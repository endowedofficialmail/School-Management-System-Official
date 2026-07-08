'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Loader2 } from 'lucide-react'
import Link from 'next/link'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import { cn } from '@/lib/utils'

const studentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['MALE', 'FEMALE'], { error: 'Gender is required' }),
  classId: z.string().min(1, 'Class is required'),
  guardianName: z.string().min(1, 'Guardian name is required'),
  guardianPhone: z
    .string()
    .min(1, 'Guardian phone is required')
    .regex(
      /^(\+92|0092|0)?3\d{9}$/,
      'Enter a valid Pakistani mobile number (e.g. 03001234567)',
    ),
  dateOfBirth: z.string().optional(),
  guardianCNIC: z
    .string()
    .regex(/^\d{5}-\d{7}-\d$/, 'Format: 12345-1234567-1')
    .optional()
    .or(z.literal('')),
  address: z.string().optional(),
  admissionDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'LEFT', 'GRADUATED']),
})

export type StudentFormValues = z.infer<typeof studentSchema>

interface StudentFormProps {
  defaultValues?: Partial<StudentFormValues>
  onSubmit: (data: StudentFormValues) => Promise<void>
  isLoading: boolean
  submitLabel: string
}

export default function StudentForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel,
}: StudentFormProps) {
  const [classes, setClasses] = useState<ClassWithYear[]>([])

  useEffect(() => {
    getClasses().then(setClasses)
  }, [])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      status: 'ACTIVE' as const,
      admissionDate: format(new Date(), 'yyyy-MM-dd'),
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* First Name */}
          <div className="space-y-1.5">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input id="firstName" placeholder="Enter first name" {...register('firstName')} />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <Label htmlFor="lastName">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input id="lastName" placeholder="Enter last name" {...register('lastName')} />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => {
                const selectedDate = field.value ? new Date(field.value) : undefined
                return (
                  <Popover>
                    <PopoverTrigger
                      className={cn(
                        'flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-3 text-sm text-left font-normal transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 shrink-0" />
                      {selectedDate ? format(selectedDate, 'PP') : 'Pick a date'}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) =>
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                        }
                        disabled={(date) => date > new Date()}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                )
              }}
            />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label>
              Gender <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gender && (
              <p className="text-xs text-destructive">{errors.gender.message}</p>
            )}
          </div>

          {/* Class */}
          <div className="space-y-1.5">
            <Label>
              Class <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="classId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={String(cls.id)}>
                        {cls.name} – {cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.classId && (
              <p className="text-xs text-destructive">{errors.classId.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="LEFT">Left</SelectItem>
                    <SelectItem value="GRADUATED">Graduated</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Admission Date */}
          <div className="space-y-1.5">
            <Label>Admission Date</Label>
            <Controller
              name="admissionDate"
              control={control}
              render={({ field }) => {
                const selectedDate = field.value ? new Date(field.value) : undefined
                return (
                  <Popover>
                    <PopoverTrigger
                      className={cn(
                        'flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-3 text-sm text-left font-normal transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 shrink-0" />
                      {selectedDate ? format(selectedDate, 'PP') : 'Pick a date'}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) =>
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                        }
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                )
              }}
            />
          </div>

          {/* Address — full width */}
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <textarea
              id="address"
              rows={2}
              placeholder="Enter address (optional)"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none resize-none transition-colors"
              {...register('address')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Guardian Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Guardian Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="guardianName">
              Guardian Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="guardianName"
              placeholder="Enter guardian name"
              {...register('guardianName')}
            />
            {errors.guardianName && (
              <p className="text-xs text-destructive">{errors.guardianName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guardianPhone">
              Guardian Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="guardianPhone"
              type="tel"
              placeholder="03001234567"
              {...register('guardianPhone')}
            />
            {errors.guardianPhone && (
              <p className="text-xs text-destructive">{errors.guardianPhone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guardianCNIC">Guardian CNIC</Label>
            <Input
              id="guardianCNIC"
              placeholder="12345-1234567-1"
              {...register('guardianCNIC')}
            />
            {errors.guardianCNIC && (
              <p className="text-xs text-destructive">{errors.guardianCNIC.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
        <Link href="/students" className={buttonVariants({ variant: 'outline' })}>
          Cancel
        </Link>
      </div>
    </form>
  )
}

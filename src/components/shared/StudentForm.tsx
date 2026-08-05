'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Camera, Loader2, User, Users } from 'lucide-react'
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import { cn, compressAndConvertToBase64 } from '@/lib/utils'

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
    .regex(/^\d{5}-\d{7}-\d{1}$/, 'Format: 12345-1234567-1')
    .optional()
    .or(z.literal('')),
  studentCNIC: z
    .string()
    .regex(/^\d{5}-\d{7}-\d{1}$/, 'Format: 12345-1234567-1')
    .optional()
    .or(z.literal('')),
  photoBase64: z.string().optional(),
  address: z.string().optional(),
  admissionDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'LEFT', 'GRADUATED']),
})

export type StudentFormValues = z.infer<typeof studentSchema>

interface FamilyEditInfo {
  fid: string
  siblingCount: number
  siblings: { id: number; firstName: string; lastName: string; registrationNumber: string; class: { name: string; section: string } }[]
}

interface StudentFormProps {
  defaultValues?: Partial<StudentFormValues>
  onSubmit: (data: StudentFormValues) => Promise<void>
  isLoading: boolean
  submitLabel: string
  familyInfo?: FamilyEditInfo
}

export default function StudentForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel,
  familyInfo,
}: StudentFormProps) {
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [siblingDialogOpen, setSiblingDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getClasses().then(setClasses)
  }, [])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      status: 'ACTIVE' as const,
      admissionDate: format(new Date(), 'yyyy-MM-dd'),
      photoBase64: '',
      studentCNIC: '',
      ...defaultValues,
    },
  })

  const photoBase64 = watch('photoBase64')
  const firstName = watch('firstName')
  const lastName = watch('lastName')
  const initials = `${(firstName || 'S')[0]}${(lastName || 'T')[0]}`.toUpperCase()

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      alert('Only JPG, PNG, and WebP images are allowed')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB')
      return
    }
    try {
      const base64 = await compressAndConvertToBase64(file, 200, 200, 0.85)
      setValue('photoBase64', base64)
    } catch {
      alert('Failed to process image')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Photo Upload */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
          {photoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoBase64}
              alt="Student photo"
              className="h-[100px] w-[100px] rounded-full object-cover border-2 border-slate-200"
            />
          ) : (
            <div className="h-[100px] w-[100px] rounded-full bg-slate-200 flex items-center justify-center border-2 border-slate-300">
              <span className="text-2xl font-semibold text-slate-600">{initials}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          {photoBase64 ? 'Change Photo' : 'Upload Photo'}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP — max 2MB</p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input id="firstName" placeholder="Enter first name" {...register('firstName')} />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input id="lastName" placeholder="Enter last name" {...register('lastName')} />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="studentCNIC">Student CNIC (optional)</Label>
            <Input id="studentCNIC" placeholder="12345-1234567-1" {...register('studentCNIC')} />
            <p className="text-xs text-muted-foreground">Format: XXXXX-XXXXXXX-X</p>
            {errors.studentCNIC && (
              <p className="text-xs text-destructive">{errors.studentCNIC.message}</p>
            )}
          </div>

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
            <Input id="guardianName" placeholder="Enter guardian name" {...register('guardianName')} />
            {errors.guardianName && (
              <p className="text-xs text-destructive">{errors.guardianName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guardianPhone">
              Guardian Phone <span className="text-destructive">*</span>
            </Label>
            <Input id="guardianPhone" type="tel" placeholder="03001234567" {...register('guardianPhone')} />
            {errors.guardianPhone && (
              <p className="text-xs text-destructive">{errors.guardianPhone.message}</p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="guardianCNIC">Guardian CNIC</Label>
            <Input id="guardianCNIC" placeholder="12345-1234567-1" {...register('guardianCNIC')} />
            <p className="text-xs text-amber-700">
              ⚠️ Guardian CNIC is used to link siblings in the Family Tree. Ensure it is correct.
            </p>
            {errors.guardianCNIC && (
              <p className="text-xs text-destructive">{errors.guardianCNIC.message}</p>
            )}
            {familyInfo && (
              <button
                type="button"
                onClick={() => setSiblingDialogOpen(true)}
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium hover:bg-blue-200 transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                Family ID: {familyInfo.fid} — {familyInfo.siblingCount} sibling{familyInfo.siblingCount !== 1 ? 's' : ''} in this family
              </button>
            )}
          </div>
        </CardContent>
      </Card>

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

      {familyInfo && (
        <Dialog open={siblingDialogOpen} onOpenChange={setSiblingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Family {familyInfo.fid}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {familyInfo.siblings.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{s.firstName} {s.lastName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{s.registrationNumber} · {s.class.name}–{s.class.section}</div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </form>
  )
}

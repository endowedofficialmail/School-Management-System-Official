'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import StudentForm, { StudentFormValues } from '@/components/shared/StudentForm'
import { getStudentById, updateStudent } from '@/lib/actions/students'

export default function EditStudentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const id = Number(params.id)
  const [isLoading, setIsLoading] = useState(false)
  const [defaultValues, setDefaultValues] = useState<Partial<StudentFormValues> | null>(null)
  const [studentMissing, setStudentMissing] = useState(false)

  useEffect(() => {
    if (isNaN(id)) { setStudentMissing(true); return }
    getStudentById(id).then((student) => {
      if (!student) { setStudentMissing(true); return }
      setDefaultValues({
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender,
        classId: String(student.classId),
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        dateOfBirth: student.dateOfBirth
          ? format(new Date(student.dateOfBirth), 'yyyy-MM-dd')
          : '',
        guardianCNIC: student.guardianCNIC ?? '',
        address: student.address ?? '',
        admissionDate: format(new Date(student.admissionDate), 'yyyy-MM-dd'),
        status: student.status,
      })
    })
  }, [id])

  async function handleSubmit(data: StudentFormValues) {
    setIsLoading(true)
    try {
      await updateStudent(id, {
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        classId: Number(data.classId),
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        dateOfBirth: data.dateOfBirth || undefined,
        guardianCNIC: data.guardianCNIC || undefined,
        address: data.address || undefined,
        admissionDate: data.admissionDate || undefined,
        status: data.status,
      })
      toast.success('Student updated successfully')
      router.push(`/students/${id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update student')
    } finally {
      setIsLoading(false)
    }
  }

  if (studentMissing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Student not found.</p>
        <Link href="/students" className={buttonVariants({ variant: 'outline' })}>
          Back to Students
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href={`/students/${id}`} className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Student</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Update the student&apos;s information
          </p>
        </div>
      </div>

      {defaultValues === null ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <StudentForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel="Update Student"
        />
      )}
    </div>
  )
}

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
import { getFamilyByStudentId } from '@/lib/actions/family'

export default function EditStudentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const id = Number(params.id)
  const [isLoading, setIsLoading] = useState(false)
  const [defaultValues, setDefaultValues] = useState<Partial<StudentFormValues> | null>(null)
  const [studentMissing, setStudentMissing] = useState(false)

  const [familyInfo, setFamilyInfo] = useState<{
    fid: string
    siblingCount: number
    siblings: { id: number; firstName: string; lastName: string; registrationNumber: string; class: { name: string; section: string } }[]
  } | null>(null)

  useEffect(() => {
    if (isNaN(id)) { setStudentMissing(true); return }
    getStudentById(id).then(async (student) => {
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
        studentCNIC: student.studentCNIC ?? '',
        photoBase64: student.photoBase64 ?? '',
        address: student.address ?? '',
        admissionDate: format(new Date(student.admissionDate), 'yyyy-MM-dd'),
        status: student.status,
      })
      if (student.family) {
        const { siblings, family } = await getFamilyByStudentId(id)
        if (family) {
          setFamilyInfo({
            fid: family.fid,
            siblingCount: siblings.length,
            siblings: siblings.map((s) => ({
              id: s.id,
              firstName: s.firstName,
              lastName: s.lastName,
              registrationNumber: s.registrationNumber,
              class: s.class,
            })),
          })
        }
      }
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
        studentCNIC: data.studentCNIC || undefined,
        photoBase64: data.photoBase64 || undefined,
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
          familyInfo={familyInfo ?? undefined}
        />
      )}
    </div>
  )
}

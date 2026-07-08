'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { buttonVariants } from '@/components/ui/button'
import StudentForm, { StudentFormValues } from '@/components/shared/StudentForm'
import { createStudent } from '@/lib/actions/students'
import Breadcrumb from '@/components/shared/Breadcrumb'

function NewStudentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClassId = searchParams.get('classId') ?? undefined

  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(data: StudentFormValues) {
    setIsLoading(true)
    try {
      await createStudent({
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
      toast.success('Student added successfully')
      router.push('/students')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add student')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StudentForm
      defaultValues={preselectedClassId ? { classId: preselectedClassId } : undefined}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitLabel="Save Student"
    />
  )
}

export default function NewStudentPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Students', href: '/students' },
        { label: 'Add New' },
      ]} />
      <div className="flex items-center gap-4">
        <Link href="/students" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add New Student</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fill in the details to enroll a new student
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="h-96 rounded-lg bg-muted animate-pulse" />}>
        <NewStudentForm />
      </Suspense>
    </div>
  )
}

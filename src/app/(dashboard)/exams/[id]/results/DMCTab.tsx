'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { CheckCircle2, Printer, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

import { buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import { getStudentFullResult, type StudentFullResult } from '@/lib/actions/exams'
import { getStudents, type StudentWithClass } from '@/lib/actions/students'
import DMCDocument from '@/components/results/DMCDocument'

type ClassOption = { id: number; name: string; section: string }

export default function DMCTab({
  examId,
  classes,
  classId,
  studentId,
  onClassChange,
  onStudentChange,
}: {
  examId: number
  classes: ClassOption[]
  classId: string
  studentId: string
  onClassChange: (v: string) => void
  onStudentChange: (v: string) => void
}) {
  const [students, setStudents] = useState<StudentWithClass[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [dmc, setDmc] = useState<StudentFullResult | null>(null)
  const [loadingDmc, setLoadingDmc] = useState(false)

  const loadStudents = useCallback(async (cid: string) => {
    if (!cid) { setStudents([]); return }
    setLoadingStudents(true)
    const data = await getStudents({ classId: Number(cid), status: 'ACTIVE', fetchAll: true })
    setStudents(data)
    setLoadingStudents(false)
  }, [])

  useEffect(() => { loadStudents(classId) }, [classId, loadStudents])

  useEffect(() => {
    if (!studentId) { setDmc(null); return }
    setLoadingDmc(true)
    getStudentFullResult(examId, Number(studentId)).then((data) => {
      setDmc(data)
      setLoadingDmc(false)
    })
  }, [examId, studentId])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        {classes.length > 1 && (
          <div className="space-y-1.5 w-48">
            <Label>Class</Label>
            <Select value={classId} onValueChange={(v) => onClassChange(v ?? '')}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select class…" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name} – {c.section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5 w-64">
          <Label>Student</Label>
          <Select value={studentId} onValueChange={(v) => onStudentChange(v ?? '')} disabled={!classId || loadingStudents || students.length === 0}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select student…" /></SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName} — {s.registrationNumber}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {classId && (
          <Link
            href={`/print/dmc/${examId}/class/${classId}`}
            target="_blank"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
          >
            <Printer className="h-4 w-4" />
            Print All DMCs (Class)
          </Link>
        )}
        {studentId && dmc && (
          <Link
            href={`/print/dmc/${examId}/${studentId}`}
            target="_blank"
            className={cn(buttonVariants({ size: 'sm' }), 'gap-2')}
          >
            <Printer className="h-4 w-4" />
            Print This DMC
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        DMC is automatically generated from Award List entries.
      </div>

      {!classId && <p className="text-center py-12 text-sm text-muted-foreground">Select a class to view student DMCs.</p>}
      {classId && !studentId && !loadingStudents && (
        <p className="text-center py-12 text-sm text-muted-foreground">Select a student to preview their DMC.</p>
      )}

      {loadingDmc && <Skeleton className="h-96 rounded-xl" />}

      {studentId && !loadingDmc && !dmc && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed rounded-xl">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-slate-700">No results found for this student</p>
        </div>
      )}

      {studentId && !loadingDmc && dmc && (
        <div className="rounded-xl border shadow-sm bg-white overflow-hidden">
          <DMCDocument data={dmc} />
        </div>
      )}
    </div>
  )
}

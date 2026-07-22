'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import AttendanceCalendar from '@/components/portal/AttendanceCalendar'
import ExamResultsList from '@/components/portal/ExamResultsList'
import FeeVoucherList from '@/components/portal/FeeVoucherList'
import StudentSummaryCard from '@/components/portal/StudentSummaryCard'
import { formatRs } from '@/components/vouchers/VoucherDocument'
import { ordinal } from '@/lib/grade'
import ParentLMSSection from '@/components/portal/ParentLMSSection'
import { type ParentPortalData } from '@/lib/actions/portal'

type LMSData = {
  courses: Array<{
    id: number
    title: string
    subject: { name: string }
    progress: { completedLessons: number; totalLessons: number; completionPercentage: number }
  }>
  announcements: Array<{
    id: number
    title: string
    isImportant: boolean
    createdAt: Date
    postedBy: { name: string }
  }>
  homeworkSummary: {
    done: number
    total: number
    items: Array<{ id: number; title: string; isDone: boolean; course: { title: string } }>
  }
}

export default function ParentPortalClient({
  data,
  school,
  lmsData,
}: {
  data: ParentPortalData
  school: { phone?: string | null; email?: string | null } | null
  lmsData?: LMSData | null
}) {
  const [studentId, setStudentId] = useState(String(data.students[0]?.student.id ?? ''))
  const selected = useMemo(
    () => data.students.find((s) => String(s.student.id) === studentId) ?? data.students[0],
    [data.students, studentId]
  )

  if (!selected) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No students linked to this parent account.
        </CardContent>
      </Card>
    )
  }

  const student = selected.student
  const currentVoucher = student.vouchers[0]
  const pendingAmount = selected.pendingAmount
  const lastExam = selected.latestPerformance
  const advanceBalance = Number(student.advanceBalance ?? 0)

  return (
    <div className="space-y-4 text-[15px]">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {data.parent.name}</h1>
        <p className="text-sm text-muted-foreground">Parent Portal</p>
      </div>

      {data.students.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Select Student</label>
          <Select value={studentId} onValueChange={(v) => setStudentId(v ?? '')}>
            <SelectTrigger className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.students.map((s) => (
                <SelectItem key={s.student.id} value={String(s.student.id)}>
                  {s.student.firstName} {s.student.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <StudentSummaryCard student={student} relation={selected.relation} />

      <div className="grid grid-cols-2 gap-3">
        <QuickStat label="Fee Status" value={currentVoucher?.status ?? 'No Due'} tone={currentVoucher ? 'bad' : 'good'} />
        <QuickStat label="Outstanding" value={formatRs(pendingAmount)} tone={pendingAmount > 0 ? 'bad' : 'good'} />
        <QuickStat label="Last Grade" value={lastExam?.grade ?? '—'} tone={lastExam?.isPassed ? 'good' : lastExam ? 'bad' : 'neutral'} />
        <QuickStat label="Last Rank" value={lastExam?.rank ? ordinal(lastExam.rank) : '—'} tone="neutral" />
      </div>

      <AttendanceCalendar studentId={student.id} />

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fee Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Pending</span>
              <Badge className={pendingAmount > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                {formatRs(pendingAmount)}
              </Badge>
            </div>
          </div>
          {advanceBalance > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-semibold text-blue-800">💙 Advance Credit: {formatRs(advanceBalance)}</p>
              <p className="text-xs text-blue-700 mt-0.5">
                This will be automatically adjusted in the next fee voucher.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <FeeVoucherList studentId={student.id} limit={6} />
      <ExamResultsList studentId={student.id} />

      {lmsData && (
        <ParentLMSSection
          courses={lmsData.courses}
          announcements={lmsData.announcements}
          homeworkSummary={lmsData.homeworkSummary}
          studentName={`${student.firstName} ${student.lastName}`}
        />
      )}

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact School</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>For queries contact the school administration.</p>
          <p><b>Phone:</b> {school?.phone ?? 'N/A'}</p>
          <p><b>Email:</b> {school?.email ?? 'N/A'}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function QuickStat({ label, value, tone }: { label: string; value: string; tone: 'good' | 'bad' | 'neutral' }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={tone === 'good' ? 'text-xl font-bold text-emerald-700' : tone === 'bad' ? 'text-xl font-bold text-red-700' : 'text-xl font-bold text-slate-800'}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

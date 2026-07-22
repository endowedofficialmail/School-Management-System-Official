import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { format, isToday, isPast } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AttendanceCalendar from '@/components/portal/AttendanceCalendar'
import ExamResultsList from '@/components/portal/ExamResultsList'
import FeeVoucherList from '@/components/portal/FeeVoucherList'
import StudentSummaryCard from '@/components/portal/StudentSummaryCard'
import StudentLMSSection from '@/components/portal/StudentLMSSection'
import { authOptions } from '@/lib/auth'
import { getStudentAttendanceSummary, getStudentPortalData } from '@/lib/actions/portal'
import {
  getLMSSettings, getCourses, getAnnouncements, getHomework, getStudentProgress,
} from '@/lib/actions/lms'
import { formatRs } from '@/components/vouchers/VoucherDocument'
import { ordinal } from '@/lib/grade'

export default async function StudentPortalPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  let student: Awaited<ReturnType<typeof getStudentPortalData>>
  try {
    student = await getStudentPortalData(Number(session.user.id))
  } catch {
    return <AccessDeniedMessage />
  }

  const now = new Date()
  const attendance = await getStudentAttendanceSummary(student.id, now.getMonth() + 1, now.getFullYear())
  const currentVoucher = student.vouchers.find((v) => v.month === now.getMonth() + 1 && v.year === now.getFullYear())
  const lastExam = student.performances[0]
  const outstanding = student.vouchers
    .filter((v) => v.status === 'UNPAID' || v.status === 'PARTIAL')
    .reduce((sum, v) => {
      if (v.status === 'PARTIAL') {
        return sum + (Number(v.remainingAmount) || Math.max(0, Number(v.totalAmount) - Number(v.paidAmount)))
      }
      return sum + Number(v.totalAmount)
    }, 0)
  const advanceBalance = Number(student.advanceBalance ?? 0)

  const lmsSettings = await getLMSSettings()
  let lmsData = null
  if (lmsSettings.isEnabled && session.user.id) {
    try {
      const userId = Number(session.user.id)
      const [courses, announcements, allHomework] = await Promise.all([
        getCourses({ userId, role: 'STUDENT' }),
        getAnnouncements({ userId, role: 'STUDENT', limit: 3 }),
        getHomework({ userId, role: 'STUDENT', studentId: student.id }),
      ])

      const coursesWithProgress = await Promise.all(
        courses.map(async (c) => {
          const progress = await getStudentProgress(c.id, student.id)
          return { ...c, progress }
        })
      )

      const todayHomework = allHomework.filter((hw) => {
        const due = new Date(hw.dueDate)
        return isToday(due) || (isPast(due) && !hw.isDone)
      })

      lmsData = { courses: coursesWithProgress, announcements, homework: todayHomework }
    } catch {
      lmsData = null
    }
  }

  return (
    <div className="space-y-4 text-[15px]">
      <StudentSummaryCard student={student} />

      <div className="grid grid-cols-2 gap-3">
        <QuickStat label="Attendance" value={`${attendance.percentage}%`} tone={attendance.percentage >= 75 ? 'good' : 'bad'} />
        <QuickStat
          label="Fee Status"
          value={currentVoucher?.status ?? 'No Voucher'}
          tone={currentVoucher?.status === 'PAID' ? 'good' : currentVoucher ? 'bad' : 'neutral'}
        />
        <QuickStat label="Last Grade" value={lastExam?.grade ?? '—'} tone={lastExam?.isPassed ? 'good' : lastExam ? 'bad' : 'neutral'} />
        <QuickStat label="Last Rank" value={lastExam?.rank ? ordinal(lastExam.rank) : '—'} tone="neutral" />
      </div>

      {outstanding > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-bold">Outstanding Balance: {formatRs(outstanding)}</p>
          <p className="text-sm">Please contact the school office for payment details.</p>
        </div>
      )}

      {advanceBalance > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
          <p className="font-bold">💙 You have {formatRs(advanceBalance)} advance credit</p>
          <p className="text-sm">This will be automatically adjusted in your next fee voucher.</p>
        </div>
      )}

      <AttendanceCalendar studentId={student.id} />
      <FeeVoucherList studentId={student.id} />
      <ExamResultsList studentId={student.id} />

      {lmsData && (
        <StudentLMSSection
          courses={lmsData.courses}
          announcements={lmsData.announcements}
          homework={lmsData.homework}
          studentId={student.id}
          userId={Number(session.user.id)}
        />
      )}

      <details className="rounded-xl border bg-white p-4 shadow-sm">
        <summary className="cursor-pointer font-semibold">Profile Info</summary>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Info label="Date of Birth" value={student.dateOfBirth ? format(new Date(student.dateOfBirth), 'dd MMM yyyy') : 'N/A'} />
          <Info label="Gender" value={student.gender === 'MALE' ? 'Male' : 'Female'} />
          <Info label="Guardian" value={student.guardianName} />
          <Info label="Guardian Phone" value={student.guardianPhone} />
          <Info label="Address" value={student.address ?? '—'} />
        </div>
      </details>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  )
}

function AccessDeniedMessage() {
  return (
    <Card>
      <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
      <CardContent>
        <Badge variant="secondary">Student profile not found</Badge>
      </CardContent>
    </Card>
  )
}

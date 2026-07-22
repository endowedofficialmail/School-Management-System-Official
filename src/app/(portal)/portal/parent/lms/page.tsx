import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getParentPortalData } from '@/lib/actions/portal'
import {
  getLMSSettings, getCourses, getAnnouncements, getHomework, getStudentProgress,
} from '@/lib/actions/lms'
import ParentLMSSection from '@/components/portal/ParentLMSSection'
import { subDays } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'

export default async function ParentLMSOverviewPage({
  searchParams,
}: {
  searchParams: { studentId?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'PARENT') redirect('/login')

  const lmsSettings = await getLMSSettings()
  if (!lmsSettings.isEnabled) redirect('/portal/parent')

  const data = await getParentPortalData(Number(session.user.id))
  const studentId = searchParams.studentId
    ? Number(searchParams.studentId)
    : data.students[0]?.student.id

  const link = data.students.find((s) => s.student.id === studentId)
  if (!link) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-bold">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-2">This student is not linked to your account</p>
        </CardContent>
      </Card>
    )
  }

  const student = link.student
  const userId = Number(session.user.id)
  const weekAgo = subDays(new Date(), 7)

  const [courses, announcements, homework] = await Promise.all([
    getCourses({ userId, role: 'PARENT', studentId: student.id }),
    getAnnouncements({ userId, role: 'PARENT', studentId: student.id, limit: 3 }),
    getHomework({ userId, role: 'PARENT', studentId: student.id }),
  ])

  const coursesWithProgress = await Promise.all(
    courses.map(async (c) => ({
      id: c.id,
      title: c.title,
      subject: c.subject,
      progress: await getStudentProgress(c.id, student.id),
    }))
  )

  const weekHomework = homework.filter((hw) => new Date(hw.createdAt) >= weekAgo)

  return (
    <div className="space-y-4">
      {data.students.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {data.students.map((s) => (
            <Link
              key={s.student.id}
              href={`/portal/parent/lms?studentId=${s.student.id}`}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                s.student.id === studentId ? 'bg-primary text-primary-foreground' : 'bg-white'
              }`}
            >
              {s.student.firstName} {s.student.lastName}
            </Link>
          ))}
        </div>
      )}
      <ParentLMSSection
        courses={coursesWithProgress}
        announcements={announcements}
        homeworkSummary={{
          done: weekHomework.filter((hw) => hw.isDone).length,
          total: weekHomework.length,
          items: homework.slice(0, 5),
        }}
        studentName={`${student.firstName} ${student.lastName}`}
      />
    </div>
  )
}

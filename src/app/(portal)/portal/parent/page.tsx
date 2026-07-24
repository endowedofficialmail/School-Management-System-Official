import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { subDays } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authOptions } from '@/lib/auth'
import { getParentPortalData } from '@/lib/actions/portal'
import { prisma } from '@/lib/prisma'
import {
  getLMSSettings, getCourses, getAnnouncements, getHomework, getStudentProgress,
} from '@/lib/actions/lms'
import ParentPortalClient from './ParentPortalClient'

export default async function ParentPortalPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  try {
    const [data, school, lmsSettings] = await Promise.all([
      getParentPortalData(Number(session.user.id)),
      prisma.school.findFirst({ select: { phone: true, email: true } }),
      getLMSSettings(),
    ])

    let lmsData = null
    if (lmsSettings.isEnabled && data.students[0]) {
      const student = data.students[0].student
      const userId = Number(session.user.id)
      try {
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
            progress: await getStudentProgress(c.id, student.id, userId, 'PARENT'),
          }))
        )

        const weekHomework = homework.filter((hw) => new Date(hw.createdAt) >= weekAgo)
        const doneCount = weekHomework.filter((hw) => hw.isDone).length

        lmsData = {
          courses: coursesWithProgress,
          announcements,
          homeworkSummary: {
            done: doneCount,
            total: weekHomework.length,
            items: homework.slice(0, 5),
          },
        }
      } catch {
        lmsData = null
      }
    }

    return (
      <ParentPortalClient
        data={data}
        school={school}
        lmsData={lmsData}
      />
    )
  } catch {
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Parent profile not found.
        </CardContent>
      </Card>
    )
  }
}

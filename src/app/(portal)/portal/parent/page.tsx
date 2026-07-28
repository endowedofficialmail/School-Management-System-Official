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
import { getStudentAssignments } from '@/lib/actions/assignments'
import { getStudentQuizzes } from '@/lib/actions/quizzes'
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
        const [courses, announcements, homework, assignments, quizzes] = await Promise.all([
          getCourses({ userId, role: 'PARENT', studentId: student.id }),
          getAnnouncements({ userId, role: 'PARENT', studentId: student.id, limit: 3 }),
          getHomework({ userId, role: 'PARENT', studentId: student.id }),
          getStudentAssignments(userId, 'PARENT', student.id),
          getStudentQuizzes(userId, 'PARENT', student.id),
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

        const gradedAssignments = assignments.filter(
          (a) => a.mySubmission?.status === 'GRADED' || a.mySubmission?.status === 'RETURNED'
        )
        const attemptedQuizzes = quizzes.filter((q) => q.myAttempt?.isCompleted)
        const avgQuiz =
          attemptedQuizzes.length > 0
            ? Math.round(
                attemptedQuizzes.reduce((s, q) => s + Number(q.myAttempt!.percentage), 0) /
                  attemptedQuizzes.length
              )
            : null

        lmsData = {
          courses: coursesWithProgress,
          announcements,
          homeworkSummary: {
            done: doneCount,
            total: weekHomework.length,
            items: homework.slice(0, 5),
          },
          assignmentSummary: {
            pending: assignments.filter((a) => !a.mySubmission).length,
            submitted: assignments.filter(
              (a) =>
                a.mySubmission &&
                a.mySubmission.status !== 'GRADED' &&
                a.mySubmission.status !== 'RETURNED'
            ).length,
            graded: gradedAssignments.length,
            recent: gradedAssignments.slice(0, 3).map((a) => ({
              id: a.id,
              title: a.title,
              marks: Number(a.mySubmission!.marksAwarded),
              total: Number(a.totalMarks),
            })),
          },
          quizSummary: {
            attempted: attemptedQuizzes.length,
            notAttempted: quizzes.length - attemptedQuizzes.length,
            avgScore: avgQuiz,
            recent: attemptedQuizzes.slice(0, 3).map((q) => ({
              id: q.id,
              title: q.title,
              percentage: Number(q.myAttempt!.percentage),
              isPassed: q.myAttempt!.isPassed,
            })),
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

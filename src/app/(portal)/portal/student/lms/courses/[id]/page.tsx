import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getStudentPortalData } from '@/lib/actions/portal'
import { getLMSSettings, getCourseById, getStudentProgress } from '@/lib/actions/lms'
import StudentCourseClient from '@/components/portal/StudentCourseClient'
import { Card, CardContent } from '@/components/ui/card'

export default async function StudentCoursePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'STUDENT') redirect('/login')

  const lmsSettings = await getLMSSettings()
  if (!lmsSettings.isEnabled) redirect('/portal/student')

  let student
  try {
    student = await getStudentPortalData(Number(session.user.id))
  } catch {
    return <AccessDenied message="Student profile not found" />
  }

  const courseId = Number(params.id)
  let course
  try {
    course = await getCourseById(courseId, Number(session.user.id), 'STUDENT')
  } catch {
    return <AccessDenied message="You don't have access to this course" />
  }

  const progress = await getStudentProgress(courseId, student.id)

  const completedLessonIds = new Set(
    progress.lessons.filter((l) => l.completed).map((l) => l.id)
  )

  return (
    <StudentCourseClient
      course={course}
      progress={progress}
      completedLessonIds={Array.from(completedLessonIds)}
      studentId={student.id}
      userId={Number(session.user.id)}
    />
  )
}

function AccessDenied({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="font-bold text-slate-900">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-2">{message}</p>
      </CardContent>
    </Card>
  )
}

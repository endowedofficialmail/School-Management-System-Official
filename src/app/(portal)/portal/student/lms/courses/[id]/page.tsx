import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLMSSettings, getCourseById, getStudentProgress } from '@/lib/actions/lms'
import StudentCourseClient from '@/components/portal/StudentCourseClient'
import { Card, CardContent } from '@/components/ui/card'

export default async function StudentCoursePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'STUDENT') redirect('/login')

  const lmsSettings = await getLMSSettings()
  if (!lmsSettings.isEnabled) redirect('/portal/student')

  const userId = Number(session.user.id)
  const profile = await prisma.studentPortalProfile.findUnique({
    where: { userId },
    include: { student: { select: { classId: true, id: true } } },
  })
  if (!profile) {
    return <AccessDenied message="Student profile not found" />
  }

  const courseId = Number(params.id)

  // Class-based access only: student.classId === course.classId
  const courseMeta = await prisma.course.findUnique({
    where: { id: courseId },
    select: { classId: true, isPublished: true },
  })
  if (!courseMeta) {
    return <AccessDenied message="Course not found" />
  }
  if (!courseMeta.isPublished) {
    return <AccessDenied message="This course is not available yet" />
  }
  if (courseMeta.classId !== profile.student.classId) {
    return <AccessDenied message="You are not enrolled in this course" />
  }

  let course
  try {
    course = await getCourseById(courseId, userId, 'STUDENT')
  } catch {
    return <AccessDenied message="You don't have access to this course" />
  }

  const progress = await getStudentProgress(
    courseId,
    profile.student.id,
    userId,
    'STUDENT'
  )

  const completedLessonIds = new Set(
    progress.lessons.filter((l) => l.completed).map((l) => l.id)
  )

  return (
    <StudentCourseClient
      course={course}
      progress={progress}
      completedLessonIds={Array.from(completedLessonIds)}
      studentId={profile.student.id}
      userId={userId}
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

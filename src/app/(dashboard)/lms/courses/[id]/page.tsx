import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings, getCourseById, getCourseCompletionStats } from '@/lib/actions/lms'
import { getAssignments } from '@/lib/actions/assignments'
import { getQuizzes } from '@/lib/actions/quizzes'
import CourseDetailClient from '@/components/lms/CourseDetailClient'

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { tab?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const role = session.user.role as string
  if (!['ADMIN', 'TEACHER'].includes(role)) redirect('/dashboard')

  const lmsSettings = await getLMSSettings()
  if (!lmsSettings.isEnabled) redirect('/dashboard?lms=disabled')

  const courseId = Number(params.id)
  if (isNaN(courseId)) notFound()

  const userId = Number(session.user.id)

  let course
  try {
    course = await getCourseById(courseId, userId, role)
  } catch {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-2">You don&apos;t have permission to view this course.</p>
      </div>
    )
  }

  const [progressStats, assignments, quizzes] = await Promise.all([
    getCourseCompletionStats(courseId).catch(() => null),
    getAssignments(courseId, userId, role).catch(() => []),
    getQuizzes(courseId, userId, role).catch(() => []),
  ])

  return (
    <CourseDetailClient
      course={course}
      progressStats={progressStats}
      userId={userId}
      role={role as 'ADMIN' | 'TEACHER'}
      initialTab={searchParams.tab ?? 'details'}
      initialAssignments={assignments}
      initialQuizzes={quizzes}
    />
  )
}

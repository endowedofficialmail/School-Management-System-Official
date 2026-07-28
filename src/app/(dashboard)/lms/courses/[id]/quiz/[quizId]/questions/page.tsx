import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings } from '@/lib/actions/lms'
import { getQuizById } from '@/lib/actions/quizzes'
import QuestionManagerClient from '@/components/lms/QuestionManagerClient'

export default async function QuizQuestionsPage({
  params,
}: {
  params: { id: string; quizId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const role = session.user.role as string
  if (!['ADMIN', 'TEACHER'].includes(role)) redirect('/dashboard')

  const lms = await getLMSSettings()
  if (!lms.isEnabled) redirect('/dashboard?lms=disabled')

  const courseId = Number(params.id)
  const quizId = Number(params.quizId)
  if (isNaN(courseId) || isNaN(quizId)) notFound()

  let quiz
  try {
    quiz = await getQuizById(quizId, Number(session.user.id), role)
  } catch {
    redirect(`/lms/courses/${courseId}?tab=quizzes`)
  }

  if (quiz.courseId !== courseId) notFound()

  return (
    <QuestionManagerClient
      quiz={quiz}
      userId={Number(session.user.id)}
      role={role as 'ADMIN' | 'TEACHER'}
    />
  )
}

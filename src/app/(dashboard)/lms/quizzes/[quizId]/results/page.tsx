import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings } from '@/lib/actions/lms'
import { getSubmissionsForQuiz } from '@/lib/actions/quizzes'
import QuizResultsClient from '@/components/lms/QuizResultsClient'

export default async function QuizResultsPage({ params }: { params: { quizId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const role = session.user.role as string
  if (!['ADMIN', 'TEACHER'].includes(role)) redirect('/dashboard')

  const lms = await getLMSSettings()
  if (!lms.isEnabled) redirect('/dashboard?lms=disabled')

  const quizId = Number(params.quizId)
  if (isNaN(quizId)) notFound()

  let data
  try {
    data = await getSubmissionsForQuiz(quizId, Number(session.user.id), role)
  } catch {
    redirect('/lms/courses')
  }

  return (
    <QuizResultsClient
      data={data}
      userId={Number(session.user.id)}
      role={role as 'ADMIN' | 'TEACHER'}
    />
  )
}

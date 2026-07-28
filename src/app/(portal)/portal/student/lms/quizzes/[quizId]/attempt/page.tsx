import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings } from '@/lib/actions/lms'
import QuizAttemptClient from '@/components/portal/QuizAttemptClient'

export default async function StudentQuizAttemptPage({
  params,
}: {
  params: { quizId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'STUDENT') redirect('/login')

  const lms = await getLMSSettings()
  if (!lms.isEnabled) redirect('/portal/student')

  const quizId = Number(params.quizId)
  if (isNaN(quizId)) notFound()

  return <QuizAttemptClient quizId={quizId} userId={Number(session.user.id)} />
}

import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLMSSettings } from '@/lib/actions/lms'
import QuizAttemptClient from '@/components/portal/QuizAttemptClient'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function StudentQuizAttemptPage({
  params,
}: {
  params: { quizId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'STUDENT') redirect('/login')

  const userId = Number(session.user.id)
  if (!Number.isFinite(userId)) redirect('/login')

  const lms = await getLMSSettings()
  if (!lms.isEnabled) redirect('/portal/student')

  const quizId = Number(params.quizId)
  if (!Number.isFinite(quizId)) notFound()

  const profile = await prisma.studentPortalProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-semibold text-slate-900">Student profile not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your portal account is not linked to a student record. Please contact the school office.
          </p>
        </CardContent>
      </Card>
    )
  }

  return <QuizAttemptClient quizId={quizId} userId={userId} />
}

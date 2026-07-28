import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings, getLMSDashboardStats } from '@/lib/actions/lms'
import { getPendingGradingCounts } from '@/lib/actions/assignments'
import { getPendingQuizReviews } from '@/lib/actions/quizzes'
import LMSDashboardClient from '@/components/lms/LMSDashboardClient'

export default async function LMSDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const role = session.user.role as string
  if (!['ADMIN', 'TEACHER'].includes(role)) {
    redirect('/dashboard')
  }

  const lmsSettings = await getLMSSettings()
  if (!lmsSettings.isEnabled) {
    redirect('/dashboard?lms=disabled')
  }

  const userId = Number(session.user.id)

  let stats
  try {
    stats = await getLMSDashboardStats(userId, role)
  } catch {
    redirect('/dashboard')
  }

  const [pendingAssignments, pendingQuizzes] = await Promise.all([
    getPendingGradingCounts(userId, role).catch(() => []),
    getPendingQuizReviews(userId, role).catch(() => []),
  ])

  return (
    <LMSDashboardClient
      role={role as 'ADMIN' | 'TEACHER'}
      stats={stats}
      pendingAssignments={pendingAssignments}
      pendingQuizzes={pendingQuizzes}
    />
  )
}

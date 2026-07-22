import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings, getLMSDashboardStats } from '@/lib/actions/lms'
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

  let stats
  try {
    stats = await getLMSDashboardStats(Number(session.user.id), role)
  } catch {
    redirect('/dashboard')
  }

  return (
    <LMSDashboardClient
      role={role as 'ADMIN' | 'TEACHER'}
      stats={stats}
    />
  )
}

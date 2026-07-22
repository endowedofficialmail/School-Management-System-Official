import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings } from '@/lib/actions/lms'
import HomeworkClient from '@/components/lms/HomeworkClient'

export default async function HomeworkPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const role = session.user.role as string
  if (!['ADMIN', 'TEACHER'].includes(role)) redirect('/dashboard')

  const lmsSettings = await getLMSSettings()
  if (!lmsSettings.isEnabled) redirect('/dashboard?lms=disabled')

  return (
    <HomeworkClient
      userId={Number(session.user.id)}
      role={role as 'ADMIN' | 'TEACHER'}
    />
  )
}

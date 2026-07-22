import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings, getAnnouncements } from '@/lib/actions/lms'
import StudentAnnouncementsClient from '@/components/portal/StudentAnnouncementsClient'

export default async function StudentAnnouncementsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'STUDENT') redirect('/login')

  const lmsSettings = await getLMSSettings()
  if (!lmsSettings.isEnabled) redirect('/portal/student')

  const announcements = await getAnnouncements({
    userId: Number(session.user.id),
    role: 'STUDENT',
  })

  return (
    <StudentAnnouncementsClient
      announcements={announcements}
      userId={Number(session.user.id)}
    />
  )
}

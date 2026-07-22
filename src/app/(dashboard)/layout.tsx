import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getSchoolProfile } from '@/lib/actions/settings'
import { getLMSSettings } from '@/lib/actions/lms'
import DashboardShell from '@/components/layout/DashboardShell'
import ProfileIncompleteBanner from '@/components/shared/ProfileIncompleteBanner'
import { UserRole } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role === 'STUDENT') {
    redirect('/portal/student')
  }

  if (session.user.role === 'PARENT') {
    redirect('/portal/parent')
  }

  const [school, lmsSettings] = await Promise.all([
    getSchoolProfile(),
    getLMSSettings(),
  ])
  const schoolName = school?.name ?? 'School Management'

  return (
    <DashboardShell
      userName={session.user.name ?? 'User'}
      userRole={(session.user.role as UserRole) ?? 'ADMIN'}
      userEmail={session.user.email ?? ''}
      schoolName={schoolName}
      schoolLogoUrl={school?.logoUrl}
      lmsEnabled={lmsSettings.isEnabled}
      banner={
        <ProfileIncompleteBanner
          schoolName={school?.name}
          address={school?.address}
          phone={school?.phone}
          logoUrl={school?.logoUrl}
          userRole={session.user.role}
        />
      }
    >
      {children}
    </DashboardShell>
  )
}

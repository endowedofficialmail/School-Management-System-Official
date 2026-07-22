import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PortalHeader from '@/components/portal/PortalHeader'
import PortalNav from '@/components/portal/PortalNav'
import { getLMSSettings } from '@/lib/actions/lms'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  if (session.user.role !== 'STUDENT' && session.user.role !== 'PARENT') {
    redirect('/dashboard')
  }

  const [school, lmsSettings] = await Promise.all([
    prisma.school.findFirst({ select: { name: true } }),
    getLMSSettings(),
  ])

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader
        schoolName={school?.name ?? 'School Management'}
        userName={session.user.name ?? 'User'}
      />
      <main className="mx-auto max-w-3xl px-4 py-4 pb-20">
        <PortalNav
          role={session.user.role as 'STUDENT' | 'PARENT'}
          lmsEnabled={lmsSettings.isEnabled}
        />
        {children}
      </main>
    </div>
  )
}

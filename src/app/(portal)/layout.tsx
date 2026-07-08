import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PortalHeader from '@/components/portal/PortalHeader'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  if (session.user.role !== 'STUDENT' && session.user.role !== 'PARENT') {
    redirect('/dashboard')
  }

  const school = await prisma.school.findFirst({ select: { name: true } })

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader
        schoolName={school?.name ?? 'School Management'}
        userName={session.user.name ?? 'User'}
      />
      <main className="mx-auto max-w-3xl px-4 py-4 pb-20">
        {children}
      </main>
    </div>
  )
}

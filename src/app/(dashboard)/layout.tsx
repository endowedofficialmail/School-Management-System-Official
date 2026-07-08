import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardShell from '@/components/layout/DashboardShell'
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

  const school = await prisma.school.findFirst({ select: { name: true } })
  const schoolName = school?.name ?? 'School Management'

  return (
    <DashboardShell
      userName={session.user.name ?? 'User'}
      userRole={(session.user.role as UserRole) ?? 'ADMIN'}
      userEmail={session.user.email ?? ''}
      schoolName={schoolName}
    >
      {children}
    </DashboardShell>
  )
}

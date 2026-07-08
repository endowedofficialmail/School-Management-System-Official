import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  // Check if the system has been set up yet
  const school = await prisma.school.findFirst()
  if (!school) redirect('/setup')

  const session = await getServerSession(authOptions)
  if (session?.user?.role === 'STUDENT') redirect('/portal/student')
  if (session?.user?.role === 'PARENT') redirect('/portal/parent')
  if (session) redirect('/dashboard')
  redirect('/login')
}

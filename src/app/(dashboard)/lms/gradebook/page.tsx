import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings, getCourses } from '@/lib/actions/lms'
import GradeBookClient from '@/components/lms/GradeBookClient'

export default async function GradeBookPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const role = session.user.role as string
  if (!['ADMIN', 'TEACHER'].includes(role)) redirect('/dashboard')

  const lms = await getLMSSettings()
  if (!lms.isEnabled) redirect('/dashboard?lms=disabled')

  const courses = await getCourses({
    userId: Number(session.user.id),
    role,
  })

  return (
    <GradeBookClient
      courses={courses.map((c) => ({ id: c.id, title: c.title }))}
      userId={Number(session.user.id)}
      role={role as 'ADMIN' | 'TEACHER'}
    />
  )
}

import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings } from '@/lib/actions/lms'
import { getSubmissionsForAssignment } from '@/lib/actions/assignments'
import AssignmentSubmissionsClient from '@/components/lms/AssignmentSubmissionsClient'

export default async function AssignmentSubmissionsPage({
  params,
}: {
  params: { assignmentId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const role = session.user.role as string
  if (!['ADMIN', 'TEACHER'].includes(role)) redirect('/dashboard')

  const lms = await getLMSSettings()
  if (!lms.isEnabled) redirect('/dashboard?lms=disabled')

  const assignmentId = Number(params.assignmentId)
  if (isNaN(assignmentId)) notFound()

  let data
  try {
    data = await getSubmissionsForAssignment(assignmentId, Number(session.user.id), role)
  } catch {
    redirect('/lms/courses')
  }

  return (
    <AssignmentSubmissionsClient
      data={data}
      userId={Number(session.user.id)}
      role={role as 'ADMIN' | 'TEACHER'}
    />
  )
}

import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLMSSettings } from '@/lib/actions/lms'
import { getAssignmentById } from '@/lib/actions/assignments'
import StudentAssignmentSubmitClient from '@/components/portal/StudentAssignmentSubmitClient'
import { Card, CardContent } from '@/components/ui/card'

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: { assignmentId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'STUDENT') redirect('/login')

  const lms = await getLMSSettings()
  if (!lms.isEnabled) redirect('/portal/student')

  const assignmentId = Number(params.assignmentId)
  if (isNaN(assignmentId)) notFound()

  let assignment
  try {
    assignment = await getAssignmentById(assignmentId, Number(session.user.id), 'STUDENT')
  } catch {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-bold">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-2">You cannot access this assignment.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <StudentAssignmentSubmitClient
      assignment={assignment}
      userId={Number(session.user.id)}
    />
  )
}

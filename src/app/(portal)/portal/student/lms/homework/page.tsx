import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getStudentPortalData } from '@/lib/actions/portal'
import { getLMSSettings, getHomework } from '@/lib/actions/lms'
import StudentHomeworkClient from '@/components/portal/StudentHomeworkClient'

export default async function StudentHomeworkPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'STUDENT') redirect('/login')

  const lmsSettings = await getLMSSettings()
  if (!lmsSettings.isEnabled) redirect('/portal/student')

  let student
  try {
    student = await getStudentPortalData(Number(session.user.id))
  } catch {
    redirect('/portal/student')
  }

  const homework = await getHomework({
    userId: Number(session.user.id),
    role: 'STUDENT',
    studentId: student.id,
  })

  return (
    <StudentHomeworkClient
      homework={homework}
      studentId={student.id}
      userId={Number(session.user.id)}
    />
  )
}

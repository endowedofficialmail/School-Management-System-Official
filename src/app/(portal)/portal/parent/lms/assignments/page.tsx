import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { getLMSSettings } from '@/lib/actions/lms'
import { getParentPortalData } from '@/lib/actions/portal'
import { getStudentAssignments } from '@/lib/actions/assignments'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function ParentAssignmentsPage({
  searchParams,
}: {
  searchParams: { studentId?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'PARENT') redirect('/login')

  const lms = await getLMSSettings()
  if (!lms.isEnabled) redirect('/portal/parent')

  const data = await getParentPortalData(Number(session.user.id))
  const studentId = searchParams.studentId
    ? Number(searchParams.studentId)
    : data.students[0]?.student.id

  const link = data.students.find((s) => s.student.id === studentId)
  if (!link) {
    return <Card><CardContent className="py-12 text-center">Access Denied</CardContent></Card>
  }

  const assignments = await getStudentAssignments(
    Number(session.user.id),
    'PARENT',
    studentId
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Assignments — {link.student.firstName}</h1>
      {data.students.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {data.students.map((s) => (
            <Link
              key={s.student.id}
              href={`/portal/parent/lms/assignments?studentId=${s.student.id}`}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                s.student.id === studentId ? 'bg-primary text-primary-foreground' : ''
              }`}
            >
              {s.student.firstName}
            </Link>
          ))}
        </div>
      )}
      {assignments.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No assignments</CardContent></Card>
      ) : (
        assignments.map((a) => {
          const sub = a.mySubmission
          let label = 'Not Submitted'
          if (sub?.status === 'GRADED' || sub?.status === 'RETURNED') {
            label = `Graded: ${Number(sub.marksAwarded)}/${Number(a.totalMarks)}`
          } else if (sub) {
            label = `Submitted ${format(new Date(sub.submittedAt), 'dd MMM yyyy, hh:mm a')}`
          }
          return (
            <Card key={a.id}>
              <CardContent className="p-4 space-y-1">
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.course.subject.name}</p>
                <p className="text-sm text-muted-foreground">
                  Due: {format(new Date(a.dueDate), 'dd MMM yyyy, hh:mm a')}
                </p>
                <Badge variant="outline">{label}</Badge>
                {sub?.feedback && (
                  <p className="text-sm mt-2">Feedback: {sub.feedback}</p>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

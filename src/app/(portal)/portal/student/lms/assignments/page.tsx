import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { format, isPast } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { getLMSSettings } from '@/lib/actions/lms'
import { getStudentAssignments } from '@/lib/actions/assignments'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function StudentAssignmentsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'STUDENT') redirect('/login')

  const lms = await getLMSSettings()
  if (!lms.isEnabled) redirect('/portal/student')

  const assignments = await getStudentAssignments(Number(session.user.id), 'STUDENT')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Assignments</h1>
      {assignments.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No assignments yet</CardContent></Card>
      ) : (
        assignments.map((a) => {
          const sub = a.mySubmission
          const overdue = isPast(new Date(a.dueDate)) && !sub
          let statusLabel = 'NOT SUBMITTED'
          let statusClass = 'bg-red-100 text-red-700'
          if (sub?.status === 'GRADED' || sub?.status === 'RETURNED') {
            statusLabel = `GRADED: ${Number(sub.marksAwarded)}/${Number(a.totalMarks)}`
            statusClass = 'bg-blue-100 text-blue-700'
          } else if (sub) {
            statusLabel = 'SUBMITTED'
            statusClass = 'bg-emerald-100 text-emerald-700'
          }

          return (
            <Card key={a.id} className={overdue ? 'border-red-300' : ''}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <p className="font-semibold">{a.title}</p>
                  <span className="text-xs text-muted-foreground">Course: {a.course.subject.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Due: {format(new Date(a.dueDate), 'dd MMM yyyy, hh:mm a')} · Total: {Number(a.totalMarks)} marks
                </p>
                <div className="flex items-center gap-2">
                  <Badge className={statusClass}>{statusLabel}</Badge>
                  {overdue && <Badge variant="destructive">OVERDUE</Badge>}
                </div>
                <Link
                  href={`/portal/student/lms/assignments/${a.id}`}
                  className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}
                >
                  {sub ? 'View Submission' : 'Submit Assignment'}
                </Link>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

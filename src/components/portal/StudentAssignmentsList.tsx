'use client'

import Link from 'next/link'
import { format, isPast } from 'date-fns'
import { ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

type Assignment = Awaited<ReturnType<typeof import('@/lib/actions/assignments').getStudentAssignments>>[number]

function assignmentStatus(a: Assignment) {
  const sub = a.mySubmission
  if (!sub) {
    const overdue = isPast(new Date(a.dueDate))
    return overdue ? { label: 'Overdue', variant: 'destructive' as const } : { label: 'Pending', variant: 'secondary' as const }
  }
  if (sub.status === 'GRADED' || sub.status === 'RETURNED') {
    return { label: 'Graded', variant: 'default' as const }
  }
  if (sub.status === 'LATE' || sub.isLate) {
    return { label: 'Submitted (Late)', variant: 'outline' as const }
  }
  return { label: 'Submitted', variant: 'default' as const }
}

export default function StudentAssignmentsList({
  assignments,
}: {
  assignments: Assignment[]
}) {
  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No assignments available
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {assignments.map((a) => {
        const status = assignmentStatus(a)
        return (
          <Card key={a.id} className="shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                    <p className="font-semibold">{a.title}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {a.course.title} · {a.course.subject.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Due: {format(new Date(a.dueDate), 'dd MMM yyyy, hh:mm a')} · {Number(a.totalMarks)} marks
                  </p>
                  {a.mySubmission?.marksAwarded != null && (
                    <p className="text-sm font-medium text-emerald-700 mt-1">
                      Score: {Number(a.mySubmission.marksAwarded)}/{Number(a.totalMarks)}
                    </p>
                  )}
                </div>
                <Link
                  href={`/portal/student/lms/assignments/${a.id}`}
                  className={cn(buttonVariants({ size: 'sm' }), 'inline-flex shrink-0')}
                >
                  View Details
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

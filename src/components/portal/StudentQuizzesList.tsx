'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { HelpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

type Quiz = Awaited<ReturnType<typeof import('@/lib/actions/quizzes').getStudentQuizzes>>[number]

function quizStatus(q: Quiz) {
  switch (q.attemptStatus) {
    case 'COMPLETED':
      return { label: 'Completed', variant: 'default' as const }
    case 'IN_PROGRESS':
      return { label: 'In Progress', variant: 'outline' as const }
    default:
      return { label: 'Not Started', variant: 'secondary' as const }
  }
}

export default function StudentQuizzesList({
  quizzes,
}: {
  quizzes: Quiz[]
}) {
  if (quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No quizzes available
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {quizzes.map((q) => {
        const status = quizStatus(q)
        const attempt = q.myAttempt
        const href =
          status.label === 'Completed'
            ? `/portal/student/lms/quizzes/${q.id}/attempt`
            : `/portal/student/lms/quizzes/${q.id}/attempt`

        return (
          <Card key={q.id} className="shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                    <p className="font-semibold">{q.title}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {q.course.title} · {q.course.subject.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {q.duration} min · {q.questionCount} questions · {Number(q.totalMarks)} marks
                  </p>
                  {(q.startTime || q.endTime) && (
                    <p className="text-xs text-muted-foreground">
                      Available:{' '}
                      {q.startTime ? format(new Date(q.startTime), 'dd MMM yyyy') : '—'} to{' '}
                      {q.endTime ? format(new Date(q.endTime), 'dd MMM yyyy') : '—'}
                    </p>
                  )}
                  {attempt?.isCompleted && attempt.marksAwarded != null && (
                    <p className="text-sm font-medium text-emerald-700 mt-1">
                      Score: {Number(attempt.marksAwarded)}/{Number(attempt.totalMarks)} ({Number(attempt.percentage)}%)
                      {attempt.isPassed ? ' — Passed' : ' — Failed'}
                    </p>
                  )}
                </div>
                <Link
                  href={href}
                  className={cn(buttonVariants({ size: 'sm' }), 'inline-flex shrink-0')}
                >
                  {status.label === 'Completed' ? 'View Results' : status.label === 'In Progress' ? 'Continue' : 'Start Quiz'}
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

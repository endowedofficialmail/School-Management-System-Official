import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { getLMSSettings } from '@/lib/actions/lms'
import { getStudentQuizzes } from '@/lib/actions/quizzes'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function StudentQuizzesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'STUDENT') redirect('/login')

  const lms = await getLMSSettings()
  if (!lms.isEnabled) redirect('/portal/student')

  const quizzes = await getStudentQuizzes(Number(session.user.id), 'STUDENT')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Quizzes</h1>
      {quizzes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No quizzes yet</CardContent></Card>
      ) : (
        quizzes.map((q) => {
          const attempt = q.myAttempt
          let status = 'NOT ATTEMPTED'
          let statusClass = 'bg-slate-100 text-slate-700'
          if (q.attemptStatus === 'IN_PROGRESS') {
            status = 'IN PROGRESS'
            statusClass = 'bg-amber-100 text-amber-800'
          } else if (q.attemptStatus === 'COMPLETED' && attempt) {
            if (q.showResultsImmediately) {
              status = attempt.isPassed
                ? `SCORE: ${Number(attempt.percentage)}%`
                : `FAILED: ${Number(attempt.percentage)}%`
              statusClass = attempt.isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            } else {
              status = 'SUBMITTED'
              statusClass = 'bg-blue-100 text-blue-700'
            }
          }

          const canStart = q.attemptStatus !== 'COMPLETED' || q.allowedAttempts > 1

          return (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <p className="font-semibold">{q.title}</p>
                  <span className="text-xs text-muted-foreground">Course: {q.course.subject.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Duration: {q.duration} min · Questions: {q.questionCount} · Marks: {Number(q.totalMarks)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Available:{' '}
                  {q.startTime || q.endTime
                    ? `${q.startTime ? format(new Date(q.startTime), 'dd MMM') : '—'} — ${q.endTime ? format(new Date(q.endTime), 'dd MMM yyyy') : '—'}`
                    : 'Open'}
                </p>
                <Badge className={statusClass}>{status}</Badge>
                <div>
                  {q.attemptStatus === 'COMPLETED' && q.showResultsImmediately ? (
                    <Link
                      href={`/portal/student/lms/quizzes/${q.id}/attempt`}
                      className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'inline-flex')}
                    >
                      View Results
                    </Link>
                  ) : canStart ? (
                    <Link
                      href={`/portal/student/lms/quizzes/${q.id}/attempt`}
                      className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}
                    >
                      {q.attemptStatus === 'IN_PROGRESS' ? 'Continue Quiz' : 'Start Quiz'}
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

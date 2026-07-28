import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { getLMSSettings } from '@/lib/actions/lms'
import { getParentPortalData } from '@/lib/actions/portal'
import { getStudentQuizzes } from '@/lib/actions/quizzes'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function ParentQuizzesPage({
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

  const quizzes = await getStudentQuizzes(Number(session.user.id), 'PARENT', studentId)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Quizzes — {link.student.firstName}</h1>
      {data.students.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {data.students.map((s) => (
            <Link
              key={s.student.id}
              href={`/portal/parent/lms/quizzes?studentId=${s.student.id}`}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                s.student.id === studentId ? 'bg-primary text-primary-foreground' : ''
              }`}
            >
              {s.student.firstName}
            </Link>
          ))}
        </div>
      )}
      {quizzes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No quizzes</CardContent></Card>
      ) : (
        quizzes.map((q) => {
          const attempt = q.myAttempt
          return (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-1">
                <p className="font-semibold">{q.title}</p>
                <p className="text-sm text-muted-foreground">{q.course.subject.name}</p>
                <p className="text-sm text-muted-foreground">
                  Duration: {q.duration} min · Marks: {Number(q.totalMarks)}
                </p>
                {attempt?.isCompleted ? (
                  <>
                    <Badge className={attempt.isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {Number(attempt.percentage)}% · {attempt.isPassed ? 'Passed' : 'Failed'}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {attempt.submittedAt ? format(new Date(attempt.submittedAt), 'dd MMM yyyy, hh:mm a') : '—'}
                      {attempt.timeSpent != null
                        ? ` · Time: ${Math.floor(attempt.timeSpent / 60)} min ${attempt.timeSpent % 60} sec`
                        : ''}
                    </p>
                  </>
                ) : (
                  <Badge variant="secondary">Not Attempted</Badge>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

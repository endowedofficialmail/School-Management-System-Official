'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import BackButton from '@/components/shared/BackButton'
import { gradeShortAnswers, getQuizAttemptDetail } from '@/lib/actions/quizzes'

type Data = Awaited<ReturnType<typeof import('@/lib/actions/quizzes').getSubmissionsForQuiz>>
type AttemptDetail = Awaited<ReturnType<typeof getQuizAttemptDetail>>
type Filter = 'ALL' | 'ATTEMPTED' | 'NOT_ATTEMPTED' | 'PASSED' | 'FAILED' | 'NEEDS_GRADING'

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m} min ${s} sec`
}

export default function QuizResultsClient({
  data: initial,
  userId,
  role,
}: {
  data: Data
  userId: number
  role: 'ADMIN' | 'TEACHER'
}) {
  const [data, setData] = useState(initial)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [detail, setDetail] = useState<AttemptDetail | null>(null)
  const [shortMarks, setShortMarks] = useState<Record<number, string>>({})
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  const rows = useMemo(() => {
    return data.rows.filter((r) => {
      if (filter === 'ALL') return true
      if (filter === 'ATTEMPTED') return Boolean(r.attempt?.isCompleted)
      if (filter === 'NOT_ATTEMPTED') return r.status === 'NOT_ATTEMPTED'
      if (filter === 'PASSED') return r.status === 'PASSED'
      if (filter === 'FAILED') return r.status === 'FAILED'
      if (filter === 'NEEDS_GRADING') return r.status === 'NEEDS_GRADING'
      return true
    })
  }, [data.rows, filter])

  async function refresh() {
    const { getSubmissionsForQuiz } = await import('@/lib/actions/quizzes')
    setData(await getSubmissionsForQuiz(data.quiz.id, userId, role))
  }

  async function openDetail(attemptId: number) {
    try {
      const d = await getQuizAttemptDetail(attemptId, userId, role)
      setDetail(d)
      setFeedback(d.teacherFeedback ?? '')
      const marks: Record<number, string> = {}
      d.answers.forEach((a) => {
        if (a.question.questionType === 'SHORT') {
          marks[a.id] = a.marksAwarded != null ? String(Number(a.marksAwarded)) : ''
        }
      })
      setShortMarks(marks)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load')
    }
  }

  async function saveShortGrades() {
    if (!detail) return
    setSaving(true)
    try {
      await gradeShortAnswers(
        {
          attemptId: detail.id,
          answers: Object.entries(shortMarks).map(([answerId, marksAwarded]) => ({
            answerId: Number(answerId),
            marksAwarded: Number(marksAwarded || 0),
          })),
          feedback,
        },
        userId,
        role
      )
      toast.success('Grades saved')
      setDetail(null)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const { summary, quiz } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">Quiz Results — {quiz.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Total Students" value={summary.total} />
        <Stat label="Attempted" value={`${summary.attempted} (${summary.total ? Math.round((summary.attempted / summary.total) * 100) : 0}%)`} />
        <Stat label="Not Attempted" value={summary.notAttempted} />
        <Stat label="Passed" value={summary.passed} tone="good" />
        <Stat label="Failed" value={summary.failed} tone="bad" />
        <Stat label="Average Score" value={`${summary.avgScore}%`} tone="blue" />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['ALL', 'All'],
          ['ATTEMPTED', 'Attempted'],
          ['NOT_ATTEMPTED', 'Not Attempted'],
          ['PASSED', 'Passed'],
          ['FAILED', 'Failed'],
          ['NEEDS_GRADING', 'Needs Grading'],
        ] as const).map(([key, label]) => (
          <Button key={key} size="sm" variant={filter === key ? 'default' : 'outline'} onClick={() => setFilter(key)}>
            {label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Started At</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Time Spent</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const name = `${row.student.firstName} ${row.student.lastName}`
                if (!row.attempt?.isCompleted) {
                  return (
                    <TableRow key={row.student.id}>
                      <TableCell>{name}</TableCell>
                      <TableCell>{row.attempt ? format(new Date(row.attempt.startedAt), 'dd MMM yyyy, hh:mm a') : '—'}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {row.status === 'IN_PROGRESS' ? 'In Progress' : 'Not Attempted'}
                        </Badge>
                      </TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                  )
                }
                const a = row.attempt
                return (
                  <TableRow key={row.student.id}>
                    <TableCell>{name}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{format(new Date(a.startedAt), 'dd MMM yyyy, hh:mm a')}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{a.submittedAt ? format(new Date(a.submittedAt), 'dd MMM yyyy, hh:mm a') : '—'}</TableCell>
                    <TableCell>{formatDuration(a.timeSpent)}</TableCell>
                    <TableCell>{Number(a.marksAwarded)}/{Number(a.totalMarks)}</TableCell>
                    <TableCell>{Number(a.percentage)}%</TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'PASSED' ? 'default' : row.status === 'NEEDS_GRADING' ? 'secondary' : 'destructive'}>
                        {row.status === 'PASSED' ? 'Passed' : row.status === 'NEEDS_GRADING' ? 'Needs Grading' : 'Failed'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openDetail(a.id)}>View Details</Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail ? `${detail.student.firstName} ${detail.student.lastName}` : 'Attempt'}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              {detail.quiz.questions.map((q, idx) => {
                const answer = detail.answers.find((a) => a.questionId === q.id)
                return (
                  <div key={q.id} className="rounded-lg border p-3 space-y-2 text-sm">
                    <p className="font-medium">Q{idx + 1}. {q.questionText}</p>
                    {q.questionType === 'SHORT' ? (
                      <>
                        <p className="whitespace-pre-wrap bg-slate-50 p-2 rounded">{answer?.textAnswer || '—'}</p>
                        <div className="flex items-center gap-2">
                          <span>Marks:</span>
                          <Input
                            className="w-24"
                            type="number"
                            value={answer ? (shortMarks[answer.id] ?? '') : ''}
                            onChange={(e) =>
                              answer && setShortMarks({ ...shortMarks, [answer.id]: e.target.value })
                            }
                          />
                          <span>/ {Number(q.marks)}</span>
                        </div>
                      </>
                    ) : (
                      <ul className="space-y-1">
                        {q.options.map((o) => {
                          const selected = answer?.selectedOptionId === o.id
                          return (
                            <li
                              key={o.id}
                              className={
                                o.isCorrect
                                  ? 'text-emerald-700 font-medium'
                                  : selected
                                    ? 'text-red-700'
                                    : ''
                              }
                            >
                              {selected ? '→ ' : ''}{o.optionText}
                              {o.isCorrect ? ' (correct)' : ''}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Teacher Feedback</p>
                <textarea
                  className="flex min-h-[70px] w-full rounded-md border px-3 py-2 text-sm"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
            <Button onClick={saveShortGrades} disabled={saving}>Save Grades</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'bad' | 'blue' }) {
  const color =
    tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : tone === 'blue' ? 'text-blue-700' : 'text-slate-900'
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

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
import {
  downloadSubmissionFile, gradeSubmission, returnAllGraded,
} from '@/lib/actions/assignments'

type Data = Awaited<ReturnType<typeof import('@/lib/actions/assignments').getSubmissionsForAssignment>>
type Filter = 'ALL' | 'SUBMITTED' | 'NOT_SUBMITTED' | 'GRADED' | 'LATE'

export default function AssignmentSubmissionsClient({
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
  const [grades, setGrades] = useState<Record<number, { marks: string; feedback: string }>>({})
  const [viewRow, setViewRow] = useState<Data['rows'][number] | null>(null)
  const [saving, setSaving] = useState<number | null>(null)

  const rows = useMemo(() => {
    return data.rows.filter((r) => {
      if (filter === 'ALL') return true
      if (filter === 'NOT_SUBMITTED') return r.status === 'NOT_SUBMITTED'
      if (filter === 'GRADED') return r.status === 'GRADED'
      if (filter === 'LATE') return r.status === 'LATE' || Boolean(r.submission?.isLate)
      if (filter === 'SUBMITTED') return r.submission && r.status !== 'GRADED'
      return true
    })
  }, [data.rows, filter])

  async function refresh() {
    const { getSubmissionsForAssignment } = await import('@/lib/actions/assignments')
    setData(await getSubmissionsForAssignment(data.assignment.id, userId, role))
  }

  function gradeState(submissionId: number, marksAwarded?: unknown, feedback?: string | null) {
    return grades[submissionId] ?? {
      marks: marksAwarded != null ? String(Number(marksAwarded)) : '',
      feedback: feedback ?? '',
    }
  }

  async function saveGrade(submissionId: number) {
    const g = gradeState(submissionId)
    if (g.marks === '') { toast.error('Enter marks'); return }
    setSaving(submissionId)
    try {
      await gradeSubmission(
        { submissionId, marksAwarded: Number(g.marks), feedback: g.feedback },
        userId,
        role
      )
      toast.success('Grade saved')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(null)
    }
  }

  async function handleDownload(submissionId: number) {
    try {
      const file = await downloadSubmissionFile(submissionId, userId, role)
      const a = document.createElement('a')
      a.href = file.fileUrl
      a.download = file.fileName
      a.click()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed')
    }
  }

  const { summary, assignment } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">Submissions — {assignment.title}</h1>
          <p className="text-sm text-muted-foreground">
            {assignment.course.subject.name} · {assignment.course.class.name}-{assignment.course.class.section}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Students" value={summary.total} />
        <Stat label="Submitted" value={`${summary.submitted} (${summary.total ? Math.round((summary.submitted / summary.total) * 100) : 0}%)`} tone="good" />
        <Stat label="Not Submitted" value={summary.notSubmitted} tone="bad" />
        <Stat label="Graded" value={summary.graded} tone="blue" />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['ALL', 'All'],
          ['SUBMITTED', 'Submitted'],
          ['NOT_SUBMITTED', 'Not Submitted'],
          ['GRADED', 'Graded'],
          ['LATE', 'Late'],
        ] as const).map(([key, label]) => (
          <Button key={key} size="sm" variant={filter === key ? 'default' : 'outline'} onClick={() => setFilter(key)}>
            {label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={async () => {
            try {
              await returnAllGraded(assignment.id, userId, role)
              toast.success('Graded submissions marked as returned')
              await refresh()
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed')
            }
          }}
        >
          Notify Students
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const name = `${row.student.firstName} ${row.student.lastName}`
                if (!row.submission) {
                  return (
                    <TableRow key={row.student.id}>
                      <TableCell>{name}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell><Badge variant="destructive">Not Submitted</Badge></TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                  )
                }
                const sub = row.submission
                const g = gradeState(sub.id, sub.marksAwarded, sub.feedback)
                return (
                  <TableRow key={row.student.id}>
                    <TableCell>{name}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(sub.submittedAt), 'dd MMM yyyy, hh:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'GRADED' ? 'default' : row.status === 'LATE' ? 'secondary' : 'outline'}>
                        {row.status === 'GRADED' ? 'Graded' : row.status === 'LATE' ? 'Late' : 'Submitted'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {sub.fileUrl && (
                          <Button size="sm" variant="link" className="h-auto p-0" onClick={() => handleDownload(sub.id)}>
                            {sub.fileName || 'Download'}
                          </Button>
                        )}
                        {sub.textAnswer && (
                          <Button size="sm" variant="link" className="h-auto p-0" onClick={() => setViewRow(row)}>
                            View Answer
                          </Button>
                        )}
                        {!sub.fileUrl && !sub.textAnswer && '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-20"
                        type="number"
                        value={g.marks}
                        onChange={(e) =>
                          setGrades({ ...grades, [sub.id]: { ...g, marks: e.target.value } })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="min-w-[140px]"
                        value={g.feedback}
                        onChange={(e) =>
                          setGrades({ ...grades, [sub.id]: { ...g, feedback: e.target.value } })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" disabled={saving === sub.id} onClick={() => saveGrade(sub.id)}>
                        Save Grade
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(viewRow)} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {viewRow ? `${viewRow.student.firstName} ${viewRow.student.lastName}` : 'Answer'}
            </DialogTitle>
          </DialogHeader>
          {viewRow?.submission && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Submitted: {format(new Date(viewRow.submission.submittedAt), 'dd MMM yyyy, hh:mm a')}
              </p>
              <p className="whitespace-pre-wrap">{viewRow.submission.textAnswer}</p>
              {viewRow.submission.fileUrl && (
                <Button size="sm" variant="outline" onClick={() => handleDownload(viewRow.submission!.id)}>
                  Download File
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRow(null)}>Close</Button>
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
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

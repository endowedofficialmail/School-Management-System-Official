'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { createQuiz, deleteQuiz, publishQuiz } from '@/lib/actions/quizzes'

type QuizRow = {
  id: number
  title: string
  duration: number
  totalMarks: unknown
  isPublished: boolean
  startTime: string | Date | null
  endTime: string | Date | null
  questionCount: number
  attemptCount?: number
  totalStudents?: number
}

export default function CourseQuizzesTab({
  courseId,
  userId,
  role,
  initialQuizzes,
}: {
  courseId: number
  userId: number
  role: 'ADMIN' | 'TEACHER'
  initialQuizzes: QuizRow[]
}) {
  const [quizzes, setQuizzes] = useState(initialQuizzes)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration: '30',
    passingMarks: '40',
    startTime: '',
    endTime: '',
    shuffleQuestions: false,
    showResultsImmediately: true,
    allowedAttempts: '1',
  })

  async function refresh() {
    const { getQuizzes } = await import('@/lib/actions/quizzes')
    const rows = await getQuizzes(courseId, userId, role)
    setQuizzes(rows as QuizRow[])
  }

  async function handleCreate() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      await createQuiz(
        {
          courseId,
          title: form.title,
          description: form.description,
          duration: Number(form.duration),
          passingMarks: Number(form.passingMarks),
          startTime: form.startTime || null,
          endTime: form.endTime || null,
          shuffleQuestions: form.shuffleQuestions,
          showResultsImmediately: form.showResultsImmediately,
          allowedAttempts: Number(form.allowedAttempts),
        },
        userId,
        role
      )
      toast.success('Quiz created')
      setOpen(false)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish(id: number) {
    try {
      await publishQuiz(id, userId, role)
      toast.success('Quiz published')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to publish quiz')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this quiz?')) return
    try {
      await deleteQuiz(id, userId, role)
      toast.success('Quiz deleted')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Quizzes</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Quiz
        </Button>
      </div>

      {quizzes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No quizzes yet</CardContent></Card>
      ) : (
        quizzes.map((q) => (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{q.title}</p>
                <Badge variant={q.isPublished ? 'default' : 'secondary'}>
                  {q.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Duration: {q.duration} min · Questions: {q.questionCount} · Marks: {Number(q.totalMarks)}
              </p>
              <p className="text-sm text-muted-foreground">
                Available:{' '}
                {q.startTime || q.endTime
                  ? `${q.startTime ? format(new Date(q.startTime), 'dd MMM yyyy') : '—'} to ${q.endTime ? format(new Date(q.endTime), 'dd MMM yyyy') : '—'}`
                  : 'Always'}
              </p>
              <p className="text-sm text-muted-foreground">
                Attempts: {q.attemptCount ?? 0} of {q.totalStudents ?? '—'} students
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/lms/courses/${courseId}/quiz/${q.id}/questions`}
                  className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'inline-flex')}
                >
                  Manage Questions
                </Link>
                <Link
                  href={`/lms/quizzes/${q.id}/results`}
                  className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'inline-flex')}
                >
                  View Results
                </Link>
                {!q.isPublished && (
                  <Button size="sm" variant="outline" onClick={() => handlePublish(q.id)}>Publish</Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => handleDelete(q.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Quiz</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea className="flex min-h-[70px] w-full rounded-md border px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duration (minutes) *</Label>
                <Input type="number" min={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Passing Marks</Label>
                <Input type="number" value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Total marks are calculated from questions.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Available From</Label>
                <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Available Until</Label>
                <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave both dates empty to make the quiz available immediately after publishing.
            </p>
            <div className="space-y-1.5">
              <Label>Allowed Attempts (1–3)</Label>
              <Input type="number" min={1} max={3} value={form.allowedAttempts} onChange={(e) => setForm({ ...form, allowedAttempts: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.shuffleQuestions} onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })} />
              Shuffle questions
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.showResultsImmediately} onChange={(e) => setForm({ ...form, showResultsImmediately: e.target.checked })} />
              Show results immediately
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
import {
  createAssignment, publishAssignment, deleteAssignment,
} from '@/lib/actions/assignments'

type AssignmentRow = {
  id: number
  title: string
  dueDate: Date
  totalMarks: unknown
  passingMarks: unknown
  isPublished: boolean
  allowLate: boolean
  submissionCount: number
  gradedCount?: number
  totalStudents?: number
}

export default function CourseAssignmentsTab({
  courseId,
  userId,
  role,
  initialAssignments,
}: {
  courseId: number
  userId: number
  role: 'ADMIN' | 'TEACHER'
  initialAssignments: AssignmentRow[]
}) {
  const [assignments, setAssignments] = useState(initialAssignments)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    fileUrl: '',
    totalMarks: '100',
    passingMarks: '40',
    dueDate: '',
    allowLate: false,
    publishImmediately: false,
  })

  async function refresh() {
    const { getAssignments } = await import('@/lib/actions/assignments')
    const rows = await getAssignments(courseId, userId, role)
    setAssignments(rows as AssignmentRow[])
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.dueDate) {
      toast.error('Title and due date are required')
      return
    }
    setSaving(true)
    try {
      await createAssignment(
        {
          courseId,
          title: form.title,
          description: form.description,
          instructions: form.instructions,
          fileUrl: form.fileUrl || undefined,
          totalMarks: Number(form.totalMarks),
          passingMarks: Number(form.passingMarks),
          dueDate: form.dueDate,
          allowLate: form.allowLate,
          publishImmediately: form.publishImmediately,
        },
        userId,
        role
      )
      toast.success('Assignment created')
      setOpen(false)
      setForm({
        title: '', description: '', instructions: '', fileUrl: '',
        totalMarks: '100', passingMarks: '40', dueDate: '', allowLate: false, publishImmediately: false,
      })
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish(id: number) {
    try {
      await publishAssignment(id, userId, role)
      toast.success('Assignment published')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this assignment and all submissions?')) return
    try {
      await deleteAssignment(id, userId, role)
      toast.success('Assignment deleted')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Assignments</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Assignment
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No assignments yet</CardContent></Card>
      ) : (
        assignments.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{a.title}</p>
                    <Badge variant={a.isPublished ? 'default' : 'secondary'}>
                      {a.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Due: {format(new Date(a.dueDate), 'dd MMM yyyy, hh:mm a')} · Total: {Number(a.totalMarks)} · Pass: {Number(a.passingMarks)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Submissions: {a.submissionCount} of {a.totalStudents ?? '—'} · Graded: {a.gradedCount ?? 0}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/lms/assignments/${a.id}/submissions`}
                  className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'inline-flex')}
                >
                  View Submissions
                </Link>
                {!a.isPublished && (
                  <Button size="sm" variant="outline" onClick={() => handlePublish(a.id)}>Publish</Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea className="flex min-h-[70px] w-full rounded-md border px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Instructions</Label>
              <textarea className="flex min-h-[70px] w-full rounded-md border px-3 py-2 text-sm" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Attachment URL (Google Drive)</Label>
              <Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Marks</Label>
                <Input type="number" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Passing Marks</Label>
                <Input type="number" value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date & Time *</Label>
              <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allowLate} onChange={(e) => setForm({ ...form, allowLate: e.target.checked })} />
              Allow late submissions
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.publishImmediately} onChange={(e) => setForm({ ...form, publishImmediately: e.target.checked })} />
              Publish immediately
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

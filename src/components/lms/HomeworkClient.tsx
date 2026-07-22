'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import BackButton from '@/components/shared/BackButton'
import {
  getHomework, createHomework, deleteHomework,
  getHomeworkCompletionStatus, getCourses,
} from '@/lib/actions/lms'

export default function HomeworkClient({
  userId,
  role,
}: {
  userId: number
  role: 'ADMIN' | 'TEACHER'
}) {
  const [homeworks, setHomeworks] = useState<Awaited<ReturnType<typeof getHomework>>>([])
  const [courses, setCourses] = useState<Array<{ id: number; title: string }>>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [completionDialog, setCompletionDialog] = useState<number | null>(null)
  const [completions, setCompletions] = useState<Awaited<ReturnType<typeof getHomeworkCompletionStatus>> | null>(null)
  const [courseFilter, setCourseFilter] = useState('all')

  const [form, setForm] = useState({ courseId: '', title: '', description: '', dueDate: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [hw, courseData] = await Promise.all([
        getHomework({ userId, role, courseId: courseFilter !== 'all' ? Number(courseFilter) : undefined }),
        getCourses({ userId, role }),
      ])
      setHomeworks(hw)
      setCourses(courseData.map((c) => ({ id: c.id, title: c.title })))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [userId, role, courseFilter])

  useEffect(() => { void load() }, [load])

  async function handleAssign() {
    if (!form.title || !form.courseId || !form.dueDate) {
      toast.error('Fill all required fields')
      return
    }
    try {
      await createHomework({
        courseId: Number(form.courseId),
        title: form.title,
        description: form.description || undefined,
        dueDate: new Date(form.dueDate),
      }, userId, role)
      toast.success('Homework assigned')
      setDialog(false)
      setForm({ courseId: '', title: '', description: '', dueDate: '' })
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function showCompletions(id: number) {
    try {
      const data = await getHomeworkCompletionStatus(id, userId, role)
      setCompletions(data)
      setCompletionDialog(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Homework</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Assign and track homework</p>
          </div>
        </div>
        <Button onClick={() => setDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Assign Homework
        </Button>
      </div>

      <Select value={courseFilter} onValueChange={(v) => setCourseFilter(v ?? 'all')}>
        <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by course" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Courses</SelectItem>
          {courses.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : homeworks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No homework assigned</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {homeworks.map((hw) => (
            <Card key={hw.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{hw.title}</p>
                    <p className="text-sm text-muted-foreground">{hw.course.title}</p>
                  </div>
                  {hw.isOverdue && <Badge className="bg-red-100 text-red-700">Overdue</Badge>}
                </div>
                <p className="text-sm">Due: {format(new Date(hw.dueDate), 'dd MMM yyyy HH:mm')}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => showCompletions(hw.id)}>
                    <Users className="h-3 w-3 mr-1" /> Completions
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={async () => {
                    try {
                      await deleteHomework(hw.id, userId, role)
                      toast.success('Deleted')
                      void load()
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed')
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Homework</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Course *</Label>
              <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v ?? '' })}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the homework clearly" className="flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completionDialog !== null} onOpenChange={() => setCompletionDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Completion Status</DialogTitle></DialogHeader>
          {completions && (
            <div className="space-y-4">
              <p className="text-sm">{completions.counts.done} of {completions.counts.total} students done</p>
              <div>
                <p className="font-medium text-emerald-700 mb-1">Done ({completions.done.length})</p>
                {completions.done.map((s) => (
                  <p key={s.id} className="text-sm">{s.name}{s.markedAt ? ` — ${format(new Date(s.markedAt), 'dd MMM HH:mm')}` : ''}</p>
                ))}
              </div>
              <div>
                <p className="font-medium text-red-700 mb-1">Not Done ({completions.notDone.length})</p>
                {completions.notDone.map((s) => (
                  <p key={s.id} className="text-sm text-red-600">{s.name}</p>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import BackButton from '@/components/shared/BackButton'
import {
  getAnnouncements, createAnnouncement, deleteAnnouncement,
  getAnnouncementReadReceipts, getCourses, getTeacherClassesAndSubjects,
} from '@/lib/actions/lms'

export default function AnnouncementsClient({
  userId,
  role,
}: {
  userId: number
  role: 'ADMIN' | 'TEACHER'
}) {
  const [announcements, setAnnouncements] = useState<Awaited<ReturnType<typeof getAnnouncements>>>([])
  const [courses, setCourses] = useState<Array<{ id: number; title: string }>>([])
  const [classes, setClasses] = useState<Array<{ id: number; name: string; section: string }>>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [receiptDialog, setReceiptDialog] = useState<number | null>(null)
  const [receipts, setReceipts] = useState<Awaited<ReturnType<typeof getAnnouncementReadReceipts>> | null>(null)

  const [form, setForm] = useState({
    title: '', content: '', postTo: 'course' as 'school' | 'class' | 'course',
    classId: '', courseId: '', isImportant: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ann, courseData, classData] = await Promise.all([
        getAnnouncements({ userId, role }),
        getCourses({ userId, role }),
        getTeacherClassesAndSubjects(userId, role),
      ])
      setAnnouncements(ann)
      setCourses(courseData.map((c) => ({ id: c.id, title: c.title })))
      setClasses(classData.map((c) => ({ id: c.id, name: c.name, section: c.section })))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [userId, role])

  useEffect(() => { void load() }, [load])

  async function handlePost() {
    if (!form.title || !form.content) { toast.error('Title and content required'); return }
    try {
      await createAnnouncement({
        title: form.title,
        content: form.content,
        courseId: form.postTo === 'course' ? Number(form.courseId) : null,
        classId: form.postTo === 'class' ? Number(form.classId) : form.postTo === 'school' ? null : null,
        isImportant: form.isImportant,
      }, userId, role)
      toast.success('Announcement posted')
      setDialog(false)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function showReceipts(id: number) {
    try {
      const data = await getAnnouncementReadReceipts(id, userId, role)
      setReceipts(data)
      setReceiptDialog(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  function postedToLabel(a: typeof announcements[number]) {
    if (!a.courseId && !a.classId) return 'Entire School'
    if (a.course) return `Course: ${a.course.title}`
    if (a.class) return `Class: ${a.class.name}-${a.class.section}`
    return '—'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Announcements</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Post and manage announcements</p>
          </div>
        </div>
        <Button onClick={() => setDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Post Announcement
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No announcements yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Posted To</TableHead>
                  <TableHead>Posted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Important</TableHead>
                  <TableHead>Read By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{postedToLabel(a)}</TableCell>
                    <TableCell>{a.postedBy.name}</TableCell>
                    <TableCell>{format(new Date(a.createdAt), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{a.isImportant ? <Badge className="bg-orange-100 text-orange-700">Yes</Badge> : '—'}</TableCell>
                    <TableCell>
                      <button className="text-primary text-sm underline" onClick={() => showReceipts(a.id)}>
                        {a._count.readReceipts} read
                      </button>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={async () => {
                        try {
                          await deleteAnnouncement(a.id, userId, role)
                          toast.success('Deleted')
                          void load()
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Failed')
                        }
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Post Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Content *</Label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Post To</Label>
              <Select value={form.postTo} onValueChange={(v) => setForm({ ...form, postTo: (v ?? 'course') as typeof form.postTo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {role === 'ADMIN' && <SelectItem value="school">Entire School</SelectItem>}
                  <SelectItem value="class">Specific Class</SelectItem>
                  <SelectItem value="course">Specific Course</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.postTo === 'class' && (
              <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v ?? '' })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}-{c.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.postTo === 'course' && (
              <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v ?? '' })}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isImportant} onChange={(e) => setForm({ ...form, isImportant: e.target.checked })} />
              Mark as Important
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handlePost}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptDialog !== null} onOpenChange={() => setReceiptDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Read Receipts</DialogTitle></DialogHeader>
          {receipts && (
            <div className="space-y-4">
              <p className="text-sm">{receipts.readCount} of {receipts.total} read</p>
              <div>
                <p className="font-medium text-sm text-emerald-700 mb-1">Read ({receipts.read.length})</p>
                {receipts.read.map((u) => <p key={u.id} className="text-sm">{u.name}</p>)}
              </div>
              <div>
                <p className="font-medium text-sm text-red-700 mb-1">Not Read ({receipts.unread.length})</p>
                {receipts.unread.map((u) => <p key={u.id} className="text-sm text-red-600">{u.name}</p>)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

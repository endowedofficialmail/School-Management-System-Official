'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ChevronDown, ChevronUp, Plus, Trash2, Pencil, Check, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import BackButton from '@/components/shared/BackButton'
import {
  updateCourse, publishCourse,
  createLesson, updateLesson, deleteLesson, publishLesson, reorderLessons,
  createHomework, deleteHomework,
  createAnnouncement,
} from '@/lib/actions/lms'
import { getLessonTypeBadges, getYouTubeThumbnail, isValidVideoUrl } from '@/lib/lms-utils'

type Course = Awaited<ReturnType<typeof import('@/lib/actions/lms').getCourseById>>
type ProgressStats = Awaited<ReturnType<typeof import('@/lib/actions/lms').getCourseCompletionStats>> | null

const EMPTY_LESSON = { title: '', content: '', videoUrl: '', pdfUrl: '' }

export default function CourseDetailClient({
  course: initialCourse,
  progressStats: initialProgress,
  userId,
  role,
  initialTab,
}: {
  course: Course
  progressStats: ProgressStats
  userId: number
  role: 'ADMIN' | 'TEACHER'
  initialTab: string
}) {
  const [course, setCourse] = useState(initialCourse)
  const [progressStats, setProgressStats] = useState(initialProgress)
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description ?? '')
  const [saving, setSaving] = useState(false)

  const [lessonDialog, setLessonDialog] = useState(false)
  const [editingLesson, setEditingLesson] = useState<number | null>(null)
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON)
  const [videoError, setVideoError] = useState('')

  const [hwDialog, setHwDialog] = useState(false)
  const [hwForm, setHwForm] = useState({ title: '', description: '', dueDate: '' })

  const [annDialog, setAnnDialog] = useState(false)
  const [annForm, setAnnForm] = useState({ title: '', content: '', isImportant: false })

  const refresh = useCallback(async () => {
    try {
      const { getCourseById, getCourseCompletionStats } = await import('@/lib/actions/lms')
      const updated = await getCourseById(course.id, userId, role)
      setCourse(updated)
      const stats = await getCourseCompletionStats(course.id)
      setProgressStats(stats)
    } catch {
      // keep current state
    }
  }, [course.id, userId, role])

  async function handleSaveDetails() {
    setSaving(true)
    try {
      await updateCourse(course.id, { title, description }, userId, role)
      toast.success('Course updated')
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublishCourse() {
    try {
      await publishCourse(course.id, userId, role)
      toast.success('Course published')
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to publish')
    }
  }

  async function handleUnpublishCourse() {
    try {
      await updateCourse(course.id, { isPublished: false }, userId, role)
      toast.success('Course unpublished')
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function handleSaveLesson() {
    if (!lessonForm.title) { toast.error('Title is required'); return }
    if (!lessonForm.content && !lessonForm.videoUrl && !lessonForm.pdfUrl) {
      toast.error('Provide at least content, video URL, or PDF URL')
      return
    }
    if (lessonForm.videoUrl && !isValidVideoUrl(lessonForm.videoUrl)) {
      setVideoError('Must be a YouTube or Google Drive link')
      return
    }

    try {
      if (editingLesson) {
        await updateLesson(editingLesson, lessonForm, userId, role)
        toast.success('Lesson updated')
      } else {
        await createLesson({ ...lessonForm, courseId: course.id }, userId, role)
        toast.success('Lesson created')
      }
      setLessonDialog(false)
      setEditingLesson(null)
      setLessonForm(EMPTY_LESSON)
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function handleDeleteLesson(id: number) {
    try {
      await deleteLesson(id, userId, role)
      toast.success('Lesson deleted')
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function handleToggleLessonPublish(lesson: { id: number; isPublished: boolean }) {
    try {
      if (lesson.isPublished) {
        await updateLesson(lesson.id, { isPublished: false }, userId, role)
      } else {
        await publishLesson(lesson.id, userId, role)
      }
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function moveLesson(lessonId: number, direction: 'up' | 'down') {
    const ids = course.lessons.map((l) => l.id)
    const idx = ids.indexOf(lessonId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === ids.length - 1) return
    const newIds = [...ids]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]]
    try {
      await reorderLessons(course.id, newIds, userId, role)
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reorder')
    }
  }

  async function handleCreateHomework() {
    if (!hwForm.title || !hwForm.dueDate) { toast.error('Title and due date required'); return }
    try {
      await createHomework({
        courseId: course.id,
        title: hwForm.title,
        description: hwForm.description || undefined,
        dueDate: new Date(hwForm.dueDate),
      }, userId, role)
      toast.success('Homework assigned')
      setHwDialog(false)
      setHwForm({ title: '', description: '', dueDate: '' })
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function handleCreateAnnouncement() {
    if (!annForm.title || !annForm.content) { toast.error('Title and content required'); return }
    try {
      await createAnnouncement({
        title: annForm.title,
        content: annForm.content,
        courseId: course.id,
        isImportant: annForm.isImportant,
      }, userId, role)
      toast.success('Announcement posted')
      setAnnDialog(false)
      setAnnForm({ title: '', content: '', isImportant: false })
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  const thumb = lessonForm.videoUrl ? getYouTubeThumbnail(lessonForm.videoUrl) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{course.title}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{course.subject.name}</Badge>
            <Badge variant="outline">{course.class.name}-{course.class.section}</Badge>
            <Badge variant={course.isPublished ? 'default' : 'secondary'}>
              {course.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSaveDetails} disabled={saving}>Save Changes</Button>
                {!course.isPublished ? (
                  <Button variant="outline" onClick={handlePublishCourse}>Publish Course</Button>
                ) : (
                  <Button variant="outline" onClick={handleUnpublishCourse}>Unpublish</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lessons" className="space-y-4 mt-4">
          <div className="flex justify-between">
            <p className="text-sm text-muted-foreground">{course.lessons.length} lessons</p>
            <Button size="sm" onClick={() => { setEditingLesson(null); setLessonForm(EMPTY_LESSON); setLessonDialog(true) }}>
              <Plus className="h-4 w-4 mr-1" /> Add Lesson
            </Button>
          </div>
          {course.lessons.map((lesson, idx) => (
            <Card key={lesson.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground w-6">{idx + 1}</span>
                  <div>
                    <p className="font-medium">{lesson.title}</p>
                    <div className="flex gap-1 mt-1">
                      {getLessonTypeBadges(lesson).map((b) => (
                        <Badge key={b} variant="outline" className="text-xs">{b}</Badge>
                      ))}
                      <Badge variant={lesson.isPublished ? 'default' : 'secondary'} className="text-xs">
                        {lesson.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => moveLesson(lesson.id, 'up')} disabled={idx === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => moveLesson(lesson.id, 'down')} disabled={idx === course.lessons.length - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingLesson(lesson.id)
                    setLessonForm({ title: lesson.title, content: lesson.content ?? '', videoUrl: lesson.videoUrl ?? '', pdfUrl: lesson.pdfUrl ?? '' })
                    setLessonDialog(true)
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleLessonPublish(lesson)}>
                    {lesson.isPublished ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteLesson(lesson.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAnnDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Post Announcement
            </Button>
          </div>
          {course.announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements for this course</p>
          ) : (
            course.announcements.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.title}</p>
                    {a.isImportant && <Badge className="bg-orange-100 text-orange-700">Important</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(a.createdAt), 'dd MMM yyyy')}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="homework" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setHwDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Assign Homework
            </Button>
          </div>
          {course.homeworks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No homework assigned</p>
          ) : (
            course.homeworks.map((hw) => (
              <Card key={hw.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{hw.title}</p>
                    <p className="text-sm text-muted-foreground">Due: {format(new Date(hw.dueDate), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={async () => {
                    try {
                      await deleteHomework(hw.id, userId, role)
                      toast.success('Deleted')
                      void refresh()
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed')
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 mt-4">
          <p className="text-xs text-muted-foreground">Print this page for records</p>
          {progressStats ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {progressStats.students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.completedCount}</TableCell>
                        <TableCell>{s.totalLessons}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${s.percentage}%` }} />
                            </div>
                            {s.percentage}%
                          </div>
                        </TableCell>
                        <TableCell>{s.lastActivity ? format(new Date(s.lastActivity), 'dd MMM yyyy') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">No progress data available</p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <textarea value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} className="flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Video URL</Label>
              <Input value={lessonForm.videoUrl} onChange={(e) => { setLessonForm({ ...lessonForm, videoUrl: e.target.value }); setVideoError('') }} placeholder="YouTube or Google Drive link" />
              <p className="text-xs text-muted-foreground">Paste a YouTube link or Google Drive video link</p>
              {videoError && <p className="text-xs text-red-500">{videoError}</p>}
              {thumb && (
                <Image src={thumb} alt="Video preview" width={320} height={180} className="rounded-lg mt-2" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>PDF URL</Label>
              <Input value={lessonForm.pdfUrl} onChange={(e) => setLessonForm({ ...lessonForm, pdfUrl: e.target.value })} placeholder="Google Drive PDF link" />
              <p className="text-xs text-muted-foreground">Share your PDF on Google Drive and paste the link here</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveLesson}>{editingLesson ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hwDialog} onOpenChange={setHwDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Homework</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={hwForm.title} onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea value={hwForm.description} onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })} placeholder="Describe the homework clearly" className="flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <Input type="datetime-local" value={hwForm.dueDate} onChange={(e) => setHwForm({ ...hwForm, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHwDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateHomework}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={annDialog} onOpenChange={setAnnDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Content *</Label>
              <textarea value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} className="flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={annForm.isImportant} onChange={(e) => setAnnForm({ ...annForm, isImportant: e.target.checked })} />
              Mark as Important
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateAnnouncement}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

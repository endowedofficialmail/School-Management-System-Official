'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Plus, Trash2, Pencil, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import BackButton from '@/components/shared/BackButton'
import { getCourses, deleteCourse, getCourseCompletionStats, getTeacherClassesAndSubjects } from '@/lib/actions/lms'

type Course = Awaited<ReturnType<typeof getCourses>>[number] & {
  completionRate?: number
}

export default function CoursesClient({
  userId,
  role,
}: {
  userId: number
  role: 'ADMIN' | 'TEACHER'
}) {
  const [courses, setCourses] = useState<Course[]>([])
  const [classes, setClasses] = useState<Array<{ id: number; name: string; section: string; subjects: Array<{ id: number; name: string }> }>>([])
  const [loading, setLoading] = useState(true)
  const [classFilter, setClassFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [publishedFilter, setPublishedFilter] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [courseData, classData] = await Promise.all([
        getCourses({ userId, role }),
        getTeacherClassesAndSubjects(userId, role),
      ])
      setClasses(classData.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        subjects: c.subjects ?? [],
      })))

      const withStats = await Promise.all(
        courseData.map(async (c) => {
          if (!c.isPublished) return { ...c, completionRate: 0 }
          try {
            const stats = await getCourseCompletionStats(c.id)
            return { ...c, completionRate: stats.completionRate }
          } catch {
            return { ...c, completionRate: 0 }
          }
        })
      )
      setCourses(withStats)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }, [userId, role])

  useEffect(() => { void load() }, [load])

  const filtered = courses.filter((c) => {
    if (classFilter !== 'all' && c.classId !== Number(classFilter)) return false
    if (subjectFilter !== 'all' && c.subjectId !== Number(subjectFilter)) return false
    if (publishedFilter === 'published' && !c.isPublished) return false
    if (publishedFilter === 'draft' && c.isPublished) return false
    return true
  })

  const allSubjects = classes.flatMap((c) => c.subjects ?? [])

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteCourse(deleteId, userId, role)
      toast.success('Course deleted')
      setDeleteId(null)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Courses</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage online courses and lessons</p>
          </div>
        </div>
        <Link href="/lms/courses/new" className={cn(buttonVariants(), 'inline-flex')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Course
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={classFilter} onValueChange={(v) => setClassFilter(v ?? 'all')}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}-{c.section}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(v ?? 'all')}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {allSubjects.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={publishedFilter} onValueChange={(v) => setPublishedFilter(v ?? 'all')}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No courses found. Create your first course to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <Card key={course.id} className="shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-bold text-slate-900">{course.title}</h3>
                  </div>
                  <Badge variant={course.isPublished ? 'default' : 'secondary'}>
                    {course.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{course.subject.name}</Badge>
                  <Badge variant="outline">{course.class.name}-{course.class.section}</Badge>
                </div>
                {role === 'ADMIN' && (
                  <p className="text-xs text-muted-foreground">Teacher: {course.teacher.name}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {course._count.lessons} lessons
                </p>
                {course.isPublished && (
                  <p className="text-xs text-emerald-700">
                    {course.completionRate ?? 0}% of students completed at least 1 lesson
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/lms/courses/${course.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Link>
                  <Link href={`/lms/courses/${course.id}?tab=lessons`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}>
                    Lessons
                  </Link>
                  {role === 'ADMIN' && (
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDeleteId(course.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the course and all its lessons, announcements, and homework.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

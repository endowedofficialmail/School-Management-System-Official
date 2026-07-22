'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import BackButton from '@/components/shared/BackButton'
import { createCourse, getTeacherClassesAndSubjects, getTeachers } from '@/lib/actions/lms'

type ClassWithSubjects = Awaited<ReturnType<typeof getTeacherClassesAndSubjects>>[number]
type Teacher = Awaited<ReturnType<typeof getTeachers>>[number]

export default function CreateCourseClient({
  userId,
  role,
}: {
  userId: number
  role: 'ADMIN' | 'TEACHER'
}) {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassWithSubjects[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [teacherId, setTeacherId] = useState(String(userId))

  useEffect(() => {
    Promise.all([
      getTeacherClassesAndSubjects(userId, role),
      role === 'ADMIN' ? getTeachers() : Promise.resolve([]),
    ]).then(([classData, teacherData]) => {
      setClasses(classData)
      setTeachers(teacherData)
      setLoading(false)
    })
  }, [userId, role])

  const selectedClass = classes.find((c) => c.id === Number(classId))
  const subjects = selectedClass?.subjects ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !classId || !subjectId) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const course = await createCourse(
        {
          title,
          description: description || undefined,
          subjectId: Number(subjectId),
          classId: Number(classId),
          teacherId: Number(teacherId),
        },
        userId,
        role
      )
      toast.success('Course created')
      router.push(`/lms/courses/${course.id}?tab=lessons`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create course')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Course</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Set up a new online course</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Grade 3 Mathematics" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief course description..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Class *</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v ?? ''); setSubjectId('') }}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}-{c.section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Subject *</Label>
                <Select value={subjectId} onValueChange={(v) => setSubjectId(v ?? '')} disabled={!classId}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {role === 'ADMIN' && (
                <div className="space-y-1.5">
                  <Label>Teacher *</Label>
                  <Select value={teacherId} onValueChange={(v) => setTeacherId(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Course'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

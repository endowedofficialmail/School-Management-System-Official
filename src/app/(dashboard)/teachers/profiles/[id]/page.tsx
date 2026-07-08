'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { School, BookOpen, ArrowLeft, CalendarRange } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTeacherById, type TeacherDetail } from '@/lib/actions/teachers'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function TeacherDetailPage() {
  const params = useParams()
  const id = Number(params.id)

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getTeacherById(id).then((data) => {
      if (!data) setNotFound(true)
      else setTeacher(data)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-36 rounded-lg bg-muted animate-pulse" />
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  if (notFound || !teacher) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-lg font-semibold text-slate-700">Teacher not found</p>
        <Link href="/teachers/profiles" className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Profiles
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button + heading */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/teachers/profiles"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight flex-1">Teacher Profile</h1>
        <Link
          href={`/teachers/timetable/${id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <CalendarRange className="h-4 w-4" />
          View Timetable
        </Link>
      </div>

      {/* Profile header card */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
              {getInitials(teacher.name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{teacher.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{teacher.email}</p>
              <div className="mt-2 flex items-center gap-3">
                <Badge
                  className={cn(
                    'text-xs px-2.5 py-0.5',
                    teacher.isActive
                      ? 'bg-green-100 text-green-700 hover:bg-green-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-100',
                  )}
                >
                  {teacher.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {teacher.classes.length} class{teacher.classes.length !== 1 ? 'es' : ''},&nbsp;
                  {teacher.subjects.length} subject{teacher.subjects.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Classes */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <School className="h-4 w-4 text-primary" />
              Class Teacher For
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teacher.classes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Not assigned as class teacher to any class yet.
              </p>
            ) : (
              <ul className="divide-y">
                {teacher.classes.map((cls) => (
                  <li key={cls.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">
                          {cls.name} – {cls.section}
                        </p>
                        <p className="text-xs text-muted-foreground">{cls.academicYear.name}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {cls._count.students} students
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Subjects Taught
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teacher.subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Not assigned to any subjects yet.
              </p>
            ) : (
              <ul className="divide-y">
                {teacher.subjects.map((subj) => (
                  <li key={subj.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-medium text-slate-800">{subj.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {subj.class.name} – {subj.class.section}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

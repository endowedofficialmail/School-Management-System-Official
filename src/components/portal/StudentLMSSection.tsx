'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, isToday } from 'date-fns'
import { BookOpen, Bell, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTimeAgo } from '@/lib/lms-utils'
import { markHomeworkDone, unmarkHomeworkDone } from '@/lib/actions/lms'

type Course = {
  id: number
  title: string
  subject: { name: string }
  teacher: { name: string }
  progress?: { completedLessons: number; totalLessons: number; completionPercentage: number }
}

type Announcement = {
  id: number
  title: string
  isImportant: boolean
  createdAt: Date
  postedBy: { name: string }
  readReceipts: Array<{ id: number }>
}

type Homework = {
  id: number
  title: string
  course: { title: string }
  dueDate: Date
  isOverdue: boolean
  isDone: boolean
}

export default function StudentLMSSection({
  courses,
  announcements,
  homework,
  studentId,
  userId,
}: {
  courses: Course[]
  announcements: Announcement[]
  homework: Homework[]
  studentId: number
  userId: number
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">My Learning</h2>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> My Courses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses available yet</p>
          ) : (
            courses.map((c) => (
              <div key={c.id} className="rounded-xl border p-3 space-y-2">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.subject.name} · {c.teacher.name}</p>
                </div>
                {c.progress && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{c.progress.completedLessons} of {c.progress.totalLessons} lessons</span>
                      <span>{c.progress.completionPercentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${c.progress.completionPercentage}%` }} />
                    </div>
                  </div>
                )}
                <Link href={`/portal/student/lms/courses/${c.id}`} className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}>
                  Continue Learning
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Recent Announcements
          </CardTitle>
          <Link href="/portal/student/lms/announcements" className="text-xs text-primary">View All</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements</p>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className={`rounded-lg border-l-4 p-2 ${a.readReceipts.length === 0 ? 'border-l-blue-500 bg-blue-50/50' : 'border-l-transparent'}`}>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{a.title}</p>
                  {a.isImportant && <Badge className="bg-orange-100 text-orange-700 text-xs">Important</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{a.postedBy.name} · {formatTimeAgo(new Date(a.createdAt))}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Today&apos;s Homework</CardTitle>
          <Link href="/portal/student/lms/homework" className="text-xs text-primary">View All Homework</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {homework.length === 0 ? (
            <p className="text-sm text-muted-foreground">No homework due today</p>
          ) : (
            homework.map((hw) => (
              <HomeworkToggle key={hw.id} hw={hw} studentId={studentId} userId={userId} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function HomeworkToggle({
  hw,
  userId,
}: {
  hw: Homework
  studentId?: number
  userId: number
}) {
  const [done, setDone] = useState(hw.isDone)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      if (done) {
        await unmarkHomeworkDone(hw.id, userId)
        setDone(false)
      } else {
        await markHomeworkDone(hw.id, userId)
        setDone(true)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const dueColor = hw.isOverdue ? 'text-red-700' : isToday(new Date(hw.dueDate)) ? 'text-orange-700' : 'text-emerald-700'

  return (
    <div className={`rounded-lg border p-3 flex items-center justify-between ${done ? 'bg-emerald-50' : ''}`}>
      <div className={done ? 'line-through' : ''}>
        <p className={`font-medium text-sm ${hw.isOverdue && !done ? 'text-red-700' : ''}`}>{hw.title}</p>
        <p className="text-xs text-muted-foreground">{hw.course.title}</p>
        <p className={`text-xs ${dueColor}`}>Due: {format(new Date(hw.dueDate), 'HH:mm')}</p>
      </div>
      <Button size="sm" variant={done ? 'outline' : 'default'} disabled={loading} onClick={toggle}>
        {done ? <><Check className="h-3 w-3 mr-1" /> Done</> : 'Mark as Done'}
      </Button>
    </div>
  )
}

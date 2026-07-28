'use client'

import Link from 'next/link'
import { BookOpen, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTimeAgo } from '@/lib/lms-utils'

type CourseProgress = {
  id: number
  title: string
  subject: { name: string }
  progress: { completedLessons: number; totalLessons: number; completionPercentage: number }
}

type Announcement = {
  id: number
  title: string
  isImportant: boolean
  createdAt: Date
  postedBy: { name: string }
}

type HomeworkSummary = {
  done: number
  total: number
  items: Array<{ id: number; title: string; isDone: boolean; course: { title: string } }>
}

export default function ParentLMSSection({
  courses,
  announcements,
  homeworkSummary,
  assignmentSummary,
  quizSummary,
  studentName,
}: {
  courses: CourseProgress[]
  announcements: Announcement[]
  homeworkSummary: HomeworkSummary
  assignmentSummary?: {
    pending: number
    submitted: number
    graded: number
    recent: Array<{ id: number; title: string; marks: number; total: number }>
  }
  quizSummary?: {
    attempted: number
    notAttempted: number
    avgScore: number | null
    recent: Array<{ id: number; title: string; percentage: number; isPassed: boolean }>
  }
  studentName: string
}) {
  const hwPct = homeworkSummary.total > 0
    ? Math.round((homeworkSummary.done / homeworkSummary.total) * 100)
    : 0
  const hwTone = hwPct >= 50 ? 'good' : 'bad'

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">My Child&apos;s Learning</h2>
      <p className="text-sm text-muted-foreground">Progress for {studentName}</p>

      {courses.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">No courses available</CardContent></Card>
      ) : (
        courses.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <p className="font-semibold">{c.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{c.subject.name}</p>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${c.progress.completionPercentage}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {c.progress.completedLessons} of {c.progress.totalLessons} lessons completed
              </p>
            </CardContent>
          </Card>
        ))
      )}

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Recent Announcements
          </CardTitle>
          <Link href="/portal/parent/lms/announcements" className="text-xs text-primary">View All</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements</p>
          ) : (
            announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="rounded-lg border p-2">
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

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Assignments</CardTitle>
          <Link href="/portal/parent/lms/assignments" className="text-xs text-primary">View Details</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {assignmentSummary ? (
            <>
              <p className="text-sm text-muted-foreground">
                Pending: {assignmentSummary.pending} · Submitted: {assignmentSummary.submitted} · Graded: {assignmentSummary.graded}
              </p>
              {assignmentSummary.recent.map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span>{a.title}</span>
                  <Badge variant="outline">{a.marks}/{a.total}</Badge>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No assignment data</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Quizzes</CardTitle>
          <Link href="/portal/parent/lms/quizzes" className="text-xs text-primary">View Details</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {quizSummary ? (
            <>
              <p className="text-sm text-muted-foreground">
                Attempted: {quizSummary.attempted} · Not Attempted: {quizSummary.notAttempted}
                {quizSummary.avgScore != null ? ` · Avg: ${quizSummary.avgScore}%` : ''}
              </p>
              {quizSummary.recent.map((q) => (
                <div key={q.id} className="flex justify-between text-sm">
                  <span>{q.title}</span>
                  <Badge className={q.isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                    {q.percentage}%
                  </Badge>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No quiz data</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Homework Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-sm font-semibold ${hwTone === 'good' ? 'text-emerald-700' : 'text-red-700'}`}>
            {studentName.split(' ')[0]} completed {homeworkSummary.done} of {homeworkSummary.total} homework assignments this week
          </p>
          <div className="mt-3 space-y-1">
            {homeworkSummary.items.slice(0, 5).map((hw) => (
              <div key={hw.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{hw.title}</span>
                <Badge className={hw.isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                  {hw.isDone ? 'Done' : 'Not Done'}
                </Badge>
              </div>
            ))}
          </div>
          <Link href="/portal/parent/lms/homework" className="text-xs text-primary mt-3 inline-block">View All Homework</Link>
        </CardContent>
      </Card>
    </div>
  )
}

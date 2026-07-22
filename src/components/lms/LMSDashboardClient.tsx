'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { BookOpen, Bell, ClipboardList, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import BackButton from '@/components/shared/BackButton'

type AdminStats = {
  totalCourses: number
  publishedCourses: number
  totalLessons: number
  activeStudents: number
  recentAnnouncements: Array<{
    id: number
    title: string
    createdAt: Date
    postedBy: { name: string }
  }>
}

type TeacherStats = {
  myCourses: number
  publishedLessons: number
  homeworkDueThisWeek: number
  pendingHomework: number
  courses: Array<{
    id: number
    title: string
    isPublished: boolean
    _count: { lessons: number; homeworks: number }
  }>
}

export default function LMSDashboardClient({
  role,
  stats,
}: {
  role: 'ADMIN' | 'TEACHER'
  stats: AdminStats | TeacherStats
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">LMS Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {role === 'ADMIN' ? 'Overview of all learning activity' : 'Your courses and teaching activity'}
          </p>
        </div>
      </div>

      {role === 'ADMIN' ? (
        <AdminDashboard stats={stats as AdminStats} />
      ) : (
        <TeacherDashboard stats={stats as TeacherStats} />
      )}
    </div>
  )
}

function AdminDashboard({ stats }: { stats: AdminStats }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Courses" value={stats.totalCourses} />
        <StatCard label="Published Courses" value={stats.publishedCourses} />
        <StatCard label="Total Lessons" value={stats.totalLessons} />
        <StatCard label="Active Students" value={stats.activeStudents} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <QuickAction href="/lms/courses/new" icon={Plus} label="Create Course" />
        <QuickAction href="/lms/announcements" icon={Bell} label="Post Announcement" />
        <QuickAction href="/lms/homework" icon={ClipboardList} label="View All Homework" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.recentAnnouncements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements yet</p>
          ) : (
            stats.recentAnnouncements.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground">by {a.postedBy.name}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(a.createdAt), 'dd MMM yyyy')}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  )
}

function TeacherDashboard({ stats }: { stats: TeacherStats }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="My Courses" value={stats.myCourses} />
        <StatCard label="Published Lessons" value={stats.publishedLessons} />
        <StatCard label="Homework Due This Week" value={stats.homeworkDueThisWeek} />
        <StatCard label="Pending Homework" value={stats.pendingHomework} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <QuickAction href="/lms/courses/new" icon={Plus} label="Create Course" />
        <QuickAction href="/lms/homework" icon={ClipboardList} label="Post Homework" />
        <QuickAction href="/lms/announcements" icon={Bell} label="Post Announcement" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Courses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses yet. Create your first course!</p>
          ) : (
            stats.courses.map((c) => (
              <Link
                key={c.id}
                href={`/lms/courses/${c.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c._count.lessons} lessons · {c._count.homeworks} homework
                    </p>
                  </div>
                </div>
                <Badge variant={c.isPublished ? 'default' : 'secondary'}>
                  {c.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  return (
    <Link href={href}>
      <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium text-sm">{label}</span>
        </CardContent>
      </Card>
    </Link>
  )
}

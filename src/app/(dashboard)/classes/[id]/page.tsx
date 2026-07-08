import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  BookOpen,
  UserCircle,
  BookMarked,
  Plus,
  Settings,
  CalendarDays,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { authOptions } from '@/lib/auth'
import { getClassById, getClassStats } from '@/lib/actions/settings'
import { cn } from '@/lib/utils'
import ClassStudentsTable from './ClassStudentsTable'
import Breadcrumb from '@/components/shared/Breadcrumb'

export const dynamic = 'force-dynamic'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface Props {
  params: { id: string }
}

export default async function ClassDetailPage({ params }: Props) {
  const id = Number(params.id)
  if (isNaN(id)) notFound()

  const [session, cls, stats] = await Promise.all([
    getServerSession(authOptions),
    getClassById(id),
    getClassStats(id),
  ])

  if (!cls) notFound()

  const role = session?.user?.role
  const isAdmin = role === 'ADMIN'
  const canModify = isAdmin || role === 'RECEPTIONIST'

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Classes', href: '/classes' },
        { label: `${cls.name} – ${cls.section}` },
      ]} />
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/classes"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-0.5 gap-1.5 shrink-0')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {cls.name}
              <span className="text-primary"> &ndash; {cls.section}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-xs">
                {cls.academicYear.name}
              </Badge>
              <span className="text-xs text-muted-foreground">Section {cls.section}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Students</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Active</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.activeStudents}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-blue-400">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Gender (Active)</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              <span className="text-blue-600">{stats.maleCount}M</span>
              <span className="text-slate-300 mx-1">/</span>
              <span className="text-pink-600">{stats.femaleCount}F</span>
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Subjects</p>
            <p className="mt-1 text-2xl font-bold text-violet-700">{stats.totalSubjects}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Class Information ─────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-4 w-4 text-primary" />
            Class Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {/* Class Teacher */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Class Teacher
            </p>
            {cls.classTeacher ? (
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {getInitials(cls.classTeacher.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{cls.classTeacher.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{cls.classTeacher.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not Assigned</p>
            )}
          </div>

          {/* Academic Year */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Academic Year
            </p>
            <p className="font-medium text-slate-800">{cls.academicYear.name}</p>
          </div>

          {/* Section */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Section
            </p>
            <p className="font-medium text-slate-800">{cls.section}</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Subjects & Teachers ───────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Subjects &amp; Teachers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cls.subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center gap-3">
              <BookMarked className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-slate-700">No subjects added yet</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add subjects for this class from the Subjects page.
                </p>
              </div>
              {isAdmin && (
                <Link
                  href="/teachers/subjects"
                  className={cn(buttonVariants({ size: 'sm' }), 'mt-1')}
                >
                  Add Subjects
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Teacher</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Teacher Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cls.subjects.map((subj, idx) => (
                    <tr
                      key={subj.id}
                      className={cn(
                        'hover:bg-muted/30 transition-colors',
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{subj.name}</td>
                      <td className="px-4 py-3">
                        {subj.teacher ? (
                          <span className="text-slate-700">{subj.teacher.name}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Not Assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {subj.teacher ? (
                          <span className="text-slate-500 text-xs">{subj.teacher.email}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Students List ─────────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Students
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {cls.students.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClassStudentsTable
            students={cls.students}
            classId={id}
            canModify={canModify}
          />
        </CardContent>
      </Card>

      {/* ── Quick Actions (Admin only) ────────────────────────────────────── */}
      {isAdmin && (
        <Card className="shadow-sm bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/teachers/subjects"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Subject
              </Link>
              <Link
                href={`/students/new?classId=${id}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Student to Class
              </Link>
              <Link
                href="/settings/classes"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
              >
                <Settings className="h-3.5 w-3.5" />
                Edit Class
              </Link>
              <Link
                href={`/exams?classId=${id}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                View Datesheets
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

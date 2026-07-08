import Link from 'next/link'
import { GraduationCap, BookOpen, CalendarRange, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import BackButton from '@/components/shared/BackButton'

export default function TeachersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teachers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage staff and subjects</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Subjects */}
        <Link href="/teachers/subjects" className="group">
          <Card className="h-full border shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-violet-100">
                <BookOpen className="h-6 w-6 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
                  Subjects
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manage subjects and assign teachers per class
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>

        {/* Teacher Profiles */}
        <Link href="/teachers/profiles" className="group">
          <Card className="h-full border shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-cyan-100">
                <GraduationCap className="h-6 w-6 text-cyan-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
                  Teacher Profiles
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  View teacher details, class and subject assignments
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>

        {/* Timetables */}
        <Link href="/teachers/timetable" className="group">
          <Card className="h-full border shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-emerald-100">
                <CalendarRange className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
                  Timetables
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Create and manage teacher timetables
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

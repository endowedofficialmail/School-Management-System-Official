'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarRange, Printer, Settings, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getAllTimetables, type TeacherWithEntryCount } from '@/lib/actions/timetable'

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export default function TimetableOverviewPage() {
  const [teachers, setTeachers] = useState<TeacherWithEntryCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllTimetables().then((data) => {
      setTeachers(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/teachers"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teacher Timetables</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? '…' : `${teachers.length} teacher${teachers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 gap-3">
          <CalendarRange className="h-10 w-10 text-slate-300" />
          <p className="font-semibold text-slate-700">No teachers found</p>
          <p className="text-sm text-muted-foreground">
            Add teachers from{' '}
            <Link href="/settings/users" className="text-primary hover:underline">
              Settings &rsaquo; User Management
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => {
            const count = teacher._count.timetableEntries
            return (
              <Card key={teacher.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-4">
                  {/* Profile row */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {getInitials(teacher.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{teacher.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center justify-between">
                    <Badge
                      className={cn(
                        'text-xs',
                        count > 0
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-100',
                      )}
                    >
                      {count > 0 ? `${count} period${count !== 1 ? 's' : ''} scheduled` : 'No timetable yet'}
                    </Badge>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Link
                      href={`/teachers/timetable/${teacher.id}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1 gap-1.5 text-xs justify-center')}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      View / Edit
                    </Link>
                    <Link
                      href={`/print/timetable/${teacher.id}`}
                      target="_blank"
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5 text-xs')}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

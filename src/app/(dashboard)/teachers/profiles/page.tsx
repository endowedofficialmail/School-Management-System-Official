'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Users, Settings, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTeachersWithStats, type TeacherWithStats } from '@/lib/actions/teachers'
import BackButton from '@/components/shared/BackButton'
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

export default function TeacherProfilesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [teachers, setTeachers] = useState<TeacherWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTeachersWithStats().then((data) => {
      setTeachers(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Teacher Profiles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              View teacher assignments and subject details
            </p>
          </div>
        </div>
        {isAdmin && (
          <Link
            href="/settings/users"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
          >
            <Settings className="h-4 w-4" />
            Manage Users
          </Link>
        )}
      </div>

      {isAdmin && (
        <p className="text-sm text-muted-foreground rounded-lg border bg-muted/40 px-4 py-2.5">
          To add a new teacher account, go to{' '}
          <Link href="/settings/users" className="font-medium text-primary hover:underline">
            Settings &rsaquo; User Management
          </Link>
          .
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">No teachers yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add teacher accounts from Settings &rsaquo; User Management.
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/settings/users"
              className={cn(buttonVariants({ size: 'sm' }), 'mt-1')}
            >
              Add Teacher Account
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <Card key={teacher.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {/* Avatar + name */}
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(teacher.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{teacher.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                    <div className="mt-1.5">
                      <Badge
                        className={cn(
                          'text-xs px-2 py-0.5',
                          teacher.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-100',
                        )}
                      >
                        {teacher.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                  <span>
                    <span className="font-semibold text-slate-800">{teacher._count.classes}</span>{' '}
                    Class{teacher._count.classes !== 1 ? 'es' : ''}
                  </span>
                  <span>
                    <span className="font-semibold text-slate-800">{teacher._count.subjects}</span>{' '}
                    Subject{teacher._count.subjects !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* View details */}
                <div className="mt-4 pt-4 border-t">
                  <Link
                    href={`/teachers/profiles/${teacher.id}`}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'w-full justify-center gap-1.5',
                    )}
                  >
                    View Details
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

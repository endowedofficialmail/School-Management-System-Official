import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { School, Users, UserCircle, Settings, ArrowUpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getAllClasses } from '@/lib/actions/settings'
import BackButton from '@/components/shared/BackButton'
import { authOptions } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function ClassesPage() {
  const [session, classes] = await Promise.all([getServerSession(authOptions), getAllClasses()])
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {classes.length} class{classes.length !== 1 ? 'es' : ''} across all academic years
            </p>
          </div>
        </div>
        {isAdmin && (
          <Link
            href="/settings/classes"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
          >
            <Settings className="h-4 w-4" />
            Manage Classes
          </Link>
        )}
      </div>

      {/* Empty state */}
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <School className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">No classes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first class from the Classes settings page.
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/settings/classes"
              className={cn(buttonVariants({ size: 'sm' }), 'mt-1')}
            >
              Add Your First Class
            </Link>
          )}
        </div>
      ) : (
        /* Class card grid */
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id} className="shadow-sm hover:shadow-md transition-all duration-200 group">
              <CardContent className="p-0">
                {/* Clickable main area → class detail */}
                <Link href={`/classes/${cls.id}`} className="block p-5 pb-4">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {cls.name}
                      <span className="text-primary"> &ndash; {cls.section}</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{cls.academicYear.name}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-slate-700">
                        {cls._count.students} student{cls._count.students !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {cls.classTeacher ? (
                        <span className="text-slate-700">{cls.classTeacher.name}</span>
                      ) : (
                        <span className="text-muted-foreground italic">No class teacher</span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Manage button — separate link, NOT inside the card link */}
                {isAdmin && (
                  <div className="px-5 pb-4 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/classes/promote/${cls.id}`}
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'w-full justify-center gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50',
                        )}
                      >
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                        Promote
                      </Link>
                      <Link
                        href="/settings/classes"
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'w-full justify-center gap-1.5',
                        )}
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Manage
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

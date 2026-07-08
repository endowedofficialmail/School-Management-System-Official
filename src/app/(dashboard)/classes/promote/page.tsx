import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { ArrowLeft, ArrowUpCircle, Info, Users } from 'lucide-react'

import { authOptions } from '@/lib/auth'
import AccessDenied from '@/components/shared/AccessDenied'
import Breadcrumb from '@/components/shared/Breadcrumb'
import BackButton from '@/components/shared/BackButton'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getClassesForPromotion } from '@/lib/actions/promotions'

export const dynamic = 'force-dynamic'

export default async function ClassPromotionLandingPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (!session || !role) notFound()
  if (role !== 'ADMIN') return <AccessDenied />

  const classes = await getClassesForPromotion()

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Classes', href: '/classes' },
        { label: 'Promote' },
      ]} />

      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Class Promotion</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Promote students from one class to the next with full audit history
          </p>
        </div>
        <Link
          href="/classes"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'ml-auto gap-1.5')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classes
        </Link>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-blue-700" />
          <div className="text-sm">
            <p className="font-semibold">Class Promotion</p>
            <p className="text-blue-800 mt-0.5">
              Promote students from one class to the next. By default all students are selected for promotion.
              Uncheck any student you want to hold back. This action creates a permanent promotion record.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <Card key={cls.id} className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-5">
              <div className="mb-3">
                <h2 className="text-lg font-bold text-slate-900">
                  {cls.name}
                  <span className="text-primary"> &ndash; {cls.section}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{cls.academicYear.name}</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-700 mb-4">
                <Users className="h-4 w-4 text-muted-foreground" />
                {cls._count.students} active student{cls._count.students !== 1 ? 's' : ''}
              </div>

              <Link
                href={`/classes/promote/${cls.id}`}
                className={cn(buttonVariants({ size: 'sm' }), 'w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center justify-center')}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Promote Class
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


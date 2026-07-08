import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Wallet, AlertCircle, CalendarCheck, UserPlus, BarChart3 } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { getFeeDashboardStats } from '@/lib/actions/fees'
import { getTodayAttendanceStats } from '@/lib/actions/attendance'
import { getStudents } from '@/lib/actions/students'
import { buttonVariants } from '@/components/ui/button'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userName = session?.user?.name ?? 'User'

  const [totalStudents, feeStats, attStats, recentStudents] = await Promise.all([
    prisma.student.count({ where: { status: 'ACTIVE' } }),
    getFeeDashboardStats(),
    getTodayAttendanceStats(),
    getStudents({ limit: 5 }),
  ])

  const attendanceValue = attStats.total === 0
    ? 'No students'
    : attStats.marked === 0
      ? 'Not marked yet'
      : `${attStats.percentage}%`

  const attendanceDesc = attStats.total > 0 && attStats.marked > 0
    ? `${attStats.marked} of ${attStats.total} students marked`
    : 'Present today'

  const stats = [
    {
      title: 'Total Students',
      value: String(totalStudents),
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      description: 'Active enrollments',
      href: '/students',
    },
    {
      title: 'Fee Collected This Month',
      value: formatCurrency(feeStats.totalCollectedThisMonth),
      icon: Wallet,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      description: 'Total received',
      href: '/fees/vouchers',
    },
    {
      title: 'Pending Dues',
      value: formatCurrency(feeStats.totalPendingDues),
      icon: AlertCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      description: 'Outstanding fees',
      href: '/fees/outstanding',
    },
    {
      title: "Today's Attendance",
      value: attendanceValue,
      icon: CalendarCheck,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      description: attendanceDesc,
      href: '/attendance/mark',
    },
  ]

  const quickActions = [
    { label: "Mark Today's Attendance", href: '/attendance/mark', icon: CalendarCheck },
    { label: 'Generate Fee Vouchers', href: '/fees/vouchers', icon: Wallet },
    { label: 'Add New Student', href: '/students/new', icon: UserPlus },
    { label: 'View Reports', href: '/reports', icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, <span className="font-medium text-slate-700">{userName}</span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href} className="group block">
              <Card className="border shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 leading-tight">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-full shrink-0',
                      stat.iconBg
                    )}
                  >
                    <Icon className={cn('h-6 w-6', stat.iconColor)} />
                  </div>
                </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(buttonVariants({ variant: 'outline' }), 'h-14 justify-start gap-3 text-left')}
                >
                  <Icon className="h-5 w-5" />
                  {action.label}
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Students */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Students</CardTitle>
        </CardHeader>
        <CardContent>
          {recentStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No students enrolled yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-3 py-2 text-left font-semibold">Name</th>
                    <th className="px-3 py-2 text-left font-semibold">Class</th>
                    <th className="px-3 py-2 text-left font-semibold">Admission Date</th>
                    <th className="px-3 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-3 py-2 font-medium">{student.firstName} {student.lastName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{student.class.name} – {student.class.section}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(student.admissionDate)}</td>
                      <td className="px-3 py-2 text-right">
                        <Link href={`/students/${student.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8')}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

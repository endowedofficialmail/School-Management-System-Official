import Link from 'next/link'
import { AlertCircle, CalendarCheck, TrendingUp, Users, FileText, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import BackButton from '@/components/shared/BackButton'

const reports = [
  {
    title: 'Outstanding Dues',
    description: 'Students with pending fee payments',
    href: '/fees/outstanding',
    icon: AlertCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    title: 'Attendance Report',
    description: 'Monthly attendance by class',
    href: '/attendance/report',
    icon: CalendarCheck,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Fee Collection Report',
    description: 'Monthly fee collection summary',
    href: '/reports/fee-collection',
    icon: TrendingUp,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    title: 'Class-wise Strength',
    description: 'Student count per class with gender breakdown',
    href: '/reports/class-strength',
    icon: Users,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    title: 'Exam Results Summary',
    description: 'Class performance and ranking by exam',
    href: '/reports/exam-summary',
    icon: FileText,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analyse attendance, fees, results, and more
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Link key={report.href} href={report.href} className="group">
              <Card className="h-full border shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <CardContent className="p-6 flex items-start gap-4">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${report.iconBg}`}
                  >
                    <Icon className={`h-6 w-6 ${report.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
                      {report.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{report.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

import Link from 'next/link'
import { Building2, Users, CalendarRange, School, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import BackButton from '@/components/shared/BackButton'

const sections = [
  {
    title: 'School Profile',
    description: 'Update school name, address, and contact info',
    href: '/settings/school',
    icon: Building2,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    title: 'User Management',
    description: 'Add and manage admin, teacher, and reception accounts',
    href: '/settings/users',
    icon: Users,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    title: 'Academic Years',
    description: 'Create academic years and set the active one',
    href: '/settings/academic-years',
    icon: CalendarRange,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Classes',
    description: 'Manage class names, sections, and assigned teachers',
    href: '/settings/classes',
    icon: School,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your school management system
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {sections.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full border shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${s.iconBg}`}>
                    <Icon className={`h-6 w-6 ${s.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
                      {s.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>
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

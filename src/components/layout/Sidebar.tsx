'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  School,
  Wallet,
  CalendarCheck,
  FileText,
  GraduationCap,
  BarChart3,
  Settings,
  Award,
  BadgeCheck,
} from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { UserRole } from '@/types'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles: UserRole[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'TEACHER', 'RECEPTIONIST'],
  },
  {
    title: 'Students',
    href: '/students',
    icon: Users,
    roles: ['ADMIN', 'RECEPTIONIST', 'TEACHER'],
  },
  {
    title: 'Classes',
    href: '/classes',
    icon: School,
    roles: ['ADMIN'],
  },
  {
    title: 'Fees',
    href: '/fees',
    icon: Wallet,
    roles: ['ADMIN', 'RECEPTIONIST'],
  },
  {
    title: 'Attendance',
    href: '/attendance',
    icon: CalendarCheck,
    roles: ['ADMIN', 'TEACHER'],
  },
  {
    title: 'Exams',
    href: '/exams',
    icon: FileText,
    roles: ['ADMIN', 'TEACHER'],
  },
  {
    title: 'Results',
    href: '/results',
    icon: Award,
    roles: ['ADMIN', 'TEACHER'],
  },
  {
    title: 'Certificates',
    href: '/certificates',
    icon: BadgeCheck,
    roles: ['ADMIN', 'RECEPTIONIST'],
  },
  {
    title: 'Teachers',
    href: '/teachers',
    icon: GraduationCap,
    roles: ['ADMIN'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['ADMIN'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['ADMIN'],
  },
]

interface SidebarProps {
  role: UserRole
  isOpen: boolean
  onClose: () => void
  schoolName: string
  schoolLogoUrl?: string | null
}

function NavLinks({
  role,
  onLinkClick,
}: {
  role: UserRole
  onLinkClick?: () => void
}) {
  const pathname = usePathname()
  const filtered = navItems.filter((item) => item.roles.includes(role))

  return (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      {filtered.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarInner({
  role,
  schoolName,
  schoolLogoUrl,
  onLinkClick,
}: {
  role: UserRole
  schoolName: string
  schoolLogoUrl?: string | null
  onLinkClick?: () => void
}) {
  // Truncate long school names for the sidebar header
  const displayName = schoolName.length > 22 ? schoolName.slice(0, 20) + '…' : schoolName
  const initials = schoolName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-5">
        {schoolLogoUrl ? (
          <Image
            src={schoolLogoUrl}
            alt={`${schoolName} logo`}
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain shrink-0 border border-slate-200 bg-white"
          />
        ) : (
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
            <span className="text-[11px] font-bold text-primary-foreground">{initials || 'SM'}</span>
          </div>
        )}
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-sm font-bold text-slate-900 truncate" title={schoolName}>
            {displayName}
          </span>
          <span className="text-xs text-slate-500">Management System</span>
        </div>
      </div>
      <NavLinks role={role} onLinkClick={onLinkClick} />
      <div className="border-t px-5 py-3 text-[11px] text-slate-400">
        v1.0.0
      </div>
    </div>
  )
}

export default function Sidebar({ role, isOpen, onClose, schoolName, schoolLogoUrl }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-white h-screen sticky top-0 overflow-y-auto">
        <SidebarInner role={role} schoolName={schoolName} schoolLogoUrl={schoolLogoUrl} />
      </aside>

      {/* Mobile sidebar — rendered as Sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarInner role={role} schoolName={schoolName} schoolLogoUrl={schoolLogoUrl} onLinkClick={onClose} />
        </SheetContent>
      </Sheet>
    </>
  )
}

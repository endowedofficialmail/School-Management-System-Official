'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Bell, ClipboardList, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

const studentLinks = [
  { href: '/portal/student/lms/courses', label: 'My Courses', icon: BookOpen },
  { href: '/portal/student/lms/announcements', label: 'Announcements', icon: Bell },
  { href: '/portal/student/lms/homework', label: 'Homework', icon: ClipboardList },
]

const parentLinks = [
  { href: '/portal/parent/lms', label: "My Child's Learning", icon: GraduationCap },
  { href: '/portal/parent/lms/announcements', label: 'Announcements', icon: Bell },
  { href: '/portal/parent/lms/homework', label: 'Homework', icon: ClipboardList },
]

export default function PortalNav({
  role,
  lmsEnabled,
}: {
  role: 'STUDENT' | 'PARENT'
  lmsEnabled: boolean
}) {
  const pathname = usePathname()
  if (!lmsEnabled) return null
  if (pathname.startsWith('/portal/change-password')) return null

  const links = role === 'STUDENT' ? studentLinks : parentLinks

  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-white p-1 shadow-sm">
      {links.map((link) => {
        const Icon = link.icon
        const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

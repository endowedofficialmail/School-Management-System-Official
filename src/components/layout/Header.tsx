'use client'

import { Menu, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  userName: string
  userRole: string
  onMenuClick: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const roleBadgeVariant: Record<string, string> = {
  ADMIN: 'bg-violet-100 text-violet-700',
  TEACHER: 'bg-blue-100 text-blue-700',
  RECEPTIONIST: 'bg-emerald-100 text-emerald-700',
}

export default function Header({ userName, userRole, onMenuClick }: HeaderProps) {
  const initials = getInitials(userName || 'User')
  const roleColor = roleBadgeVariant[userRole] ?? 'bg-slate-100 text-slate-700'

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center border-b bg-white shadow-sm px-4 md:px-6">
      {/* Hamburger — mobile only */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden mr-2 text-slate-600"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2.5 h-auto py-1.5 px-2 rounded-lg hover:bg-slate-100 outline-none cursor-pointer"
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium text-slate-900 leading-none">
              {userName}
            </span>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-full leading-none ${roleColor}`}
            >
              {userRole}
            </span>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-slate-900">{userName}</p>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full w-fit ${roleColor}`}>
                  {userRole}
                </span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer gap-2"
            onClick={async () => {
              try {
                await Promise.race([
                  signOut({ redirect: false }),
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), 3000)
                  ),
                ])
              } catch {
                // timeout or error — still redirect
              } finally {
                window.location.href = '/login'
              }
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

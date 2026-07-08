'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Eye, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

type Student = {
  id: number
  registrationNumber: string
  firstName: string
  lastName: string
  gender: string
  status: string
  guardianName: string
  guardianPhone: string
}

interface Props {
  students: Student[]
  classId: number
  canModify: boolean
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  LEFT: 'bg-slate-100 text-slate-500 hover:bg-slate-100',
  GRADUATED: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
}

export default function ClassStudentsTable({ students, classId, canModify }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.registrationNumber.toLowerCase().includes(q),
    )
  }, [students, search])

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name or reg#…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Empty state */}
      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center gap-3">
          <UserPlus className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-slate-700">No students enrolled yet</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add students to this class from the Students section.
            </p>
          </div>
          {canModify && (
            <Link
              href={`/students/new?classId=${classId}`}
              className={cn(buttonVariants({ size: 'sm' }), 'mt-1')}
            >
              Add First Student
            </Link>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No students match &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="rounded-lg border overflow-x-auto shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Reg#</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Full Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Gender</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Guardian</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Guardian Phone</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((student, idx) => (
                <tr
                  key={student.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors',
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                  )}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {student.registrationNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">
                    {student.gender.charAt(0) + student.gender.slice(1).toLowerCase()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        'text-xs px-2 py-0.5',
                        STATUS_BADGE[student.status] ?? '',
                      )}
                    >
                      {student.status.charAt(0) + student.status.slice(1).toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{student.guardianName}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                    {student.guardianPhone}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/students/${student.id}`}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'gap-1.5 h-7 text-xs',
                      )}
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {search && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {filtered.length} of {students.length} student{students.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

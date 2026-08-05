'use client'

import Link from 'next/link'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

type FamilyStudent = {
  id: number
  firstName: string
  lastName: string
  registrationNumber: string
  photoBase64?: string | null
  status: string
  class: { name: string; section: string }
}

export default function FamilyStudentGrid({ students }: { students: FamilyStudent[] }) {
  if (students.length === 0) {
    return <p className="text-sm text-muted-foreground">No students in this family.</p>
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium w-20">Photo</th>
            <th className="text-left p-3 font-medium">Name</th>
            <th className="text-left p-3 font-medium">Class</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-right p-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const statusCls =
              s.status === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-700'
                : s.status === 'GRADUATED'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
            return (
              <tr key={s.id} className="border-t">
                <td className="p-3">
                  {s.photoBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.photoBase64}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <div className="font-medium">{s.firstName} {s.lastName}</div>
                  <div className="text-xs font-mono text-muted-foreground">{s.registrationNumber}</div>
                </td>
                <td className="p-3">{s.class.name} – {s.class.section}</td>
                <td className="p-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusCls)}>
                    {s.status === 'ACTIVE' ? 'Active' : s.status === 'GRADUATED' ? 'Graduated' : 'Left'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Link href={`/students/${s.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    View Profile
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

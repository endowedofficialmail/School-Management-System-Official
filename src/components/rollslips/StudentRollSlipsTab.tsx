'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { IdCard, Printer } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { getRollSlipsByStudent, type StudentRollSlipRow } from '@/lib/actions/rollslips'

export default function StudentRollSlipsTab({ studentId }: { studentId: number }) {
  const [slips, setSlips] = useState<StudentRollSlipRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRollSlipsByStudent(studentId).then((data) => {
      setSlips(data)
      setLoading(false)
    })
  }, [studentId])

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading roll slips...</p>
  }

  if (slips.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <IdCard className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">No roll number slips issued yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Roll #</TableHead>
            <TableHead>Exam Name</TableHead>
            <TableHead>Issued Date</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {slips.map((slip) => (
            <TableRow key={slip.id}>
              <TableCell className="font-mono font-bold text-sm">{slip.rollNumber}</TableCell>
              <TableCell className="font-medium">{slip.exam.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(slip.issuedAt), 'dd MMM yyyy')}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{slip.venue || '—'}</TableCell>
              <TableCell>
                <Badge className={cn(
                  'text-xs',
                  slip.isValid
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-red-100 text-red-700 hover:bg-red-100',
                )}>
                  {slip.isValid ? 'Valid' : 'Invalidated'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/print/rollslip/${slip.id}`}
                  target="_blank"
                  className={buttonVariants({ size: 'sm', variant: 'outline' })}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Print Slip
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Printer } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getOutstandingDues, type OutstandingStudent } from '@/lib/actions/fees'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import BackButton from '@/components/shared/BackButton'

function fmt(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`
}

export default function OutstandingPage() {
  const [data, setData] = useState<OutstandingStudent[]>([])
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [classFilter, setClassFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getOutstandingDues({
        classId: classFilter !== 'ALL' ? Number(classFilter) : undefined,
      })
      setData(result)
    } finally {
      setLoading(false)
    }
  }, [classFilter])

  useEffect(() => {
    getClasses().then(setClasses)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const grandTotal = data.reduce((sum, d) => sum + d.totalOutstanding, 0)

  return (
    <>
      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">My School</h1>
        <p className="text-sm">
          Outstanding Dues Report — {format(new Date(), 'dd MMMM yyyy')}
        </p>
        <hr className="my-2" />
      </div>

      <div className="space-y-6 print:space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Outstanding Dues</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Students with pending or partial fee payments
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>

        {/* Filter — hidden on print */}
        <div className="flex items-center gap-3 print:hidden">
          <Select value={classFilter} onValueChange={(v) => setClassFilter(v ?? 'ALL')}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} – {c.section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {data.length} student{data.length !== 1 ? 's' : ''} with outstanding dues
            </span>
          )}
        </div>

        {/* Table */}
        <Card className="overflow-x-auto print:shadow-none print:border">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-8 print:hidden">#</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-center">Pending Invoices</TableHead>
                <TableHead className="text-right">Total Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                        <AlertCircle className="h-7 w-7 text-emerald-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">No outstanding dues</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        All invoices are paid or no invoices exist yet
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((entry, idx) => (
                  <TableRow key={entry.student.id}>
                    <TableCell className="text-muted-foreground text-sm print:hidden">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.student.firstName} {entry.student.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.student.class.name} – {entry.student.class.section}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                        {entry.pendingCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-semibold text-red-600">
                        {fmt(entry.totalOutstanding)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Grand Total */}
        {!loading && data.length > 0 && (
          <div className="flex justify-end">
            <div className="rounded-xl border bg-red-50 px-6 py-4 text-right">
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600 mt-0.5">{fmt(grandTotal)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                across {data.length} student{data.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          main * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </>
  )
}

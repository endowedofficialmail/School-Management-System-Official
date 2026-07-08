'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Printer } from 'lucide-react'

import Breadcrumb from '@/components/shared/Breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import { getPromotionFilters, getPromotionHistory } from '@/lib/actions/promotions'

export default function PromotionHistoryClient() {
  const sp = useSearchParams()
  const initialClassId = sp.get('classId') ?? ''

  const [filters, setFilters] = useState({
    classId: initialClassId,
    academicYearId: '',
    fromDate: '',
    toDate: '',
    status: 'ALL' as 'ALL' | 'PROMOTED' | 'HELD_BACK',
  })

  const [options, setOptions] = useState<Awaited<ReturnType<typeof getPromotionFilters>>>({ classes: [], years: [] })
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getPromotionHistory>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPromotionFilters().then(setOptions)
  }, [])

  useEffect(() => {
    setLoading(true)
    getPromotionHistory({
      classId: filters.classId ? Number(filters.classId) : undefined,
      academicYearId: filters.academicYearId ? Number(filters.academicYearId) : undefined,
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
      status: filters.status,
    }).then((r) => {
      setRows(r)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [filters])

  const summary = useMemo(() => {
    const promoted = rows.filter((r) => r.wasPromoted).length
    const heldBack = rows.filter((r) => !r.wasPromoted).length
    return { promoted, heldBack, total: rows.length }
  }, [rows])

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Classes', href: '/classes' },
        { label: 'Promote', href: '/classes/promote' },
        { label: 'History' },
      ]} />

      <div className="flex items-start justify-between gap-3 flex-wrap print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Promotion History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total Promotions: {summary.promoted} | Held Back: {summary.heldBack}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Link href="/classes/promote" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Back
          </Link>
        </div>
      </div>

      <Card className="shadow-sm print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <select
              className="h-9 w-full rounded-md border bg-white px-3 text-sm"
              value={filters.classId}
              onChange={(e) => setFilters((f) => ({ ...f, classId: e.target.value }))}
            >
              <option value="">All</option>
              {options.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} – {c.section} ({c.academicYear.name})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <select
              className="h-9 w-full rounded-md border bg-white px-3 text-sm"
              value={filters.academicYearId}
              onChange={(e) => setFilters((f) => ({ ...f, academicYearId: e.target.value }))}
            >
              <option value="">All</option>
              {options.years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" className="h-9" value={filters.fromDate} onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" className="h-9" value={filters.toDate} onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))} />
          </div>
          <div className="space-y-1.5 md:col-span-4">
            <Label>Status</Label>
            <div className="flex gap-2">
              {(['ALL', 'PROMOTED', 'HELD_BACK'] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={filters.status === s ? 'default' : 'outline'}
                  onClick={() => setFilters((f) => ({ ...f, status: s }))}
                >
                  {s === 'ALL' ? 'All' : s === 'PROMOTED' ? 'Promoted' : 'Held Back'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto print:shadow-none print:border">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-3 py-2 text-left font-semibold">Student</th>
              <th className="px-3 py-2 text-left font-semibold">From Class</th>
              <th className="px-3 py-2 text-left font-semibold">To Class</th>
              <th className="px-3 py-2 text-left font-semibold">Academic Year</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-left font-semibold">Reason</th>
              <th className="px-3 py-2 text-left font-semibold">Promoted By</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No promotion records found.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/40">
                  <td className="px-3 py-2 text-slate-700">
                    {new Date(r.promotedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.student.firstName} {r.student.lastName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.student.registrationNumber}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{r.fromClass.name} – {r.fromClass.section}</td>
                  <td className="px-3 py-2 text-slate-700">{r.toClass.name} – {r.toClass.section}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {r.fromAcademicYear.name} → {r.toAcademicYear.name}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={r.wasPromoted ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {r.wasPromoted ? 'Promoted' : 'Held Back'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {!r.wasPromoted ? (r.notes ?? '—') : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{r.promotedBy.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground print:hidden">
        Print this page for records.
      </p>
    </div>
  )
}


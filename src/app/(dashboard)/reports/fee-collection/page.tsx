'use client'

import { useEffect, useState, useCallback } from 'react'
import { Printer, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import BackButton from '@/components/shared/BackButton'
import { getFeeCollectionReport } from '@/lib/actions/fees'

type ReportData = Awaited<ReturnType<typeof getFeeCollectionReport>>

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export default function FeeCollectionReportPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  const load = useCallback(() => {
    setLoading(true)
    getFeeCollectionReport({ month, year }).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [month, year])

  useEffect(() => { load() }, [load])

  const collectionPct =
    data && data.totalInvoiced > 0
      ? Math.round((data.totalCollected / data.totalInvoiced) * 1000) / 10
      : 0

  return (
    <div className="space-y-6">
      {/* Screen header */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fee Collection Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Monthly fee collection summary</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
      </div>

      {/* Print header */}
      <div className="print-only hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Fee Collection Report</h1>
        <p className="text-muted-foreground">
          {MONTHS[month - 1]} {year} &nbsp;&bull;&nbsp; Generated on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Filters */}
      <div className="no-print flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Month:</span>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v ?? month))}>
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Year:</span>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v ?? year))}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <p className="text-muted-foreground">Failed to load report data.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className="shadow-sm border-l-4 border-l-blue-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">Total Invoiced</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">PKR {fmt(data.totalInvoiced)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{MONTHS[month - 1]} {year}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-green-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
                <p className="mt-1 text-2xl font-bold text-green-700">PKR {fmt(data.totalCollected)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{collectionPct}% collection rate</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-red-500">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
                <p className="mt-1 text-2xl font-bold text-red-700">PKR {fmt(data.totalPending)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.totalInvoiced > 0
                    ? (100 - collectionPct).toFixed(1) + '% outstanding'
                    : 'No invoices'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Class breakdown table */}
          {data.byClass.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center gap-2">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-slate-700">No invoices for {MONTHS[month - 1]} {year}</p>
              <p className="text-sm text-muted-foreground">Fee invoices for this period will appear here.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto shadow-sm">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Class</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Invoiced</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Collected</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Pending</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Collection %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.byClass.map((row) => {
                    const pct = row.invoiced > 0 ? Math.round((row.collected / row.invoiced) * 1000) / 10 : 0
                    return (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {row.name} – {row.section}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(row.invoiced)}</td>
                        <td className="px-4 py-3 text-right text-green-700 font-medium">{fmt(row.collected)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{fmt(row.pending)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 border-t font-semibold">
                    <td className="px-4 py-3 text-slate-800">Total</td>
                    <td className="px-4 py-3 text-right text-slate-800">{fmt(data.totalInvoiced)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(data.totalCollected)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(data.totalPending)}</td>
                    <td className="px-4 py-3 text-right text-slate-800">{collectionPct}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

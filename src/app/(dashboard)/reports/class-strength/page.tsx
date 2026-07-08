'use client'

import { useEffect, useState } from 'react'
import { Printer, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BackButton from '@/components/shared/BackButton'
import { getClassStrengthReport } from '@/lib/actions/students'

type ReportRow = Awaited<ReturnType<typeof getClassStrengthReport>>[number]

export default function ClassStrengthPage() {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClassStrengthReport().then((data) => {
      setRows(data)
      setLoading(false)
    })
  }, [])

  const totals = rows.reduce(
    (acc, r) => ({ total: acc.total + r.total, male: acc.male + r.male, female: acc.female + r.female }),
    { total: 0, male: 0, female: 0 },
  )

  return (
    <div className="space-y-6">
      {/* Screen header */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Class-wise Strength</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Active student count per class with gender breakdown
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Class-wise Strength Report</h1>
        <p className="text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center gap-2">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-slate-700">No classes or students found</p>
          <p className="text-sm text-muted-foreground">
            Add classes and enroll students to see the strength report.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto shadow-sm">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Class</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Section</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 hidden sm:table-cell">
                  Academic Year
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Male</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Female</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.section}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{row.academicYear}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{row.total}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{row.male}</td>
                  <td className="px-4 py-3 text-right text-pink-600">{row.female}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 border-t font-semibold">
                <td className="px-4 py-3 text-slate-800" colSpan={3}>
                  Grand Total
                </td>
                <td className="px-4 py-3 text-right text-slate-900">{totals.total}</td>
                <td className="px-4 py-3 text-right text-blue-600">{totals.male}</td>
                <td className="px-4 py-3 text-right text-pink-600">{totals.female}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, getDaysInMonth } from 'date-fns'
import { Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import { getAttendanceReport, type AttendanceReportResult } from '@/lib/actions/attendance'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import BackButton from '@/components/shared/BackButton'

// ─── Config ───────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1,  label: 'January' },  { value: 2,  label: 'February' },
  { value: 3,  label: 'March' },    { value: 4,  label: 'April' },
  { value: 5,  label: 'May' },      { value: 6,  label: 'June' },
  { value: 7,  label: 'July' },     { value: 8,  label: 'August' },
  { value: 9,  label: 'September'},  { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
]

type StatusKey = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE'

const STATUS_CELL: Record<StatusKey, { cell: string; letter: string }> = {
  PRESENT: { cell: 'bg-emerald-100 text-emerald-700', letter: 'P'  },
  ABSENT:  { cell: 'bg-red-100 text-red-700',         letter: 'A'  },
  LATE:    { cell: 'bg-yellow-100 text-yellow-700',   letter: 'L'  },
  LEAVE:   { cell: 'bg-blue-100 text-blue-700',       letter: 'Lv' },
}

const LEGEND = [
  { letter: 'P',  label: 'Present', cell: 'bg-emerald-100 text-emerald-700' },
  { letter: 'A',  label: 'Absent',  cell: 'bg-red-100 text-red-700' },
  { letter: 'L',  label: 'Late',    cell: 'bg-yellow-100 text-yellow-700' },
  { letter: 'Lv', label: 'Leave',   cell: 'bg-blue-100 text-blue-700' },
  { letter: '—',  label: 'Not marked', cell: 'bg-slate-100 text-slate-400' },
]

function percentBadge(pct: number | null) {
  if (pct === null) return 'text-slate-400'
  if (pct >= 90)  return 'text-emerald-600'
  if (pct >= 75)  return 'text-yellow-600'
  return 'text-red-600'
}

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

// ─── Component ───────────────────────────────────────────────────────────────

export default function AttendanceReportPage() {
  const today = new Date()
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [reportData, setReportData] = useState<AttendanceReportResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { getClasses().then(setClasses) }, [])

  const fetchReport = useCallback(async () => {
    if (!selectedClass) return
    setLoading(true)
    const data = await getAttendanceReport({
      classId: Number(selectedClass),
      month: selectedMonth,
      year: selectedYear,
    })
    setReportData(data)
    setLoading(false)
  }, [selectedClass, selectedMonth, selectedYear])

  useEffect(() => { fetchReport() }, [fetchReport])

  const cls = classes.find((c) => String(c.id) === selectedClass)
  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label ?? ''
  const daysInMonth = reportData?.daysInMonth ?? getDaysInMonth(new Date(selectedYear, selectedMonth - 1))
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <>
      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-center">Attendance Report</h1>
        {cls && (
          <p className="text-center text-sm text-slate-600 mt-1">
            {cls.name} – {cls.section} &nbsp;|&nbsp; {monthLabel} {selectedYear}
          </p>
        )}
        <p className="text-center text-xs text-slate-400 mt-1">
          Generated {format(new Date(), 'dd MMM yyyy, HH:mm')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Report</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Monthly attendance per student per class
              </p>
            </div>
          </div>
          {selectedClass && reportData && (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 print:hidden">
          <div className="space-y-1.5 w-full sm:w-auto sm:min-w-[200px]">
            <Label>Class</Label>
            <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v ?? '')}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select class..." />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} – {c.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Month</Label>
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number(v ?? selectedMonth))}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Year</Label>
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v ?? selectedYear))}
            >
              <SelectTrigger className="h-9 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Empty state */}
        {!selectedClass && (
          <div className="flex flex-col items-center justify-center py-24 text-center print:hidden">
            <p className="text-sm font-medium text-slate-700">Select a class, month, and year to view the report</p>
          </div>
        )}

        {/* Loading */}
        {selectedClass && loading && (
          <div className="flex items-center justify-center py-16 print:hidden">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {/* Table */}
        {selectedClass && !loading && reportData && (
          <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
            <div className="min-w-max">
              <table className="border-collapse text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-50">
                    {/* Sticky name column */}
                    <th className="sticky left-0 z-20 bg-slate-50 text-left px-3 py-2.5 font-semibold text-slate-700 border-b border-r border-slate-200 min-w-[170px] whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                      Student
                    </th>
                    {/* Day columns */}
                    {dayNumbers.map((d) => (
                      <th
                        key={d}
                        className="px-1.5 py-2.5 font-semibold text-slate-600 border-b border-r border-slate-200 w-8 text-center"
                      >
                        {d}
                      </th>
                    ))}
                    {/* Percentage column */}
                    <th className="sticky right-0 z-20 bg-slate-50 px-3 py-2.5 font-semibold text-slate-700 border-b border-l border-slate-200 whitespace-nowrap shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] text-center">
                      Att %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.students.length === 0 ? (
                    <tr>
                      <td
                        colSpan={daysInMonth + 2}
                        className="py-10 text-center text-slate-400 text-sm"
                      >
                        No active students found in this class.
                      </td>
                    </tr>
                  ) : (
                    reportData.students.map(({ student, dayMap, percentage }, idx) => (
                      <tr
                        key={student.id}
                        className={cn('group', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}
                      >
                        {/* Sticky name */}
                        <td
                          className={cn(
                            'sticky left-0 z-10 px-3 py-2 font-medium text-slate-800 border-b border-r border-slate-100 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]',
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                          )}
                        >
                          {student.firstName} {student.lastName}
                        </td>

                        {/* Day cells */}
                        {dayNumbers.map((d) => {
                          const status = dayMap[d] as StatusKey | undefined
                          const cfg = status ? STATUS_CELL[status] : null
                          return (
                            <td
                              key={d}
                              className={cn(
                                'w-8 text-center py-2 border-b border-r border-slate-100',
                                cfg ? cfg.cell : 'bg-transparent text-slate-200'
                              )}
                            >
                              {cfg ? cfg.letter : '—'}
                            </td>
                          )
                        })}

                        {/* Percentage */}
                        <td
                          className={cn(
                            'sticky right-0 z-10 px-3 py-2 text-center font-bold border-b border-l border-slate-100 whitespace-nowrap shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.06)]',
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50',
                            percentBadge(percentage)
                          )}
                        >
                          {percentage !== null ? `${percentage}%` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        {selectedClass && !loading && reportData && (
          <div className="flex flex-wrap items-center gap-3 pt-2 print:mt-4">
            <span className="text-xs text-muted-foreground font-medium">Legend:</span>
            {LEGEND.map((l) => (
              <div key={l.letter} className="flex items-center gap-1.5">
                <span className={cn('inline-flex w-6 h-5 items-center justify-center rounded text-[11px] font-bold', l.cell)}>
                  {l.letter}
                </span>
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

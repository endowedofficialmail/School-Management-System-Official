'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStudentAttendanceSummary, type AttendanceSummary } from '@/lib/actions/portal'
import { cn } from '@/lib/utils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STATUS_CLASS: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ABSENT: 'bg-red-100 text-red-700 border-red-200',
  LATE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LEAVE: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function AttendanceCalendar({
  studentId,
  initialMonth,
  initialYear,
}: {
  studentId: number
  initialMonth?: number
  initialYear?: number
}) {
  const today = new Date()
  const [month, setMonth] = useState(initialMonth ?? today.getMonth() + 1)
  const [year, setYear] = useState(initialYear ?? today.getFullYear())
  const [data, setData] = useState<AttendanceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getStudentAttendanceSummary(studentId, month, year)
      .then(setData)
      .finally(() => setLoading(false))
  }, [studentId, month, year])

  function moveMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1)
    setMonth(next.getMonth() + 1)
    setYear(next.getFullYear())
  }

  const days = Array.from({ length: data?.daysInMonth ?? 31 }, (_, i) => i + 1)
  const firstDay = new Date(year, month - 1, 1).getDay()
  const leading = firstDay === 0 ? 6 : firstDay - 1

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Attendance</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => moveMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[130px] text-center text-sm font-semibold">
              {MONTHS[month - 1]} {year}
            </span>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => moveMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[
            ['Present', data?.counts.PRESENT ?? 0, 'text-emerald-700'],
            ['Absent', data?.counts.ABSENT ?? 0, 'text-red-700'],
            ['Late', data?.counts.LATE ?? 0, 'text-yellow-700'],
            ['Leave', data?.counts.LEAVE ?? 0, 'text-blue-700'],
          ].map(([label, value, cls]) => (
            <div key={label} className="rounded-xl border p-3 text-center">
              <p className={cn('text-xl font-bold', cls as string)}>{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Attendance Percentage</span>
            <span className="font-bold">{loading ? '...' : `${data?.percentage ?? 0}%`}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                (data?.percentage ?? 0) >= 75 ? 'bg-emerald-500' : 'bg-red-500'
              )}
              style={{ width: `${data?.percentage ?? 0}%` }}
            />
          </div>
        </div>

        {!loading && data?.records.length === 0 && (
          <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
            No attendance records for this period
          </p>
        )}

        <div className="grid grid-cols-7 gap-1.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-xs font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
          {Array.from({ length: leading }).map((_, i) => <div key={`blank-${i}`} />)}
          {days.map((day) => {
            const status = data?.dayMap[day]
            return (
              <div
                key={day}
                className={cn(
                  'flex h-9 min-h-9 items-center justify-center rounded-lg border text-sm font-semibold',
                  status ? STATUS_CLASS[status] : 'border-slate-200 bg-slate-50 text-slate-400'
                )}
                title={status ?? 'Not marked'}
              >
                {day}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

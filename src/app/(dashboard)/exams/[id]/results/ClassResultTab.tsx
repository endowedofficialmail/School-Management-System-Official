'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { CheckCircle2, Printer, Trophy, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

import { buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import { getClassResult, type ClassResultData } from '@/lib/actions/exams'
import { GRADE_COLORS } from '@/lib/grade'

type ClassOption = { id: number; name: string; section: string }

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === 1) return <span className="flex items-center gap-1"><Trophy className="h-4 w-4 text-yellow-500" />1</span>
  if (rank === 2) return <span className="flex items-center gap-1"><Trophy className="h-4 w-4 text-slate-400" />2</span>
  if (rank === 3) return <span className="flex items-center gap-1"><Trophy className="h-4 w-4 text-amber-700" />3</span>
  return <span className="text-slate-600">{rank ?? '—'}</span>
}

const RESULT_BADGE: Record<string, string> = {
  Pass: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  Fail: 'bg-red-100 text-red-700 hover:bg-red-100',
  Absent: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  Withheld: 'bg-slate-200 text-slate-600 hover:bg-slate-200',
  Pending: 'bg-slate-100 text-slate-400 hover:bg-slate-100',
}

export default function ClassResultTab({
  examId,
  classes,
  classId,
  onClassChange,
}: {
  examId: number
  classes: ClassOption[]
  classId: string
  onClassChange: (v: string) => void
}) {
  const [data, setData] = useState<ClassResultData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!classId) { setData(null); return }
    setLoading(true)
    const result = await getClassResult(examId, Number(classId))
    setData(result)
    setLoading(false)
  }, [examId, classId])

  useEffect(() => { load() }, [load])

  const selectedClass = classes.find((c) => String(c.id) === classId)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {classes.length > 1 ? (
          <div className="space-y-1.5 w-48">
            <Label>Class</Label>
            <Select value={classId} onValueChange={(v) => onClassChange(v ?? '')}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select class…" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name} – {c.section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : <div />}
        {classId && data && data.rows.length > 0 && (
          <Link
            href={`/print/classresult/${examId}/${classId}`}
            target="_blank"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
          >
            <Printer className="h-4 w-4" />
            Print Class Result
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        This result is automatically calculated from Award List entries.
      </div>

      {!classId && <p className="text-center py-12 text-sm text-muted-foreground">Select a class to view its result.</p>}

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {classId && !loading && (!data || data.rows.length === 0 || data.subjects.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed rounded-xl">
          <BarChart2 className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-slate-700">No results entered yet</p>
          <p className="text-sm text-muted-foreground">Enter marks in the Award List tab first.</p>
        </div>
      )}

      {classId && !loading && data && data.rows.length > 0 && data.subjects.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Students', value: data.totalStudents, cls: 'text-slate-700' },
              { label: 'Passed', value: data.passCount, cls: 'text-emerald-700' },
              { label: 'Failed', value: data.failCount, cls: 'text-red-700' },
              { label: 'Absent', value: data.absentCount, cls: 'text-yellow-700' },
              { label: 'Class Average %', value: `${data.classAverage}%`, cls: 'text-blue-700' },
            ].map((c) => (
              <Card key={c.label} className="shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className={cn('text-2xl font-bold', c.cls)}>{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
            <table className="w-full text-sm" style={{ minWidth: 700 + data.subjects.length * 90 }}>
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Rank</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Roll No / Reg#</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Student Name</th>
                  {data.subjects.map((s) => (
                    <th key={s.id} className="px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">{s.name}</th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold text-slate-700">Total</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700">Percentage</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700">Grade</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.map((row) => (
                  <tr key={row.student.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 font-medium"><RankBadge rank={row.rank} /></td>
                    <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{row.rollNumber ?? row.student.registrationNumber}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900 whitespace-nowrap">{row.student.firstName} {row.student.lastName}</td>
                    {row.subjectMarks.map((m) => (
                      <td key={m.subjectId} className={cn(
                        'px-3 py-2.5 text-center whitespace-nowrap',
                        m.isAbsent ? 'text-amber-600 font-semibold' : m.isWithheld ? 'text-slate-500 font-semibold' : 'text-slate-700'
                      )}>
                        {m.isAbsent ? 'ABS' : m.isWithheld ? 'W/H' : m.marksObtained !== null ? `${m.marksObtained}/${m.totalMarks}` : '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-semibold text-slate-700">
                      {row.totalObtained !== null ? `${row.totalObtained}/${row.totalPossible}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold">{row.percentage !== null ? `${row.percentage.toFixed(1)}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {row.grade ? (
                        <span className={cn('inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold', GRADE_COLORS[row.grade] ?? GRADE_COLORS['N/A'])}>{row.grade}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge className={cn('text-xs', RESULT_BADGE[row.resultStatus] ?? RESULT_BADGE.Pending)}>{row.resultStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t font-semibold">
                  <td colSpan={3} className="px-3 py-2.5 text-right text-slate-700">Class Average:</td>
                  {data.subjectAverages.map((s) => (
                    <td key={s.subjectId} className="px-3 py-2.5 text-center text-slate-700">{s.avgObtained}</td>
                  ))}
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-center text-blue-700">{data.classAverage}%</td>
                  <td className="px-3 py-2.5" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            {selectedClass && `${selectedClass.name} – ${selectedClass.section}`} &nbsp;·&nbsp; Highest: {data.highest.toFixed(1)}% &nbsp;·&nbsp; Lowest: {data.lowest.toFixed(1)}%
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Printer, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import BackButton from '@/components/shared/BackButton'
import { getExams } from '@/lib/actions/exams'
import { getExamSummaryReport } from '@/lib/actions/exams'
import { GRADE_COLORS } from '@/lib/grade'
import { cn } from '@/lib/utils'

type ExamList = Awaited<ReturnType<typeof getExams>>
type ReportData = NonNullable<Awaited<ReturnType<typeof getExamSummaryReport>>>

export default function ExamSummaryPage() {
  const [exams, setExams] = useState<ExamList>([])
  const [examId, setExamId] = useState<number | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [loadingExams, setLoadingExams] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)

  useEffect(() => {
    getExams({}).then((data) => {
      setExams(data)
      setLoadingExams(false)
    })
  }, [])

  const loadReport = useCallback((id: number) => {
    setLoadingReport(true)
    setReport(null)
    getExamSummaryReport(id).then((data) => {
      setReport(data)
      setLoadingReport(false)
    })
  }, [])

  const handleExamChange = (val: string | null) => {
    if (!val) return
    const id = Number(val)
    setExamId(id)
    loadReport(id)
  }

  const s = report?.summary

  return (
    <div className="space-y-6">
      {/* Screen header */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Exam Results Summary</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Class performance and student rankings per exam
            </p>
          </div>
        </div>
        {report && (
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        )}
      </div>

      {/* Print header */}
      {report && (
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">Exam Results Summary</h1>
          <p className="font-medium">{report.exam.name} — {report.exam.class.name} {report.exam.class.section}</p>
          <p className="text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
        </div>
      )}

      {/* Exam selector */}
      <div className="no-print flex items-center gap-3">
        <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Select Exam:</span>
        {loadingExams ? (
          <div className="h-9 w-64 rounded bg-muted animate-pulse" />
        ) : (
          <Select value={examId ? String(examId) : ''} onValueChange={handleExamChange}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Choose an exam…" />
            </SelectTrigger>
            <SelectContent>
              {exams.length === 0 ? (
                <SelectItem value="__none__" disabled>No exams found</SelectItem>
              ) : (
                exams.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name} — {e.class.name} {e.class.section}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {!examId && !loadingExams && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center gap-2">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-slate-700">Select an exam to view the summary</p>
        </div>
      )}

      {loadingReport && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {report && !loadingReport && (
        <>
          {/* Exam title (screen) */}
          <div className="no-print">
            <h2 className="text-lg font-bold text-slate-800">
              {report.exam.name} —{' '}
              <span className="text-primary">
                {report.exam.class.name} {report.exam.class.section}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">{report.exam.academicYear.name}</p>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <Card className="shadow-sm border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Class Average</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {s?.avgPct != null ? `${s.avgPct}%` : '—'}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Highest Score</p>
                <p className="mt-1 text-2xl font-bold text-green-700">
                  {s?.highest ? `${s.highest.percentage}%` : '—'}
                </p>
                {s?.highest && (
                  <p className="text-xs text-muted-foreground truncate">{s.highest.name}</p>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Passed</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{s?.passCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">of {s?.totalStudents ?? 0} students</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Failed</p>
                <p className="mt-1 text-2xl font-bold text-red-700">{s?.failCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">of {s?.totalStudents ?? 0} students</p>
              </CardContent>
            </Card>
          </div>

          {/* Rankings table */}
          {report.students.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center gap-2">
              <p className="text-muted-foreground">No results entered for this exam yet.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto shadow-sm">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-3 py-3 text-left font-semibold text-slate-700 w-10">Rank</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Marks</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">%</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Grade</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.students.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3 text-center text-muted-foreground font-medium">
                        {student.percentage !== null ? idx + 1 : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.registrationNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {student.possible > 0 ? `${student.obtained} / ${student.possible}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {student.percentage != null ? `${student.percentage}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {student.grade ? (
                          <Badge
                            className={cn(
                              'text-xs px-2 py-0.5',
                              GRADE_COLORS[student.grade] ?? 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {student.grade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {student.percentage !== null ? (
                          <Badge
                            className={cn(
                              'text-xs px-2.5 py-0.5',
                              student.passed
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : 'bg-red-100 text-red-700 hover:bg-red-100',
                            )}
                          >
                            {student.passed ? 'Pass' : 'Fail'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No data</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

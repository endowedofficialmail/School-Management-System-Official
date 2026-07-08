'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { GRADE_COLORS, ordinal } from '@/lib/grade'
import { getPortalExamResults } from '@/lib/actions/portal'
import { cn } from '@/lib/utils'

type Result = Awaited<ReturnType<typeof getPortalExamResults>>[number]

export default function ExamResultsList({ studentId }: { studentId: number }) {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPortalExamResults(studentId).then((data) => {
      setResults(data)
      setLoading(false)
    })
  }, [studentId])

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Exam Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading results...</p>
        ) : results.length === 0 ? (
          <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
            No exam results available yet
          </p>
        ) : (
          results.map((r) => (
            <div key={r.id} className="rounded-xl border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.exam.name}</p>
                  <p className="text-xs text-muted-foreground">{r.exam.academicYear.name}</p>
                </div>
                <Badge className={cn('text-xs', r.isPassed ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-red-100 text-red-700 hover:bg-red-100')}>
                  {r.isPassed ? 'Pass' : 'Fail'}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-lg font-bold">{Number(r.percentage).toFixed(1)}%</p>
                  <p className="text-[11px] text-muted-foreground">Percentage</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <span className={cn('inline-flex h-7 min-w-10 items-center justify-center rounded-full px-2 text-sm font-bold', GRADE_COLORS[r.grade] ?? GRADE_COLORS['N/A'])}>
                    {r.grade}
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">Grade</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-lg font-bold">{r.rank ? ordinal(r.rank) : '—'}</p>
                  <p className="text-[11px] text-muted-foreground">Rank</p>
                </div>
              </div>
              <Link
                href={`/print/result-card/${r.examId}/${studentId}`}
                target="_blank"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3 min-h-9 w-full gap-1.5')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Result Card
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

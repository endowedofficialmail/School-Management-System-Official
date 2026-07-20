'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GRADE_COLORS } from '@/lib/grade'
import { getStudentResultHistory, type StudentResultHistoryItem } from '@/lib/actions/exams'

export default function StudentResultsTab({ studentId }: { studentId: number }) {
  const [history, setHistory] = useState<StudentResultHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStudentResultHistory(studentId).then((data) => {
      setHistory(data)
      setLoading(false)
    })
  }, [studentId])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Award className="h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No exam results yet</p>
          <p className="text-sm text-muted-foreground">
            Results will appear here once exams are entered and performance is calculated.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-900">{item.examName}</p>
                <p className="text-xs text-muted-foreground">{item.className} &bull; {item.academicYear}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{item.percentage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Percentage</p>
                </div>
                <span className={cn('inline-flex items-center justify-center w-12 h-8 rounded-full text-sm font-bold', GRADE_COLORS[item.grade] ?? GRADE_COLORS['N/A'])}>
                  {item.grade}
                </span>
                {item.rank && (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">#{item.rank}</p>
                    <p className="text-xs text-muted-foreground">Rank</p>
                  </div>
                )}
                <Badge className={cn('text-xs', item.isPassed ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-red-100 text-red-700 hover:bg-red-100')}>
                  {item.isPassed ? 'Pass' : 'Fail'}
                </Badge>
                <Link
                  href={`/print/dmc/${item.examId}/${studentId}`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs')}
                >
                  <ExternalLink className="h-3 w-3" />
                  Result Card
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

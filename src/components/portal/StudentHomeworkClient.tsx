'use client'

import { useMemo, useState } from 'react'
import { format, isToday, isPast } from 'date-fns'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { markHomeworkDone, unmarkHomeworkDone } from '@/lib/actions/lms'

type Homework = Awaited<ReturnType<typeof import('@/lib/actions/lms').getHomework>>[number]

type Filter = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'

export default function StudentHomeworkClient({
  homework: initial,
  studentId,
  userId,
}: {
  homework: Homework[]
  studentId: number
  userId: number
}) {
  const [homework, setHomework] = useState(initial)
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const now = new Date()
    return homework.filter((hw) => {
      const due = new Date(hw.dueDate)
      if (filter === 'today') return isToday(due)
      if (filter === 'upcoming') return due > now && !hw.isDone
      if (filter === 'overdue') return isPast(due) && !hw.isDone
      if (filter === 'completed') return hw.isDone
      return true
    })
  }, [homework, filter])

  async function toggle(id: number, isDone: boolean) {
    setLoading(id)
    try {
      if (isDone) {
        await unmarkHomeworkDone(id, studentId, userId)
        setHomework((prev) => prev.map((h) => h.id === id ? { ...h, isDone: false } : h))
      } else {
        await markHomeworkDone(id, studentId, userId)
        setHomework((prev) => prev.map((h) => h.id === id ? { ...h, isDone: true } : h))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Due Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Homework</h1>

      <div className="flex gap-1 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-white border text-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No homework found</CardContent></Card>
      ) : (
        filtered.map((hw) => {
          const due = new Date(hw.dueDate)
          const dueColor = hw.isOverdue ? 'text-red-700' : isToday(due) ? 'text-orange-700' : 'text-emerald-700'
          return (
            <Card key={hw.id} className={hw.isDone ? 'bg-emerald-50' : ''}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className={hw.isDone ? 'line-through' : ''}>
                  <p className="font-semibold">{hw.title}</p>
                  {hw.description && <p className="text-sm text-muted-foreground mt-1">{hw.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {hw.course.title} · {hw.course.subject?.name}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${dueColor}`}>
                    Due: {format(due, 'dd MMM yyyy HH:mm')}
                  </p>
                  {hw.isOverdue && !hw.isDone && (
                    <Badge className="bg-red-100 text-red-700 mt-1">Overdue</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={hw.isDone ? 'outline' : 'default'}
                  disabled={loading === hw.id}
                  onClick={() => toggle(hw.id, hw.isDone)}
                >
                  {hw.isDone ? <><Check className="h-3 w-3 mr-1" /> Done</> : 'Mark as Done'}
                </Button>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

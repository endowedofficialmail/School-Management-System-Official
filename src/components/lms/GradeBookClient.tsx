'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import BackButton from '@/components/shared/BackButton'
import { getGradeBook } from '@/lib/actions/assignments'

type GradeBook = Awaited<ReturnType<typeof getGradeBook>>
type CourseOption = { id: number; title: string }

export default function GradeBookClient({
  courses,
  userId,
  role,
}: {
  courses: CourseOption[]
  userId: number
  role: 'ADMIN' | 'TEACHER'
}) {
  const [courseId, setCourseId] = useState<number | ''>('')
  const [data, setData] = useState<GradeBook | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(id: number) {
    setLoading(true)
    setError(null)
    try {
      const book = await getGradeBook(id, userId, role)
      setData(book)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 print:hidden">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">LMS Grade Book</h1>
          <p className="text-sm text-muted-foreground">Assignment and quiz scores by student</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end print:hidden">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Course</label>
          <select
            className="flex h-10 rounded-md border px-3 text-sm min-w-[240px]"
            value={courseId}
            onChange={(e) => {
              const id = Number(e.target.value)
              setCourseId(id)
              if (id) void load(id)
            }}
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        {data && (
          <Button variant="outline" onClick={() => window.print()}>Print Grade Book</Button>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="p-4 border-b">
              <p className="font-semibold">{data.course.title}</p>
              <p className="text-sm text-muted-foreground">
                {data.course.class.name}-{data.course.class.section}
                {data.classAverage != null ? ` · Class average: ${data.classAverage}%` : ''}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  {data.assignments.map((a) => (
                    <TableHead key={`a-${a.id}`}>{a.title}</TableHead>
                  ))}
                  {data.quizzes.map((q) => (
                    <TableHead key={`q-${q.id}`}>{q.title}</TableHead>
                  ))}
                  <TableHead>LMS Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row.student.id}>
                    <TableCell className="font-medium">
                      {row.student.firstName} {row.student.lastName}
                    </TableCell>
                    {row.assignmentScores.map((s) => (
                      <TableCell key={`as-${s.assignmentId}`} className={cellColor(s.status)}>
                        {s.marks != null ? `${s.marks}/${s.total}` : '—'}
                      </TableCell>
                    ))}
                    {row.quizScores.map((s) => (
                      <TableCell key={`qs-${s.quizId}`} className={cellColor(s.status)}>
                        {s.marks != null ? `${s.marks}/${s.total}` : 'Not Attempted'}
                      </TableCell>
                    ))}
                    <TableCell className="font-semibold">
                      {row.average != null ? `${row.average}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-bold">Class Average</TableCell>
                  {data.assignments.map((a) => (
                    <TableCell key={`fa-${a.id}`}>—</TableCell>
                  ))}
                  {data.quizzes.map((q) => (
                    <TableCell key={`fq-${q.id}`}>—</TableCell>
                  ))}
                  <TableCell className="font-bold">
                    {data.classAverage != null ? `${data.classAverage}%` : '—'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function cellColor(status: string) {
  if (status === 'PASS') return 'text-emerald-700'
  if (status === 'FAIL') return 'text-red-700'
  return 'text-slate-500'
}

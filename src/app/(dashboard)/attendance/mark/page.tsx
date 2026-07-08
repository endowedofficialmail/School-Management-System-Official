'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { CalendarIcon, CheckCircle, Users, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

import {
  getStudentsByClass,
  getAttendanceForClassAndDate,
  markAttendance,
  type StudentForAttendance,
} from '@/lib/actions/attendance'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import BackButton from '@/components/shared/BackButton'
import AccessDenied from '@/components/shared/AccessDenied'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'] as const
type AttStatus = (typeof STATUSES)[number]

const STATUS_CONFIG: Record<AttStatus, { label: string; short: string; active: string; inactive: string }> = {
  PRESENT: { label: 'Present', short: 'P',  active: 'bg-emerald-500 text-white hover:bg-emerald-600', inactive: 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700' },
  ABSENT:  { label: 'Absent',  short: 'A',  active: 'bg-red-500 text-white hover:bg-red-600',         inactive: 'bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-700' },
  LATE:    { label: 'Late',    short: 'L',  active: 'bg-yellow-500 text-white hover:bg-yellow-600',   inactive: 'bg-slate-100 text-slate-500 hover:bg-yellow-100 hover:text-yellow-700' },
  LEAVE:   { label: 'Leave',   short: 'Lv', active: 'bg-blue-500 text-white hover:bg-blue-600',       inactive: 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-700' },
}

const SUMMARY_CONFIG: Record<AttStatus, { color: string }> = {
  PRESENT: { color: 'text-emerald-600' },
  ABSENT:  { color: 'text-red-600' },
  LATE:    { color: 'text-yellow-600' },
  LEAVE:   { color: 'text-blue-600' },
}

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MarkAttendancePage() {
  const { data: session, status } = useSession()
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const [students, setStudents] = useState<StudentForAttendance[]>([])
  const [statuses, setStatuses] = useState<Record<number, string>>({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { getClasses().then(setClasses) }, [])

  const fetchStudents = useCallback(async () => {
    if (!selectedClass) return
    setLoadingStudents(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const [studentList, existing] = await Promise.all([
      getStudentsByClass(Number(selectedClass)),
      getAttendanceForClassAndDate(Number(selectedClass), dateStr),
    ])
    setStudents(studentList)
    // Default everyone to PRESENT, then override with saved records
    const map: Record<number, string> = {}
    studentList.forEach((s) => { map[s.id] = 'PRESENT' })
    existing.forEach((a) => { map[a.studentId] = a.status })
    setStatuses(map)
    setLoadingStudents(false)
  }, [selectedClass, selectedDate])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const summary = useMemo(() => {
    const counts: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 }
    Object.values(statuses).forEach((s) => { if (s in counts) counts[s]++ })
    return counts
  }, [statuses])

  function setStudentStatus(studentId: number, status: string) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }))
  }

  function markAllPresent() {
    const map: Record<number, string> = {}
    students.forEach((s) => { map[s.id] = 'PRESENT' })
    setStatuses(map)
  }

  async function handleSave() {
    if (!selectedClass || students.length === 0) return
    setSaving(true)
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        status: statuses[s.id] ?? 'PRESENT',
      }))
      await markAttendance({
        classId: Number(selectedClass),
        dateStr: format(selectedDate, 'yyyy-MM-dd'),
        records,
      })
      const cls = classes.find((c) => String(c.id) === selectedClass)
      toast.success(
        `Attendance saved for ${cls?.name ?? 'class'} — ${format(selectedDate, 'dd MMM yyyy')}`
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const hasStudents = students.length > 0
  const isReady = !!selectedClass

  if (status === 'loading') return null
  if (session?.user?.role === 'RECEPTIONIST') return <AccessDenied />

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mark Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select a class and date to begin
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5 flex-1 sm:max-w-xs">
          <Label>Class</Label>
          <Select
            value={selectedClass}
            onValueChange={(v) => setSelectedClass(v ?? '')}
          >
            <SelectTrigger className="w-full h-9">
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
          <Label>Date</Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger
              className={cn(
                'flex h-9 min-w-[160px] items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-3 text-sm font-normal transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none'
              )}
            >
              <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {format(selectedDate, 'dd MMM yyyy')}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) { setSelectedDate(date); setDatePickerOpen(false) }
                }}
                disabled={(date) => date > new Date()}
                captionLayout="dropdown"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Empty state */}
      {!isReady && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-violet-500" />
          </div>
          <p className="text-sm font-medium text-slate-700">Select a class and date to begin</p>
          <p className="text-xs text-muted-foreground mt-1">
            Choose a class from the dropdown above
          </p>
        </div>
      )}

      {/* Loading */}
      {isReady && loadingStudents && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-7 w-10 rounded-md" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No students */}
      {isReady && !loadingStudents && students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Users className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">No active students in this class</p>
        </div>
      )}

      {/* Student list */}
      {isReady && !loadingStudents && hasStudents && (
        <>
          {/* Mark all present */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {students.length} student{students.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={markAllPresent}
              className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Mark All Present
            </button>
          </div>

          <div className="divide-y border rounded-xl overflow-hidden bg-white">
            {students.map((student) => {
              const current = (statuses[student.id] ?? 'PRESENT') as AttStatus
              return (
                <div
                  key={student.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(student.firstName, student.lastName)}
                    </AvatarFallback>
                  </Avatar>

                  <span className="flex-1 text-sm font-medium text-slate-900 min-w-0 truncate">
                    {student.firstName} {student.lastName}
                  </span>

                  {/* Status buttons */}
                  <div className="flex gap-1 shrink-0">
                    {STATUSES.map((status) => {
                      const cfg = STATUS_CONFIG[status]
                      const isActive = current === status
                      return (
                        <button
                          key={status}
                          onClick={() => setStudentStatus(student.id, status)}
                          title={cfg.label}
                          className={cn(
                            'min-w-[2rem] h-7 px-1.5 rounded-md text-xs font-semibold transition-colors',
                            isActive ? cfg.active : cfg.inactive
                          )}
                        >
                          {cfg.short}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Sticky footer — save + summary */}
      {isReady && hasStudents && !loadingStudents && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background border-t shadow-lg px-4 md:px-6 py-3 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            {/* Live summary */}
            <div className="flex items-center gap-3 text-sm font-medium flex-wrap">
              {STATUSES.map((s) => (
                <span key={s} className={cn('flex items-center gap-1', SUMMARY_CONFIG[s].color)}>
                  <span className="font-bold">{summary[s]}</span>
                  <span className="hidden sm:inline text-xs opacity-80">{STATUS_CONFIG[s].label}</span>
                </span>
              ))}
            </div>
            <Button onClick={handleSave} disabled={saving} className="shrink-0">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

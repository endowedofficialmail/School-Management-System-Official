'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeft, IdCard, Search, Users, AlertTriangle, CheckCircle2,
  Printer, MoreHorizontal, Pencil, Ban, Trash2, Info, Plus,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import Breadcrumb from '@/components/shared/Breadcrumb'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import { getDatesheetByExam } from '@/lib/actions/datesheet'
import { getSubjectsByClass } from '@/lib/actions/exams'
import {
  deleteDatesheetEntry, upsertDatesheetEntry,
} from '@/lib/actions/datesheet'
import {
  getRollSlipsByExam,
  getStudentsForRollSlipIssue,
  issueRollSlipsForClass,
  issueRollSlipForStudent,
  searchExamStudents,
  getRollSlipForStudentExam,
  updateRollSlipDetails,
  invalidateRollSlip,
  deleteRollSlip,
  type RollSlipWithDetails,
} from '@/lib/actions/rollslips'

type ExamClassInfo = { id: number; name: string; section: string }

type StudentRow = Awaited<ReturnType<typeof getStudentsForRollSlipIssue>>[number]

function classLabel(c: { name: string; section: string }) {
  return `${c.name} - ${c.section}`
}

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

export default function RollSlipsClient(props: {
  examId: number
  examName: string
  startDate: string
  endDate: string
  academicYearName: string
  examClasses: ExamClassInfo[]
  issuedById: number
}) {
  const { examId, examName, issuedById, examClasses } = props

  const [slips, setSlips] = useState<RollSlipWithDetails[]>([])
  const [datesheetEntries, setDatesheetEntries] = useState<Awaited<ReturnType<typeof getDatesheetByExam>>>([])
  const [loading, setLoading] = useState(true)

  // Class issue card
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classVenue, setClassVenue] = useState('')
  const [classInstructions, setClassInstructions] = useState('')
  const [showStudentPanel, setShowStudentPanel] = useState(false)
  const [classStudents, setClassStudents] = useState<StudentRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set())
  const [studentSearch, setStudentSearch] = useState('')
  const [issuingClass, setIssuingClass] = useState(false)

  // Individual issue card
  const [studentQuery, setStudentQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof searchExamStudents>>>([])
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [pickedStudentClassId, setPickedStudentClassId] = useState<number | null>(null)
  const [individualVenue, setIndividualVenue] = useState('')
  const [individualInstructions, setIndividualInstructions] = useState('')
  const [existingSlip, setExistingSlip] = useState<Awaited<ReturnType<typeof getRollSlipForStudentExam>>>(null)
  const [issuingIndividual, setIssuingIndividual] = useState(false)

  // Edit panel for existing slip (individual)
  const [editVenue, setEditVenue] = useState('')
  const [editInstructions, setEditInstructions] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Issued slips table
  const [tableSearch, setTableSearch] = useState('')
  const [editSlip, setEditSlip] = useState<RollSlipWithDetails | null>(null)
  const [editDialogVenue, setEditDialogVenue] = useState('')
  const [editDialogInstructions, setEditDialogInstructions] = useState('')
  const [invalidateTarget, setInvalidateTarget] = useState<RollSlipWithDetails | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RollSlipWithDetails | null>(null)

  const loadData = useCallback(async () => {
    const [slipList, entries] = await Promise.all([
      getRollSlipsByExam(examId),
      getDatesheetByExam(examId),
    ])
    setSlips(slipList)
    setDatesheetEntries(entries)
    setLoading(false)
  }, [examId])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (examClasses.length === 1 && !selectedClassId) {
      setSelectedClassId(String(examClasses[0].id))
    }
  }, [examClasses, selectedClassId])

  // Student search for individual issue
  useEffect(() => {
    const q = studentQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    const t = setTimeout(() => {
      searchExamStudents(examId, q).then(setSearchResults)
    }, 300)
    return () => clearTimeout(t)
  }, [studentQuery, examId])

  useEffect(() => {
    if (!selectedStudentId) {
      setExistingSlip(null)
      return
    }
    getRollSlipForStudentExam(examId, selectedStudentId).then((slip) => {
      setExistingSlip(slip)
      if (slip) {
        setEditVenue(slip.venue ?? '')
        setEditInstructions(slip.instructions ?? '')
      }
    })
  }, [selectedStudentId, examId])

  const subjectCount = useMemo(
    () => new Set(datesheetEntries.map((e) => e.subjectId)).size,
    [datesheetEntries],
  )

  const classesLabel = examClasses.map((c) => classLabel(c)).join(', ')

  const filteredSlips = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return slips
    return slips.filter((s) => {
      const name = `${s.student.firstName} ${s.student.lastName}`.toLowerCase()
      return name.includes(q) || s.rollNumber.toLowerCase().includes(q)
    })
  }, [slips, tableSearch])

  const filteredClassStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return classStudents
    return classStudents.filter((s) => {
      const name = `${s.firstName} ${s.lastName}`.toLowerCase()
      return name.includes(q) || s.registrationNumber.toLowerCase().includes(q)
    })
  }, [classStudents, studentSearch])

  const selectedNewCount = useMemo(
    () => Array.from(selectedStudentIds).filter((id) => {
      const s = classStudents.find((st) => st.id === id)
      return s && !s.existingSlip
    }).length,
    [selectedStudentIds, classStudents],
  )

  async function handleSelectStudents() {
    if (!selectedClassId) {
      toast.error('Please select a class')
      return
    }
    setLoadingStudents(true)
    setShowStudentPanel(true)
    try {
      const students = await getStudentsForRollSlipIssue(examId, Number(selectedClassId))
      setClassStudents(students)
      const ids = new Set<number>()
      students.forEach((s) => {
        if (!s.existingSlip) ids.add(s.id)
      })
      setSelectedStudentIds(ids)
    } catch {
      toast.error('Failed to load students')
    } finally {
      setLoadingStudents(false)
    }
  }

  function toggleStudent(id: number, hasSlip: boolean) {
    if (hasSlip) return
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllNew(checked: boolean) {
    if (checked) {
      const ids = new Set<number>()
      classStudents.forEach((s) => { if (!s.existingSlip) ids.add(s.id) })
      setSelectedStudentIds(ids)
    } else {
      setSelectedStudentIds(new Set())
    }
  }

  async function handleIssueClass() {
    const ids = Array.from(selectedStudentIds)
    if (ids.length === 0) {
      toast.error('No students selected')
      return
    }
    setIssuingClass(true)
    try {
      const result = await issueRollSlipsForClass({
        examId,
        classId: Number(selectedClassId),
        issuedById,
        venue: classVenue,
        instructions: classInstructions,
        studentIds: ids,
      })
      toast.success(`${result.created} roll slips issued, ${result.skipped} already existed`)
      setShowStudentPanel(false)
      await loadData()
    } catch {
      toast.error('Failed to issue roll slips')
    } finally {
      setIssuingClass(false)
    }
  }

  async function handleIssueIndividual() {
    if (!selectedStudentId) {
      toast.error('Please select a student')
      return
    }
    setIssuingIndividual(true)
    try {
      const slip = await issueRollSlipForStudent({
        examId,
        studentId: selectedStudentId,
        issuedById,
        venue: individualVenue,
        instructions: individualInstructions,
      })
      toast.success(`Roll slip issued: ${slip.rollNumber}`)
      setExistingSlip({ id: slip.id, rollNumber: slip.rollNumber, venue: slip.venue, instructions: slip.instructions, isValid: slip.isValid })
      await loadData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to issue slip')
    } finally {
      setIssuingIndividual(false)
    }
  }

  async function handleSaveIndividualEdit() {
    if (!existingSlip) return
    setSavingEdit(true)
    try {
      await updateRollSlipDetails(existingSlip.id, {
        venue: editVenue,
        instructions: editInstructions,
      })
      toast.success('Slip details updated')
      await loadData()
    } catch {
      toast.error('Failed to update slip')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleSaveEditDialog() {
    if (!editSlip) return
    try {
      await updateRollSlipDetails(editSlip.id, {
        venue: editDialogVenue,
        instructions: editDialogInstructions,
      })
      toast.success('Slip updated')
      setEditSlip(null)
      await loadData()
    } catch {
      toast.error('Failed to update slip')
    }
  }

  async function handleInvalidate() {
    if (!invalidateTarget) return
    try {
      await invalidateRollSlip(invalidateTarget.id)
      toast.success('Slip invalidated')
      setInvalidateTarget(null)
      await loadData()
    } catch {
      toast.error('Failed to invalidate slip')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteRollSlip(deleteTarget.id)
      toast.success('Slip deleted')
      setDeleteTarget(null)
      await loadData()
    } catch {
      toast.error('Failed to delete slip')
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Exams', href: '/exams' },
          { label: examName, href: `/exams/${examId}/datesheet` },
          { label: 'Roll No Slips' },
        ]}
      />

      <div className="flex items-center gap-3">
        <Link href="/exams" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <IdCard className="h-6 w-6 text-slate-600" />
            Roll Number Slips — {examName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {classesLabel} &bull; {format(new Date(props.startDate), 'dd MMM yyyy')} – {format(new Date(props.endDate), 'dd MMM yyyy')} &bull; {props.academicYearName}
          </p>
        </div>
      </div>

      {/* Datesheet notice */}
      {datesheetEntries.length > 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800">Datesheet Available</p>
            <p className="text-sm text-emerald-700 mt-1">
              Roll number slips will automatically include the complete exam schedule from the datesheet.
            </p>
            <p className="text-sm text-emerald-600 mt-1">
              {datesheetEntries.length} paper{datesheetEntries.length !== 1 ? 's' : ''} scheduled across {subjectCount} subject{subjectCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">No Datesheet Found</p>
            <p className="text-sm text-amber-700 mt-1">
              Roll slips will be issued without exam schedule. Create a datesheet first for complete slips.
            </p>
            <Link href={`/exams/${examId}/datesheet`} className={cn(buttonVariants({ size: 'sm' }), 'mt-3')}>
              Create Datesheet
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>Tip: Create the exam datesheet before issuing roll slips so the schedule appears on the slip automatically.</span>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Issue for Entire Class
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={selectedClassId} onValueChange={(v) => setSelectedClassId(v ?? '')}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select class..." />
                </SelectTrigger>
                <SelectContent>
                  {examClasses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {classLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Venue (optional)</Label>
              <Input placeholder="e.g. Main Hall, Room 101" value={classVenue} onChange={(e) => setClassVenue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Instructions (optional)</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. Bring your own stationery"
                value={classInstructions}
                onChange={(e) => setClassInstructions(e.target.value)}
                rows={2}
              />
            </div>
            <Button onClick={handleSelectStudents} disabled={!selectedClassId || loadingStudents}>
              {loadingStudents ? 'Loading...' : 'Select Students'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IdCard className="h-4 w-4" />
              Issue for Individual Student
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Search Student</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by name or registration #..."
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                />
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-b-0',
                        selectedStudentId === s.id && 'bg-blue-50',
                      )}
                      onClick={() => {
                        setSelectedStudentId(s.id)
                        setPickedStudentClassId(s.class.id)
                      }}
                    >
                      <span className="font-medium">{s.firstName} {s.lastName}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{s.registrationNumber}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{classLabel(s.class)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {existingSlip ? (
              <div className="rounded-md border bg-slate-50 p-3 space-y-3">
                <p className="text-sm">
                  Slip already issued:{' '}
                  <span className="font-mono font-bold">{existingSlip.rollNumber}</span>
                </p>
                <div className="flex gap-2">
                  <a
                    href={`/print/rollslip/${existingSlip.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    Print
                  </a>
                </div>

                {/* Edit panel */}
                <div className="border-t pt-3 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase">Edit Slip Details</p>
                  <div className="space-y-1.5">
                    <Label>Venue</Label>
                    <Input value={editVenue} onChange={(e) => setEditVenue(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Instructions</Label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={editInstructions}
                      onChange={(e) => setEditInstructions(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {datesheetEntries.length > 0 && (
                    <DatesheetEditPanel
                      examId={examId}
                      classId={pickedStudentClassId ?? examClasses[0]?.id ?? 0}
                      entries={datesheetEntries}
                      onUpdated={loadData}
                    />
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleSaveIndividualEdit} disabled={savingEdit}>
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await invalidateRollSlip(existingSlip.id)
                        toast.success('Slip invalidated')
                        await loadData()
                        const updated = await getRollSlipForStudentExam(examId, selectedStudentId!)
                        setExistingSlip(updated)
                      }}
                    >
                      Invalidate Slip
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedStudentId ? (
              <>
                <div className="space-y-1.5">
                  <Label>Venue (optional)</Label>
                  <Input value={individualVenue} onChange={(e) => setIndividualVenue(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instructions (optional)</Label>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={individualInstructions}
                    onChange={(e) => setIndividualInstructions(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button onClick={handleIssueIndividual} disabled={issuingIndividual}>
                  {issuingIndividual ? 'Issuing...' : 'Issue Slip'}
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Student selection panel */}
      {showStudentPanel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => selectAllNew(true)}>Select All</Button>
              <Button size="sm" variant="outline" onClick={() => selectAllNew(false)}>Deselect All</Button>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 h-9" placeholder="Filter by name..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedNewCount} of {classStudents.filter((s) => !s.existingSlip).length} new students selected
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Students who already have slips are shown but will be skipped.
            </p>

            {loadingStudents ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading students...</p>
            ) : (
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {filteredClassStudents.map((s) => {
                  const hasSlip = !!s.existingSlip
                  const checked = selectedStudentIds.has(s.id)
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50',
                        hasSlip && 'opacity-60 cursor-not-allowed bg-slate-50/50',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={hasSlip ? true : checked}
                        disabled={hasSlip}
                        onChange={() => toggleStudent(s.id, hasSlip)}
                        className="rounded"
                      />
                      <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                        {initials(s.firstName, s.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-muted-foreground">{s.registrationNumber} &bull; {classLabel(s.class)}</p>
                        {hasSlip && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Already has slip: {s.existingSlip!.rollNumber}
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleIssueClass} disabled={issuingClass || selectedNewCount === 0}>
                {issuingClass ? 'Issuing...' : `Issue Slips (${selectedNewCount})`}
              </Button>
              <Button variant="outline" onClick={() => setShowStudentPanel(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issued slips table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">
            Issued Roll Slips ({slips.length} total)
          </CardTitle>
          {slips.length > 0 && (
            <a
              href={`/print/rollslip/exam/${examId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: 'sm', variant: 'outline' })}
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print All Slips
            </a>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9"
              placeholder="Search by name or roll number..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : filteredSlips.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No roll slips issued yet.</p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Roll #</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Issued On</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlips.map((slip) => (
                    <TableRow key={slip.id}>
                      <TableCell className="font-mono font-bold text-sm">{slip.rollNumber}</TableCell>
                      <TableCell>{slip.student.firstName} {slip.student.lastName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {classLabel(slip.student.class)}
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(slip.issuedAt), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{slip.venue || '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          'text-xs',
                          slip.isValid
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-100 text-red-700 hover:bg-red-100',
                        )}>
                          {slip.isValid ? 'Valid' : 'Invalidated'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 w-8 p-0')}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => window.open(`/print/rollslip/${slip.id}`, '_blank')}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print Slip
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setEditSlip(slip)
                                setEditDialogVenue(slip.venue ?? '')
                                setEditDialogInstructions(slip.instructions ?? '')
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            {slip.isValid && (
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600"
                                onClick={() => setInvalidateTarget(slip)}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Invalidate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600"
                              onClick={() => setDeleteTarget(slip)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editSlip} onOpenChange={(o) => !o && setEditSlip(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Slip Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Venue</Label>
              <Input value={editDialogVenue} onChange={(e) => setEditDialogVenue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Instructions</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={editDialogInstructions}
                onChange={(e) => setEditDialogInstructions(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSlip(null)}>Cancel</Button>
            <Button onClick={handleSaveEditDialog}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invalidate dialog */}
      <Dialog open={!!invalidateTarget} onOpenChange={(o) => !o && setInvalidateTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invalidate Roll Slip</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Invalidate slip <span className="font-mono font-bold">{invalidateTarget?.rollNumber}</span> for{' '}
            {invalidateTarget?.student.firstName} {invalidateTarget?.student.lastName}?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvalidateTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleInvalidate}>Invalidate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Roll Slip</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete slip <span className="font-mono font-bold">{deleteTarget?.rollNumber}</span>?
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DatesheetEditPanel(props: {
  examId: number
  classId: number
  entries: Awaited<ReturnType<typeof getDatesheetByExam>>
  onUpdated: () => void
}) {
  const [subjects, setSubjects] = useState<Awaited<ReturnType<typeof getSubjectsByClass>>>([])
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ subjectId: '', date: '', startTime: '09:00', endTime: '11:00' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (props.classId) {
      getSubjectsByClass(props.classId).then(setSubjects)
    }
  }, [props.classId])

  async function handleRemove(entryId: number) {
    try {
      await deleteDatesheetEntry(entryId)
      toast.success('Paper removed from datesheet')
      props.onUpdated()
    } catch {
      toast.error('Failed to remove paper')
    }
  }

  async function handleAdd() {
    if (!addForm.subjectId || !addForm.date) {
      toast.error('Subject and date are required')
      return
    }
    setSaving(true)
    try {
      await upsertDatesheetEntry({
        examId: props.examId,
        subjectId: Number(addForm.subjectId),
        date: new Date(addForm.date),
        startTime: addForm.startTime,
        endTime: addForm.endTime,
      })
      toast.success('Paper added to datesheet')
      setShowAdd(false)
      setAddForm({ subjectId: '', date: '', startTime: '09:00', endTime: '11:00' })
      props.onUpdated()
    } catch {
      toast.error('Failed to add paper')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-md p-3 space-y-2 bg-amber-50/50">
      <div className="flex items-start gap-2 text-xs text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>Editing exam papers here will update the datesheet for ALL students in this exam.</span>
      </div>
      <p className="text-xs font-semibold text-slate-600 uppercase">Exam Papers (Datesheet)</p>
      <div className="space-y-1">
        {props.entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between text-xs bg-white border rounded px-2 py-1.5">
            <span>
              {format(new Date(e.date), 'dd MMM')} &bull; {e.subject.name} &bull; {e.startTime}–{e.endTime}
            </span>
            <Button size="sm" variant="ghost" className="h-6 text-red-600 px-2" onClick={() => handleRemove(e.id)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
      {showAdd ? (
        <div className="space-y-2 border-t pt-2">
          <Select value={addForm.subjectId} onValueChange={(v) => setAddForm((f) => ({ ...f, subjectId: v ?? '' }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" className="h-8 text-xs" value={addForm.date} onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="time" className="h-8 text-xs" value={addForm.startTime} onChange={(e) => setAddForm((f) => ({ ...f, startTime: e.target.value }))} />
            <Input type="time" className="h-8 text-xs" value={addForm.endTime} onChange={(e) => setAddForm((f) => ({ ...f, endTime: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? 'Adding...' : 'Add Paper'}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAdd(true)}>
          <Plus className="h-3 w-3 mr-1" />
          Add Paper
        </Button>
      )}
    </div>
  )
}

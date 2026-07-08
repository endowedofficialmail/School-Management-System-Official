'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import {
  getSubjects, createSubject, deleteSubject, getTeachers,
} from '@/lib/actions/exams'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import BackButton from '@/components/shared/BackButton'
import { buttonVariants } from '@/components/ui/button'

type Subject = Awaited<ReturnType<typeof getSubjects>>[number]
type Teacher = Awaited<ReturnType<typeof getTeachers>>[number]

const EMPTY_FORM = { name: '', classId: '', teacherId: '' }

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [subjectList, classList, teacherList] = await Promise.all([
      getSubjects(),
      getClasses(),
      getTeachers(),
    ])
    setSubjects(subjectList)
    setClasses(classList)
    setTeachers(teacherList)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleSave() {
    if (!form.name.trim() || !form.classId) {
      toast.error('Subject name and class are required')
      return
    }
    setSaving(true)
    try {
      await createSubject({
        name: form.name.trim(),
        classId: Number(form.classId),
        teacherId: form.teacherId ? Number(form.teacherId) : null,
      })
      toast.success(`Subject "${form.name.trim()}" created`)
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      loadData()
    } catch {
      toast.error('Failed to create subject')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteSubject(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" deleted`)
      setDeleteOpen(false)
      loadData()
    } catch {
      toast.error('Failed to delete subject')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subjects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? '...' : `${subjects.length} subject${subjects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subject
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold">Subject Name</TableHead>
              <TableHead className="font-semibold">Class</TableHead>
              <TableHead className="font-semibold">Teacher</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-28" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : subjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <BookOpen className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No subjects yet</p>
                    <p className="text-xs text-muted-foreground">
                      Click &quot;Add Subject&quot; to create your first subject
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              subjects.map((sub) => (
                <TableRow key={sub.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900">{sub.name}</TableCell>
                  <TableCell className="text-slate-600">
                    {sub.class.name} – {sub.class.section}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {sub.teacher?.name ?? (
                      <span className="text-muted-foreground text-xs italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => { setDeleteTarget(sub); setDeleteOpen(true) }}
                      className={cn(
                        buttonVariants({ variant: 'ghost', size: 'sm' }),
                        'h-8 text-red-500 hover:text-red-600 hover:bg-red-50'
                      )}
                      title="Delete subject"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="subject-name">Subject Name *</Label>
              <Input
                id="subject-name"
                placeholder="e.g. Mathematics, English, Science"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select value={form.classId} onValueChange={(v) => setForm((f) => ({ ...f, classId: v ?? '' }))}>
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
              <Label>
                Teacher{' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </Label>
              {teachers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No teachers found. Add users with the Teacher role first.
                </p>
              ) : (
                <Select value={form.teacherId} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v ?? '' }))}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Assign teacher (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Unassigned —</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Add Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>?
            All results linked to this subject will also be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

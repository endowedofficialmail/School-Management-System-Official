'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import BackButton from '@/components/shared/BackButton'
import {
  getAllClasses, createClass, updateClass, deleteClass,
  getAcademicYears,
} from '@/lib/actions/settings'
import { getTeachers } from '@/lib/actions/exams'

type ClassRow = Awaited<ReturnType<typeof getAllClasses>>[number]
type AcademicYear = Awaited<ReturnType<typeof getAcademicYears>>[number]
type Teacher = Awaited<ReturnType<typeof getTeachers>>[number]

const EMPTY_FORM = { name: '', section: '', classTeacherId: '', academicYearId: '' }

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ClassRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [cls, yrs, tchs] = await Promise.all([getAllClasses(), getAcademicYears(), getTeachers()])
    setClasses(cls)
    setYears(yrs)
    setTeachers(tchs)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditTarget(null)
    const active = years.find((y) => y.isActive)
    setForm({ ...EMPTY_FORM, academicYearId: active ? String(active.id) : '' })
    setDialogOpen(true)
  }

  function openEdit(cls: ClassRow) {
    setEditTarget(cls)
    setForm({
      name: cls.name,
      section: cls.section,
      classTeacherId: cls.classTeacherId ? String(cls.classTeacherId) : '',
      academicYearId: String(cls.academicYearId),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.section.trim() || !form.academicYearId) {
      toast.error('Name, section, and academic year are required'); return
    }
    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        section: form.section.trim(),
        classTeacherId: form.classTeacherId ? Number(form.classTeacherId) : null,
        academicYearId: Number(form.academicYearId),
      }
      if (editTarget) {
        await updateClass(editTarget.id, data)
        toast.success('Class updated')
      } else {
        await createClass(data)
        toast.success('Class created')
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save class')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteClass(deleteTarget.id)
      toast.success(`"${deleteTarget.name} – ${deleteTarget.section}" deleted`)
      setDeleteTarget(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete class')
    } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Classes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? '...' : `${classes.length} class${classes.length !== 1 ? 'es' : ''}`}
            </p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Class</Button>
      </div>

      <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold">Class Name</TableHead>
              <TableHead className="font-semibold">Section</TableHead>
              <TableHead className="font-semibold">Class Teacher</TableHead>
              <TableHead className="font-semibold">Academic Year</TableHead>
              <TableHead className="font-semibold text-center">Students</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : classes.map((cls) => (
              <TableRow key={cls.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium text-slate-900">{cls.name}</TableCell>
                <TableCell className="text-slate-600">{cls.section}</TableCell>
                <TableCell className="text-slate-600">
                  {cls.classTeacher?.name ?? <span className="text-muted-foreground text-xs italic">Unassigned</span>}
                </TableCell>
                <TableCell className="text-slate-600">{cls.academicYear.name}</TableCell>
                <TableCell className="text-center font-medium text-slate-700">{cls._count.students}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(cls)}
                      className="h-8 w-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cls)}
                      className="h-8 w-8 rounded-md hover:bg-red-50 flex items-center justify-center text-slate-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? 'Edit Class' : 'Add Class'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class Name *</Label>
                <Input placeholder="e.g. Grade 4" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Section *</Label>
                <Input placeholder="e.g. A" value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Academic Year *</Label>
              <Select value={form.academicYearId} onValueChange={(v) => setForm((f) => ({ ...f, academicYearId: v ?? '' }))}>
                <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select year..." /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y.id} value={String(y.id)}>{y.name}{y.isActive ? ' (Active)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Class Teacher <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Select value={form.classTeacherId} onValueChange={(v) => setForm((f) => ({ ...f, classTeacherId: v ?? '' }))}>
                <SelectTrigger className="w-full h-9"><SelectValue placeholder="Assign teacher..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Unassigned —</SelectItem>
                  {teachers.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Class'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Class</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">
              {deleteTarget?.name} – {deleteTarget?.section}
            </span>?
            {(deleteTarget?._count.students ?? 0) > 0 && (
              <span className="block mt-1 text-amber-600">
                This class has {deleteTarget?._count.students} enrolled student(s) and cannot be deleted.
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={deleting || (deleteTarget?._count.students ?? 0) > 0}
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

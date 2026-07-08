'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Settings2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
type FeeFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONETIME'

import {
  getFeeStructures, createFeeStructure, updateFeeStructure, deleteFeeStructure,
  getActiveAcademicYear, type FeeStructureWithClass,
} from '@/lib/actions/fees'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import BackButton from '@/components/shared/BackButton'

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
  ONETIME: 'One-time',
}

const FREQUENCY_COLORS: Record<string, string> = {
  MONTHLY: 'bg-blue-100 text-blue-700',
  QUARTERLY: 'bg-violet-100 text-violet-700',
  YEARLY: 'bg-emerald-100 text-emerald-700',
  ONETIME: 'bg-slate-100 text-slate-700',
}

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString('en-PK')}`
}

const EMPTY_FORM = { name: '', amount: '', frequency: 'MONTHLY', classId: 'ALL' }

export default function FeeStructuresPage() {
  const [structures, setStructures] = useState<FeeStructureWithClass[]>([])
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FeeStructureWithClass | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<FeeStructureWithClass | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [s, c, ay] = await Promise.all([
      getFeeStructures(),
      getClasses(),
      getActiveAcademicYear(),
    ])
    setStructures(s)
    setClasses(c)
    setAcademicYearId(ay?.id ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(s: FeeStructureWithClass) {
    setEditTarget(s)
    setForm({
      name: s.name,
      amount: String(Number(s.amount)),
      frequency: s.frequency,
      classId: s.classId ? String(s.classId) : 'ALL',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount < 0) { toast.error('Enter a valid amount'); return }
    if (!academicYearId && !editTarget) {
      toast.error('No active academic year found. Please set one first.')
      return
    }

    setSaving(true)
    try {
      if (editTarget) {
        await updateFeeStructure(editTarget.id, {
          name: form.name.trim(),
          amount,
          frequency: form.frequency as FeeFrequency,
          classId: form.classId === 'ALL' ? null : Number(form.classId),
        })
        toast.success('Fee structure updated')
      } else {
        await createFeeStructure({
          name: form.name.trim(),
          amount,
          frequency: form.frequency as FeeFrequency,
          classId: form.classId === 'ALL' ? null : Number(form.classId),
          academicYearId: academicYearId!,
        })
        toast.success('Fee structure created')
      }
      setDialogOpen(false)
      fetchAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteFeeStructure(deleteTarget.id)
      toast.success('Fee structure deleted')
      setDeleteTarget(null)
      fetchAll()
    } catch {
      toast.error('Failed to delete. It may have invoices attached.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Structures</h1>
            <p className="text-sm text-muted-foreground mt-1">Define fee types and amounts</p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Fee Structure
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Applies To</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : structures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <Settings2 className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No fee structures yet</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      Create your first fee structure to start generating invoices
                    </p>
                    <Button size="sm" onClick={openAdd}>
                      <Plus className="h-4 w-4 mr-1" /> Add First Fee Structure
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              structures.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatCurrency(Number(s.amount))}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.class ? `${s.class.name} – ${s.class.section}` : 'All Classes'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FREQUENCY_COLORS[s.frequency]}`}
                    >
                      {FREQUENCY_LABELS[s.frequency]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-slate-100 outline-none">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Fee Structure' : 'Add Fee Structure'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="fs-name">Name *</Label>
              <Input
                id="fs-name"
                placeholder="e.g. Monthly Tuition Fee"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fs-amount">Amount (Rs.) *</Label>
              <Input
                id="fs-amount"
                type="number"
                min={0}
                placeholder="e.g. 5000"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Frequency *</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v ?? 'MONTHLY' })}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                  <SelectItem value="ONETIME">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Applies To</Label>
              <Select
                value={form.classId}
                onValueChange={(v) => setForm({ ...form, classId: v ?? 'ALL' })}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} – {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Fee Structure</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">&ldquo;{deleteTarget?.name}&rdquo;</span>?
              This cannot be undone and will fail if invoices are already generated using it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Plus, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import BackButton from '@/components/shared/BackButton'
import { getAcademicYears, createAcademicYear, setActiveAcademicYear } from '@/lib/actions/settings'

type AcademicYear = Awaited<ReturnType<typeof getAcademicYears>>[number]

export default function AcademicYearsPage() {
  const [years, setYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const [saving, setSaving] = useState(false)

  // Confirmation for set active
  const [activateTarget, setActivateTarget] = useState<AcademicYear | null>(null)
  const [activating, setActivating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setYears(await getAcademicYears())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      toast.error('All fields are required'); return
    }
    setSaving(true)
    try {
      await createAcademicYear({
        name: form.name.trim(),
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
      })
      toast.success(`Academic year "${form.name}" created`)
      setAddOpen(false)
      setForm({ name: '', startDate: '', endDate: '' })
      load()
    } catch {
      toast.error('Failed to create academic year')
    } finally { setSaving(false) }
  }

  async function handleSetActive() {
    if (!activateTarget) return
    setActivating(true)
    try {
      await setActiveAcademicYear(activateTarget.id)
      toast.success(`"${activateTarget.name}" is now the active academic year`)
      setActivateTarget(null)
      load()
    } catch {
      toast.error('Failed to set active year')
    } finally { setActivating(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Years</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? '...' : `${years.length} year${years.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Academic Year
        </Button>
      </div>

      <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Start Date</TableHead>
              <TableHead className="font-semibold">End Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse w-28" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : years.map((y) => (
              <TableRow key={y.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium text-slate-900">{y.name}</TableCell>
                <TableCell className="text-slate-600">{format(new Date(y.startDate), 'dd MMM yyyy')}</TableCell>
                <TableCell className="text-slate-600">{format(new Date(y.endDate), 'dd MMM yyyy')}</TableCell>
                <TableCell>
                  {y.isActive ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!y.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setActivateTarget(y)}
                    >
                      Set as Active
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Academic Year</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Year Name *</Label>
              <Input placeholder="e.g. 2025-2026" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Active Confirmation */}
      <Dialog open={!!activateTarget} onOpenChange={(o) => { if (!o) setActivateTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Set Active Academic Year</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will make{' '}
            <span className="font-semibold text-slate-900">{activateTarget?.name}</span>{' '}
            the active academic year for all new records. All other years will be marked inactive.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateTarget(null)} disabled={activating}>Cancel</Button>
            <Button onClick={handleSetActive} disabled={activating}>
              {activating ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

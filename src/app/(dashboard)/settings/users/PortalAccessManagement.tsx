'use client'

import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Link2, Trash2, Copy, Download, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createParentPortalAccess,
  createStudentPortalAccess,
  getPortalManagementData,
  removeParentPortalAccess,
  removeStudentPortalAccess,
  type PortalManagementData,
} from '@/lib/actions/portal'
import {
  resetAllStudentPasswordsToRegNumbers,
  getAllPortalCredentialsExport,
} from '@/lib/actions/bulk-import'

type StudentOption = PortalManagementData['students'][number]

function randomPassword() {
  return Math.random().toString(36).slice(-8)
}

export default function PortalAccessManagement() {
  const [data, setData] = useState<PortalManagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [studentOpen, setStudentOpen] = useState(false)
  const [parentOpen, setParentOpen] = useState(false)
  const [credentials, setCredentials] = useState<{ title: string; email: string; password: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  const [studentForm, setStudentForm] = useState({ studentId: '', email: '', password: '', confirm: '' })
  const [studentSearch, setStudentSearch] = useState('')
  const [parentForm, setParentForm] = useState({
    name: '', email: '', password: '', confirm: '', relation: 'Father', studentIds: [] as number[],
  })
  const [parentSearch, setParentSearch] = useState('')

  const load = () => {
    setLoading(true)
    getPortalManagementData().then((d) => {
      setData(d)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const studentsWithoutPortal = useMemo(
    () => (data?.students ?? []).filter((s) => !s.portalProfile),
    [data]
  )

  const filteredStudentOptions = useMemo(() => {
    const q = studentSearch.toLowerCase()
    return studentsWithoutPortal.filter((s) =>
      `${s.firstName} ${s.lastName} ${s.registrationNumber}`.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [studentSearch, studentsWithoutPortal])

  const filteredParentStudentOptions = useMemo(() => {
    const q = parentSearch.toLowerCase()
    return (data?.students ?? []).filter((s) =>
      `${s.firstName} ${s.lastName} ${s.registrationNumber}`.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [parentSearch, data])

  function selectStudentForPortal(student: StudentOption) {
    const suggested = `${student.registrationNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@school.com`
    setStudentForm((f) => ({ ...f, studentId: String(student.id), email: f.email || suggested }))
    setStudentSearch(`${student.firstName} ${student.lastName}`)
  }

  async function handleCreateStudentAccess() {
    if (!studentForm.studentId || !studentForm.email || !studentForm.password) {
      toast.error('All fields are required'); return
    }
    if (studentForm.password !== studentForm.confirm) { toast.error('Passwords do not match'); return }
    setSaving(true)
    try {
      await createStudentPortalAccess({
        studentId: Number(studentForm.studentId),
        email: studentForm.email,
        password: studentForm.password,
      })
      setCredentials({ title: 'Student Portal Credentials', email: studentForm.email, password: studentForm.password })
      setStudentOpen(false)
      setStudentForm({ studentId: '', email: '', password: '', confirm: '' })
      setStudentSearch('')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create access')
    } finally { setSaving(false) }
  }

  async function handleCreateParentAccess() {
    if (!parentForm.name || !parentForm.email || !parentForm.password || parentForm.studentIds.length === 0) {
      toast.error('Fill all required fields'); return
    }
    if (parentForm.password !== parentForm.confirm) { toast.error('Passwords do not match'); return }
    setSaving(true)
    try {
      await createParentPortalAccess({
        name: parentForm.name,
        email: parentForm.email,
        password: parentForm.password,
        relation: parentForm.relation,
        studentIds: parentForm.studentIds,
      })
      setCredentials({ title: 'Parent Portal Credentials', email: parentForm.email, password: parentForm.password })
      setParentOpen(false)
      setParentForm({ name: '', email: '', password: '', confirm: '', relation: 'Father', studentIds: [] })
      setParentSearch('')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create access')
    } finally { setSaving(false) }
  }

  async function revokeStudent(studentId: number) {
    if (!confirm('Revoke this student portal access?')) return
    await removeStudentPortalAccess(studentId)
    toast.success('Student portal access revoked')
    load()
  }

  async function revokeParent(userId: number) {
    if (!confirm('Revoke this parent portal access?')) return
    await removeParentPortalAccess(userId)
    toast.success('Parent portal access revoked')
    load()
  }

  function copyCredentials() {
    if (!credentials) return
    navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`)
    toast.success('Credentials copied')
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Portal Access Management</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Create student and parent login accounts.</p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="students">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="students">Student Portals</TabsTrigger>
            <TabsTrigger value="parents">Parent Portals</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4 pt-4">
            <Button onClick={() => setStudentOpen(true)} className="gap-2">
              <KeyRound className="h-4 w-4" />
              Grant Student Portal Access
            </Button>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Student Name</th>
                    <th className="px-4 py-3 text-left">Class</th>
                    <th className="px-4 py-3 text-left">Portal Email</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : data?.studentProfiles.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No student portals yet</td></tr>
                  ) : data?.studentProfiles.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium">{p.student.firstName} {p.student.lastName}</td>
                      <td className="px-4 py-3">{p.student.class.name} – {p.student.class.section}</td>
                      <td className="px-4 py-3">{p.user.email}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={p.user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                          {p.user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => revokeStudent(p.studentId)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="parents" className="space-y-4 pt-4">
            <Button onClick={() => setParentOpen(true)} className="gap-2">
              <Link2 className="h-4 w-4" />
              Grant Parent Portal Access
            </Button>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Parent Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Linked Students</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : data?.parentProfiles.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No parent portals yet</td></tr>
                  ) : data?.parentProfiles.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium">{p.user.name}</td>
                      <td className="px-4 py-3">{p.user.email}</td>
                      <td className="px-4 py-3">
                        {p.students.map((s) => `${s.student.firstName} ${s.student.lastName}`).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={p.user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                          {p.user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => revokeParent(p.userId)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={studentOpen} onOpenChange={setStudentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Grant Student Portal Access</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Search Student</Label>
              <Input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Student name or reg#" />
              {studentSearch && filteredStudentOptions.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-lg border">
                  {filteredStudentOptions.map((s) => (
                    <button key={s.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => selectStudentForPortal(s)}>
                      {s.firstName} {s.lastName} <span className="text-xs text-muted-foreground">({s.registrationNumber})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={studentForm.email} onChange={(e) => setStudentForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="flex gap-2">
                <Input value={studentForm.password} onChange={(e) => setStudentForm((f) => ({ ...f, password: e.target.value }))} />
                <Button variant="outline" onClick={() => {
                  const p = randomPassword()
                  setStudentForm((f) => ({ ...f, password: p, confirm: p }))
                }}>Generate</Button>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Confirm Password</Label><Input value={studentForm.confirm} onChange={(e) => setStudentForm((f) => ({ ...f, confirm: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreateStudentAccess} disabled={saving}>{saving ? 'Creating...' : 'Create Portal Access'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={parentOpen} onOpenChange={setParentOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Grant Parent Portal Access</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Parent Name</Label><Input value={parentForm.name} onChange={(e) => setParentForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={parentForm.email} onChange={(e) => setParentForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>Password</Label><Input value={parentForm.password} onChange={(e) => setParentForm((f) => ({ ...f, password: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Confirm</Label><Input value={parentForm.confirm} onChange={(e) => setParentForm((f) => ({ ...f, confirm: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Relation</Label><Input value={parentForm.relation} onChange={(e) => setParentForm((f) => ({ ...f, relation: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Link Students</Label>
              <Input value={parentSearch} onChange={(e) => setParentSearch(e.target.value)} placeholder="Search students" />
              {parentSearch && filteredParentStudentOptions.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-lg border">
                  {filteredParentStudentOptions.map((s) => {
                    const selected = parentForm.studentIds.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => setParentForm((f) => ({
                          ...f,
                          studentIds: selected ? f.studentIds.filter((id) => id !== s.id) : [...f.studentIds, s.id],
                        }))}
                      >
                        {selected ? '✓ ' : ''}{s.firstName} {s.lastName} <span className="text-xs text-muted-foreground">({s.registrationNumber})</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{parentForm.studentIds.length} student(s) selected</p>
            </div>
          </div>
          <DialogFooter><Button onClick={handleCreateParentAccess} disabled={saving}>{saving ? 'Creating...' : 'Create Portal Access'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentials} onOpenChange={(o) => { if (!o) setCredentials(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{credentials?.title}</DialogTitle>
            <DialogDescription>Share these credentials securely.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p><b>Email:</b> {credentials?.email}</p>
            <p><b>Password:</b> {credentials?.password}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentials(null)}>Close</Button>
            <Button onClick={copyCredentials} className="gap-2"><Copy className="h-4 w-4" />Copy Credentials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Credentials Reset */}
      <div className="border-t pt-4 mt-2">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setBulkOpen((o) => !o)}
        >
          <div>
            <p className="font-semibold text-sm">Bulk Credentials Reset</p>
            <p className="text-xs text-muted-foreground">Admin tools for portal passwords and credential exports</p>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${bulkOpen ? 'rotate-180' : ''}`} />
        </button>

        {bulkOpen && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={bulkBusy}
              onClick={() => setResetOpen(true)}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Reset All Student Passwords to Registration Numbers
            </Button>
            <Button
              variant="outline"
              disabled={bulkBusy}
              onClick={async () => {
                setBulkBusy(true)
                try {
                  const rows = await getAllPortalCredentialsExport()
                  const header = ['Student Name', 'Reg#', 'Class', 'Student Email', 'Parent Email', 'Parent Account Status']
                  const csv = [
                    header.join(','),
                    ...rows.map((r) =>
                      [r.studentName, r.registrationNumber, r.className, r.studentEmail, r.parentEmail, r.parentAccountStatus]
                        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                        .join(',')
                    ),
                  ].join('\n')
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'all-portal-credentials.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success('Credentials CSV downloaded (emails only)')
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed to export')
                } finally {
                  setBulkBusy(false)
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download All Portal Credentials
            </Button>
          </div>
        )}
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset All Student Passwords?</DialogTitle>
            <DialogDescription>
              This will reset ALL student portal passwords to their registration numbers.
              Students will be prompted to change on next login. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={bulkBusy}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkBusy}
              onClick={async () => {
                setBulkBusy(true)
                try {
                  const { count } = await resetAllStudentPasswordsToRegNumbers()
                  toast.success(`Reset ${count} student passwords`)
                  setResetOpen(false)
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed to reset')
                } finally {
                  setBulkBusy(false)
                }
              }}
            >
              {bulkBusy ? 'Resetting...' : 'Yes, Reset All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

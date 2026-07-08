'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, KeyRound, UserCheck, UserX, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  getAllUsers, createUser, updateUser, resetUserPassword, toggleUserActive,
} from '@/lib/actions/settings'
import PortalAccessManagement from './PortalAccessManagement'

type User = Awaited<ReturnType<typeof getAllUsers>>[number]

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
] as const

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-violet-100 text-violet-700',
  TEACHER: 'bg-blue-100 text-blue-700',
  RECEPTIONIST: 'bg-slate-100 text-slate-700',
  PARENT: 'bg-emerald-100 text-emerald-700',
  STUDENT: 'bg-amber-100 text-amber-700',
}

export default function UsersPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ? Number(session.user.id) : null

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Add dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'TEACHER' as User['role'] })
  const [addSaving, setAddSaving] = useState(false)

  // Edit dialog
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'TEACHER' as User['role'], isActive: true })
  const [editSaving, setEditSaving] = useState(false)

  // Reset password dialog
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetSaving, setResetSaving] = useState(false)

  // Toggle confirm
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)
  const [toggleOpen, setToggleOpen] = useState(false)
  const [toggling, setToggling] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setUsers(await getAllUsers())
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  // ── Add ──────────────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!addForm.name || !addForm.email || !addForm.password) {
      toast.error('All fields are required'); return
    }
    if (addForm.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setAddSaving(true)
    try {
      await createUser({ name: addForm.name, email: addForm.email, password: addForm.password, role: addForm.role })
      toast.success(`User "${addForm.name}" created`)
      setAddOpen(false)
      setAddForm({ name: '', email: '', password: '', role: 'TEACHER' })
      loadUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create user')
    } finally { setAddSaving(false) }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  function openEdit(user: User) {
    setEditUser(user)
    setEditForm({ name: user.name, email: user.email, role: user.role, isActive: user.isActive })
  }

  async function handleEdit() {
    if (!editUser) return
    setEditSaving(true)
    try {
      await updateUser(editUser.id, editForm)
      toast.success('User updated')
      setEditUser(null)
      loadUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update user')
    } finally { setEditSaving(false) }
  }

  // ── Reset Password ───────────────────────────────────────────────────────────
  async function handleReset() {
    if (!resetUser) return
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setResetSaving(true)
    try {
      await resetUserPassword(resetUser.id, newPassword)
      toast.success('Password reset successfully')
      setResetUser(null)
      setNewPassword('')
    } catch {
      toast.error('Failed to reset password')
    } finally { setResetSaving(false) }
  }

  // ── Toggle Active ────────────────────────────────────────────────────────────
  async function handleToggle() {
    if (!toggleTarget) return
    setToggling(true)
    try {
      await toggleUserActive(toggleTarget.id)
      toast.success(`User ${toggleTarget.isActive ? 'deactivated' : 'activated'}`)
      setToggleOpen(false)
      loadUsers()
    } catch {
      toast.error('Failed to update user status')
    } finally { setToggling(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? '...' : `${users.length} user${users.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-slate-100 rounded animate-pulse w-28" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              users.map((user) => {
                const isMe = user.id === currentUserId
                return (
                  <TableRow key={user.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">
                      {user.name}
                      {isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs hover:opacity-100', ROLE_COLORS[user.role] ?? '')}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs hover:opacity-100', user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="h-8 w-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                          title="Edit user"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setResetUser(user); setNewPassword('') }}
                          className="h-8 w-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                          title="Reset password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { if (!isMe) { setToggleTarget(user); setToggleOpen(true) } }}
                          disabled={isMe}
                          className={cn(
                            'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
                            isMe
                              ? 'opacity-30 cursor-not-allowed'
                              : user.isActive
                                ? 'hover:bg-red-50 text-slate-500 hover:text-red-600'
                                : 'hover:bg-emerald-50 text-slate-500 hover:text-emerald-600'
                          )}
                          title={isMe ? 'Cannot deactivate your own account' : user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PortalAccessManagement />

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Full name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="email@school.com" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" placeholder="Min 6 characters" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm((f) => ({ ...f, role: (v ?? 'TEACHER') as User['role'] }))}>
                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addSaving}>{addSaving ? 'Creating...' : 'Create User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: (v ?? 'TEACHER') as User['role'] }))}>
                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editSaving}>{editSaving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(o) => { if (!o) setResetUser(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reset Password — {resetUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>New Password *</Label>
            <Input type="password" placeholder="Min 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)} disabled={resetSaving}>Cancel</Button>
            <Button onClick={handleReset} disabled={resetSaving}>{resetSaving ? 'Resetting...' : 'Reset Password'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Active Confirmation */}
      <Dialog open={toggleOpen} onOpenChange={setToggleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{toggleTarget?.isActive ? 'Deactivate' : 'Activate'} User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to {toggleTarget?.isActive ? 'deactivate' : 'activate'}{' '}
            <span className="font-semibold text-slate-900">{toggleTarget?.name}</span>?
            {toggleTarget?.isActive && ' They will no longer be able to log in.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleOpen(false)} disabled={toggling}>Cancel</Button>
            <Button onClick={handleToggle} disabled={toggling}
              className={toggleTarget?.isActive ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            >
              {toggling ? 'Updating...' : toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

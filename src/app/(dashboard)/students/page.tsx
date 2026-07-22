'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Pencil,
  Eye,
  Users,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import BackButton from '@/components/shared/BackButton'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getStudents,
  getClasses,
  deleteStudent,
  type StudentWithClass,
  type ClassWithYear,
} from '@/lib/actions/students'

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  LEFT: 'bg-slate-100 text-slate-600',
  GRADUATED: 'bg-blue-100 text-blue-700',
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  LEFT: 'Left',
  GRADUATED: 'Graduated',
}

export default function StudentsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const canModify = session?.user?.role !== 'TEACHER'
  const [students, setStudents] = useState<StudentWithClass[]>([])
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getStudents({
        search: search || undefined,
        classId: classFilter !== 'ALL' ? Number(classFilter) : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      })
      setStudents(data)
    } finally {
      setLoading(false)
    }
  }, [search, classFilter, statusFilter])

  useEffect(() => {
    getClasses().then(setClasses)
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteStudent(deleteId)
      toast.success('Student deleted successfully')
      setDeleteId(null)
      fetchStudents()
    } catch {
      toast.error('Failed to delete student')
    } finally {
      setDeleting(false)
    }
  }

  const deleteTarget = students.find((s) => s.id === deleteId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? '...' : `${students.length} student${students.length !== 1 ? 's' : ''} found`}
          </p>
          </div>
        </div>
        {canModify && (
          <div className="flex items-center gap-2">
            {session?.user?.role === 'ADMIN' && (
              <Link href="/students/import" className={buttonVariants({ variant: 'outline' })}>
                <Upload className="h-4 w-4 mr-2" />
                Import Students
              </Link>
            )}
            <Link href="/students/new" className={buttonVariants()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or reg#..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={classFilter} onValueChange={(v) => setClassFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-full sm:w-44 h-9">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={String(cls.id)}>
                {cls.name} – {cls.section}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'ALL')}>
          <SelectTrigger className="w-full sm:w-36 h-9">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="LEFT">Left</SelectItem>
            <SelectItem value="GRADUATED">Graduated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="w-32">Reg #</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Guardian Phone</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-7 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <Users className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No students found</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      {search || classFilter !== 'ALL' || statusFilter !== 'ALL'
                        ? 'Try adjusting your filters'
                        : 'Get started by adding your first student'}
                    </p>
                    {!search && classFilter === 'ALL' && statusFilter === 'ALL' && canModify && (
                      <Link href="/students/new" className={buttonVariants({ size: 'sm' })}>
                        <Plus className="h-4 w-4 mr-1" /> Add First Student
                      </Link>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow
                  key={student.id}
                  className="cursor-pointer hover:bg-slate-50/50"
                  onClick={() => router.push(`/students/${student.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {student.registrationNumber}
                  </TableCell>
                  <TableCell className="font-medium">
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {student.class.name} – {student.class.section}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {student.guardianPhone}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[student.status]}`}
                    >
                      {statusLabels[student.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-slate-100 outline-none">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => router.push(`/students/${student.id}`)}
                        >
                          <Eye className="h-4 w-4" /> View
                        </DropdownMenuItem>
                        {canModify && (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => router.push(`/students/${student.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        {canModify && (
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => setDeleteId(student.id)}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.firstName} {deleteTarget?.lastName}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

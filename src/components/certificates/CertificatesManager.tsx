'use client'

import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { CertificateStatus, CertificateType } from '@prisma/client'
import { toast } from 'sonner'

import {
  deleteCertificate,
  getCertificates,
  revokeCertificate,
  type CertificateWithRelations,
} from '@/lib/actions/certificates'
import { getStudents } from '@/lib/actions/students'
import { cn, formatDate } from '@/lib/utils'
import { UserRole } from '@/types'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import IssueCertificateDialog from './IssueCertificateDialog'

type StudentItem = Awaited<ReturnType<typeof getStudents>>[number]

function typeBadge(type: CertificateType) {
  const base = 'px-2 py-0.5 text-xs font-medium rounded-full'
  if (type === 'BIRTH') return <span className={cn(base, 'bg-blue-100 text-blue-700')}>Birth Certificate</span>
  if (type === 'SCHOOL_LEAVING') return <span className={cn(base, 'bg-orange-100 text-orange-800')}>School Leaving</span>
  return <span className={cn(base, 'bg-purple-100 text-purple-700')}>Character</span>
}

function statusBadge(status: CertificateStatus) {
  const base = 'px-2 py-0.5 text-xs font-medium rounded-full'
  if (status === 'ISSUED') return <span className={cn(base, 'bg-emerald-100 text-emerald-700')}>Issued</span>
  return <span className={cn(base, 'bg-red-100 text-red-700')}>Revoked</span>
}

interface Props {
  role: UserRole
  userId: number
}

export default function CertificatesManager({ role, userId }: Props) {
  const [rows, setRows] = useState<CertificateWithRelations[]>([])
  const [students, setStudents] = useState<StudentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [issueOpen, setIssueOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [type, setType] = useState<'ALL' | CertificateType>('ALL')
  const [status, setStatus] = useState<'ALL' | CertificateStatus>('ALL')

  async function load() {
    setLoading(true)
    try {
      const [certs, stds] = await Promise.all([
        getCertificates({
          type: type === 'ALL' ? undefined : type,
          status: status === 'ALL' ? undefined : status,
          search: search || undefined,
        }),
        getStudents({ status: 'ACTIVE', limit: 200 }),
      ])
      setRows(certs)
      setStudents(stds)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.certificateNumber.toLowerCase().includes(q) ||
      `${r.student.firstName} ${r.student.lastName}`.toLowerCase().includes(q)
    )
  }, [rows, search])

  async function onRevoke(id: number) {
    if (!confirm('Are you sure you want to revoke this certificate? This action cannot be undone.')) return
    try {
      await revokeCertificate(id)
      toast.success('Certificate revoked')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke')
    }
  }

  async function onDelete(id: number) {
    if (!confirm('Delete this revoked certificate?')) return
    try {
      await deleteCertificate(id)
      toast.success('Certificate deleted')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 md:flex-row">
          <Input
            placeholder="Search by student or certificate #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-xs"
          />
          <Select value={type} onValueChange={(v) => setType((v as CertificateType) || 'ALL')}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="BIRTH">Birth Certificate</SelectItem>
              <SelectItem value="SCHOOL_LEAVING">School Leaving</SelectItem>
              <SelectItem value="CHARACTER">Character Certificate</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus((v as CertificateStatus) || 'ALL')}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ISSUED">Issued</SelectItem>
              <SelectItem value="REVOKED">Revoked</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>Apply</Button>
        </div>
        <Button onClick={() => setIssueOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Issue Certificate
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead>Certificate #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Issued By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No certificates found</TableCell></TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className={r.status === 'REVOKED' ? 'opacity-80' : ''}>
                  <TableCell className="font-mono font-semibold">{r.certificateNumber}</TableCell>
                  <TableCell>{typeBadge(r.type)}</TableCell>
                  <TableCell className={r.status === 'REVOKED' ? 'line-through' : ''}>{r.student.firstName} {r.student.lastName}</TableCell>
                  <TableCell>{r.student.class.name} - {r.student.class.section}</TableCell>
                  <TableCell>{formatDate(r.issueDate)}</TableCell>
                  <TableCell>{r.issuedBy.name}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 w-8 p-0')}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => window.open(`/print/certificate/${r.id}`, '_blank')}>
                          Print Certificate
                        </DropdownMenuItem>
                        {role === 'ADMIN' && r.status === 'ISSUED' && (
                          <DropdownMenuItem onClick={() => onRevoke(r.id)}>
                            Revoke
                          </DropdownMenuItem>
                        )}
                        {role === 'ADMIN' && r.status === 'REVOKED' && (
                          <DropdownMenuItem onClick={() => onDelete(r.id)} className="text-red-600">
                            Delete
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
      </div>

      <IssueCertificateDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        issuedById={userId}
        students={students}
        onIssued={load}
      />
    </div>
  )
}


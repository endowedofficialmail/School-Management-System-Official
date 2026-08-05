'use client'

import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { CertificateStatus, CertificateType } from '@prisma/client'
import { toast } from 'sonner'

import {
  deleteCertificate,
  getTeacherLetters,
  revokeCertificate,
} from '@/lib/actions/certificates'
import { cn, formatDate } from '@/lib/utils'
import { UserRole } from '@/types'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import IssueTeacherLetterDialog from './IssueTeacherLetterDialog'

type LetterRow = Awaited<ReturnType<typeof getTeacherLetters>>[number]

function typeBadge(type: CertificateType) {
  const base = 'px-2 py-0.5 text-xs font-medium rounded-full'
  if (type === 'OFFER_LETTER') return <span className={cn(base, 'bg-blue-100 text-blue-700')}>Offer</span>
  if (type === 'EXPERIENCE_LETTER') return <span className={cn(base, 'bg-emerald-100 text-emerald-700')}>Experience</span>
  return <span className={cn(base, 'bg-orange-100 text-orange-700')}>Resignation</span>
}

function statusBadge(status: CertificateStatus) {
  const base = 'px-2 py-0.5 text-xs font-medium rounded-full'
  if (status === 'ISSUED') return <span className={cn(base, 'bg-emerald-100 text-emerald-700')}>Issued</span>
  return <span className={cn(base, 'bg-red-100 text-red-700')}>Revoked</span>
}

export default function TeacherLettersManager({ role, userId }: { role: UserRole; userId: number }) {
  const [rows, setRows] = useState<LetterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [issueOpen, setIssueOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'ALL' | CertificateType>('ALL')
  const [status, setStatus] = useState<'ALL' | CertificateStatus>('ALL')

  async function load() {
    setLoading(true)
    try {
      const letters = await getTeacherLetters({
        type: type === 'ALL' ? undefined : type,
        status: status === 'ALL' ? undefined : status,
        search: search || undefined,
      })
      setRows(letters)
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
      (r.teacher?.name ?? '').toLowerCase().includes(q)
    )
  }, [rows, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 md:flex-row">
          <Input placeholder="Search by teacher or letter #" value={search} onChange={(e) => setSearch(e.target.value)} className="md:max-w-xs" />
          <Select value={type} onValueChange={(v) => setType((v as CertificateType) || 'ALL')}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="OFFER_LETTER">Offer Letter</SelectItem>
              <SelectItem value="EXPERIENCE_LETTER">Experience Letter</SelectItem>
              <SelectItem value="RESIGNATION_LETTER">Resignation Letter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus((v as CertificateStatus) || 'ALL')}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
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
          Issue Teacher Letter
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>Letter #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Teacher Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No letters found</TableCell></TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-semibold">{r.certificateNumber}</TableCell>
                  <TableCell>{typeBadge(r.type)}</TableCell>
                  <TableCell>{r.teacher?.name ?? '—'}</TableCell>
                  <TableCell>{r.designation ?? '—'}</TableCell>
                  <TableCell>{formatDate(r.issueDate)}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 w-8 p-0')}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(`/print/letter/${r.id}`, '_blank')}>Print</DropdownMenuItem>
                        {role === 'ADMIN' && r.status === 'ISSUED' && (
                          <DropdownMenuItem onClick={async () => {
                            if (!confirm('Revoke this letter?')) return
                            await revokeCertificate(r.id)
                            toast.success('Letter revoked')
                            load()
                          }}>Revoke</DropdownMenuItem>
                        )}
                        {role === 'ADMIN' && r.status === 'REVOKED' && (
                          <DropdownMenuItem className="text-red-600" onClick={async () => {
                            if (!confirm('Delete this letter?')) return
                            await deleteCertificate(r.id)
                            toast.success('Letter deleted')
                            load()
                          }}>Delete</DropdownMenuItem>
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

      <IssueTeacherLetterDialog open={issueOpen} onOpenChange={setIssueOpen} issuedById={userId} onIssued={load} />
    </div>
  )
}

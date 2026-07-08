'use client'

import { useEffect, useState } from 'react'
import { Award, Printer } from 'lucide-react'
import { CertificateStatus, CertificateType } from '@prisma/client'
import { toast } from 'sonner'

import { buttonVariants, Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { getStudents } from '@/lib/actions/students'
import { getStudentCertificates, revokeCertificate } from '@/lib/actions/certificates'
import IssueCertificateDialog from './IssueCertificateDialog'
import { UserRole } from '@/types'

type StudentItem = Awaited<ReturnType<typeof getStudents>>[number]
type StudentCert = Awaited<ReturnType<typeof getStudentCertificates>>[number]

function typeBadge(type: CertificateType) {
  const base = 'px-2 py-0.5 text-xs font-medium rounded-full'
  if (type === 'BIRTH') return <span className={cn(base, 'bg-blue-100 text-blue-700')}>Birth</span>
  if (type === 'SCHOOL_LEAVING') return <span className={cn(base, 'bg-orange-100 text-orange-800')}>Leaving</span>
  return <span className={cn(base, 'bg-purple-100 text-purple-700')}>Character</span>
}

function statusBadge(status: CertificateStatus) {
  const base = 'px-2 py-0.5 text-xs font-medium rounded-full'
  if (status === 'ISSUED') return <span className={cn(base, 'bg-emerald-100 text-emerald-700')}>Issued</span>
  return <span className={cn(base, 'bg-red-100 text-red-700')}>Revoked</span>
}

interface Props {
  studentId: number
  userId: number
  role: UserRole
}

export default function StudentCertificatesTab({ studentId, userId, role }: Props) {
  const [rows, setRows] = useState<StudentCert[]>([])
  const [students, setStudents] = useState<StudentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [issueOpen, setIssueOpen] = useState(false)

  async function load() {
    setLoading(true)
    const [certs, stds] = await Promise.all([
      getStudentCertificates(studentId),
      getStudents({ status: 'ACTIVE', limit: 200 }),
    ])
    setRows(certs)
    setStudents(stds)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  async function onRevoke(id: number) {
    if (!confirm('Revoke this certificate?')) return
    try {
      await revokeCertificate(id)
      toast.success('Certificate revoked')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke')
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading certificates...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} certificates issued</p>
        {(role === 'ADMIN' || role === 'RECEPTIONIST') && (
          <Button onClick={() => setIssueOpen(true)}>
            <Award className="h-4 w-4 mr-2" />
            Issue Certificate
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No certificates issued yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-3 py-2 text-left font-semibold">Certificate #</th>
                <th className="px-3 py-2 text-left font-semibold">Type</th>
                <th className="px-3 py-2 text-left font-semibold">Issue Date</th>
                <th className="px-3 py-2 text-left font-semibold">Issued By</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className={r.status === 'REVOKED' ? 'opacity-80' : ''}>
                  <td className={cn('px-3 py-2 font-mono font-medium', r.status === 'REVOKED' && 'line-through')}>
                    {r.certificateNumber}
                  </td>
                  <td className="px-3 py-2">{typeBadge(r.type)}</td>
                  <td className="px-3 py-2">{formatDate(r.issueDate)}</td>
                  <td className="px-3 py-2">{r.issuedBy.name}</td>
                  <td className="px-3 py-2">{statusBadge(r.status)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8')}
                        onClick={() => window.open(`/print/certificate/${r.id}`, '_blank')}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1" />
                        Print
                      </button>
                      {role === 'ADMIN' && r.status === 'ISSUED' && (
                        <button
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 text-red-600')}
                          onClick={() => onRevoke(r.id)}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <IssueCertificateDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        issuedById={userId}
        students={students}
        defaultStudentId={studentId}
        onIssued={load}
      />
    </div>
  )
}


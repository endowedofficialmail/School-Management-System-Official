'use client'

import { Copy, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import type { PortalCredentials } from '@/lib/actions/bulk-import'

export type CredentialsDialogData = PortalCredentials & {
  studentName: string
  registrationNumber: string
  className: string
}

export default function PortalCredentialsDialog({
  open,
  data,
  onContinue,
}: {
  open: boolean
  data: CredentialsDialogData | null
  onContinue: () => void
}) {
  if (!data) return null

  const text = [
    `Student: ${data.studentName}`,
    `Reg#: ${data.registrationNumber}`,
    `Class: ${data.className}`,
    '',
    'STUDENT LOGIN:',
    `Email: ${data.studentEmail}`,
    `Password: ${data.studentPassword}`,
    '',
    'PARENT LOGIN:',
    `Email: ${data.parentEmail}`,
    `Password: ${data.parentPassword}`,
  ].join('\n')

  function copyAll() {
    void navigator.clipboard.writeText(text)
    toast.success('Credentials copied to clipboard')
  }

  function printSlip() {
    const payload = [{
      studentName: data!.studentName,
      registrationNumber: data!.registrationNumber,
      className: data!.className,
      studentEmail: data!.studentEmail,
      studentPassword: data!.studentPassword,
      parentEmail: data!.parentEmail,
      parentPassword: data!.parentPassword,
    }]
    sessionStorage.setItem('portal-credentials-print', JSON.stringify(payload))
    window.open('/print/credentials', '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onContinue() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Student added successfully!</DialogTitle>
          <DialogDescription>
            Portal accounts have been created. Share these credentials with the student and parent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm rounded-lg border bg-slate-50 p-4">
          <div>
            <p className="font-semibold text-slate-900 mb-1">Student Portal</p>
            <p>Email: <span className="font-mono">{data.studentEmail || '—'}</span></p>
            <p>Password: <span className="font-mono">{data.studentPassword || '—'}</span></p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-1">Parent Portal</p>
            <p>Email: <span className="font-mono">{data.parentEmail || '—'}</span></p>
            <p>Password: <span className="font-mono">{data.parentPassword || '—'}</span></p>
            {!data.parentAccountCreated && data.parentEmail && (
              <p className="text-xs text-amber-700 mt-1">
                Linked to an existing parent account (same phone / sibling).
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={copyAll}>
            <Copy className="h-4 w-4 mr-2" /> Copy Credentials
          </Button>
          <Button type="button" variant="outline" onClick={printSlip}>
            <Printer className="h-4 w-4 mr-2" /> Print Credentials
          </Button>
          <Button type="button" onClick={onContinue}>
            Continue to Students List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

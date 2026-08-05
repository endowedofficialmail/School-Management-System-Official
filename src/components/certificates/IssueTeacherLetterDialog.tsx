'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Briefcase, FileText, LogOut, CheckCircle2 } from 'lucide-react'
import { CertificateType } from '@prisma/client'
import { toast } from 'sonner'

import { issueTeacherLetter } from '@/lib/actions/certificates'
import { getTeachers } from '@/lib/actions/lms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type TeacherItem = Awaited<ReturnType<typeof getTeachers>>[number]
type LetterType = 'OFFER_LETTER' | 'EXPERIENCE_LETTER' | 'RESIGNATION_LETTER'

type FormState = {
  type: LetterType | null
  teacherId: string
  issueDate: string
  designation: string
  joiningDate: string
  leavingDate: string
  workingHours: string
  terms: string
  salary: string
  noticePeriod: string
  resignationDate: string
  lastWorkingDate: string
  reasonForLeaving: string
  notes: string
}

const INITIAL: FormState = {
  type: null,
  teacherId: '',
  issueDate: format(new Date(), 'yyyy-MM-dd'),
  designation: '',
  joiningDate: '',
  leavingDate: '',
  workingHours: '8 hours per day, Monday to Saturday',
  terms: '',
  salary: '',
  noticePeriod: '30 days',
  resignationDate: '',
  lastWorkingDate: '',
  reasonForLeaving: '',
  notes: '',
}

function TextareaField(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="min-h-[90px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      {...props}
    />
  )
}

export default function IssueTeacherLetterDialog({
  open,
  onOpenChange,
  issuedById,
  onIssued,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  issuedById: number
  onIssued: () => void
}) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [teachers, setTeachers] = useState<TeacherItem[]>([])
  const [issuedId, setIssuedId] = useState<number | null>(null)
  const [issuedNumber, setIssuedNumber] = useState('')
  const [form, setForm] = useState<FormState>(INITIAL)

  useEffect(() => {
    if (open) getTeachers().then(setTeachers)
  }, [open])

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === Number(form.teacherId)) ?? null,
    [teachers, form.teacherId]
  )

  function reset() {
    setStep(1)
    setSaving(false)
    setIssuedId(null)
    setIssuedNumber('')
    setForm(INITIAL)
  }

  function validateStep2() {
    if (!form.designation.trim()) { toast.error('Designation is required'); return false }
    if (form.type === 'OFFER_LETTER' && !form.joiningDate) { toast.error('Joining date is required'); return false }
    if (form.type === 'EXPERIENCE_LETTER') {
      if (!form.joiningDate || !form.leavingDate) { toast.error('Joining and leaving dates are required'); return false }
    }
    if (form.type === 'RESIGNATION_LETTER') {
      if (!form.resignationDate || !form.lastWorkingDate) { toast.error('Resignation and last working dates are required'); return false }
    }
    return true
  }

  async function onIssue() {
    if (!form.type || !selectedTeacher) return
    setSaving(true)
    try {
      const created = await issueTeacherLetter({
        type: form.type,
        teacherId: selectedTeacher.id,
        issuedById,
        issueDate: new Date(form.issueDate),
        designation: form.designation,
        joiningDate: form.joiningDate ? new Date(form.joiningDate) : undefined,
        leavingDate: form.leavingDate ? new Date(form.leavingDate) : undefined,
        workingHours: form.workingHours || undefined,
        terms: form.terms || undefined,
        salary: form.salary || undefined,
        noticePeriod: form.noticePeriod || undefined,
        resignationDate: form.resignationDate ? new Date(form.resignationDate) : undefined,
        lastWorkingDate: form.lastWorkingDate ? new Date(form.lastWorkingDate) : undefined,
        reasonForLeaving: form.reasonForLeaving || undefined,
        notes: form.notes || undefined,
      })
      setIssuedId(created.id)
      setIssuedNumber(created.certificateNumber)
      setStep(4)
      toast.success(`Letter ${created.certificateNumber} issued`)
      onIssued()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to issue letter')
    } finally {
      setSaving(false)
    }
  }

  const typeCards = [
    { type: 'OFFER_LETTER' as LetterType, title: 'Offer Letter', desc: 'Issued to newly hired teachers', icon: Briefcase },
    { type: 'EXPERIENCE_LETTER' as LetterType, title: 'Experience Letter', desc: 'Issued to current or former teachers', icon: FileText },
    { type: 'RESIGNATION_LETTER' as LetterType, title: 'Resignation Letter', desc: 'Issued upon teacher resignation', icon: LogOut },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue Teacher Letter</DialogTitle>
          <DialogDescription>Step {step} of 3</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-3">
              {typeCards.map(({ type, title, desc, icon: Icon }) => (
                <Card
                  key={type}
                  className={cn('cursor-pointer transition-colors', form.type === type && 'ring-2 ring-primary')}
                  onClick={() => setForm((f) => ({ ...f, type }))}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Teacher *</Label>
              <Select value={form.teacherId} onValueChange={(v) => setForm((f) => ({ ...f, teacherId: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && form.type && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Designation *</Label>
              <Input value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} placeholder="Mathematics Teacher" />
            </div>
            {form.type === 'OFFER_LETTER' && (
              <>
                <div className="space-y-1.5"><Label>Joining Date *</Label><Input type="date" value={form.joiningDate} onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Working Hours</Label><Input value={form.workingHours} onChange={(e) => setForm((f) => ({ ...f, workingHours: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Terms & Conditions</Label><TextareaField value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Salary (optional — leave blank)</Label><Input value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} placeholder="Leave blank" /></div>
              </>
            )}
            {form.type === 'EXPERIENCE_LETTER' && (
              <>
                <div className="space-y-1.5"><Label>Joining Date *</Label><Input type="date" value={form.joiningDate} onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Leaving Date *</Label><Input type="date" value={form.leavingDate} onChange={(e) => setForm((f) => ({ ...f, leavingDate: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Reason for Leaving</Label><Input value={form.reasonForLeaving} onChange={(e) => setForm((f) => ({ ...f, reasonForLeaving: e.target.value }))} /></div>
              </>
            )}
            {form.type === 'RESIGNATION_LETTER' && (
              <>
                <div className="space-y-1.5"><Label>Resignation Date *</Label><Input type="date" value={form.resignationDate} onChange={(e) => setForm((f) => ({ ...f, resignationDate: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Notice Period</Label><Input value={form.noticePeriod} onChange={(e) => setForm((f) => ({ ...f, noticePeriod: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Last Working Date *</Label><Input type="date" value={form.lastWorkingDate} onChange={(e) => setForm((f) => ({ ...f, lastWorkingDate: e.target.value }))} /></div>
              </>
            )}
            <div className="space-y-1.5"><Label>Issue Date</Label><Input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} /></div>
          </div>
        )}

        {step === 3 && selectedTeacher && (
          <div className="space-y-2 text-sm">
            <p><b>Type:</b> {form.type?.replace(/_/g, ' ')}</p>
            <p><b>Teacher:</b> {selectedTeacher.name}</p>
            <p><b>Designation:</b> {form.designation}</p>
            {form.joiningDate && <p><b>Joining:</b> {form.joiningDate}</p>}
            {form.leavingDate && <p><b>Leaving:</b> {form.leavingDate}</p>}
          </div>
        )}

        {step === 4 && issuedId && (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <p className="font-semibold">Letter {issuedNumber} issued successfully</p>
            <Button onClick={() => window.open(`/print/letter/${issuedId}`, '_blank')}>Print Now</Button>
          </div>
        )}

        {step < 4 && (
          <DialogFooter>
            {step > 1 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>}
            {step === 1 && (
              <Button
                onClick={() => {
                  if (!form.type) { toast.error('Select letter type'); return }
                  if (!form.teacherId) { toast.error('Select teacher'); return }
                  setStep(2)
                }}
              >
                Next
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => { if (validateStep2()) setStep(3) }}>Next</Button>
            )}
            {step === 3 && (
              <Button onClick={onIssue} disabled={saving}>{saving ? 'Issuing…' : 'Issue Letter'}</Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

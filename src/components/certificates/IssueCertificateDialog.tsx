'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Baby, FileBadge, Shield, CheckCircle2 } from 'lucide-react'
import { CertificateType } from '@prisma/client'
import { toast } from 'sonner'

import { issueCertificate } from '@/lib/actions/certificates'
import { getStudents } from '@/lib/actions/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type StudentItem = Awaited<ReturnType<typeof getStudents>>[number]

type FormState = {
  type: CertificateType | null
  studentId: string
  issueDate: string
  notes: string
  birthPlace: string
  birthDate: string
  fatherName: string
  motherName: string
  fatherCNIC: string
  motherCNIC: string
  fatherOccupation: string
  dateOfLeaving: string
  lastClass: string
  reasonForLeaving: string
  conductDuringStay: string
  characterRemarks: string
  purpose: string
}

const INITIAL_STATE: FormState = {
  type: null,
  studentId: '',
  issueDate: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
  birthPlace: '',
  birthDate: '',
  fatherName: '',
  motherName: '',
  fatherCNIC: '',
  motherCNIC: '',
  fatherOccupation: '',
  dateOfLeaving: '',
  lastClass: '',
  reasonForLeaving: '',
  conductDuringStay: '',
  characterRemarks: 'bears good moral character and has been a disciplined student',
  purpose: '',
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  issuedById: number
  students: StudentItem[]
  defaultStudentId?: number
  onIssued: () => void
}

function TextareaField(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="min-h-[90px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      {...props}
    />
  )
}

export default function IssueCertificateDialog({
  open,
  onOpenChange,
  issuedById,
  students,
  defaultStudentId,
  onIssued,
}: Props) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [issuedId, setIssuedId] = useState<number | null>(null)
  const [issuedNumber, setIssuedNumber] = useState<string>('')
  const [studentSearch, setStudentSearch] = useState('')
  const [form, setForm] = useState<FormState>({
    ...INITIAL_STATE,
    studentId: defaultStudentId ? String(defaultStudentId) : '',
  })

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return students.slice(0, 10)
    return students
      .filter((s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.registrationNumber.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [studentSearch, students])

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === Number(form.studentId)) ?? null,
    [students, form.studentId]
  )

  function reset() {
    setStep(1)
    setSaving(false)
    setIssuedId(null)
    setIssuedNumber('')
    setStudentSearch('')
    setForm({
      ...INITIAL_STATE,
      studentId: defaultStudentId ? String(defaultStudentId) : '',
      lastClass: defaultStudentId
        ? (students.find((s) => s.id === defaultStudentId)
          ? `${students.find((s) => s.id === defaultStudentId)?.class.name} - ${students.find((s) => s.id === defaultStudentId)?.class.section}`
          : '')
        : '',
    })
  }

  function chooseType(type: CertificateType) {
    setForm((f) => ({ ...f, type }))
  }

  function validateStep1() {
    if (!form.type) {
      toast.error('Select certificate type')
      return false
    }
    if (!form.studentId) {
      toast.error('Select student')
      return false
    }
    return true
  }

  function validateStep2() {
    if (form.type === 'BIRTH') {
      if (!form.birthPlace || !form.fatherName || !form.motherName) {
        toast.error('Birth place, father name, and mother name are required')
        return false
      }
    }
    if (form.type === 'SCHOOL_LEAVING') {
      if (!form.dateOfLeaving || !form.lastClass || !form.reasonForLeaving || !form.conductDuringStay) {
        toast.error('Complete all required school leaving fields')
        return false
      }
    }
    if (form.type === 'CHARACTER') {
      if (!form.purpose.trim()) {
        toast.error('Purpose is required')
        return false
      }
    }
    return true
  }

  async function onIssue() {
    if (!form.type || !selectedStudent) return
    setSaving(true)
    try {
      const created = await issueCertificate({
        type: form.type,
        studentId: selectedStudent.id,
        issuedById,
        issueDate: new Date(form.issueDate),
        notes: form.notes || undefined,
        birthPlace: form.birthPlace || undefined,
        birthDate: form.birthDate || undefined,
        fatherName: form.fatherName || selectedStudent.guardianName,
        motherName: form.motherName || undefined,
        fatherCNIC: form.fatherCNIC || undefined,
        motherCNIC: form.motherCNIC || undefined,
        fatherOccupation: form.fatherOccupation || undefined,
        dateOfLeaving: form.dateOfLeaving ? new Date(form.dateOfLeaving) : undefined,
        lastClass: form.lastClass || `${selectedStudent.class.name} - ${selectedStudent.class.section}`,
        reasonForLeaving: form.reasonForLeaving || undefined,
        conductDuringStay: form.conductDuringStay || undefined,
        characterRemarks: form.characterRemarks || undefined,
        purpose: form.purpose || undefined,
      })
      setIssuedId(created.id)
      setIssuedNumber(created.certificateNumber)
      setStep(4)
      toast.success(`Certificate ${created.certificateNumber} issued successfully`)
      onIssued()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to issue certificate')
    } finally {
      setSaving(false)
    }
  }

  const typeCards = [
    {
      type: 'BIRTH' as CertificateType,
      title: 'Birth Certificate',
      desc: 'Official birth record for a student',
      icon: Baby,
    },
    {
      type: 'SCHOOL_LEAVING' as CertificateType,
      title: 'School Leaving Certificate',
      desc: 'Issued when a student leaves the school',
      icon: FileBadge,
    },
    {
      type: 'CHARACTER' as CertificateType,
      title: 'Character Certificate',
      desc: "Certifies student's moral character",
      icon: Shield,
    },
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue Certificate</DialogTitle>
          <DialogDescription>
            Step {Math.min(step, 3)} of 3
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {typeCards.map((card) => {
                const Icon = card.icon
                const active = form.type === card.type
                return (
                  <button
                    type="button"
                    key={card.type}
                    onClick={() => chooseType(card.type)}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-colors',
                      active ? 'border-primary bg-primary/5' : 'hover:bg-slate-50'
                    )}
                  >
                    <Icon className="h-5 w-5 text-primary mb-2" />
                    <div className="font-semibold text-sm">{card.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{card.desc}</div>
                  </button>
                )
              })}
            </div>

            <div className="space-y-2">
              <Label>Student</Label>
              <Input
                placeholder="Search by name or registration number"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <div className="max-h-44 overflow-auto rounded-lg border">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        studentId: String(s.id),
                        birthDate: s.dateOfBirth ? format(new Date(s.dateOfBirth), 'yyyy-MM-dd') : f.birthDate,
                        fatherName: f.fatherName || s.guardianName,
                        lastClass: `${s.class.name} - ${s.class.section}`,
                      }))
                    }
                    className={cn(
                      'w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50',
                      Number(form.studentId) === s.id && 'bg-primary/5'
                    )}
                  >
                    <div className="font-medium">{s.firstName} {s.lastName}</div>
                    <div className="text-xs text-muted-foreground">{s.registrationNumber} • {s.class.name} - {s.class.section}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 2 && form.type === 'BIRTH' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Birth Place *</Label>
              <Input value={form.birthPlace} onChange={(e) => setForm((f) => ({ ...f, birthPlace: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Father&apos;s Name *</Label>
              <Input value={form.fatherName} onChange={(e) => setForm((f) => ({ ...f, fatherName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mother&apos;s Name *</Label>
              <Input value={form.motherName} onChange={(e) => setForm((f) => ({ ...f, motherName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Father&apos;s CNIC</Label>
              <Input value={form.fatherCNIC} onChange={(e) => setForm((f) => ({ ...f, fatherCNIC: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mother&apos;s CNIC</Label>
              <Input value={form.motherCNIC} onChange={(e) => setForm((f) => ({ ...f, motherCNIC: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Father&apos;s Occupation</Label>
              <Input value={form.fatherOccupation} onChange={(e) => setForm((f) => ({ ...f, fatherOccupation: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <TextareaField value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        )}

        {step === 2 && form.type === 'SCHOOL_LEAVING' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date of Leaving *</Label>
              <Input type="date" value={form.dateOfLeaving} onChange={(e) => setForm((f) => ({ ...f, dateOfLeaving: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Last Class Attended *</Label>
              <Input value={form.lastClass} onChange={(e) => setForm((f) => ({ ...f, lastClass: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Reason for Leaving *</Label>
              <Input value={form.reasonForLeaving} onChange={(e) => setForm((f) => ({ ...f, reasonForLeaving: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Conduct During Stay *</Label>
              <Input value={form.conductDuringStay} onChange={(e) => setForm((f) => ({ ...f, conductDuringStay: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <TextareaField value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        )}

        {step === 2 && form.type === 'CHARACTER' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Character Remarks</Label>
              <TextareaField value={form.characterRemarks} onChange={(e) => setForm((f) => ({ ...f, characterRemarks: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Purpose *</Label>
              <Input value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <TextareaField value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="p-4 text-sm space-y-2">
              <p><span className="font-medium">Type:</span> {form.type?.replace('_', ' ')}</p>
              <p><span className="font-medium">Student:</span> {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : '—'}</p>
              <p><span className="font-medium">Issue Date:</span> {form.issueDate}</p>
              {form.notes && <p><span className="font-medium">Notes:</span> {form.notes}</p>}
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Certificate issued successfully
            </div>
            <p className="mt-2 text-emerald-800">Certificate Number: <span className="font-mono">{issuedNumber}</span></p>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => issuedId && window.open(`/print/certificate/${issuedId}`, '_blank')}
              >
                Print Now
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && step < 4 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step === 1 && (
            <Button
              onClick={() => {
                if (!validateStep1()) return
                setStep(2)
              }}
            >
              Next
            </Button>
          )}
          {step === 2 && (
            <Button
              onClick={() => {
                if (!validateStep2()) return
                setStep(3)
              }}
            >
              Review
            </Button>
          )}
          {step === 3 && (
            <Button onClick={onIssue} disabled={saving}>
              {saving ? 'Issuing...' : 'Issue Certificate'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { GraduationCap, Loader2, CheckCircle2, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { compressAndConvertToBase64 } from '@/lib/utils'
import { isSystemSetup, setupSystem } from '@/lib/actions/setup'

const setupSchema = z.object({
  schoolName: z.string().min(3, 'School name must be at least 3 characters'),
  address: z.string().min(10, 'Please enter a complete address'),
  phone: z.string().regex(/^(0[0-9]{2,3}-?[0-9]{7,8})$/, 'Enter a valid Pakistani phone number e.g. 051-1234567'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  logoBase64: z.string().min(1, 'School logo is required'),
  adminName: z.string().min(2, 'Admin name is required'),
  adminEmail: z.string().email('Enter a valid email'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
  academicYearName: z.string().min(1, 'Academic year name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
})

type SetupValues = z.infer<typeof setupSchema> & { adminPasswordConfirm: string }

type FieldErrors = Partial<Record<keyof SetupValues, string>>

const MAX_FILE_BYTES = 2 * 1024 * 1024

export default function SetupPage() {
  const router = useRouter()
  const currentYear = new Date().getFullYear()
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [fileWarning, setFileWarning] = useState('')

  const [form, setForm] = useState<SetupValues>({
    schoolName: '',
    address: '',
    phone: '',
    email: '',
    logoBase64: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    academicYearName: `${currentYear}-${currentYear + 1}`,
    startDate: `${currentYear}-04-01`,
    endDate: `${currentYear + 1}-03-31`,
  })

  useEffect(() => {
    isSystemSetup().then((setup) => {
      if (setup) router.replace('/login')
      else setChecking(false)
    })
  }, [router])

  function setField<K extends keyof SetupValues>(key: K, value: SetupValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleLogoChange(file?: File) {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setFileWarning('Image too large. Please use an image under 2MB')
      setField('logoBase64', '')
      return
    }
    setFileWarning('')
    try {
      const base64 = await compressAndConvertToBase64(file)
      setField('logoBase64', base64)
    } catch {
      toast.error('Failed to process image')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = setupSchema.safeParse(form)
    const nextErrors: FieldErrors = {}

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof SetupValues
        nextErrors[key] = issue.message
      }
    }
    if (form.adminPassword !== form.adminPasswordConfirm) {
      nextErrors.adminPasswordConfirm = 'Passwords do not match'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      toast.error('Please fix the highlighted fields')
      return
    }

    setSaving(true)
    try {
      await setupSystem({
        schoolName: form.schoolName.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || undefined,
        logoBase64: form.logoBase64,
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
        academicYearName: form.academicYearName.trim(),
        academicYearStartDate: form.startDate,
        academicYearEndDate: form.endDate,
      })
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Setup failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const logoPreview = useMemo(() => form.logoBase64 || null, [form.logoBase64])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Setup Complete!</h2>
          <p className="text-sm text-slate-500">Redirecting you to the login page…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-lg">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome — First Time Setup</h1>
          <p className="text-slate-500 text-sm mt-1 text-center max-w-sm">
            Enter your school details to get started. This runs once on a fresh installation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="shadow-sm border-0 shadow-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">School Information</CardTitle>
              <CardDescription>Basic details about your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="school-name">School Name *</Label>
                <Input id="school-name" placeholder="e.g. Bright Future Academy" value={form.schoolName} onChange={(e) => setField('schoolName', e.target.value)} />
                {errors.schoolName && <p className="text-xs text-red-500">{errors.schoolName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" placeholder="e.g. 45 Main Blvd, Lahore, Pakistan" value={form.address} onChange={(e) => setField('address', e.target.value)} />
                {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" placeholder="e.g. 051-1234567 or 0300-1234567" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="school-email">School Email</Label>
                  <Input id="school-email" type="email" placeholder="info@school.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>School Logo *</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:bg-slate-100">
                  <ImagePlus className="h-6 w-6 text-slate-500 mb-2" />
                  <span className="text-sm font-medium text-slate-700">Click to upload school logo</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, WEBP up to 2MB</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => void handleLogoChange(e.target.files?.[0])}
                  />
                </label>
                {fileWarning && <p className="text-xs text-red-500">{fileWarning}</p>}
                {errors.logoBase64 && <p className="text-xs text-red-500">{errors.logoBase64}</p>}
                {logoPreview && (
                  <div className="rounded-xl border bg-white p-4">
                    <Image src={logoPreview} alt="School logo preview" width={240} height={120} className="max-h-[120px] w-auto object-contain" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 shadow-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Academic Year</CardTitle>
              <CardDescription>This active academic year is created automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="academic-year">Academic Year Name *</Label>
                <Input id="academic-year" value={form.academicYearName} onChange={(e) => setField('academicYearName', e.target.value)} />
                {errors.academicYearName && <p className="text-xs text-red-500">{errors.academicYearName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="year-start">Start Date *</Label>
                  <Input id="year-start" type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
                  {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year-end">End Date *</Label>
                  <Input id="year-end" type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} />
                  {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 shadow-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Admin Account</CardTitle>
              <CardDescription>Create the primary administrator account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="admin-name">Admin Name *</Label>
                <Input id="admin-name" placeholder="Full name" value={form.adminName} onChange={(e) => setField('adminName', e.target.value)} />
                {errors.adminName && <p className="text-xs text-red-500">{errors.adminName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Email *</Label>
                <Input id="admin-email" type="email" placeholder="admin@school.com" value={form.adminEmail} onChange={(e) => setField('adminEmail', e.target.value)} />
                {errors.adminEmail && <p className="text-xs text-red-500">{errors.adminEmail}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" placeholder="Min 6 characters" value={form.adminPassword} onChange={(e) => setField('adminPassword', e.target.value)} />
                  {errors.adminPassword && <p className="text-xs text-red-500">{errors.adminPassword}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm Password *</Label>
                  <Input id="confirm" type="password" placeholder="Repeat password" value={form.adminPasswordConfirm} onChange={(e) => setField('adminPasswordConfirm', e.target.value)} />
                  {errors.adminPasswordConfirm && <p className="text-xs text-red-500">{errors.adminPasswordConfirm}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up…</>
            ) : (
              'Complete Setup & Create Account'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

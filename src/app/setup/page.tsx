'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { isSystemSetup, setupSystem } from '@/lib/actions/setup'

export default function SetupPage() {
  const router = useRouter()
  const currentYear = new Date().getFullYear()
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    schoolName: '',
    address: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    academicYearName: `${currentYear}-${currentYear + 1}`,
    academicYearStartDate: `${currentYear}-04-01`,
    academicYearEndDate: `${currentYear + 1}-03-31`,
  })

  // Redirect if already set up
  useEffect(() => {
    isSystemSetup().then((setup) => {
      if (setup) router.replace('/login')
      else setChecking(false)
    })
  }, [router])

  function f(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.schoolName.trim()) { toast.error('School name is required'); return }
    if (!form.adminName.trim() || !form.adminEmail.trim()) { toast.error('Admin name and email are required'); return }
    if (form.adminPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (form.adminPassword !== form.adminPasswordConfirm) { toast.error('Passwords do not match'); return }

    setSaving(true)
    try {
      await setupSystem({
        schoolName: form.schoolName.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
        academicYearName: form.academicYearName.trim(),
        academicYearStartDate: form.academicYearStartDate,
        academicYearEndDate: form.academicYearEndDate,
      })
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Setup failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

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
      <div className="w-full max-w-lg">
        {/* Logo / Title */}
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
          {/* School Info */}
          <Card className="shadow-sm border-0 shadow-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">School Information</CardTitle>
              <CardDescription>Basic details about your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="school-name">School Name *</Label>
                <Input id="school-name" placeholder="e.g. Bright Future Academy" value={form.schoolName} onChange={(e) => f('schoolName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" placeholder="e.g. 45 Main Blvd, Lahore" value={form.address} onChange={(e) => f('address', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" placeholder="+92 300 0000000" value={form.phone} onChange={(e) => f('phone', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Academic Year */}
          <Card className="shadow-sm border-0 shadow-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Academic Year</CardTitle>
              <CardDescription>This active academic year is created automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="academic-year">Academic Year Name *</Label>
                <Input id="academic-year" value={form.academicYearName} onChange={(e) => f('academicYearName', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="year-start">Start Date *</Label>
                  <Input id="year-start" type="date" value={form.academicYearStartDate} onChange={(e) => f('academicYearStartDate', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year-end">End Date *</Label>
                  <Input id="year-end" type="date" value={form.academicYearEndDate} onChange={(e) => f('academicYearEndDate', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Account */}
          <Card className="shadow-sm border-0 shadow-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Admin Account</CardTitle>
              <CardDescription>Create the primary administrator account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="admin-name">Admin Name *</Label>
                <Input id="admin-name" placeholder="Full name" value={form.adminName} onChange={(e) => f('adminName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Email *</Label>
                <Input id="admin-email" type="email" placeholder="admin@school.com" value={form.adminEmail} onChange={(e) => f('adminEmail', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" placeholder="Min 6 characters" value={form.adminPassword} onChange={(e) => f('adminPassword', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm Password *</Label>
                  <Input id="confirm" type="password" placeholder="Repeat password" value={form.adminPasswordConfirm} onChange={(e) => f('adminPasswordConfirm', e.target.value)} />
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

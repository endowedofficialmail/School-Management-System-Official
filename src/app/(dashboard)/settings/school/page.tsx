'use client'

import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import BackButton from '@/components/shared/BackButton'
import { getSchoolProfile, updateSchoolProfile } from '@/lib/actions/settings'

export default function SchoolProfilePage() {
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '', logoUrl: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSchoolProfile().then((school) => {
      if (school) {
        setForm({
          name: school.name ?? '',
          address: school.address ?? '',
          phone: school.phone ?? '',
          email: school.email ?? '',
          logoUrl: school.logoUrl ?? '',
        })
      }
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    if (!form.name.trim()) { toast.error('School name is required'); return }
    setSaving(true)
    try {
      await updateSchoolProfile({
        name: form.name.trim(),
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        logoUrl: form.logoUrl || undefined,
      })
      toast.success('School profile updated')
    } catch {
      toast.error('Failed to update school profile')
    } finally {
      setSaving(false)
    }
  }

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">School Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            This information appears on reports and the login page
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">School Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                  <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="school-name">School Name *</Label>
                <Input
                  id="school-name"
                  placeholder="e.g. Bright Future Academy"
                  value={form.name}
                  onChange={(e) => field('name', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="e.g. 123 Main Street, Lahore"
                  value={form.address}
                  onChange={(e) => field('address', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+92 300 0000000"
                    value={form.phone}
                    onChange={(e) => field('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@school.com"
                    value={form.email}
                    onChange={(e) => field('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="logo">
                  Logo URL{' '}
                  <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                </Label>
                <Input
                  id="logo"
                  placeholder="https://example.com/logo.png"
                  value={form.logoUrl}
                  onChange={(e) => field('logoUrl', e.target.value)}
                />
                {form.logoUrl && (
                  <div className="mt-2 p-3 border rounded-lg bg-slate-50 inline-flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.logoUrl}
                      alt="School logo preview"
                      className="h-12 w-12 object-contain rounded"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                    <span className="text-xs text-muted-foreground">Logo preview</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Camera, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import BackButton from '@/components/shared/BackButton'
import { compressAndConvertToBase64 } from '@/lib/utils'
import { getSchoolProfile, updateSchoolProfile } from '@/lib/actions/settings'

const profileSchema = z.object({
  name: z.string().min(3, 'School name must be at least 3 characters'),
  address: z.string().min(10, 'Please enter a complete address'),
  phone: z.string().regex(/^(0[0-9]{2,3}-?[0-9]{7,8})$/, 'Enter a valid Pakistani phone number e.g. 051-1234567'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  logoUrl: z.string().min(1, 'School logo is required'),
})

type ProfileValues = z.infer<typeof profileSchema>
type Errors = Partial<Record<keyof ProfileValues, string>>

const MAX_FILE_BYTES = 2 * 1024 * 1024

export default function SchoolProfilePage() {
  const [form, setForm] = useState<ProfileValues>({
    name: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fileWarning, setFileWarning] = useState('')

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

  function setField<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleLogoChange(file?: File) {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setFileWarning('Image too large. Please use an image under 2MB')
      setField('logoUrl', '')
      return
    }
    setFileWarning('')
    try {
      const base64 = await compressAndConvertToBase64(file)
      setField('logoUrl', base64)
    } catch {
      toast.error('Failed to process image')
    }
  }

  async function handleSave() {
    const parsed = profileSchema.safeParse(form)
    if (!parsed.success) {
      const nextErrors: Errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ProfileValues
        nextErrors[key] = issue.message
      }
      setErrors(nextErrors)
      toast.error('Please fix the highlighted fields')
      return
    }

    setSaving(true)
    try {
      await updateSchoolProfile({
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email || undefined,
        logoUrl: form.logoUrl,
      })
      toast.success('School profile updated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update school profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">School Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            This information appears on reports, certificates, and the login page
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
              <div className="space-y-2">
                <Label>School Logo *</Label>
                {form.logoUrl ? (
                  <label className="group relative flex h-[100px] w-[100px] cursor-pointer overflow-hidden rounded-2xl border bg-slate-50">
                    <Image src={form.logoUrl} alt="School logo" fill className="object-contain p-2" />
                    <div className="absolute inset-0 hidden items-center justify-center bg-black/45 text-xs font-medium text-white group-hover:flex">
                      Change Logo
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      className="hidden"
                      onChange={(e) => void handleLogoChange(e.target.files?.[0])}
                    />
                  </label>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:bg-slate-100">
                    <Camera className="h-6 w-6 text-slate-500 mb-2" />
                    <span className="text-sm font-medium text-slate-700">Upload School Logo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      className="hidden"
                      onChange={(e) => void handleLogoChange(e.target.files?.[0])}
                    />
                  </label>
                )}
                {fileWarning && <p className="text-xs text-red-500">{fileWarning}</p>}
                {errors.logoUrl && <p className="text-xs text-red-500">{errors.logoUrl}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="school-name">School Name *</Label>
                <Input id="school-name" placeholder="e.g. Bright Future Academy" value={form.name} onChange={(e) => setField('name', e.target.value)} />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" placeholder="e.g. 45 Main Blvd, Lahore, Pakistan" value={form.address} onChange={(e) => setField('address', e.target.value)} />
                {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" placeholder="e.g. 051-1234567 or 0300-1234567" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="info@school.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
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

'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { changePortalPassword } from '@/lib/actions/portal'

export default function ChangePasswordForm() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (!session?.user?.id) {
      toast.error('Not authenticated')
      return
    }

    setSaving(true)
    try {
      await changePortalPassword(Number(session.user.id), password)
      await update()
      toast.success('Password updated')
      const dest = session.user.role === 'PARENT' ? '/portal/parent' : '/portal/student'
      router.replace(dest)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Please set a new password</CardTitle>
          <p className="text-sm text-muted-foreground">
            For your security, please change your auto-generated password before continuing.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Set Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

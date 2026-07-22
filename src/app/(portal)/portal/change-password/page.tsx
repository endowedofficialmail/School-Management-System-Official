'use client'

import ChangePasswordGuard from '@/components/portal/ChangePasswordGuard'
import ChangePasswordPage from './ChangePasswordForm'

export default function Page() {
  return (
    <ChangePasswordGuard>
      <ChangePasswordPage />
    </ChangePasswordGuard>
  )
}

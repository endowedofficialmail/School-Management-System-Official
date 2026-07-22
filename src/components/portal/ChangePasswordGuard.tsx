'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

/** Redirect to portal home if password change is not required. */
export default function ChangePasswordGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (session?.user?.mustChangePassword === false) {
      const dest = session.user.role === 'PARENT' ? '/portal/parent' : '/portal/student'
      router.replace(dest)
    }
  }, [session, status, router])

  return <>{children}</>
}

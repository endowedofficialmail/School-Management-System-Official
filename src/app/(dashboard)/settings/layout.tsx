import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AccessDenied from '@/components/shared/AccessDenied'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return <AccessDenied />
  }
  return <>{children}</>
}

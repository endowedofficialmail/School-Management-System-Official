import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AccessDenied from '@/components/shared/AccessDenied'

export default async function FeesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (role !== 'ADMIN' && role !== 'RECEPTIONIST') {
    return <AccessDenied />
  }
  return <>{children}</>
}

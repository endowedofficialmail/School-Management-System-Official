import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import AccessDenied from '@/components/shared/AccessDenied'
import PromotionHistoryClient from './PromotionHistoryClient'

export const dynamic = 'force-dynamic'

export default async function PromotionHistoryPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (!session || !role) notFound()
  if (role !== 'ADMIN') return <AccessDenied />
  return <PromotionHistoryClient />
}


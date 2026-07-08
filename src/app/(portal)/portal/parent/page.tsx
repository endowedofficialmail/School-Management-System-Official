import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authOptions } from '@/lib/auth'
import { getParentPortalData } from '@/lib/actions/portal'
import { prisma } from '@/lib/prisma'
import ParentPortalClient from './ParentPortalClient'

export default async function ParentPortalPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  try {
    const [data, school] = await Promise.all([
      getParentPortalData(Number(session.user.id)),
      prisma.school.findFirst({ select: { phone: true, email: true } }),
    ])
    return <ParentPortalClient data={data} school={school} />
  } catch {
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Parent profile not found.
        </CardContent>
      </Card>
    )
  }
}

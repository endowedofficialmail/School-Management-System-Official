import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { getCertificateStats } from '@/lib/actions/certificates'
import AccessDenied from '@/components/shared/AccessDenied'
import Breadcrumb from '@/components/shared/Breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, Baby, LogOut, Shield } from 'lucide-react'
import CertificatesManager from '@/components/certificates/CertificatesManager'

export const dynamic = 'force-dynamic'

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (!session || !role) notFound()
  if (role !== 'ADMIN' && role !== 'RECEPTIONIST') {
    return <AccessDenied />
  }
  const userId = Number(session.user.id)

  const stats = await getCertificateStats()

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Certificates' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Certificates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Issue and manage birth, leaving, and character certificates
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Issued</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold">{stats.totalIssued}</div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Award className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Birth Certificates</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold">{stats.birthCertificates}</div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Baby className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">School Leaving</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold">{stats.schoolLeavingCertificates}</div>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <LogOut className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Character Certificates</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold">{stats.characterCertificates}</div>
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <CertificatesManager role={role} userId={userId} />
    </div>
  )
}


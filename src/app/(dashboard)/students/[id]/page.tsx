import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, Pencil, Award, IdCard } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@/types'
import { cn } from '@/lib/utils'

import { buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getStudentById } from '@/lib/actions/students'
import StudentResultsTab from './StudentResultsTab'
import StudentFeeHistoryTab from './StudentFeeHistoryTab'
import AttendanceCalendar from '@/components/portal/AttendanceCalendar'
import Breadcrumb from '@/components/shared/Breadcrumb'
import StudentCertificatesTab from '@/components/certificates/StudentCertificatesTab'
import StudentRollSlipsTab from '@/components/rollslips/StudentRollSlipsTab'
import { getStudentPromotionHistory } from '@/lib/actions/promotions'

const statusConfig = {
  ACTIVE: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  LEFT: { label: 'Left', className: 'bg-slate-100 text-slate-600' },
  GRADUATED: { label: 'Graduated', className: 'bg-blue-100 text-blue-700' },
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-slate-900">{value || '—'}</span>
    </div>
  )
}

export default async function StudentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const id = Number(params.id)
  if (isNaN(id)) notFound()

  const [student, session, promoHistory] = await Promise.all([
    getStudentById(id),
    getServerSession(authOptions),
    getStudentPromotionHistory(id),
  ])
  if (!student) notFound()
  const role = session?.user?.role as UserRole | undefined
  const userId = session?.user?.id ? Number(session.user.id) : 0

  const fullName = `${student.firstName} ${student.lastName}`
  const initials = `${student.firstName[0]}${student.lastName[0]}`.toUpperCase()
  const status = statusConfig[student.status]

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Students', href: '/students' },
        { label: fullName },
      ]} />
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/students" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{fullName}</h1>
        </div>
        <Link href={`/students/${id}/edit`} className={buttonVariants()}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Student
        </Link>
      </div>

      {/* Profile header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16 text-lg">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-slate-900">{fullName}</h2>
              <p className="text-sm font-mono text-muted-foreground">
                {student.registrationNumber}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
                {Number(student.advanceBalance) > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Advance Credit: Rs. {Number(student.advanceBalance).toLocaleString('en-PK')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="fees">Fee History</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="certificates">
            <Award className="h-3.5 w-3.5 mr-1" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="rollslips">
            <IdCard className="h-3.5 w-3.5 mr-1" />
            Roll Slips
          </TabsTrigger>
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile" className="pt-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoRow
                  label="Date of Birth"
                  value={student.dateOfBirth ? format(new Date(student.dateOfBirth), 'PP') : null}
                />
                <InfoRow
                  label="Gender"
                  value={student.gender === 'MALE' ? 'Male' : 'Female'}
                />
                <InfoRow
                  label="Class"
                  value={`${student.class.name} – ${student.class.section}`}
                />
                <InfoRow
                  label="Admission Date"
                  value={format(new Date(student.admissionDate), 'PP')}
                />
                <InfoRow label="Status" value={status.label} />
                <InfoRow
                  label="Address"
                  value={student.address}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Guardian Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4">
                <InfoRow label="Guardian Name" value={student.guardianName} />
                <InfoRow label="Guardian Phone" value={student.guardianPhone} />
                <InfoRow label="Guardian CNIC" value={student.guardianCNIC} />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Promotion History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {promoHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No promotion records yet.</p>
              ) : (
                <div className="space-y-4">
                  {promoHistory.map((r) => (
                    <div key={r.id} className="flex gap-3">
                      <div className={cn(
                        'mt-1 h-2.5 w-2.5 rounded-full shrink-0',
                        r.wasPromoted ? 'bg-emerald-500' : 'bg-red-500',
                      )} />
                      <div className="min-w-0">
                        <p className={cn('text-sm font-semibold', r.wasPromoted ? 'text-emerald-700' : 'text-red-700')}>
                          {new Date(r.promotedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                          — {r.wasPromoted ? 'Promoted' : 'Held Back'}
                        </p>
                        <p className="text-sm text-slate-700">
                          {r.fromClass.name}–{r.fromClass.section} → {r.toClass.name}–{r.toClass.section}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Promoted by: {r.promotedBy.name} • {r.fromAcademicYear.name} → {r.toAcademicYear.name}
                        </p>
                        {!r.wasPromoted && r.notes && (
                          <p className="text-xs text-red-700 mt-1">
                            Reason: {r.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee History tab */}
        <TabsContent value="fees" className="pt-4">
          <StudentFeeHistoryTab
            studentId={id}
            advanceBalance={Number(student.advanceBalance)}
            isAdmin={role === 'ADMIN'}
            adminId={userId}
            adminName={session?.user?.name ?? 'Admin'}
          />
        </TabsContent>

        {/* Attendance tab */}
        <TabsContent value="attendance" className="pt-4">
          <AttendanceCalendar studentId={id} />
        </TabsContent>

        {/* Results tab */}
        <TabsContent value="results" className="pt-4">
          <StudentResultsTab studentId={id} />
        </TabsContent>

        <TabsContent value="certificates" className="pt-4">
          {role && userId ? (
            <StudentCertificatesTab studentId={id} role={role} userId={userId} />
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load certificates.</p>
          )}
        </TabsContent>

        <TabsContent value="rollslips" className="pt-4">
          <StudentRollSlipsTab studentId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

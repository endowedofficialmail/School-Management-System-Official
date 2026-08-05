'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserRole } from '@/types'
import CertificatesManager from '@/components/certificates/CertificatesManager'
import TeacherLettersManager from '@/components/certificates/TeacherLettersManager'

export default function CertificatesTabs({
  role,
  userId,
  stats,
}: {
  role: UserRole
  userId: number
  stats: {
    offerLetters: number
    experienceLetters: number
    resignationLetters: number
  }
}) {
  return (
    <Tabs defaultValue="students">
      <TabsList>
        <TabsTrigger value="students">Student Certificates</TabsTrigger>
        <TabsTrigger value="teachers">Teacher Letters</TabsTrigger>
      </TabsList>
      <TabsContent value="students" className="pt-4">
        <CertificatesManager role={role} userId={userId} />
      </TabsContent>
      <TabsContent value="teachers" className="pt-4 space-y-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[
            { label: 'Offer Letters', value: stats.offerLetters },
            { label: 'Experience Letters', value: stats.experienceLetters },
            { label: 'Resignation Letters', value: stats.resignationLetters },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border bg-white p-4">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="text-3xl font-bold mt-1">{c.value}</p>
            </div>
          ))}
        </div>
        <TeacherLettersManager role={role} userId={userId} />
      </TabsContent>
    </Tabs>
  )
}

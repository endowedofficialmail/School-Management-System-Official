import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type StudentLike = {
  firstName: string
  lastName: string
  registrationNumber: string
  status: string
  class: { name: string; section: string; academicYear?: { name: string } }
}

export default function StudentSummaryCard({
  student,
  relation,
}: {
  student: StudentLike
  relation?: string
}) {
  const fullName = `${student.firstName} ${student.lastName}`
  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm opacity-80">Welcome</p>
            <h1 className="text-2xl font-bold leading-tight">{fullName}</h1>
            <p className="mt-1 font-mono text-sm opacity-90">{student.registrationNumber}</p>
          </div>
          <Badge className={cn('bg-white/20 text-white hover:bg-white/20')}>
            {student.status}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/15 p-3">
            <p className="opacity-75">Class</p>
            <p className="font-semibold">{student.class.name} – {student.class.section}</p>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            <p className="opacity-75">{relation ? 'Relation' : 'Academic Year'}</p>
            <p className="font-semibold">{relation ?? student.class.academicYear?.name ?? '—'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

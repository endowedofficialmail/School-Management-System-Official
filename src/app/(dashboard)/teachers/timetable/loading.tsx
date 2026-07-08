import { Skeleton } from '@/components/ui/skeleton'

export default function TeacherTimetableLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-32" /></div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export default function TeacherTimetableDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
    </div>
  )
}

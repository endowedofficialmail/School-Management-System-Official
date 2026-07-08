import { Skeleton } from '@/components/ui/skeleton'

export default function StudentPortalLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  )
}

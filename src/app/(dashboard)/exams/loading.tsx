import { Skeleton } from '@/components/ui/skeleton'

export default function ExamsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="rounded-xl border bg-white p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 border-b py-3 last:border-0">
            {Array.from({ length: 6 }).map((__, j) => <Skeleton key={j} className="h-4 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export default function ExamResultsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-44" /></div>
      <div className="flex gap-4"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-32" /></div>
      <Skeleton className="h-10 w-72" />
      <div className="rounded-xl border bg-white p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-3 border-b py-3 last:border-0">
            {Array.from({ length: 6 }).map((__, j) => <Skeleton key={j} className="h-4 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  )
}

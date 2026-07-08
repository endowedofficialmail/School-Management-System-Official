import { Skeleton } from '@/components/ui/skeleton'

export default function FeeVouchersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between"><Skeleton className="h-8 w-52" /><Skeleton className="h-9 w-36" /></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-36" />)}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export default function DatesheetLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-72" />
      <div className="flex justify-between"><Skeleton className="h-8 w-80" /><Skeleton className="h-9 w-36" /></div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

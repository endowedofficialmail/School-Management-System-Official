'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { markAnnouncementRead } from '@/lib/actions/lms'

type Announcement = Awaited<ReturnType<typeof import('@/lib/actions/lms').getAnnouncements>>[number]

export default function ParentAnnouncementsClient({
  announcements: initial,
  userId,
}: {
  announcements: Announcement[]
  userId: number
}) {
  const [announcements, setAnnouncements] = useState(initial)
  const [expanded, setExpanded] = useState<number | null>(null)

  async function handleOpen(id: number) {
    setExpanded(expanded === id ? null : id)
    const ann = announcements.find((a) => a.id === id)
    if (ann && ann.readReceipts.length === 0) {
      try {
        await markAnnouncementRead(id, userId)
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, readReceipts: [{ id: 1, userId, announcementId: id, readAt: new Date() }] } : a
          )
        )
      } catch {
        // silent
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Announcements</h1>
      {announcements.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No announcements</CardContent></Card>
      ) : (
        announcements.map((a) => {
          const isUnread = a.readReceipts.length === 0
          return (
            <Card
              key={a.id}
              className={`cursor-pointer ${isUnread ? 'border-l-4 border-l-blue-500' : ''} ${a.isImportant ? 'bg-orange-50/50' : ''}`}
              onClick={() => handleOpen(a.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{a.title}</p>
                  {a.isImportant && <Badge className="bg-orange-100 text-orange-700">Important</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {a.postedBy.name} · {format(new Date(a.createdAt), 'dd MMM yyyy')}
                </p>
                {expanded === a.id && (
                  <p className="text-sm mt-3 whitespace-pre-wrap">{a.content}</p>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

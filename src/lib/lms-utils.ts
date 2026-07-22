/** YouTube / Google Drive URL helpers for LMS lessons */

export function isValidVideoUrl(url: string): boolean {
  return (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('drive.google.com')
  )
}

export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.slice(1)
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
      const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/)
      if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`
    }
  } catch {
    return null
  }
  return null
}

export function getYouTubeThumbnail(url: string): string | null {
  const embed = getYouTubeEmbedUrl(url)
  if (!embed) return null
  const id = embed.split('/embed/')[1]
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null
}

export function getLessonTypeBadges(lesson: {
  content?: string | null
  videoUrl?: string | null
  pdfUrl?: string | null
}): string[] {
  const badges: string[] = []
  if (lesson.videoUrl) badges.push('Video')
  if (lesson.pdfUrl) badges.push('PDF')
  if (lesson.content) badges.push('Text')
  return badges
}

export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

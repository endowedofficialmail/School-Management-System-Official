/**
 * Calculate a letter grade from marks.
 * Importable by both server actions and client components.
 */
export function calculateGrade(marksObtained: number, totalMarks: number): string {
  if (totalMarks <= 0 || isNaN(marksObtained) || isNaN(totalMarks)) return 'N/A'
  const pct = (marksObtained / totalMarks) * 100
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 50) return 'D'
  return 'F'
}

export const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-700',
  'A':  'bg-green-100 text-green-700',
  'B':  'bg-blue-100 text-blue-700',
  'C':  'bg-yellow-100 text-yellow-700',
  'D':  'bg-orange-100 text-orange-700',
  'F':  'bg-red-100 text-red-700',
  'N/A':'bg-slate-100 text-slate-500',
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

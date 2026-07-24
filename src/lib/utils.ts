import { clsx, type ClassValue } from "clsx"
import { format } from "date-fns"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | number): string {
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatCurrency(amount: number | string): string {
  return `Rs. ${Number(amount).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function dateToWords(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen', 'Twenty', 'Twenty One', 'Twenty Two',
    'Twenty Three', 'Twenty Four', 'Twenty Five', 'Twenty Six', 'Twenty Seven',
    'Twenty Eight', 'Twenty Nine', 'Thirty', 'Thirty One',
  ]

  const yearToWords = (y: number): string => {
    if (y >= 2000 && y <= 2099) {
      const remainder = y - 2000
      if (remainder === 0) return 'Two Thousand'
      return `Two Thousand and ${ones[remainder]}`
    }
    return y.toString()
  }

  return `${ones[day]}, ${month} ${yearToWords(year)}`
}

export function getDateWithDayName(date: Date): string {
  const dayName = date.toLocaleString('en-US', { weekday: 'long' })
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()
  return `${dayName}, ${month} ${day}, ${year}`
}

export function compressAndConvertToBase64(
  file: File,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height
      ctx?.drawImage(img, 0, 0, width, height)
      const base64 = canvas.toDataURL('image/jpeg', quality)
      URL.revokeObjectURL(objectUrl)
      resolve(base64)
    }

    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl)
      reject(error)
    }

    img.src = objectUrl
  })
}

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import SessionProvider from '@/components/providers/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

// NOTE: For full white-labelling, replace this with generateMetadata() that reads
// the school name from the database and sets the title dynamically per deployment.
// For now a generic title is used so no hardcoded school name leaks into the browser tab.
export const metadata: Metadata = {
  title: 'School Management System',
  description: 'Comprehensive school administration platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

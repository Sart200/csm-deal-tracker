import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/layout/AppShell'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'CSM Deal Tracker — Fibr AI',
  description: 'Internal CSM deal and onboarding tracker for Fibr AI',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}

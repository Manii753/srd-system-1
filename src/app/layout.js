import { Inter } from 'next/font/google'
import { AuthProvider } from './providers'
import './globals.css'
import dbConnect from '@/lib/db'
import Company from '@/models/Company'

const inter = Inter({ subsets: ['latin'], display: 'swap', fallback: ['ui-sans-serif', 'system-ui'] })

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  let name = 'Merchandising Management System'
  let logo = ''
  try {
    await dbConnect()
    const company = await Company.findOne().select('name logo').lean()
    if (company?.name) name = company.name
    if (company?.logo) logo = company.logo
  } catch (error) {
    console.error('Root metadata: failed to load company', error)
  }

  return {
    title: name,
    description: 'Real-time communication and call system for MMS team',
    manifest: '/manifest.webmanifest',
    icons: {
      icon: logo || '/icons/icon-192x192.png',
      apple: logo || '/icons/icon-192x192.png',
    },
    appleWebApp: {
      capable: true,
      title: name,
      statusBarStyle: 'default',
    },
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
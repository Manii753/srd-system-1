import { Inter } from 'next/font/google'
import { AuthProvider } from './providers'
import { getSafeLicenseStatus } from '@/lib/license'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', fallback: ['ui-sans-serif', 'system-ui'] })

export const metadata = {
  title: 'SRDS Communication System',
  description: 'Real-time communication and call system for SRDS team',

}

export const runtime = 'nodejs'

export default async function RootLayout({ children }) {
  const initialLicenseStatus = await getSafeLicenseStatus()
  

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider initialLicenseStatus={initialLicenseStatus}>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

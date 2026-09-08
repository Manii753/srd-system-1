import { Inter } from 'next/font/google'
import { AuthProvider } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', fallback: ['ui-sans-serif', 'system-ui'] })

export const metadata = {
  title: 'MMS Communication System',
  description: 'Real-time communication and call system for MMS team',

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
import { Inter } from 'next/font/google'
import { AuthProvider } from './providers'



import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', fallback: ['ui-sans-serif', 'system-ui'] })

export const metadata = {
  title: 'SRDS Communication System',
  description: 'Real-time communication and call system for SRDS team',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SRDS',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#3b82f6',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SRDS" />
        
        {/* iOS Splash Screens */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
        
        {/* Favicon */}
        <link rel="icon" href="/icons/icon-72x72.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
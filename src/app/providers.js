'use client'

import { SessionProvider } from 'next-auth/react'
import { LicenseProvider } from '@/components/license/LicenseProvider'

export function AuthProvider({ children, initialLicenseStatus }) {
  return (
    <LicenseProvider initialStatus={initialLicenseStatus}>
      <SessionProvider>
        {children}
      </SessionProvider>
    </LicenseProvider>
  )
}

'use client';

import { useSession } from 'next-auth/react';
import Header from './Header';
import DynamicSidebar from './DynamicSidebar';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import GraceBanner from '@/components/license/GraceBanner';

export default function Layout({ children }) {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DynamicSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <GraceBanner />
          <main className="flex-1 p-6">
            {children}
          </main>
          <Toaster />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

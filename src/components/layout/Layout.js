'use client';

import { useSession } from 'next-auth/react';
import Header from './Header';
import DynamicSidebar from './DynamicSidebar';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function Layout({ children, headerContent, headerRightContent }) {
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
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
          <Header headerContent={headerContent} headerRightContent={headerRightContent} />
          <main className="flex-1 min-h-0 overflow-hidden">
            {children}
          </main>
          <Toaster />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

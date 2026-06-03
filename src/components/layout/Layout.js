'use client';

import { useSession } from 'next-auth/react';
import Header from './Header';
import DynamicSidebar from './DynamicSidebar';
import { Toaster } from '@/components/ui/sonner';

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar — fixed width, never overlaps content */}
      <DynamicSidebar />

      {/* Main area — takes remaining space */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header headerContent={headerContent} headerRightContent={headerRightContent} />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
        <Toaster />
      </div>
    </div>
  );
}

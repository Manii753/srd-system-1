'use client';

import DynamicSidebar from '@/components/layout/DynamicSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SampleManagementLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <DynamicSidebar />
      <SidebarInset>
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
          <main className="flex-1 min-h-0 overflow-y-auto">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

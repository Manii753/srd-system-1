'use client'
import { useEffect, useState, useRef } from "react";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/use-toast';
import { Loader } from "lucide-react";
import Layout from "@/components/layout/Layout";

export default function page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const hasCreated = useRef(false); // Prevent double creation

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    const allowedRoles = ['vmd', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      router.push(`/dashboard/${session.user.role}`);
      return;
    }
    
    // Only call once, even in React Strict Mode
    if (!hasCreated.current) {
      hasCreated.current = true;
      handleRaiseSrd();
    }
  }, [session, status, router]);


  const handleRaiseSrd = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/srd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          createdBy: {
            id: session.user.id,
            name: session.user.name,
            role: session.user.role,
          },
          // title is now optional and will be omitted
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/srd/${data.data._id}`);
      } else {
        console.error('Failed to create SRD:', data.error);
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating SRD:', error);
      setIsCreating(false);
    }
  }
  return (
    <>
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    </>
  );
}
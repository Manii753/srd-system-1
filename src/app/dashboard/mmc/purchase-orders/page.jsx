'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardList, FileText } from 'lucide-react';

export default function MMCPurchaseOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingIds, setMarkingIds] = useState([]);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    const allowedRoles = ['mmc', 'admin'];
    if (!allowedRoles.includes(session.user.role?.toLowerCase())) {
      router.push(`/dashboard/${session.user.role}`);
      return;
    }

    fetchPurchaseOrders();
  }, [session, status, router]);

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPurchaseOrders(data.data.filter((notif) => notif.action === 'purchase-request'));
      }
    } catch (error) {
      console.error('Error fetching MMC purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const markInHouse = async (notificationId) => {
    if (!notificationId) return;
    setMarkingIds((prev) => [...prev, notificationId]);

    try {
      const response = await fetch('/api/purchase-order/mark-inhouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      const data = await response.json();
      if (data.success) {
        setPurchaseOrders((prev) => prev.filter((request) => request._id !== notificationId));
      } else {
        console.error('Failed to mark purchase order in house:', data.error);
      }
    } catch (error) {
      console.error('Error marking purchase order in house:', error);
    } finally {
      setMarkingIds((prev) => prev.filter((id) => id !== notificationId));
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-app-heading font-bold text-gray-900">MMC Purchase Orders</h1>
            <p className="text-gray-600 mt-1">Review purchase requests submitted from SRDs with reference links.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/mmc">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to MMC Portal
              </Button>
            </Link>
            <Link href="/dashboard/mmc/create">
              <Button className="gap-2">
                <ClipboardList className="h-4 w-4" />
                New SRD
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Purchase Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-sm text-gray-500">Loading purchase orders...</div>
            ) : purchaseOrders.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">No purchase orders found. Items are set to InStock by default.</div>
            ) : (
              <div className="space-y-3">
                {purchaseOrders.map((request) => (
                  <Card key={request._id} className="border-gray-200 bg-white">
                    <CardContent>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{request.metadata?.itemName || request.message}</p>
                          <p className="text-xs text-gray-500 mt-1">SRD: {request.srd?.refNo || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(request.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center justify-end">
                          {request.srd?._id && (
                            <Link href={`/srd/${request.srd._id}`} className="text-sm text-blue-600 hover:underline">
                              View SRD
                            </Link>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => markInHouse(request._id)}
                            disabled={markingIds.includes(request._id)}
                            className="gap-2"
                          >
                            {markingIds.includes(request._id) ? 'Marking...' : 'Mark In House'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

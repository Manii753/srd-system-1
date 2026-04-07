'use client';

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useSession, signOut } from 'next-auth/react';
import { Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/use-toast';
import { initializePusher, bindPusherEvents } from '@/lib/pusher';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePushNotifications } from '@/lib/usePushNotifications';

export default function Header({ headerContent, headerRightContent }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  usePushNotifications();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) setNotifications(data.data);
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications();
    initializePusher();
    const cleanup = bindPusherEvents({
      'srd:new': (data) => { toast({ title: 'New SRD', description: `${data.refNo} created` }); fetchNotifications(); },
      'srd:update': (data) => { toast({ title: 'SRD Updated', description: `SRD ${data.id} updated` }); fetchNotifications(); },
      'srd:flag': (data) => { toast({ title: 'SRD Flagged', description: data.comment?.text, variant: 'destructive' }); fetchNotifications(); },
    });
    return cleanup;
  }, [session, toast, fetchNotifications]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const markOneAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    await fetch(`/api/notifications/${id}`, { method: 'PUT' }).catch(console.error);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
    if (!unreadIds.length) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: unreadIds }),
    }).catch(console.error);
  };

  const userInitial = session?.user?.name?.[0]?.toUpperCase() || 'U';
  const userRole = session?.user?.role?.toUpperCase() || '';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3 shrink-0">
      <SidebarTrigger className="text-gray-500 hover:text-gray-800 shrink-0" />

      {/* Page-specific content injected here */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {headerContent ?? null}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Page-specific right content (e.g. Activity Console toggle) */}
        {headerRightContent ?? null}
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
              <Bell className="h-4 w-4 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-app-heading text-gray-800">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-app-text text-blue-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <p className="text-app-text text-gray-400 text-center py-6">No notifications</p>
              ) : notifications.map((n) => (
                <div key={n._id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    {!n.read && <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mr-1.5 mb-0.5 align-middle" />}
                    <span className="text-app-text text-gray-800">{n.message}</span>
                    <p className="text-app-text text-gray-400 mt-0.5">{new Date(n.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {n.srd && (
                      <Link href={`/srd/${n.srd}`}>
                        <button className="text-app-text text-blue-600 hover:underline">View SRD</button>
                      </Link>
                    )}
                    {!n.read && (
                      <button onClick={() => markOneAsRead(n._id)} className="text-app-text text-gray-500 hover:text-gray-700">
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-gray-100 transition-colors">
              <span className="h-8 w-8 rounded-full bg-blue-600 text-white text-app-heading font-semibold flex items-center justify-center shrink-0">
                {userInitial}
              </span>
              <div className="hidden sm:block text-left">
                <p className="text-app-heading font-semibold text-gray-800 leading-tight">{session?.user?.name}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{userRole}</p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1 shadow-lg">
            <div className="px-3 py-2 border-b mb-1">
              <p className="text-app-heading font-semibold text-gray-800">{session?.user?.name}</p>
              <p className="text-app-text text-gray-400">{userRole}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 px-3 py-2 text-app-text text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}

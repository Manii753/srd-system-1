'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useSession, signOut } from 'next-auth/react';
import { Bell, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/use-toast';
import { initializePusher, bindPusherEvents } from '@/lib/pusher';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function Header() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();

      initializePusher();
      
      const cleanup = bindPusherEvents({
        'srd:new': (data) => {
          console.log('Pusher event received: srd:new', data);
          toast({
            title: 'New SRD Created',
            description: `SRD ${data.refNo} has been created`,
          });
          fetchNotifications();
        },
        'srd:update': (data) => {
          toast({
            title: 'SRD Updated',
            description: `SRD ${data.id} has been updated`,
          });
          fetchNotifications();
        },
        'srd:flag': (data) => {
          toast({
            title: 'SRD Flagged',
            description: `SRD ${data.id} flagged: ${data.comment?.text}`,
            variant: 'destructive'
          });
          fetchNotifications();
        }
      });
      
      return () => {
        cleanup();
      };
    }
  }, [session, toast, fetchNotifications]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const markOneAsRead = async (id) => {
    const originalNotifications = notifications;
    setNotifications(prev => 
      prev.map(notif => notif._id === id ? { ...notif, read: true } : notif)
    );
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications(originalNotifications);
    }
  };

  const markAllAsRead = async () => {
    const originalNotifications = notifications;
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
      if (unreadIds.length === 0) return;

      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      });
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      setNotifications(originalNotifications);
    }
  };

  return (
    <header className="sticky top-2 z-50 bg-white border-b border-gray-200 px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    You have {unreadCount} unread messages.
                  </p>
                </div>
                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent ${notification.read ? 'opacity-50' : ''}`}
                    >
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {notification.message}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                        <div className="flex space-x-2 mt-2">
                          {notification.srd && (
                            <Link href={`/srd/${notification.srd}`} passHref>
                              <Button variant="outline" size="sm">View SRD</Button>
                            </Link>
                          )}
                          {!notification.read && (
                            <Button variant="secondary" size="sm" onClick={() => markOneAsRead(notification._id)}>
                              Mark as Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button onClick={markAllAsRead} disabled={unreadCount === 0}>
                  Mark all as read
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
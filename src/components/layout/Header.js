'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useSession, signOut } from 'next-auth/react';
import { Bell, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/use-toast';
import { initializePusher, bindPusherEvents } from '@/lib/pusher';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (session?.user) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch('/api/notifications');
          const data = await res.json();
          console.log('Fetched notifications:', data);
          if (data.success) {
            setNotifications(data.data);
          }
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
        }
      };

      fetchNotifications();

      initializePusher();
      
      const cleanup = bindPusherEvents({
        'srd:new': (data) => {
          console.log('Pusher event received: srd:new', data);
          const newNotification = {
            _id: `new-${data._id}-${Date.now()}`,
            srd: data._id,
            type: 'new',
            message: `New SRD created: ${data.refNo}`,
            timestamp: new Date(data.timestamp),
            read: false,
          };
          setNotifications(prev => {
            console.log('Updating notifications state:', [newNotification, ...prev]);
            return [newNotification, ...prev];
          });
          
          toast({
            title: 'New SRD Created',
            description: `SRD ${data.refNo} has been created`,
          });
        },
        'srd:update': (data) => {
          const newNotification = {
            ...data,
            _id: data._id, // Use the _id from the database
            type: 'update',
            message: `SRD ${data.id} updated`,
            timestamp: new Date(data.timestamp),
            read: false,
          };
          setNotifications(prev => [newNotification, ...prev]);
          
          toast({
            title: 'SRD Updated',
            description: `SRD ${data.id} has been updated`,
          });
        },
        'srd:flag': (data) => {
          const newNotification = {
            ...data,
            _id: data._id,
            type: 'flag',
            message: `SRD ${data.id} flagged by ${data.department}`,
            timestamp: new Date(data.timestamp),
            read: false,
          };
          setNotifications(prev => [newNotification, ...prev]);
          
          toast({
            title: 'SRD Flagged',
            description: `SRD ${data.id} flagged: ${data.comment?.text}`,
            variant: 'destructive'
          });
        }
      });
      
      return () => {
        cleanup();
      };
    }
  }, [session, toast]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const markOneAsRead = async (id) => {
    setNotifications(prev => 
      prev.map(notif => notif._id === id ? { ...notif, read: true } : notif)
    );
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Optionally revert state if API call fails
      setNotifications(prev => 
        prev.map(notif => notif._id === id ? { ...notif, read: false } : notif)
      );
    }
  };

  const markAllAsRead = async () => {
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
      // Revert state on error
      setNotifications(prev => prev.map(notif => ({...notif, read: unreadIds.includes(notif._id) ? false : notif.read })));
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">SRD Tracking System</h1>
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
          
          {/* User Profile */}
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
              {/* <p className="text-xs text-gray-500">{session?.user?.role?.toUpperCase()}</p> */}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
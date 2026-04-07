'use client';

import { useEffect, useRef } from 'react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications() {
  const subscribed = useRef(false);

  useEffect(() => {
    if (subscribed.current) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || vapidKey === 'your_public_key') return;

    async function setup() {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        // Save subscription to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });

        subscribed.current = true;
      } catch (error) {
        console.error('Push notification setup failed:', error);
      }
    }

    setup();
  }, []);
}

/**
 * useWebPush — request and manage browser push notifications.
 *
 * Lifecycle:
 *   1. Check if browser supports Push API
 *   2. Request permission (only when user-initiated)
 *   3. Get subscription, send to backend
 *   4. Backend stores it and pushes events (battle ending, prize won, etc.)
 *
 * Backend needs vapidPublicKey to encrypt push messages.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

interface PushState {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

export function useWebPush() {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: 'default',
    subscribed: false,
  });

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    if (!supported) {
      setState({ supported: false, permission: 'denied', subscribed: false });
      return;
    }

    setState((s) => ({ ...s, supported: true, permission: Notification.permission }));

    // Check existing subscription
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setState((s) => ({ ...s, subscribed: !!sub }));
      })
      .catch(() => {});
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY not configured');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState((s) => ({ ...s, permission }));
      if (permission !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to backend
      const res = await api.post('/api/push/subscribe', sub.toJSON());
      if (!res.ok) {
        await sub.unsubscribe();
        return false;
      }

      setState((s) => ({ ...s, subscribed: true }));
      return true;
    } catch (e) {
      console.error('Push subscribe failed:', e);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post('/api/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState((s) => ({ ...s, subscribed: false }));
    } catch (e) {
      console.error('Push unsubscribe failed:', e);
    }
  }, []);

  return { ...state, subscribe, unsubscribe };
}

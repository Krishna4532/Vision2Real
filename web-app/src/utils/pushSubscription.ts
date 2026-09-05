/**
 * Vision2Real – Web Push Registration & VAPID Utilities
 */

import { notificationApi } from '@/services/api/notification';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[WebPush] Service Workers or PushManager not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    console.error('[WebPush] Service Worker registration failed:', err);
    return null;
  }
}

export async function subscribeToWebPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[WebPush] Push permission denied or dismissed by user.');
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) return false;

    // Fetch VAPID key from backend API
    const publicKey = await notificationApi.getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe via PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as unknown as BufferSource,
    });

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      console.error('[WebPush] Incomplete push subscription object generated.');
      return false;
    }

    // Send subscription payload to backend
    await notificationApi.savePushSubscription({
      endpoint: subJson.endpoint,
      p256dh_key: subJson.keys.p256dh,
      auth_key: subJson.keys.auth,
      user_agent: navigator.userAgent,
    });

    console.info('[WebPush] Successfully subscribed to browser push notifications.');
    return true;
  } catch (err) {
    console.error('[WebPush] Error subscribing to Web Push:', err);
    return false;
  }
}

export async function unsubscribeFromWebPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await notificationApi.deletePushSubscription(endpoint);
      console.info('[WebPush] Successfully unsubscribed from Web Push.');
    }
    return true;
  } catch (err) {
    console.error('[WebPush] Error unsubscribing:', err);
    return false;
  }
}

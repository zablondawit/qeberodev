---
title: "PWA Engagement: Push Notifications and Installability"
description: "Deep dive into Web Push APIs and creating a native feel for users."
date: 2025-12-28T10:00:00Z
author:
  name: "Zablon Dawit"
tags:
  - pwa
  - notifications
  - engagement
category: "engineering"
slug: "pwa-offline-first-2"
series: "Modern PWA Guide"
weight: 2
layout: "post"
draft: false
toc: true
reading_time: 8
lang: en
---

# PWA Engagement: Push Notifications and Installability

## Introduction

Part one covered offline-first caching. Your app works without internet. But an offline app is still invisible if users forget it exists.

Push notifications bring users back. Web Push API lets your app send notifications even when the browser is closed. Installability makes your app accessible from the home screen, just like native apps.

This is part two of the PWA series. We'll build re-engagement features that keep users returning.

## Problem Definition

Web apps suffer from a visibility problem:

1. **App Amnesia:** Users install your app once, then forget it exists. Native apps stay visible on the home screen. Web apps hide in browser history.
2. **No Notifications:** Native apps send push notifications. Web apps are silent.
3. **Installation Friction:** Users must bookmark your site or add it manually. Most don't.
4. **No Native Feel:** Web apps don't feel like part of the phone. They feel like websites.

Push notifications solve invisibility. Installability solves friction. Together, they transform your web app into a first-class citizen on users' devices.

## Web Push API: Sending Notifications

Push notifications require three components:

1. **Service Worker:** Receives notifications.
2. **Push Service:** Telegram between your server and user's browser (handled by browser vendors).
3. **Your Server:** Sends the notification.

First, request notification permission:

```javascript
// Request permission
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    console.log('Notifications enabled');
    // Subscribe to push
    navigator.serviceWorker.ready.then(reg => {
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
      });
    });
  }
});
```

Your Service Worker receives notifications:

```javascript
// Inside sw.js
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'order-notification', // Only one notification per tag
    requireInteraction: false // Auto-close after user sees it
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Open app and navigate to order page
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/orders/' + event.notification.tag);
      }
    })
  );
});
```

## Installability: The Web App Manifest

A `manifest.json` file tells browsers how to install your app:

```json
{
  "name": "Coffee Shop",
  "short_name": "Coffee",
  "description": "Order coffee online",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#6F4E37",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot-mobile.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ],
  "categories": ["shopping", "productivity"]
}
```

Link it in your HTML:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#6F4E37">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

Chrome automatically prompts installation when criteria are met:
- Service Worker registered
- HTTPS enabled
- Manifest present
- 5+ minute engagement

## Complete Example: Full Push Notification Flow

Here's a production setup:

**manifest.json:**

```json
{
  "name": "Order Tracker Pro",
  "short_name": "OrderTracker",
  "description": "Track your orders in real-time",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#2563EB",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Client (subscribe to push):**

```javascript
const PUBLIC_KEY = 'BEiFVx...'; // From web-push library

async function subscribeUser() {
  const registration = await navigator.serviceWorker.ready;
  
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
    });
    
    // Send subscription to server
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    
    console.log('Push subscription successful');
  } catch (error) {
    console.error('Push subscription failed:', error);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}
```

**Server (send notifications):**

```javascript
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.PUBLIC_KEY,
  process.env.PRIVATE_KEY
);

app.post('/api/order-update', async (req, res) => {
  const { orderId, status, subscription } = req.body;
  
  const notification = {
    title: 'Order Update',
    body: `Your order ${orderId} is now ${status}`,
    icon: '/icon-192x192.png',
    tag: `order-${orderId}`
  };
  
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(notification)
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Push failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notify-all', async (req, res) => {
  const { title, body } = req.body;
  const subscriptions = await Subscription.find();
  
  const promises = subscriptions.map(sub =>
    webpush.sendNotification(sub.endpoint, JSON.stringify({ title, body }))
      .catch(error => console.error('Failed:', error))
  );
  
  await Promise.all(promises);
  res.json({ sent: subscriptions.length });
});
```

**Service Worker (receive and handle):**

```javascript
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'notification',
    requireInteraction: false,
    data: { url: data.url || '/' }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'New Message', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let client of clientList) {
        if ('focus' in client) {
          client.focus();
          return client.navigate(event.notification.data.url);
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
```

This approach guarantees:
- **Re-engagement:** Users return via notifications.
- **Native feel:** Home screen icon + standalone display mode.
- **Rich interaction:** Users see, click, and navigate from notifications.
- **Server control:** Send notifications based on business logic.

## Conclusion

Push notifications and installability transform web apps from "nice tools" into "essential apps."

Offline-first gives users resilience. Notifications give them reasons to return. Installability gives your app a home on their device.

Combine these three parts—caching, notifications, and installation—and your PWA competes directly with native applications.
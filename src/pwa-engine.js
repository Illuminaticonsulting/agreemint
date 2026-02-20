/**
 * AgreeMint — PWA Engine
 *
 * Progressive Web App support:
 *   - Service Worker for offline caching
 *   - Web App Manifest for install prompt
 *   - Push Notification via Web Push API (VAPID)
 *   - Background sync for offline signing
 *   - Responsive viewport meta tags
 *
 * Push notification triggers:
 *   - Agreement sent for signature
 *   - Party signed
 *   - Dispute raised / resolved
 *   - Escrow funded / released
 *   - Pledge check-in reminder
 *   - Template purchased (seller notification)
 */

const crypto = require('crypto');

// ─── VAPID Keys for Web Push ────────────────────────────
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@kingpinstrategies.com';

let webpush = null;

function initPush() {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log('  Push:    NOT CONFIGURED (set VAPID keys in .env)');
    return false;
  }
  try {
    webpush = require('web-push');
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    console.log('  Push:    CONFIGURED (VAPID)');
    return true;
  } catch (e) {
    console.log('  Push:    Module not installed (run: npm install web-push)');
    return false;
  }
}

// ─── Push Subscription Store ────────────────────────────
// In production, store in DB. Here we export helpers.

/**
 * Save a push subscription for a user.
 */
function savePushSubscription(userId, subscription) {
  return {
    id: crypto.randomUUID(),
    userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    createdAt: new Date().toISOString(),
    active: true,
    userAgent: subscription.userAgent || ''
  };
}

/**
 * Send a push notification to a user.
 */
async function sendPushNotification(subscription, payload) {
  if (!webpush) return { sent: false, reason: 'Push not configured' };

  const pushPayload = JSON.stringify({
    title: payload.title || 'AgreeMint',
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/badge-72.png',
    tag: payload.tag || 'agreemint-' + Date.now(),
    data: {
      url: payload.url || '/',
      agreementId: payload.agreementId || null,
      type: payload.type || 'general',
      timestamp: new Date().toISOString()
    },
    actions: payload.actions || [],
    requireInteraction: payload.requireInteraction || false
  });

  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      pushPayload,
      { TTL: payload.ttl || 86400 }
    );
    return { sent: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { sent: false, expired: true, reason: 'Subscription expired' };
    }
    return { sent: false, reason: err.message };
  }
}

/**
 * Broadcast push to all subscriptions for a user.
 */
async function broadcastPush(subscriptions, payload) {
  const results = [];
  for (const sub of subscriptions) {
    if (!sub.active) continue;
    const result = await sendPushNotification(sub, payload);
    results.push({ subscriptionId: sub.id, ...result });
    if (result.expired) sub.active = false;
  }
  return results;
}

// ─── Notification Templates ────────────────────────────

const PUSH_TEMPLATES = {
  agreement_sent: (agreement) => ({
    title: 'Agreement Ready for Signature',
    body: `"${agreement.title}" has been sent for your signature.`,
    tag: `sign-${agreement.id}`,
    url: `/sign/${agreement.id}`,
    agreementId: agreement.id,
    type: 'signature_request',
    actions: [
      { action: 'sign', title: 'Sign Now' },
      { action: 'view', title: 'View Details' }
    ],
    requireInteraction: true
  }),
  party_signed: (agreement, signerName) => ({
    title: 'Party Signed',
    body: `${signerName} signed "${agreement.title}".`,
    tag: `signed-${agreement.id}`,
    url: `/agreements/${agreement.id}`,
    agreementId: agreement.id,
    type: 'signature_update'
  }),
  all_signed: (agreement) => ({
    title: 'Agreement Fully Signed',
    body: `All parties have signed "${agreement.title}". IP registered on Story Protocol.`,
    tag: `complete-${agreement.id}`,
    url: `/agreements/${agreement.id}`,
    agreementId: agreement.id,
    type: 'agreement_complete',
    requireInteraction: true
  }),
  dispute_raised: (agreement, raiserName) => ({
    title: 'Dispute Raised',
    body: `${raiserName} raised a dispute on "${agreement.title}".`,
    tag: `dispute-${agreement.id}`,
    url: `/agreements/${agreement.id}`,
    agreementId: agreement.id,
    type: 'dispute',
    requireInteraction: true
  }),
  dispute_resolved: (agreement) => ({
    title: 'Dispute Resolved',
    body: `The dispute on "${agreement.title}" has been resolved.`,
    tag: `resolved-${agreement.id}`,
    url: `/agreements/${agreement.id}`,
    agreementId: agreement.id,
    type: 'dispute_resolved'
  }),
  escrow_funded: (agreement, amount, currency) => ({
    title: 'Escrow Funded',
    body: `${amount} ${currency} deposited into escrow for "${agreement.title}".`,
    tag: `escrow-${agreement.id}`,
    url: `/agreements/${agreement.id}`,
    agreementId: agreement.id,
    type: 'escrow'
  }),
  escrow_released: (agreement, amount, currency) => ({
    title: 'Escrow Released',
    body: `${amount} ${currency} released from escrow for "${agreement.title}".`,
    tag: `escrow-release-${agreement.id}`,
    url: `/agreements/${agreement.id}`,
    agreementId: agreement.id,
    type: 'escrow'
  }),
  pledge_reminder: (pledge) => ({
    title: 'Pledge Check-In Reminder',
    body: `Time to check in on your pledge: "${pledge.title}"`,
    tag: `pledge-${pledge.id}`,
    url: `/keepyourword`,
    type: 'pledge_reminder',
    actions: [
      { action: 'checkin', title: 'Check In Now' }
    ]
  }),
  template_sold: (template, buyerName) => ({
    title: 'Template Sold!',
    body: `${buyerName} purchased your template "${template.name}". You earned $${((template.price * 0.8) / 100).toFixed(2)}.`,
    tag: `sale-${template.id}`,
    url: `/marketplace`,
    type: 'sale'
  })
};

// ─── Web App Manifest ──────────────────────────────────

function getManifest(branding = {}) {
  return {
    name: branding.name || 'AgreeMint',
    short_name: branding.shortName || 'AgreeMint',
    description: branding.description || 'AI-Powered Legal Agreement Platform with Blockchain IP Registration',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: branding.bgColor || '#0a0a0f',
    theme_color: branding.themeColor || '#6366f1',
    categories: ['business', 'productivity', 'finance'],
    lang: 'en',
    dir: 'auto',
    icons: [
      { src: '/icons/icon-72.png',  sizes: '72x72',   type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-96.png',  sizes: '96x96',   type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ],
    screenshots: [
      { src: '/screenshots/desktop.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Dashboard' },
      { src: '/screenshots/mobile.png',  sizes: '390x844',  type: 'image/png', form_factor: 'narrow', label: 'Mobile View' }
    ],
    shortcuts: [
      { name: 'Create Agreement', short_name: 'Create', url: '/?page=create', icon: '/icons/icon-96.png' },
      { name: 'Keep Your Word',   short_name: 'KYW',    url: '/keepyourword',  icon: '/icons/icon-96.png' },
      { name: 'Marketplace',      short_name: 'Market',  url: '/?page=marketplace', icon: '/icons/icon-96.png' }
    ],
    related_applications: [],
    prefer_related_applications: false
  };
}

// ─── Service Worker Script ─────────────────────────────

function getServiceWorkerScript() {
  return `// AgreeMint Service Worker — Offline + Push + Background Sync
const CACHE_NAME = 'agreemint-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/keepyourword.html',
  '/sign.html',
  '/verify.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json'
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls — network only (don't cache dynamic data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline', offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Static assets — cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// Push — display notification
self.addEventListener('push', event => {
  let data = { title: 'AgreeMint', body: 'You have a new notification' };
  try { data = event.data.json(); } catch (e) {}

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    tag: data.tag || 'agreemint',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click — open app to relevant page
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  if (event.action === 'sign') {
    event.waitUntil(clients.openWindow(url));
  } else if (event.action === 'checkin') {
    event.waitUntil(clients.openWindow('/keepyourword'));
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
    );
  }
});

// Background sync — retry failed operations when back online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-signatures') {
    event.waitUntil(syncPendingSignatures());
  }
  if (event.tag === 'sync-checkins') {
    event.waitUntil(syncPendingCheckins());
  }
});

async function syncPendingSignatures() {
  // Retrieve pending signatures from IndexedDB and submit
  console.log('[SW] Syncing pending signatures...');
}

async function syncPendingCheckins() {
  // Retrieve pending check-ins from IndexedDB and submit
  console.log('[SW] Syncing pending check-ins...');
}
`;
}

module.exports = {
  initPush,
  savePushSubscription,
  sendPushNotification,
  broadcastPush,
  PUSH_TEMPLATES,
  getManifest,
  getServiceWorkerScript,
  VAPID_PUBLIC
};

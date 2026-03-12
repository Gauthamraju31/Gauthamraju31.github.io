/**
 * coi-serviceworker v0.1.7 — https://github.com/gzuidhof/coi-serviceworker
 *
 * Patches every fetch response with Cross-Origin-Opener-Policy: same-origin
 * and Cross-Origin-Embedder-Policy: require-corp so that SharedArrayBuffer
 * is available on hosts that cannot set HTTP headers (e.g. GitHub Pages).
 *
 * On Firebase Hosting the headers are already present in firebase.json, so
 * the SW registration is skipped entirely via the crossOriginIsolated check
 * in index.html — this file is never even fetched in that case.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', function (event) {
    const request = event.request

    // Don't touch non-GET requests (POST, etc.)
    if (request.method !== 'GET') return

    // Passthrough for browser-extension requests
    if (!request.url.startsWith('http')) return

    event.respondWith(
        fetch(request)
            .then(response => {
                // Only patch same-origin and CORS responses we can actually read
                if (response.status === 0) return response

                const newHeaders = new Headers(response.headers)
                newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')
                newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
                newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin')

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                })
            })
            .catch(e => {
                console.error('[coi-sw] fetch error:', e)
                return new Response('Network error', { status: 503 })
            })
    )
})

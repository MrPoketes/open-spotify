// TanStack Start writes a few inline bootstrap scripts into the SPA shell and
// tags them with this nonce. The main process replaces it with a fresh random
// value on every page load, so injected markup cannot guess it. The dev server
// keeps the placeholder, which is enough to surface policy problems early.
export const scriptNoncePlaceholder = "open-spotify-script-nonce"

export function contentSecurityPolicy(scriptNonce: string): string {
  return [
    // Anything not allowed below is blocked, such as plugins and workers.
    "default-src 'none'",
    // The Web Playback SDK's script adds a hidden iframe from the same host,
    // and plays audio inside it. The iframe's own policy governs its
    // websocket, licence and audio requests, so they need nothing here.
    `script-src 'self' 'nonce-${scriptNonce}' https://sdk.scdn.co`,
    "frame-src https://sdk.scdn.co",
    "style-src 'self'",
    "font-src 'self'",
    // Spotify serves cover art from many hosts under these two domains, for
    // example i.scdn.co, mosaic.scdn.co and image-cdn-ak.spotifycdn.com.
    "img-src 'self' https://*.scdn.co https://*.spotifycdn.com",
    // The silent clip that lets media keys reach the app is a data: URL.
    "media-src data:",
    // 'self' also covers the dev server's hot reload websocket.
    "connect-src 'self' https://api.spotify.com https://accounts.spotify.com",
    // An injected <base> tag would redirect every relative script URL.
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ")
}

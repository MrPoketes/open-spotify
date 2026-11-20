// Fixed because the user registers this exact URI in their own Spotify app
// (decision 0003). Login cannot fall back to another port.
export const spotifyRedirectPort = 43821

export const spotifyRedirectUri = `http://127.0.0.1:${spotifyRedirectPort}/callback`

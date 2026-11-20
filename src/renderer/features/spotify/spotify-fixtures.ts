// Invented data in Spotify's wire format. No real users, tracks, or artists.

export const fakeListenerId = "fake-listener"

// The .invalid domain never resolves, so the UI shows its image fallback.
const coverUrl = (id: string) => `https://covers.open-spotify.invalid/${id}.jpg`

const pickInTurn = <A>(values: readonly [A, ...Array<A>], index: number): A =>
  values[index % values.length] ?? values[0]

export const fakeCurrentUser = {
  id: fakeListenerId,
  display_name: "Mira Kaelin",
  images: [{ url: coverUrl("mira-kaelin"), width: 300, height: 300 }],
  uri: `spotify:user:${fakeListenerId}`,
  type: "user",
}

const fakeAlbum = (albumName: string, artistName: string, index: number) => ({
  id: `fake-album-${index}`,
  name: albumName,
  images: [{ url: coverUrl(`album-${index}`), width: 640, height: 640 }],
  artists: [{ id: `fake-artist-${index}`, name: artistName }],
  uri: `spotify:album:fake-${index}`,
})

const albums = [
  fakeAlbum("Glass Harbour", "Northbound Static", 0),
  fakeAlbum("Small Hours", "Lena Varga", 1),
  fakeAlbum("Weather Maps", "The Paper Moons", 2),
  fakeAlbum("Saltwater Letters", "Odalys Reyes", 3),
  fakeAlbum("Low Orbit", "Kite Theory", 4),
  fakeAlbum("Second Spring", "Juniper Hollow", 5),
] as const

const titleWords = ["Quiet", "Electric", "Paper", "Golden", "Restless", "Hollow", "Slow"] as const
const titleNouns = ["Rivers", "Signals", "Rooms", "Satellites", "Gardens", "Echoes"] as const

const fakeTrack = (index: number) => {
  const album = pickInTurn(albums, index)
  const word = pickInTurn(titleWords, index)
  const noun = pickInTurn(titleNouns, Math.floor(index / titleWords.length))
  return {
    type: "track",
    id: `fake-track-${index}`,
    name: `${word} ${noun}`,
    uri: `spotify:track:fake-${index}`,
    duration_ms: 150_000 + ((index * 7919) % 120_000),
    explicit: index % 9 === 0,
    album,
    artists: album.artists,
  }
}

const localTrack = {
  type: "track",
  id: null,
  name: "Demo Take 3",
  uri: "spotify:local:Mira+Kaelin::Demo+Take+3:184",
  duration_ms: 184_000,
  explicit: false,
  album: { id: null, name: "Voice Memos", images: [] },
  artists: [{ id: null, name: "Mira Kaelin" }],
}

export const fakeEpisode = {
  type: "episode",
  id: "fake-episode-0",
  name: "How Playlists Are Made",
  uri: "spotify:episode:fake-0",
  duration_ms: 2_412_000,
}

const playlistEntry = (item: unknown, index: number) => ({
  added_at: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
  added_by: { id: fakeListenerId },
  is_local: item === localTrack,
  item,
})

const tracks = (count: number, firstIndex: number) =>
  Array.from({ length: count }, (_, offset) => fakeTrack(firstIndex + offset))

export interface FakePlaylist {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly images: ReadonlyArray<{ url: string; width: number; height: number }> | null
  readonly owner: { readonly id: string; readonly display_name: string }
  readonly collaborative: boolean
  readonly entries: ReadonlyArray<ReturnType<typeof playlistEntry>>
}

const listener = { id: fakeListenerId, display_name: "Mira Kaelin" }

export const fakePlaylists: ReadonlyArray<FakePlaylist> = [
  {
    id: "fake-playlist-late-night-drive",
    name: "Late Night Drive",
    description: "Long roads, low lights.",
    images: [{ url: coverUrl("late-night-drive"), width: 640, height: 640 }],
    owner: listener,
    collaborative: false,
    entries: tracks(120, 0).map(playlistEntry),
  },
  {
    id: "fake-playlist-morning-coffee",
    name: "Morning Coffee",
    description: "",
    images: [{ url: coverUrl("morning-coffee"), width: 640, height: 640 }],
    owner: listener,
    collaborative: false,
    // A removed track shows up as a null item.
    entries: [...tracks(12, 200), localTrack, fakeEpisode, null].map(playlistEntry),
  },
  {
    id: "fake-playlist-ideas",
    name: "Ideas for Later",
    description: "",
    images: null,
    owner: listener,
    collaborative: false,
    entries: [],
  },
  {
    id: "fake-playlist-road-trip",
    name: "Road Trip with Sam",
    description: "Everyone adds two songs.",
    images: [{ url: coverUrl("road-trip"), width: 640, height: 640 }],
    owner: { id: "fake-friend", display_name: "Sam Okafor" },
    collaborative: true,
    entries: tracks(8, 300).map(playlistEntry),
  },
  // Followed but not owned, so Spotify withholds its items.
  {
    id: "fake-playlist-indie-finds",
    name: "Indie Finds",
    description: "New voices every Friday.",
    images: [{ url: coverUrl("indie-finds"), width: 640, height: 640 }],
    owner: { id: "fake-curator", display_name: "Fern Radio" },
    collaborative: false,
    entries: tracks(30, 400).map(playlistEntry),
  },
]

const savedAt = (index: number) => new Date(Date.UTC(2025, 5, 1 + index)).toISOString()

export const fakeLikedSongs = tracks(57, 600).map((track, index) => ({
  added_at: savedAt(index),
  track,
}))

export const fakeSavedAlbums = albums
  .slice(0, 4)
  .map((album, index) => ({ added_at: savedAt(index), album }))

const bandFirstWords = ["Velvet", "Neon", "Cedar", "Amber", "Lunar", "Copper", "Silver"] as const
const bandLastWords = ["Choir", "Parade", "Fields", "Engine", "Club", "Season", "Harbor"] as const

const followedArtistNames = [
  ...albums.flatMap(({ artists }) => artists.map(({ name }) => name)),
  ...bandFirstWords.flatMap((first) => bandLastWords.map((last) => `${first} ${last}`)),
]

// More artists than fit on one page, so a client has to follow the cursor.
export const fakeFollowedArtists = followedArtistNames.map((name, index) => ({
  id: `fake-artist-${index}`,
  name,
  images: [{ url: coverUrl(`artist-${index}`), width: 320, height: 320 }],
  uri: `spotify:artist:fake-${index}`,
  type: "artist",
}))

const fakeShow = (name: string, index: number) => ({
  added_at: savedAt(index),
  show: {
    id: `fake-show-${index}`,
    name,
    images: [{ url: coverUrl(`show-${index}`), width: 640, height: 640 }],
    uri: `spotify:show:fake-${index}`,
    type: "show",
  },
})

export const fakeSavedShows = [fakeShow("Slow Science", 0), fakeShow("The Long Edit", 1)]

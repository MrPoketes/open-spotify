// Invented data in Spotify's wire format. No real users, tracks, or artists.

export const fakeListenerId = "fake-listener"

// The .invalid domain never resolves, so the UI shows its image fallback.
export const coverUrl = (id: string) => `https://covers.open-spotify.invalid/${id}.jpg`

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
  uri: `spotify:album:fake-album-${index}`,
})

const albums = [
  fakeAlbum("Glass Harbour", "Northbound Static", 0),
  fakeAlbum("Small Hours", "Lena Varga", 1),
  fakeAlbum("Weather Maps", "The Paper Moons", 2),
  fakeAlbum("Saltwater Letters", "Odalys Reyes", 3),
  fakeAlbum("Low Orbit", "Kite Theory", 4),
  fakeAlbum("Second Spring", "Juniper Hollow", 5),
] as const

type FakeSimplifiedAlbum = (typeof albums)[number]

// The third track of Glass Harbour features a second artist.
const artistsOfAlbumTrack = (album: FakeSimplifiedAlbum, trackNumber: number) =>
  album.id === "fake-album-0" && trackNumber === 3
    ? [...album.artists, { id: "fake-artist-1", name: "Lena Varga" }]
    : album.artists

const fakeAlbumTrack = (album: FakeSimplifiedAlbum, discNumber: number, trackNumber: number) => ({
  type: "track",
  id: `${album.id}-track-${discNumber}-${trackNumber}`,
  name: `${album.name}, part ${discNumber}.${trackNumber}`,
  uri: `spotify:track:${album.id}-${discNumber}-${trackNumber}`,
  duration_ms: 180_000 + trackNumber * 1_000,
  explicit: false,
  disc_number: discNumber,
  track_number: trackNumber,
  artists: artistsOfAlbumTrack(album, trackNumber),
})

const fakeFullAlbum = (
  album: FakeSimplifiedAlbum,
  releaseDate: string,
  trackCountPerDisc: ReadonlyArray<number>,
) => {
  const albumTracks = trackCountPerDisc.flatMap((trackCount, discIndex) =>
    Array.from({ length: trackCount }, (_, trackIndex) =>
      fakeAlbumTrack(album, discIndex + 1, trackIndex + 1),
    ),
  )
  return {
    ...album,
    album_type: "album",
    release_date: releaseDate,
    release_date_precision: releaseDate.length === 4 ? "year" : "day",
    total_tracks: albumTracks.length,
    type: "album",
    tracks: albumTracks,
  }
}

// Low Orbit has two discs and more tracks than Spotify embeds in an album.
export const fakeAlbums = [
  fakeFullAlbum(albums[0], "2019-05-17", [10]),
  fakeFullAlbum(albums[1], "2021-10-01", [12]),
  fakeFullAlbum(albums[2], "1998", [9]),
  fakeFullAlbum(albums[3], "2024-02-09", [11]),
  fakeFullAlbum(albums[4], "2016-08-26", [30, 30]),
  fakeFullAlbum(albums[5], "2023-04-14", [7]),
]

const titleWords = ["Quiet", "Electric", "Paper", "Golden", "Restless", "Hollow", "Slow"] as const
const titleNouns = ["Rivers", "Signals", "Rooms", "Satellites", "Gardens", "Echoes"] as const

export const fakeTrack = (index: number) => {
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
  images: [{ url: coverUrl("episode-0"), width: 640, height: 640 }],
  duration_ms: 2_412_000,
  description: "A look at how a playlist goes from idea to finished sequence.",
  release_date: "2026-03-14",
  release_date_precision: "day",
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
    // Spotify sends descriptions HTML-escaped.
    description: "Long roads &amp; low lights.",
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
    id: "fake-playlist-big-archive",
    name: "The Big Archive",
    description: "",
    images: [{ url: coverUrl("big-archive"), width: 640, height: 640 }],
    owner: listener,
    collaborative: false,
    entries: tracks(1000, 1000).map(playlistEntry),
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

// Thousands of songs, so the Liked Songs page has to load pages out of order.
export const fakeLikedSongs = tracks(5000, 600).map((track, index) => ({
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
// Spotify sends an empty list of genres for an artist it has not classified.
export const fakeFollowedArtists = followedArtistNames.map((name, index) => ({
  id: `fake-artist-${index}`,
  name,
  images: [{ url: coverUrl(`artist-${index}`), width: 320, height: 320 }],
  genres: index === 0 ? ["dream pop", "shoegaze"] : [],
  uri: `spotify:artist:fake-artist-${index}`,
  type: "artist",
}))

const episodeTopics = [
  "Tide Pools",
  "Lichen",
  "Deep Time",
  "Glaciers",
  "Bird Migration",
  "Soil",
] as const

const weekInMs = 7 * 24 * 60 * 60 * 1000

// Spotify lists a show's episodes newest first, so episode 0 is the latest.
const fakeShowEpisode = (showId: string, index: number) => {
  const topic = pickInTurn(episodeTopics, index)
  return {
    type: "episode",
    id: `${showId}-episode-${index}`,
    name: `${topic}, part ${Math.floor(index / episodeTopics.length) + 1}`,
    uri: `spotify:episode:${showId}-${index}`,
    images: [{ url: coverUrl(`${showId}-episode-${index}`), width: 640, height: 640 }],
    duration_ms: 1_200_000 + ((index * 104_729) % 3_000_000),
    description: `This week is all about ${topic.toLowerCase()}. We follow the researchers who spend years watching it change, and ask why they keep coming back.`,
    release_date: new Date(Date.UTC(2026, 10, 16) - index * weekInMs).toISOString().slice(0, 10),
    release_date_precision: "day",
  }
}

const slowScienceEpisodes = Array.from({ length: 60 }, (_, index) =>
  fakeShowEpisode("fake-show-slow-science", index),
).map((episode, index) => {
  if (index === 1) {
    return {
      ...episode,
      description: "Show notes: <b>bold claims</b> and <script>alert('hi')</script> inside.",
    }
  }
  // Spotify sends null for an episode it no longer serves.
  return index === 55 ? null : episode
})

const fakeShow = (
  id: string,
  { name, description }: { readonly name: string; readonly description: string },
  episodes: ReadonlyArray<ReturnType<typeof fakeShowEpisode> | null>,
) => ({
  id,
  name,
  description,
  images: [{ url: coverUrl(id), width: 640, height: 640 }],
  uri: `spotify:show:${id}`,
  type: "show",
  episodes,
})

export const fakeShows = [
  fakeShow(
    "fake-show-slow-science",
    {
      name: "Slow Science",
      description: "Patient stories about how scientists actually find things out.",
    },
    slowScienceEpisodes,
  ),
  fakeShow(
    "fake-show-long-edit",
    { name: "The Long Edit", description: "A new show, starting soon." },
    [],
  ),
]

export const fakeSavedShows = fakeShows.map(({ id, name, images, uri, type }, index) => ({
  added_at: savedAt(index),
  show: { id, name, images, uri, type },
}))

const fakeDevice = (id: string, name: string, type: string) => ({
  id,
  name,
  type,
  is_active: false,
  is_private_session: false,
  is_restricted: false,
  volume_percent: 60,
  supports_volume: true,
})

export const fakeDevices = [
  fakeDevice("fake-device-laptop", "Mira's Laptop", "Computer"),
  fakeDevice("fake-device-phone", "Mira's Phone", "Smartphone"),
  fakeDevice("fake-device-kitchen", "Kitchen Speaker", "Speaker"),
] as const

export const fakePlayingTrack = fakeTrack(0)

export const fakePlaybackState = (activeDevice: (typeof fakeDevices)[number]) => ({
  device: { ...activeDevice, is_active: true },
  repeat_state: "off",
  shuffle_state: false,
  context: null,
  timestamp: Date.UTC(2026, 10, 20, 18, 0),
  progress_ms: 42_000,
  is_playing: true,
  currently_playing_type: "track",
  actions: { disallows: { resuming: true } },
})

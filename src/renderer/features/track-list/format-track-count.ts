const trackCountFormat = new Intl.NumberFormat()

export const formatTrackCount = (trackCount: number) =>
  `${trackCountFormat.format(trackCount)} ${trackCount === 1 ? "track" : "tracks"}`

const songCountFormat = new Intl.NumberFormat()

export const songCountText = (songCount: number) =>
  `${songCountFormat.format(songCount)} ${songCount === 1 ? "song" : "songs"}`

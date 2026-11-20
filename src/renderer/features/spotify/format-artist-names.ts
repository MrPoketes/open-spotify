export const formatArtistNames = (artists: ReadonlyArray<{ readonly name: string }>) =>
  artists.map(({ name }) => name).join(", ")

// The body Spotify sends with an error status.
export const spotifyErrorBody = (status: number, message: string) => ({
  error: { status, message },
})

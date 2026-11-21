export const spotifyErrorBody = (status: number, message: string) => ({
  error: { status, message },
})

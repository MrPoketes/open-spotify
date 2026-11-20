const millisecondsPerMinute = 60_000

export const formatEpisodeDuration = (durationMs: number) => {
  const totalMinutes = Math.max(1, Math.round(durationMs / millisecondsPerMinute))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) {
    return `${minutes} min`
  }
  if (minutes === 0) {
    return `${hours} hr`
  }
  return `${hours} hr ${minutes} min`
}

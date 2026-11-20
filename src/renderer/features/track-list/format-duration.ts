const durationParts = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000)
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  }
}

const twoDigits = (value: number) => String(value).padStart(2, "0")

export function formatTrackDuration(durationMs: number): string {
  const { hours, minutes, seconds } = durationParts(durationMs)
  if (hours === 0) {
    return `${minutes}:${twoDigits(seconds)}`
  }
  return `${hours}:${twoDigits(minutes)}:${twoDigits(seconds)}`
}

export function formatTotalDuration(durationMs: number): string {
  const { hours, minutes, seconds } = durationParts(durationMs)
  if (hours > 0 && minutes === 0) {
    return `${hours} hr`
  }
  if (hours > 0) {
    return `${hours} hr ${minutes} min`
  }
  if (minutes > 0) {
    return `${minutes} min`
  }
  return `${seconds} sec`
}

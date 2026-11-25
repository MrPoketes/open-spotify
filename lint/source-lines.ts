export function lineStartsOf(source: string): ReadonlyArray<number> {
  const starts = [0]
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) {
      starts.push(index + 1)
    }
  }
  return starts
}

export const lineAtOffset = (lineStarts: ReadonlyArray<number>, offset: number): number =>
  lineStarts.findLastIndex((start) => start <= offset) + 1

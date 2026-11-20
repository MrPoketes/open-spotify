import { describe, expect, it } from "vitest"
import { encodeIcoFile } from "./ico-file.ts"

const fakePng = (size: number) => new TextEncoder().encode(`png ${size}`)

function readIcoEntries(file: Uint8Array) {
  const view = new DataView(file.buffer)
  const count = view.getUint16(4, true)
  return Array.from({ length: count }, (_, index) => {
    const entry = 6 + 16 * index
    const length = view.getUint32(entry + 8, true)
    const offset = view.getUint32(entry + 12, true)
    return {
      width: view.getUint8(entry),
      height: view.getUint8(entry + 1),
      bitsPerPixel: view.getUint16(entry + 6, true),
      image: new TextDecoder().decode(file.subarray(offset, offset + length)),
    }
  })
}

describe("encodeIcoFile", () => {
  // Windows reads each size through the directory; a wrong offset or length
  // shows a broken or blank icon in the taskbar and installer.
  it("lists every Windows icon size with the PNG stored at its offset", () => {
    const entries = readIcoEntries(encodeIcoFile(fakePng))

    expect(entries.map((entry) => entry.image)).toEqual([
      "png 16",
      "png 24",
      "png 32",
      "png 48",
      "png 64",
      "png 128",
      "png 256",
    ])
    expect(entries.every((entry) => entry.bitsPerPixel === 32)).toBe(true)
  })

  it("writes the 256 pixel size as 0, the format's one-byte encoding of 256", () => {
    const largest = readIcoEntries(encodeIcoFile(fakePng)).at(-1)

    expect(largest).toMatchObject({ width: 0, height: 0, image: "png 256" })
  })
})

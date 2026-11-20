import { describe, expect, it } from "vitest"
import { encodeIcnsFile } from "./icns-file.ts"

const fakePng = (size: number) => new TextEncoder().encode(`png ${size}`)

function readIcnsEntries(file: Uint8Array) {
  const view = new DataView(file.buffer)
  const decoder = new TextDecoder()
  const entries: Array<{ type: string; image: string }> = []
  let offset = 8
  while (offset < file.length) {
    const length = view.getUint32(offset + 4)
    entries.push({
      type: decoder.decode(file.subarray(offset, offset + 4)),
      image: decoder.decode(file.subarray(offset + 8, offset + length)),
    })
    offset += length
  }
  return entries
}

describe("encodeIcnsFile", () => {
  // macOS rejects the whole file when the declared length is wrong, and falls
  // back to the generic app icon.
  it("starts with the icns magic and the total file length", () => {
    const file = encodeIcnsFile(fakePng)

    expect(new TextDecoder().decode(file.subarray(0, 4))).toBe("icns")
    expect(new DataView(file.buffer).getUint32(4)).toBe(file.length)
  })

  it("stores each icon type with the PNG of its pixel size", () => {
    const entries = readIcnsEntries(encodeIcnsFile(fakePng))

    expect(entries).toEqual([
      { type: "icp4", image: "png 16" },
      { type: "icp5", image: "png 32" },
      { type: "ic11", image: "png 32" },
      { type: "icp6", image: "png 64" },
      { type: "ic12", image: "png 64" },
      { type: "ic07", image: "png 128" },
      { type: "ic08", image: "png 256" },
      { type: "ic13", image: "png 256" },
      { type: "ic09", image: "png 512" },
      { type: "ic14", image: "png 512" },
      { type: "ic10", image: "png 1024" },
    ])
  })
})

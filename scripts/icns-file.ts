// Each icns entry type holds one pixel size. The second type for a size is
// its Retina ("@2x") slot: ic11 is 16 pt drawn with 32 pixels, and so on.
const icnsEntryTypes = [
  { type: "icp4", size: 16 },
  { type: "icp5", size: 32 },
  { type: "ic11", size: 32 },
  { type: "icp6", size: 64 },
  { type: "ic12", size: 64 },
  { type: "ic07", size: 128 },
  { type: "ic08", size: 256 },
  { type: "ic13", size: 256 },
  { type: "ic09", size: 512 },
  { type: "ic14", size: 512 },
  { type: "ic10", size: 1024 },
]

const blockHeaderLength = 8

export function encodeIcnsFile(renderPng: (size: number) => Uint8Array): Uint8Array {
  const entries = icnsEntryTypes.map(({ type, size }) => ({ type, png: renderPng(size) }))
  let fileLength = blockHeaderLength
  for (const { png } of entries) {
    fileLength += blockHeaderLength + png.length
  }

  const file = new Uint8Array(fileLength)
  const view = new DataView(file.buffer)
  const encoder = new TextEncoder()
  file.set(encoder.encode("icns"), 0)
  view.setUint32(4, fileLength)

  let entryOffset = blockHeaderLength
  for (const { type, png } of entries) {
    file.set(encoder.encode(type), entryOffset)
    view.setUint32(entryOffset + 4, blockHeaderLength + png.length)
    file.set(png, entryOffset + blockHeaderLength)
    entryOffset += blockHeaderLength + png.length
  }
  return file
}

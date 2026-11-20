// Windows picks the closest size for each place it shows the icon: small ones
// in title bars and lists, 48 in Explorer, 256 for large tiles.
const icoSizes = [16, 24, 32, 48, 64, 128, 256]

const directoryHeaderLength = 6
const directoryEntryLength = 16

// Each entry stores a whole PNG, which Windows has read since Vista. That
// keeps the file small and needs no bitmap encoder.
export function encodeIcoFile(renderPng: (size: number) => Uint8Array): Uint8Array {
  const images = icoSizes.map((size) => ({ size, png: renderPng(size) }))
  const directoryLength = directoryHeaderLength + directoryEntryLength * images.length
  let fileLength = directoryLength
  for (const { png } of images) {
    fileLength += png.length
  }

  const file = new Uint8Array(fileLength)
  const view = new DataView(file.buffer)
  view.setUint16(2, 1, true)
  view.setUint16(4, images.length, true)

  let imageOffset = directoryLength
  for (const [index, { size, png }] of images.entries()) {
    const entry = directoryHeaderLength + directoryEntryLength * index
    // Dimensions are one byte each, so 256 is written as 0.
    view.setUint8(entry, size % 256)
    view.setUint8(entry + 1, size % 256)
    view.setUint16(entry + 4, 1, true)
    view.setUint16(entry + 6, 32, true)
    view.setUint32(entry + 8, png.length, true)
    view.setUint32(entry + 12, imageOffset, true)
    file.set(png, imageOffset)
    imageOffset += png.length
  }
  return file
}

import type { BrowserContext } from "@playwright/test"

// Colors for drawn covers only: they stand in for Spotify's artwork, which no
// theme controls.
const coverPalettes = [
  ["#1f3a5f", "#f2a65a", "#f7e1c7"],
  ["#2d1e2f", "#e05263", "#f4c3c9"],
  ["#0f4c5c", "#e36414", "#fbe7c6"],
  ["#3a2e39", "#f4d35e", "#ebebd3"],
  ["#14213d", "#fca311", "#e5e5e5"],
  ["#264653", "#e9c46a", "#f4a261"],
  ["#5f0f40", "#fb8b24", "#f9dbbd"],
  ["#22333b", "#c6ac8f", "#eae0d5"],
  ["#283618", "#dda15e", "#fefae0"],
  ["#3d405b", "#81b29a", "#f2cc8f"],
] as const

// FNV-1a, so neighbouring ids such as album-1 and album-2 get unrelated covers.
const hashOf = (text: string) => {
  let hash = 2_166_136_261
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16_777_619) >>> 0
  }
  return hash
}

type CoverPalette = (typeof coverPalettes)[number]

const drawSun = ([ground, figure, light]: CoverPalette, seed: number) =>
  `<rect width="640" height="640" fill="${ground}"/>` +
  `<circle cx="${220 + (seed % 200)}" cy="300" r="200" fill="${figure}"/>` +
  `<circle cx="${220 + (seed % 200)}" cy="300" r="60" fill="${light}"/>`

const drawBands = ([ground, figure, light]: CoverPalette) =>
  `<rect width="640" height="640" fill="${light}"/>` +
  [0, 1, 2, 3, 4]
    .map((band) => {
      const fill = band % 2 === 0 ? ground : figure
      return `<rect y="${band * 128 + 40}" width="640" height="56" fill="${fill}"/>`
    })
    .join("")

const drawSlope = ([ground, figure, light]: CoverPalette, seed: number) =>
  `<rect width="640" height="640" fill="${ground}"/>` +
  `<path d="M0 640 L640 ${120 + (seed % 240)} L640 640 Z" fill="${figure}"/>` +
  `<circle cx="180" cy="180" r="70" fill="${light}"/>`

const drawRings = ([ground, figure, light]: CoverPalette) =>
  `<rect width="640" height="640" fill="${figure}"/>` +
  [300, 230, 160, 90]
    .map((radius, ring) => {
      const fill = ring % 2 === 0 ? ground : light
      return `<circle cx="320" cy="320" r="${radius}" fill="${fill}"/>`
    })
    .join("")

const coverCompositions = [drawSun, drawBands, drawSlope, drawRings]

const drawCover = (coverPath: string) => {
  const seed = hashOf(coverPath)
  const palette = coverPalettes[seed % coverPalettes.length] ?? coverPalettes[0]
  const compose = coverCompositions[(seed >>> 8) % coverCompositions.length] ?? drawSun
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">${compose(palette, seed)}</svg>`
}

// The fixtures' covers live at made-up paths on Spotify's cover host
// (coverUrl in spotify-fixtures.ts). Drawing one for each makes the app look
// as it does with real artwork, for the README's screenshots.
export async function serveFakeCoverArt(context: BrowserContext): Promise<void> {
  await context.route("https://i.scdn.co/image/open-spotify-fake-*", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: drawCover(new URL(route.request().url()).pathname),
    }),
  )
}

import path from "node:path"

const releaseDirectory = path.join(import.meta.dirname, "..", "release")

// Where `pnpm package:dir` puts the unpacked app on each OS.
export function packagedAppExecutable(): string {
  if (process.platform === "win32") {
    return path.join(releaseDirectory, "win-unpacked", "Open Spotify.exe")
  }
  if (process.platform === "darwin") {
    const macFolder = process.arch === "arm64" ? "mac-arm64" : "mac"
    return path.join(
      releaseDirectory,
      macFolder,
      "Open Spotify.app",
      "Contents",
      "MacOS",
      "Open Spotify",
    )
  }
  return path.join(releaseDirectory, "linux-unpacked", "open-spotify")
}

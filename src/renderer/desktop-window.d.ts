import type { DesktopApi } from "../preload/desktop-api"

declare global {
  interface Window {
    readonly desktop: DesktopApi
  }
}

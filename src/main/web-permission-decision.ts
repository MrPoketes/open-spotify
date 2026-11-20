import type { Session } from "electron"

type PermissionCheckHandler = NonNullable<Parameters<Session["setPermissionCheckHandler"]>[0]>

type WebPermission = Parameters<PermissionCheckHandler>[1]

// Electron grants most web permissions by default. The UI needs none of them
// except clipboard writes for its copy buttons, so injected content cannot
// reach the camera, microphone, location, or notifications.
export function isWebPermissionGranted(permission: WebPermission): boolean {
  return permission === "clipboard-sanitized-write"
}

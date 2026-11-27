import type { Device } from "../spotify/spotify-device"
import { describeThisComputerFailure, type ThisComputerFailure } from "./this-computer-failure"

const thisComputerName = "This computer"

// A device without an id never matches, even while this computer has none.
const isThisComputer = (device: Device, thisComputerDeviceId: string | null) =>
  thisComputerDeviceId !== null && device.id === thisComputerDeviceId

export const shownDeviceName = (device: Device, thisComputerDeviceId: string | null) =>
  isThisComputer(device, thisComputerDeviceId) ? thisComputerName : device.name

export interface DeviceEntry {
  readonly device: Device
  // Why this computer cannot play, on its own entry only.
  readonly failureReason: string | null
}

// This computer before Spotify lists it. Without a device id it cannot be
// picked, and its entry only says why it cannot play.
const unlistedThisComputer = (thisComputerDeviceId: string | null): Device => ({
  id: thisComputerDeviceId,
  name: thisComputerName,
  type: "Computer",
  isActive: false,
  isRestricted: false,
  volumePercent: null,
  supportsVolume: true,
})

// Spotify's device list can lag behind the SDK's ready event, so this
// computer is listed as soon as the SDK reports its device, or as soon as
// it fails, so the user sees why it cannot play.
export const withThisComputer = (
  devices: ReadonlyArray<Device>,
  thisComputerDeviceId: string | null,
  failure: ThisComputerFailure | null,
): ReadonlyArray<DeviceEntry> => {
  const failureReason = failure === null ? null : describeThisComputerFailure(failure)
  const entries = devices.map((device) =>
    isThisComputer(device, thisComputerDeviceId)
      ? { device: { ...device, name: thisComputerName }, failureReason }
      : { device, failureReason: null },
  )
  const isListedBySpotify = devices.some((device) => isThisComputer(device, thisComputerDeviceId))
  const hasNothingToShow = thisComputerDeviceId === null && failure === null
  if (isListedBySpotify || hasNothingToShow) {
    return entries
  }
  return [...entries, { device: unlistedThisComputer(thisComputerDeviceId), failureReason }]
}

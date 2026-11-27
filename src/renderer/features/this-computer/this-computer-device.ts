import type { Device } from "../spotify/spotify-device"

const thisComputerName = "This computer"

export const shownDeviceName = (device: Device, thisComputerDeviceId: string | null) =>
  device.id === thisComputerDeviceId ? thisComputerName : device.name

// Spotify's device list can lag behind the SDK's ready event, so this
// computer is listed as soon as the SDK reports its device.
export const withThisComputer = (
  devices: ReadonlyArray<Device>,
  thisComputerDeviceId: string | null,
): ReadonlyArray<Device> => {
  if (thisComputerDeviceId === null) {
    return devices
  }
  const named = devices.map((device) => ({
    ...device,
    name: shownDeviceName(device, thisComputerDeviceId),
  }))
  if (devices.some(({ id }) => id === thisComputerDeviceId)) {
    return named
  }
  return [
    ...named,
    {
      id: thisComputerDeviceId,
      name: thisComputerName,
      type: "Computer",
      isActive: false,
      isRestricted: false,
      volumePercent: null,
      supportsVolume: true,
    },
  ]
}

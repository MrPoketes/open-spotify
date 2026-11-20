import {
  Car,
  Cast,
  Gamepad2,
  Laptop,
  type LucideIcon,
  MonitorSpeaker,
  Smartphone,
  Speaker,
  Tablet,
  Tv,
} from "lucide-react"

interface DeviceType {
  readonly label: string
  readonly icon: LucideIcon
}

// Keyed by Spotify's device types in lower case, because the documentation
// writes them in lower case and the API capitalises them ("Computer").
const deviceTypes: Record<string, DeviceType> = {
  computer: { label: "Computer", icon: Laptop },
  tablet: { label: "Tablet", icon: Tablet },
  smartphone: { label: "Phone", icon: Smartphone },
  speaker: { label: "Speaker", icon: Speaker },
  avr: { label: "AV receiver", icon: Speaker },
  tv: { label: "TV", icon: Tv },
  stb: { label: "Set-top box", icon: Tv },
  castvideo: { label: "Cast device", icon: Cast },
  castaudio: { label: "Cast device", icon: Cast },
  audiodongle: { label: "Audio adapter", icon: Cast },
  gameconsole: { label: "Game console", icon: Gamepad2 },
  automobile: { label: "Car", icon: Car },
}

export const describeDeviceType = (spotifyType: string): DeviceType =>
  deviceTypes[spotifyType.toLowerCase()] ?? { label: spotifyType, icon: MonitorSpeaker }

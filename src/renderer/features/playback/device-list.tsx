import { Effect } from "effect"
import { Volume2 } from "lucide-react"
import { type KeyboardEvent, use, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { useLoad } from "../../lib/use-load"
import { LoadingMessage } from "../../ui/loading-message"
import { menuRowClassName } from "../../ui/menu-row-class-name"
import { AccentButton } from "../../ui/pill-button"
import { type RovingRowProps, useRovingFocus } from "../../ui/use-roving-focus"
import type { Device } from "../spotify/spotify-device"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import { describeDeviceType } from "./device-type"
import { Player } from "./player"

const listAvailableDevices = Effect.gen(function* () {
  const player = yield* Player
  return yield* player.listDevices
})

interface DeviceListProps {
  readonly onDeviceChosen: () => void
}

export function DeviceList({ onDeviceChosen }: DeviceListProps) {
  const { state: availableDevices, retry } = useLoad(
    listAvailableDevices,
    "The device list failed to load",
  )

  if (availableDevices.status === "loading") {
    return <LoadingMessage>Looking for devices…</LoadingMessage>
  }

  if (availableDevices.status === "failed") {
    return (
      <SpotifyLoadFailure
        error={availableDevices.error}
        message="Your devices didn't load."
        onRetry={retry}
      />
    )
  }

  if (availableDevices.value.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p>No devices found.</p>
        <p className="text-muted">
          Open the Spotify app on this computer, your phone, or a speaker, then look again.
        </p>
        <AccentButton label="Look again" onClick={retry} />
      </div>
    )
  }

  return <DeviceChoices devices={availableDevices.value} onDeviceChosen={onDeviceChosen} />
}

interface DeviceChoicesProps extends DeviceListProps {
  readonly devices: ReadonlyArray<Device>
}

function DeviceChoices({ devices, onDeviceChosen }: DeviceChoicesProps) {
  const runtime = use(RendererRuntimeContext)
  const [failedDevice, setFailedDevice] = useState<Device | null>(null)
  // The active device comes first, so the list's tab stop starts on it.
  const orderedDevices = [
    ...devices.filter(({ isActive }) => isActive),
    ...devices.filter(({ isActive }) => !isActive),
  ]
  const { onKeyDown, rowProps } = useRovingFocus(orderedDevices.length)

  const choose = (device: Device, deviceId: string) => {
    if (device.isActive) {
      onDeviceChosen()
      return
    }
    runtime.runFork(
      Effect.gen(function* () {
        const player = yield* Player
        yield* player.transferPlayback(deviceId)
      }).pipe(
        Effect.tapError((error) => Effect.logError("Playback failed to transfer", error)),
        Effect.match({
          onFailure: () => setFailedDevice(device),
          onSuccess: onDeviceChosen,
        }),
      ),
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col">
        {orderedDevices.map((device, index) => (
          <li key={device.id ?? device.name}>
            <DeviceChoice
              device={device}
              rovingProps={rowProps(index)}
              onKeyDown={onKeyDown}
              onChoose={(deviceId) => choose(device, deviceId)}
            />
          </li>
        ))}
      </ul>
      {failedDevice !== null && (
        <p role="alert" className="text-sm text-danger">
          Couldn't switch to {failedDevice.name}. Check that it is on and try again.
        </p>
      )}
    </div>
  )
}

interface DeviceChoiceProps {
  readonly device: Device
  readonly rovingProps: RovingRowProps
  readonly onKeyDown: (event: KeyboardEvent) => void
  readonly onChoose: (deviceId: string) => void
}

function DeviceChoice({ device, rovingProps, onKeyDown, onChoose }: DeviceChoiceProps) {
  const { label, icon: Icon } = describeDeviceType(device.type)
  const { id } = device
  // aria-disabled instead of disabled: a disabled button cannot take focus,
  // and the roving focus would get stuck on it or lose its only tab stop.
  return (
    <button
      type="button"
      {...rovingProps}
      aria-disabled={id === null}
      aria-current={device.isActive}
      onClick={id === null ? undefined : () => onChoose(id)}
      onKeyDown={onKeyDown}
      className={`${menuRowClassName} aria-disabled:opacity-50`}
    >
      <Icon aria-hidden size={20} className={device.isActive ? "text-accent" : "text-muted"} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate text-sm ${device.isActive ? "font-semibold text-accent" : ""}`}>
          {device.name}
        </span>
        <span className="truncate text-xs text-muted">
          {device.isActive ? `${label} · Playing here` : label}
        </span>
      </span>
      {device.isActive && <Volume2 aria-hidden size={16} className="text-accent" />}
    </button>
  )
}

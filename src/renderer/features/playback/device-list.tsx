import { Effect } from "effect"
import { Volume2 } from "lucide-react"
import { use, useState, type KeyboardEvent } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { useLoad } from "../../lib/use-load"
import { Button } from "../../ui/button"
import { LoadingMessage } from "../../ui/loading-message"
import { menuRowClassName } from "../../ui/menu-row-class-name"
import { useRovingFocus, type RovingRowProps } from "../../ui/use-roving-focus"
import type { Device } from "../spotify/spotify-device"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import { withThisComputer, type DeviceEntry } from "../this-computer/this-computer-device"
import { ThisComputerDeviceIdContext } from "../this-computer/this-computer-device-id-context"
import { ThisComputerFailureContext } from "../this-computer/this-computer-failure-context"
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
  const thisComputerDeviceId = use(ThisComputerDeviceIdContext)
  const thisComputerFailure = use(ThisComputerFailureContext)
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

  const deviceEntries = withThisComputer(
    availableDevices.value,
    thisComputerDeviceId,
    thisComputerFailure,
  )

  if (deviceEntries.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p>No devices found.</p>
        <p className="text-muted">
          Open the Spotify app on this computer, your phone, or a speaker, then look again.
        </p>
        <Button onClick={retry}>Look again</Button>
      </div>
    )
  }

  return <DeviceChoices deviceEntries={deviceEntries} onDeviceChosen={onDeviceChosen} />
}

interface DeviceChoicesProps extends DeviceListProps {
  readonly deviceEntries: ReadonlyArray<DeviceEntry>
}

function DeviceChoices({ deviceEntries, onDeviceChosen }: DeviceChoicesProps) {
  const runtime = use(RendererRuntimeContext)
  const [failedDevice, setFailedDevice] = useState<Device | null>(null)
  // The active device comes first, so the list's tab stop starts on it.
  const orderedEntries = [
    ...deviceEntries.filter(({ device }) => device.isActive),
    ...deviceEntries.filter(({ device }) => !device.isActive),
  ]
  const { onKeyDown, rowProps } = useRovingFocus(orderedEntries.length)

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
        {orderedEntries.map(({ device, failureReason }, index) => (
          <li key={device.id ?? device.name}>
            <DeviceChoice
              device={device}
              failureReason={failureReason}
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
  readonly failureReason: string | null
  readonly rovingProps: RovingRowProps
  readonly onKeyDown: (event: KeyboardEvent) => void
  readonly onChoose: (deviceId: string) => void
}

function DeviceChoice({
  device,
  failureReason,
  rovingProps,
  onKeyDown,
  onChoose,
}: DeviceChoiceProps) {
  const { label, icon: Icon } = describeDeviceType(device.type)
  const { id } = device
  // aria-disabled instead of disabled: a disabled button cannot take focus,
  // and the roving focus would get stuck on it or lose its only tab stop. A
  // row that says why this computer cannot play stays at full opacity, so the
  // reason stays readable.
  const disabledClassName = failureReason === null ? "aria-disabled:opacity-50" : ""
  return (
    <button
      type="button"
      {...rovingProps}
      aria-disabled={id === null}
      aria-current={device.isActive}
      onClick={id === null ? undefined : () => onChoose(id)}
      onKeyDown={onKeyDown}
      className={`${menuRowClassName} ${disabledClassName}`}
    >
      <Icon aria-hidden size={20} className={device.isActive ? "text-accent" : "text-muted"} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate text-sm ${device.isActive ? "font-semibold text-accent" : ""}`}>
          {device.name}
        </span>
        {failureReason === null ? (
          <span className="truncate text-xs text-muted">
            {device.isActive ? `${label} · Playing here` : label}
          </span>
        ) : (
          <span className="text-xs text-danger">{failureReason}</span>
        )}
      </span>
      {device.isActive && <Volume2 aria-hidden size={16} className="text-accent" />}
    </button>
  )
}

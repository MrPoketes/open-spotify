import { use, useId } from "react"
import { SettingRow } from "../../ui/setting-row"
import { Switch } from "../../ui/switch"
import { PlayOnThisComputerContext } from "./play-on-this-computer-context"

export function PlayOnThisComputerSetting() {
  const { playOnThisComputer, choosePlayOnThisComputer } = use(PlayOnThisComputerContext)
  const switchId = useId()

  return (
    <SettingRow
      label="Play on this computer"
      description="Lists this computer in the device picker, so Spotify can play here without the official app. When it is off, Open Spotify only controls your other devices."
      controlId={switchId}
    >
      {({ labelId, descriptionId }) => (
        <Switch
          id={switchId}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          checked={playOnThisComputer}
          onCheckedChange={choosePlayOnThisComputer}
        />
      )}
    </SettingRow>
  )
}

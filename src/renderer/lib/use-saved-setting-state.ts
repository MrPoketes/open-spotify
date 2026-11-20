import { use, useState } from "react"
import type { SettingKey, SettingValue } from "../../shared/settings"
import { RendererRuntimeContext } from "./renderer-runtime"
import { saveSetting } from "./saved-setting"

// State for a choice the app remembers: a change shows at once and is saved
// in the background.
export const useSavedSettingState = <K extends SettingKey>(key: K, savedValue: SettingValue<K>) => {
  const runtime = use(RendererRuntimeContext)
  const [value, setValue] = useState(savedValue)
  const change = (nextValue: SettingValue<K>) => {
    setValue(nextValue)
    runtime.runFork(saveSetting(key, nextValue))
  }
  return [value, change] as const
}

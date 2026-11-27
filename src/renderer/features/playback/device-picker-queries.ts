import { screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"

export const pickerButton = (deviceLabel: string) =>
  screen.findByRole("button", { name: `Choose a device. ${deviceLabel}` })

export const openPicker = async (deviceLabel = "Playing on Mira's Laptop") => {
  await userEvent.click(await pickerButton(deviceLabel))
  return screen.getByRole("dialog", { name: "Connect to a device" })
}

export const deviceButton = async (picker: HTMLElement, name: RegExp) =>
  within(picker).findByRole("button", { name })

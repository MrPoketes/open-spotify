import { screen, waitFor } from "@testing-library/react"
import { expect } from "vitest"

export const seekBar = () => screen.findByRole("slider", { name: "Playback position" })

export const showsPosition = (slider: HTMLElement, position: string) =>
  waitFor(() => expect(slider).toHaveAttribute("aria-valuetext", position))

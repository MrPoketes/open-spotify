import { screen } from "@testing-library/react"

// The status message region keeps its text in a paragraph, which tells it
// apart from other status regions, such as the library's for its filters,
// and from the same words elsewhere on the screen, such as an entry's name.
export const findStatusMessage = (text: string) =>
  screen.findByText(text, { selector: "output > p" })

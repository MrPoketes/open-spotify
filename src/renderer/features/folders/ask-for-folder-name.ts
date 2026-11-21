import { createContext } from "react"

// Opens the New folder dialog, which passes the name the user chose to
// onName. FoldersProvider in the app shell renders the dialog, so it outlives
// the menu and the row that opened it.
export const AskForFolderNameContext = createContext<(onName: (name: string) => void) => void>(
  () => undefined,
)

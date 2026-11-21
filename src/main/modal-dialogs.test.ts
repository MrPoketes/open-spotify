import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import { choosePathToOpen, choosePathToSave } from "./modal-dialogs"

const jsonFiles = { title: "Choose a file", filters: [{ name: "JSON", extensions: ["json"] }] }

// Electron reports a cancelled save dialog as an empty path, which must never
// reach the file system as a place to write.
const cancellingDialogModule = {
  showSaveDialog: () => Promise.resolve({ canceled: true, filePath: "" }),
  showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
}

const choosingDialogModule = {
  showSaveDialog: () => Promise.resolve({ canceled: false, filePath: "/backups/library.json" }),
  showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: ["/backups/library.json"] }),
}

describe("modal dialogs", () => {
  it.effect("chooses no path when the user cancels either dialog", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* choosePathToOpen(cancellingDialogModule, null, jsonFiles),
        Option.none(),
      )
      assert.deepStrictEqual(
        yield* choosePathToSave(cancellingDialogModule, null, {
          ...jsonFiles,
          defaultPath: "library.json",
        }),
        Option.none(),
      )
    }),
  )

  it.effect("chooses the path the user picked in either dialog", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* choosePathToOpen(choosingDialogModule, null, jsonFiles),
        Option.some("/backups/library.json"),
      )
      assert.deepStrictEqual(
        yield* choosePathToSave(choosingDialogModule, null, {
          ...jsonFiles,
          defaultPath: "library.json",
        }),
        Option.some("/backups/library.json"),
      )
    }),
  )
})

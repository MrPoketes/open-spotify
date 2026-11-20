import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import { FileDialogs } from "./file-dialogs"

// Electron reports a cancelled save dialog as an empty path, which must never
// reach the file system as a place to write.
const cancellingDialogModule = {
  showSaveDialog: () => Promise.resolve({ canceled: true, filePath: "" }),
  showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
}

const choosingDialogModule = {
  showSaveDialog: () => Promise.resolve({ canceled: false, filePath: "/backups/folders.json" }),
  showOpenDialog: () => Promise.resolve({ canceled: false, filePaths: ["/backups/folders.json"] }),
}

describe("FileDialogs", () => {
  it.effect("chooses no path when the user cancels either dialog", () =>
    Effect.gen(function* () {
      const fileDialogs = yield* FileDialogs

      assert.deepStrictEqual(yield* fileDialogs.chooseFoldersExportPath(null), Option.none())
      assert.deepStrictEqual(yield* fileDialogs.chooseFoldersImportPath(null), Option.none())
    }).pipe(Effect.provide(FileDialogs.layer(cancellingDialogModule))),
  )

  it.effect("chooses the path the user picked in either dialog", () =>
    Effect.gen(function* () {
      const fileDialogs = yield* FileDialogs

      assert.deepStrictEqual(
        yield* fileDialogs.chooseFoldersExportPath(null),
        Option.some("/backups/folders.json"),
      )
      assert.deepStrictEqual(
        yield* fileDialogs.chooseFoldersImportPath(null),
        Option.some("/backups/folders.json"),
      )
    }).pipe(Effect.provide(FileDialogs.layer(choosingDialogModule))),
  )
})

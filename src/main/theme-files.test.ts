import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Option, Ref } from "effect"
import { builtInThemes } from "../shared/built-in-themes"
import { decodeThemeFile } from "../shared/theme"
import { freshThemeStorage, storedThemes } from "./imported-themes-fakes"
import { Settings } from "./settings"
import { ThemeFileDialogs } from "./theme-file-dialogs"
import { exportCurrentTheme, importThemeFile } from "./theme-files"

const themeFile = (name: string, tokens: Record<string, string> = {}) =>
  JSON.stringify({ name, author: "A theme author", version: "1.0.0", colorScheme: "dark", tokens })

// Works in a temporary folder and answers the dialogs the way the user would:
// the file chosen in either file dialog is the one the test last named.
const setUp = Effect.fn("setUp")(function* ({ replacesTheme = true } = {}) {
  const fileSystem = yield* FileSystem.FileSystem
  const folder = yield* fileSystem.makeTempDirectoryScoped()
  const chosenFile = yield* Ref.make(Option.none<string>())
  const suggestedFileNames = yield* Ref.make<ReadonlyArray<string>>([])
  const dialogs = ThemeFileDialogs.of({
    chooseFileToImport: () => Ref.get(chosenFile),
    chooseExportFile: (_parentWindow, suggestedFileName) =>
      Ref.update(suggestedFileNames, (names) => [...names, suggestedFileName]).pipe(
        Effect.andThen(Ref.get(chosenFile)),
      ),
    confirmReplace: () => Effect.succeed(replacesTheme),
  })
  const chooseFile = (fileName: string) =>
    Ref.set(chosenFile, Option.some(path.join(folder, fileName)))

  const importFile = (fileName: string, contents: string) =>
    fileSystem
      .writeFileString(path.join(folder, fileName), contents)
      .pipe(
        Effect.andThen(chooseFile(fileName)),
        Effect.andThen(importThemeFile(null)),
        Effect.provideService(ThemeFileDialogs, dialogs),
      )
  const exportTo = (fileName: string) =>
    chooseFile(fileName).pipe(
      Effect.andThen(exportCurrentTheme(null)),
      Effect.andThen(fileSystem.readFileString(path.join(folder, fileName))),
      Effect.provideService(ThemeFileDialogs, dialogs),
    )
  const importAndChoose = Effect.fn("importAndChoose")(function* (contents: string) {
    const settings = yield* Settings
    const importedTheme = Option.getOrThrow(yield* importFile("theme.json", contents))
    yield* settings.set("themeId", importedTheme.id)
    return importedTheme
  })
  return { importFile, importAndChoose, exportTo, suggestedFileNames }
})

const freshStorage = () => freshThemeStorage().pipe(Layer.provideMerge(NodeFileSystem.layer))

describe("importThemeFile", () => {
  it.effect("stores a valid theme, filling the tokens it leaves out with the defaults", () =>
    Effect.gen(function* () {
      const { importFile } = yield* setUp()

      yield* importFile("sunset.json", themeFile("Sunset", { "color-accent": "#ffaa00" }))

      const [storedTheme] = yield* storedThemes
      assert.deepStrictEqual(storedTheme?.theme.tokens, {
        ...builtInThemes.dark.tokens,
        "color-accent": "#ffaa00",
      })
    }).pipe(Effect.provide(freshStorage())),
  )

  // Theme authors edit JSON by hand, so the message has to point at the line.
  it.effect("rejects an invalid theme with a message naming the file and token", () =>
    Effect.gen(function* () {
      const { importFile } = yield* setUp()

      const error = yield* Effect.flip(
        importFile("sunset.json", themeFile("Sunset", { "color-acent": "#ffaa00" })),
      )

      assert.strictEqual(error._tag, "ThemeImportFailed")
      assert.include(error.message, "sunset.json")
      assert.include(error.message, '["tokens"]["color-acent"]')
      assert.deepStrictEqual(yield* storedThemes, [])
    }).pipe(Effect.provide(freshStorage())),
  )

  it.effect("rejects a file that is not JSON", () =>
    Effect.gen(function* () {
      const { importFile } = yield* setUp()

      const error = yield* Effect.flip(importFile("notes.json", "name: Sunset"))

      assert.include(error.message, "notes.json is not a valid theme")
    }).pipe(Effect.provide(freshStorage())),
  )

  // A theme someone shares must never take the place of one the app ships.
  it.effect("rejects a theme with the name and author of a built-in theme", () =>
    Effect.gen(function* () {
      const { importFile } = yield* setUp()
      const { name, author, colorScheme } = builtInThemes.dark
      const builtInLookalike = JSON.stringify({
        name,
        author,
        version: "2",
        colorScheme,
        tokens: {},
      })

      const error = yield* Effect.flip(importFile("dark.json", builtInLookalike))

      assert.include(error.message, "is a built-in theme")
      assert.deepStrictEqual(yield* storedThemes, [])
    }).pipe(Effect.provide(freshStorage())),
  )

  // Keeping the id keeps the theme chosen when the user updates the one in use.
  it.effect("replaces a theme with the same name and author under the same id", () =>
    Effect.gen(function* () {
      const { importFile } = yield* setUp({ replacesTheme: true })
      const firstImport = yield* importFile("v1.json", themeFile("Sunset", { spacing: "4px" }))

      const secondImport = yield* importFile("v2.json", themeFile("Sunset", { spacing: "5px" }))

      const replacedTheme = Option.getOrThrow(secondImport)
      assert.strictEqual(replacedTheme.id, Option.getOrThrow(firstImport).id)
      assert.deepStrictEqual(yield* storedThemes, [replacedTheme])
    }).pipe(Effect.provide(freshStorage())),
  )

  it.effect("keeps the stored theme when the user declines to replace it", () =>
    Effect.gen(function* () {
      const { importFile } = yield* setUp({ replacesTheme: false })
      const firstImport = yield* importFile("v1.json", themeFile("Sunset", { spacing: "4px" }))

      const secondImport = yield* importFile("v2.json", themeFile("Sunset", { spacing: "5px" }))

      assert.isTrue(Option.isNone(secondImport))
      assert.deepStrictEqual(yield* storedThemes, [Option.getOrThrow(firstImport)])
    }).pipe(Effect.provide(freshStorage())),
  )
})

describe("exportCurrentTheme", () => {
  it.effect("writes the active theme as indented JSON that imports back unchanged", () =>
    Effect.gen(function* () {
      const { importFile, importAndChoose, exportTo } = yield* setUp()
      const activeTheme = yield* importAndChoose(themeFile("Sunset", { spacing: "5px" }))

      const exportedFile = yield* exportTo("exported.json")

      assert.include(exportedFile, '\n  "name": "Sunset"')
      assert.deepStrictEqual(yield* decodeThemeFile(exportedFile), activeTheme.theme)
      assert.deepStrictEqual(
        yield* importFile("exported.json", exportedFile),
        Option.some(activeTheme),
      )
    }).pipe(Effect.provide(freshStorage())),
  )

  // A "/" in the name would otherwise point the save dialog into a folder.
  it.effect("suggests a file name made of the theme name's letters and digits", () =>
    Effect.gen(function* () {
      const { importAndChoose, exportTo, suggestedFileNames } = yield* setUp()
      yield* importAndChoose(themeFile("AC/DC Nights!"))

      yield* exportTo("exported.json")

      assert.deepStrictEqual(yield* Ref.get(suggestedFileNames), ["ac-dc-nights.json"])
    }).pipe(Effect.provide(freshStorage())),
  )
})

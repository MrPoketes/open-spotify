import { describe, expect, it } from "vitest"
import { findDuplicateCode } from "./duplicate-code.ts"
import { sourcesIn } from "./repository-sources.ts"

const copiedHelper = `
const buildApiFake = (
  overrides: (api: FakeApi["Service"]) => Partial<FakeApi["Service"]>,
) =>
  Layer.effect(
    FakeApi,
    Effect.gen(function* () {
      const api = yield* FakeApi
      return FakeApi.of({ ...api, ...overrides(api) })
    }),
  ).pipe(Layer.provide(FakeApi.layerFake))
`

const firstHook = `
  export function useCatalogItems(): CatalogState {
    const runtime = use(RuntimeContext)
    const [state, setState] = useState<CatalogState>({ status: "loading" })

    useEffect(() => {
      const running = runtime.runFork(
        loadCatalogItems.pipe(
          Effect.tapError((error) => Effect.logError("Catalog failed to load", error)),
          Effect.match({
            onFailure: failedCatalogState,
            onSuccess: (items): CatalogState => ({ status: "loaded", items }),
          }),
          Effect.flatMap((nextState) => Effect.sync(() => setState(nextState))),
        ),
      )
      return () => {
        runtime.runFork(Fiber.interrupt(running))
      }
    }, [runtime])

    return state
  }
`

const renamedHook = `
  export function useConnectedSpeakers(): SpeakersState {
    const runtime = use(RuntimeContext)
    const [state, setState] = useState<SpeakersState>({ status: "loading" })

    useEffect(() => {
      const pending = runtime.runFork(
        loadConnectedSpeakers.pipe(
          Effect.tapError((error) => Effect.logError("Speakers failed to load", error)),
          Effect.match({
            onFailure: failedSpeakersState,
            onSuccess: (speakers): SpeakersState => ({ status: "loaded", speakers }),
          }),
          Effect.flatMap((loaded) => Effect.sync(() => setState(loaded))),
        ),
      )
      return () => {
        runtime.runFork(Fiber.interrupt(pending))
      }
    }, [runtime])

    return state
  }
`

describe("findDuplicateCode", () => {
  it("reports an exact block of code copied into another file", () => {
    const sources = new Map([
      ["src/a.ts", copiedHelper],
      ["src/b.ts", copiedHelper],
    ])

    expect(findDuplicateCode(sources)).toEqual([
      "Duplicate code (44 tokens): src/a.ts:2-11 and src/b.ts:2-11",
    ])
  })

  it("reports a copied block whose identifiers and strings were renamed", () => {
    const sources = new Map([
      ["src/catalog.ts", firstHook],
      ["src/speakers.ts", renamedHook],
    ])

    expect(findDuplicateCode(sources)).toEqual([
      "Duplicate code with renamed identifiers (100 tokens): src/catalog.ts:2-22 and src/speakers.ts:2-22",
    ])
  })

  it("ignores TypeScript interface mirrors and separate test cases", () => {
    const sources = new Map([
      [
        "src/main/service.ts",
        `export interface MainService {
          readonly readTree: Effect.Effect<Tree, StorageError>
          readonly createNode: (request: CreateNode) => Effect.Effect<string, StorageError>
          readonly renameNode: (request: RenameNode) => Effect.Effect<void, StorageError>
          readonly deleteNode: (request: DeleteNode) => Effect.Effect<void, StorageError>
          readonly moveNode: (request: MoveNode) => Effect.Effect<void, StorageError>
        }
        describe("first", () => {
          it("checks login redirect", async () => {
            await waitFor(() => expect(router.location.pathname).toBe("/login"))
            expect(router.location.search).toEqual({ expired: true })
          })
          it("checks logged out", async () => {
            await waitFor(() => expect(router.location.pathname).toBe("/login"))
          })
        })`,
      ],
      [
        "src/renderer/bridge.ts",
        `export interface BridgeService {
          readonly getTree: Effect.Effect<Tree, BridgeError>
          readonly createNode: (request: CreateNode) => Effect.Effect<string, BridgeError>
          readonly renameNode: (request: RenameNode) => Effect.Effect<void, BridgeError>
          readonly deleteNode: (request: DeleteNode) => Effect.Effect<void, BridgeError>
          readonly moveNode: (request: MoveNode) => Effect.Effect<void, BridgeError>
        }
        describe("second", () => {
          it("checks login redirect", async () => {
            await waitFor(() => expect(router.location.pathname).toBe("/login"))
            expect(router.location.search).toEqual({ expired: true })
          })
          it("checks logged out", async () => {
            await waitFor(() => expect(router.location.pathname).toBe("/login"))
          })
        })`,
      ],
    ])

    expect(findDuplicateCode(sources)).toEqual([])
  })

  it("reports duplicated long Tailwind class strings across files", () => {
    const buttonClasses =
      "rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-opacity duration-120 ease-out hover:opacity-90 active:opacity-75"
    const sources = new Map([
      [
        "src/a.tsx",
        `export const A = () => (
          <>
            <button className="mr-3 ${buttonClasses}" />
            <span className="flex items-center gap-2 rounded-small px-3 py-1" />
            <div className="flex min-h-screen items-center justify-center p-6" />
          </>
        )`,
      ],
      [
        "src/b.tsx",
        `export const B = () => (
          <>
            <button className="mr-2 ${buttonClasses}" />
            <span className="py-1 px-3 rounded-small gap-2 items-center flex" />
            <div className="flex min-h-screen items-center justify-center p-6" />
          </>
        )`,
      ],
    ])

    expect(findDuplicateCode(sources)).toEqual([
      "Duplicate Tailwind classes (12 shared): src/a.tsx:3 and src/b.tsx:3",
      "Duplicate Tailwind classes (6 shared): src/a.tsx:4 and src/b.tsx:4",
    ])
  })

  // Copy-pasted code drifts apart as one copy is fixed and another is missed
  // (AGENTS.md rules 4 and 9).
  it("finds no duplicated code across files in src/ and lint/", () => {
    const sources = sourcesIn(["src/**/*.{ts,tsx}", "lint/**/*.ts"])

    expect(findDuplicateCode(sources)).toEqual([])
  })
})

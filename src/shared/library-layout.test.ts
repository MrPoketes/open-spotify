import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { defaultLibrarySections, LibrarySections } from "./library-layout"

const decodeSections = Schema.decodeUnknownEffect(LibrarySections)

describe("LibrarySections", () => {
  // A missing kind would make every entry of that kind vanish from the sidebar.
  it.effect("rejects a section list that leaves out a kind", () =>
    Effect.gen(function* () {
      const withoutShows = defaultLibrarySections.filter(({ kind }) => kind !== "show")

      const error = yield* Effect.flip(decodeSections(withoutShows))

      assert.include(error.message, "each library section exactly once")
    }),
  )

  it.effect("rejects a section list that holds a kind twice", () =>
    Effect.gen(function* () {
      // Keeps the length right, so only the duplicate gives it away.
      const albumsInsteadOfLikedSongs = [
        ...defaultLibrarySections.slice(1),
        { kind: "album", hidden: false, collapsed: false },
      ]

      const error = yield* Effect.flip(decodeSections(albumsInsteadOfLikedSongs))

      assert.include(error.message, "each library section exactly once")
    }),
  )
})

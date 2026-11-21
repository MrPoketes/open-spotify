import { Effect, Stream } from "effect"
import { useStreamValue } from "../../lib/use-stream-value"
import { Player, type PlayerState } from "./player"

export type PlayerStateOrLoading = { readonly status: "loading" } | PlayerState

export const playerStates = Stream.unwrap(
  Effect.gen(function* () {
    const player = yield* Player
    return player.state
  }),
)

export function usePlayerState(): PlayerStateOrLoading {
  return useStreamValue(playerStates, { status: "loading" } as const)
}

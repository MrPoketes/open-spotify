import { Schema } from "effect"

export const TrackListDensity = Schema.Literals(["comfortable", "dense"])

export type TrackListDensity = typeof TrackListDensity.Type

export const defaultTrackListDensity: TrackListDensity = "comfortable"

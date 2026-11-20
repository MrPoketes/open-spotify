import { Schema } from "effect"

export const SearchParams = Schema.Struct({ q: Schema.optional(Schema.String) })

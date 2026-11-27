import { Option, Record, Result, Schema } from "effect"
import { CssLength, HexColor, themeTokenSchemas, type ThemeToken } from "../../../shared/theme"

type TokenPrefix<Token> = Token extends `${infer Prefix}-${string}` ? Prefix : Token

// Grouped and named as in docs/design.md. A token with a new prefix does not
// compile until it has a group here.
const groupHeadings: Record<TokenPrefix<ThemeToken>, string> = {
  color: "Colors",
  font: "Typography",
  radius: "Radii",
  spacing: "Spacing",
  shadow: "Shadows",
  artwork: "Artwork",
}

type TokenControl = "color" | "length" | "text"

export interface TokenField {
  readonly token: ThemeToken
  readonly control: TokenControl
}

interface TokenGroup {
  readonly heading: string
  readonly fields: ReadonlyArray<TokenField>
}

const controlFor = (token: ThemeToken): TokenControl => {
  const valueSchema = themeTokenSchemas[token]
  if (valueSchema === HexColor) {
    return "color"
  }
  return valueSchema === CssLength ? "length" : "text"
}

const themeTokens = Record.keys(themeTokenSchemas)

// Built from the Theme Schema, so a new token appears in the editor without
// changes here.
export const themeTokenGroups: ReadonlyArray<TokenGroup> = Object.entries(groupHeadings).map(
  ([prefix, heading]) => ({
    heading,
    fields: themeTokens
      .filter((token) => token === prefix || token.startsWith(`${prefix}-`))
      .map((token) => ({ token, control: controlFor(token) })),
  }),
)

// What is wrong with a value the user typed, such as "Expected a hex color
// like #1a2b3c", or none when the token accepts it.
export const tokenValueProblem = (token: ThemeToken, value: string): Option.Option<string> =>
  Result.match(Schema.decodeUnknownResult(themeTokenSchemas[token])(value), {
    onSuccess: () => Option.none(),
    onFailure: (error) => Option.some(error.message),
  })

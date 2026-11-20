import { Schema } from "effect"
import { LibraryTheme } from "./theme-library"

// The message tells the user what to fix, such as the first problem in the file.
export class ThemeImportFailed extends Schema.TaggedError<ThemeImportFailed>()(
  "ThemeImportFailed",
  { message: Schema.String },
) {}

// A rejected invoke loses its error type, so a file the user has to fix
// travels inside the reply.
export const ImportThemeReply = Schema.Union([
  Schema.TaggedStruct("ThemeImported", { importedTheme: LibraryTheme }),
  Schema.TaggedStruct("ThemeImportCanceled", {}),
  ThemeImportFailed,
])

// The file the theme was written to, or null when the user canceled.
export const ExportThemeReply = Schema.OptionFromNullOr(Schema.String)

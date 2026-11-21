import { Schema } from "effect"
import { FolderId } from "./folders"

// The sidebar folders the user expanded. Storing these rather than the
// collapsed ones makes every new folder start collapsed, which keeps the
// sidebar short until the user opens a folder.
export const ExpandedFolders = Schema.Array(FolderId)

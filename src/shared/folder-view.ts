import { Schema } from "effect"

export const FolderView = Schema.Literals(["grid", "list"])

export type FolderView = typeof FolderView.Type

export const defaultFolderView: FolderView = "grid"

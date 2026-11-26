import { integer, sqliteTable, text, unique, type AnySQLiteColumn } from "drizzle-orm/sqlite-core"

export const settingsTable = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})

export const folderEntriesTable = sqliteTable(
  "folder_entries",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id").references((): AnySQLiteColumn => folderEntriesTable.id, {
      onDelete: "cascade",
    }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    spotifyUri: text("spotify_uri"),
    imageUrl: text("image_url"),
  },
  (table) => [unique().on(table.parentId, table.spotifyUri)],
)

export const importedThemesTable = sqliteTable(
  "imported_themes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    author: text("author").notNull(),
    theme: text("theme").notNull(),
  },
  (table) => [unique().on(table.name, table.author)],
)

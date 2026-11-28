# Design

This document sets how Open Spotify looks and behaves. Every UI issue follows it. When a design
question is not answered here, decide, build it, and add the answer to this file in the same PR.

## Principles

1. **The music is the content.** Artwork and titles carry the color and weight. The chrome
   around them is quiet and precise, and the accent marks only what plays and what to press.
2. **Fast for people who know what they want.** Everything can be reached from the keyboard,
   and the common paths take one shortcut.
3. **The user arranges the app.** Pane sizes, list density, sidebar contents, and every color
   belong to the user, and the app remembers them.
4. **The theme owns every pixel.** Components never hard-code a color, font, radius, or shadow.
   They use the design tokens, so a theme can restyle all of them.

The look is our own. Open Spotify does not use Spotify's logo, wordmark, green, or fonts.

## Improvements over the official client

1. **Resizable, remembered panes.** The sidebar, main view, and right pane (queue, details)
   resize by dragging or with the keyboard, and sizes persist between launches. People with
   long playlist names, small laptops, or wide monitors need different splits, and should set
   them once.
2. **Optional dense list layout.** A setting switches track lists from 48 px rows with artwork
   to 32 px rows without it, so twice as many tracks fit on screen. Large libraries are
   scanned, not browsed; dense rows make a 2,000-track playlist usable.
3. **Keyboard-first navigation.** Arrow keys and `j`/`k` move through lists, `Enter` plays,
   `/` focuses search, and `Alt+←`/`Alt+→` (`Cmd+[`/`Cmd+]` on macOS) go back and forward.
   Every action has a shortcut. Power users never need the mouse, and making every control
   focusable also helps screen reader users.
4. **Command palette.** `Ctrl+K` (`Cmd+K` on macOS) opens a search box that jumps to any
   playlist, folder, artist, or setting, and runs any command. One shortcut replaces hunting
   through menus and the sidebar.
5. **Customisable sidebar.** Sections can be reordered, hidden, and collapsed, and any item can
   be pinned to the top. Users with hundreds of playlists need to choose what stays visible.
6. **Folders for anything.** A folder can hold playlists, artists, albums, shows, tracks, and
   other folders. The official client only puts playlists in folders, so a user cannot group
   "everything for running" or "one artist's side projects".
7. **Full theming.** Every color, font, radius, and shadow comes from a theme that users pick,
   import, or edit. A theme that can only change the accent color is not a theme.
8. **Always-visible playback device.** The now-playing bar always shows which Spotify Connect
   device is playing, and says plainly when none is active. Playback is remote control
   (decision 0002), so a user must never wonder why pressing play does nothing.

## Direction: liner notes

The app reads like a well-made record sleeve: the artwork leads, and everything around it is set
with the precision of the liner notes on the back, small, aligned, and numbered. Why this
direction, and what else was weighed, is in
[decision 0008](decisions/0008-liner-notes-design-direction-on-shadcn.md).

- **One lit sheet.** The main view is the only raised surface. The sidebar and the now-playing
  bar sit on the bare `canvas`, so the eye goes to the content.
- **Warm black and paper white.** The default theme's neutrals are warm, like a sleeve's card and
  print, with the coral of the app icon as the one accent.
- **Artwork carries the color.** Covers lift off the sheet with `shadow-raised`, and the artwork
  wash (below) lets the music color the page.
- **Quiet states.** Loading keeps the page's shape with skeletons; a failure is a muted line and
  an outline Retry, never a row of accent buttons.

The redesign lands screen by screen (ARM-162 and its follow-ups). Until a screen's follow-up
lands, it keeps its earlier styling inside the new shell, and its section below describes it.

## Visual language

### Layout grid

```
┌──────────────┬─────────────────────────────────────┬──────────────┐
│              │ ╭ top bar: home, history, search ─╮ │ ╭──────────╮ │
│   sidebar    │ │                                 │ │ │  right   │ │
│  on canvas   │ │  main view: the raised sheet    │ │ │  pane    │ │
│              │ │  content padding: 32 px         │ │ │ (sheet)  │ │
│  200–420 px  │ │  fluid                          │ │ │ 280–400  │ │
│  default 280 │ ╰─────────────────────────────────╯ │ ╰──────────╯ │
├──────────────┴─────────────────────────────────────┴──────────────┤
│ now-playing bar on canvas, 80 px                                  │
└───────────────────────────────────────────────────────────────────┘
```

- The sidebar collapses to a 72 px icon rail (see Sidebar rail).
- The window is `canvas` with an 8 px margin. The sidebar and the now-playing bar sit on it with
  no panel of their own. The main view and the right pane are sheets: `surface`, `radius-large`
  corners, `shadow-raised`. The gaps between them double as resize handles.
- The top bar is 56 px tall and floats over the top of the main view. Its left end holds Home,
  Back, and Forward, then the search field (at most 448 px wide); a gear link to Settings sits at
  its right end. It is transparent while the view is scrolled to the top, so the artwork wash
  shows behind it, and turns `surface` with a `border` hairline under it once the view has
  scrolled 48 px. The main view's scroll position drives that change in CSS, with no script.
  Content starts 16 px below the bar, and whatever scrolls into view (a focused control, a row
  moved to with the arrow keys) stops below it instead of under it. Both lengths are steps of the
  `spacing` token (`--top-bar-height` and `--main-view-content-top` in `app.css`).
- Card grids (albums, artists, folders) use `repeat(auto-fill, minmax(160px, 1fr))` with a
  24 px gap, so the column count follows the pane width. Tile grids (Home's Jump back in) use
  `repeat(auto-fill, minmax(240px, 1fr))` with an 8 px gap.
- Track lists use fixed columns: index, title and artist, album, date added, duration. The
  column names are credits labels (see Type) in a 36 px header row ruled off from the rows by a
  `border` hairline. Columns
  that do not fit the list's width are hidden from the right, never squeezed: date added goes
  first, below 768 px, then the album, below 576 px. Duration always stays. An album name links
  to its album page, and each artist name links to that artist's page, so a track with several
  artists has one link per name. Only the row that is the list's tab stop puts these links in
  the tab order.
- Search results and the home page's tracks were never added to a list, so their track lists
  leave out date added.
- An album's track list shows track numbers and leaves out artwork, album, and date added,
  which every track on it shares or lacks. A multi-disc album gets one list per disc, each under
  a "Disc 1", "Disc 2" heading; a single-disc album gets no heading.
- Track lists scroll with the main view, so a page header above one scrolls away. Only the rows
  near the screen are in the DOM; a row whose track has not loaded keeps its full height and
  shows a bar, after a placeholder artwork tile where the list shows artwork, so the scrollbar
  is right from the start.
- Dense track lists (the `trackListDensity` setting) have 32 px rows with no artwork, and the
  artists follow the title on the same line.

### Before login

Onboarding and login come before the app exists, so they skip the pane layout: one sheet
(`surface`, `radius-large` corners, `shadow-raised`) centered on the `canvas`, 24 px from the
window edge, 576 px wide for onboarding and 448 px for login
(`src/renderer/features/login/before-login-sheet.tsx`). The disclaimer that Open Spotify is an
unofficial client sits under the sheet as `text-xs` `muted` small print, on both screens.

- **The app's own warmth.** The sheet opens with a lockup: the app icon's open ring and play
  triangle (`app-mark.tsx`), drawn without its tile in `accent` and `foreground` so a theme
  restyles it, 40 px beside the `text-3xl` title. No artwork exists yet, so a blurred `accent`
  disc colors the sheet's top-left corner where a page's artwork wash would, at the same
  `artwork-wash` opacity, and a theme that turns the wash off turns this off too. A `muted` line
  under the title says what comes next.
- **Steps set like a tracklist.** Onboarding's steps for creating a Spotify app are a numbered
  list in `text-sm`, ruled above, below, and between steps with `border` hairlines. Each number
  is written out in a 16 px `muted` 600 `tabular-nums` column, since a flex list item drops the
  browser's list marker; it is hidden from screen readers, which announce the list position.
  The Redirect URI sits in a `surface-raised` strip with its Copy button, at 600 weight.
- **Actions.** The sheet's one primary action is a default Button; secondary actions are
  secondary Buttons or muted links (see Buttons). Login's Log in fills the sheet's width, and
  Change Client ID sits under a hairline at the bottom as a `muted` link that turns `foreground`
  on hover. Onboarding's Client ID uses the shared text field (see Text fields), with Save and
  continue under it.
- **Waiting.** An action that waits, such as logging in in the browser, says what it waits for,
  disables the button that started it, and offers Cancel beside it. The wait is a
  `surface-raised` note with a 16 px `muted` `Globe` icon in place of the line under the title,
  inside an `output` so screen readers announce it. Focus moves to Cancel and back when the wait
  ends, and a double-click cannot cancel what its first click started. No spinner.
- **Failure.** A failed login or Cancel is a `text-sm` `danger` line in an `alert` under the
  buttons, saying what went wrong and what to do.

### Spacing

Spacing comes from Tailwind's numeric scale, where one step is the `spacing` token (4 px by
default). Use only these steps:

| Step | Default | Use                                          |
| ---- | ------- | -------------------------------------------- |
| 1    | 4 px    | Icon to label                                |
| 2    | 8 px    | Between related controls; pane gap; tile gap |
| 3    | 12 px   | Inside list rows, buttons, and cards         |
| 4    | 16 px   | Between a section heading and its content    |
| 6    | 24 px   | Card grid gap                                |
| 8    | 32 px   | Main view padding                            |
| 12   | 48 px   | Between page sections                        |

### Type

The default typeface is Schibsted Grotesk, a grotesk with the compact build of newspaper and
sleeve typography. It ships with the app (`@fontsource-variable/schibsted-grotesk`, SIL Open Font
License), so the app looks the same on every platform; the system UI font behind it covers the
scripts it lacks. A theme sets its own families with `font-body` and `font-display`; `code` and
`kbd` use `font-body` too (`--default-mono-font-family` in `app.css`), so no text falls back to a
platform monospace the theme cannot change. Use only
these sizes:

| Class       | Size  | Use                                                                        |
| ----------- | ----- | -------------------------------------------------------------------------- |
| `text-xs`   | 12 px | Metadata: durations, dates, counts; toggle options; sidebar section labels |
| `text-sm`   | 14 px | List rows, sidebar items, buttons, inputs                                  |
| `text-base` | 16 px | Body text                                                                  |
| `text-xl`   | 20 px | Section headings                                                           |
| `text-3xl`  | 30 px | Titles of login, onboarding, and not-found pages                           |
| `text-5xl`  | 48 px | Home's greeting; the titles of search and Settings; a page header's title  |

Weights: 400 for body, 500 for resting toggle options, 600 for emphasis, buttons, and active
items, 700 for headings. Headings from `text-xl` up use `font-display` (lint enforces it) and
`tracking-tight`. Durations and counts in columns use `tabular-nums` so they line up; running
text, such as a page header's details line, leaves it off, since Schibsted Grotesk's tabular
figures set commas at figure width ("5 ,000"). The labels that
divide the sidebar (Folders, Pinned, the library sections, Hidden) and the track list's column
names are set like the credits on a sleeve's back: `text-xs`, 600, `uppercase`, `tracking-wider`,
`muted` (`src/renderer/ui/credits-label-class-name.ts`).

### Radii

| Class            | Default | Use                                                |
| ---------------- | ------- | -------------------------------------------------- |
| `rounded-small`  | 6 px    | List rows, small buttons, small artwork            |
| `rounded-medium` | 10 px   | Buttons, inputs, tiles, artwork in grids           |
| `rounded-large`  | 16 px   | Sheets, cards, dialogs, menus, the command palette |
| `rounded-full`   | —       | Avatars, icon buttons, toggle groups, play buttons |

Artists use round artwork; everything else uses square artwork with a radius. This tells the
two apart at a glance.

### Elevation

| Level   | Surface           | Shadow           | Use                                                 |
| ------- | ----------------- | ---------------- | --------------------------------------------------- |
| Ground  | `canvas`          | none             | The window, the sidebar, the now-playing bar        |
| Sheet   | `surface`         | `shadow-raised`  | The main view and the right pane                    |
| Raised  | `surface-raised`  | none             | Inputs, tiles, hovered rows and cards               |
| Artwork | the image         | `shadow-raised`  | Covers in grids, headers, and the bar; play buttons |
| Overlay | `surface-overlay` | `shadow-overlay` | Menus, dialogs, the command palette, toasts         |

Hovered list rows take `surface-raised` but never gain a shadow. A chosen row is marked like a
pressed toggle (see Color roles), never with the accent.

### Color roles

Color is used by role, never by hue. A component asks for "muted text on a raised surface", and
the theme decides what that looks like. The default dark theme is warm black with paper-white
text and the icon's coral as the accent; the light theme is the same sleeve printed on paper.
`accent` marks only what plays, primary actions, and progress. A pressed toggle turns to
`foreground`, and a hover state takes the next surface up.

### Artwork wash

The page's artwork, blurred far past recognition (`blur-3xl`, `saturate-150`), fills the top
384 px of the page and fades out into `surface` (`src/renderer/ui/artwork-wash.tsx`). It bleeds
through the main view's padding to the sheet's edges and up behind the floating top bar, and
scrolls away with the page, while the top bar takes on its background. Its
opacity is the `artwork-wash` token (0.45 in the dark theme, 0.3 in the light one), and a theme
that sets it to 0 turns the wash off. It is decorative and hidden from screen readers. The
smallest image Spotify lists is enough, since it is blurred. Home takes it from the cover of the
track played last, search from the cover of its top track (see Search), and every page with a page
header from its cover (see Page header); a page without artwork, such as Liked Songs or a folder, shows none. The now-playing bar has a smaller one:
the playing cover's wash fills the left third of the bar, behind what plays, and fades out into the
`canvas` to the right and above, so the bar takes on the music's color without becoming a panel.

### Icons

Icons come from [Lucide](https://lucide.dev) (`lucide-react`, ISC license), imported one by one
so only the icons in use are bundled. They draw with `currentColor`, so they follow the theme.
Use 20 px icons in 32 px icon buttons and 14–16 px icons next to `text-sm` or smaller text. Icons
are decorative (`aria-hidden`); the control that holds them carries the accessible name.

### Components

Controls come from [shadcn/ui](https://ui.shadcn.com) on Base UI (`@base-ui/react`), added with
the shadcn CLI into `src/renderer/ui/` and restyled to this document. To add one, run
`pnpm dlx shadcn@latest add <component>`, then check `package.json`: the CLI adds packages to
`dependencies` with a caret range, which AGENTS.md forbids, so remove what it added or move it to
an exact dev dependency. Make its imports relative (the CLI writes `@/ui/…`
paths and a broken `cn` import; `cn` is in `src/renderer/ui/class-names.ts`), delete the exports
nothing uses, and adapt its classes: no `dark:` variants, no focus rings (the global
`:focus-visible` outline stays), no arbitrary radii, and `bg-surface-raised` for shadcn's
`bg-muted` and `bg-accent`.

`app.css` maps shadcn's CSS variables (`primary`, `secondary`, `popover`, `ring`, the radii, and
the rest) onto the theme tokens, so a component from the CLI follows every theme. shadcn's `muted`
and `accent` are surface colors, while the app's are a text color and the brand color, so those
two keep the app's meaning.

#### Buttons

`Button` (`src/renderer/ui/button.tsx`) has four variants:

- **default:** `accent` with `on-accent` text, for the one primary action of a view.
- **secondary:** `surface-raised`, for the other actions beside it.
- **outline:** a `border` edge on the surface, for low-key actions such as Retry, Copy, and
  search's Load more.
- **ghost:** `muted` icon or text that turns `foreground` on a `surface-raised` hover, for
  toolbars and icon buttons.

The default size is 36 px tall with `rounded-medium` corners, the small size 32 px with
`rounded-small` corners and `text-xs`, icon buttons 32 px and round, and the `play` size 56 px,
round, and lifted with `shadow-raised` (see Playing from a page). Labels are 600 weight. A
disabled or `aria-disabled` button dims to 50 %, and an `aria-disabled` one keeps its focus.
Links that look like buttons, such as the top bar's Home and Settings, use `buttonVariants`.

#### Toggle groups

A choice between two to five options is a toggle group (`src/renderer/ui/toggle-group.tsx`):
`text-xs` options 28 px tall, set in one `surface-raised` pill. A pressed option
turns `foreground` with `surface` text and a 600 weight, so its state shows as a change of
lightness and weight, not of hue. Options set `aria-pressed`. The group is one tab stop named
for screen readers; the arrow keys move between options, and `Enter` or `Space` presses one.

`SegmentedControl` (`src/renderer/ui/segmented-control.tsx`) is a toggle group with exactly one
option always chosen: Home's time ranges, the folder page's Grid / List, and Settings' track list
rows.

The sidebar library has a toggle group across its width, one option per kind (Playlists, Albums,
Artists, Shows), with a name filter under it. Pressing the pressed kind again shows every kind. The
filters stay at the top of the pane while the list scrolls. When the filters match nothing, the list
says so instead of going blank. The sidebar folders sit above the filters and scroll away first,
since the filters apply only to the library.

#### Switches

An on/off setting is a switch (`src/renderer/ui/switch.tsx`): a 40 × 24 px rail with a 16 px
thumb. On, the rail is `accent` and the thumb `on-accent`, on the right; off, the rail is `muted`
and the thumb `surface`, on the left, so the off rail still stands out from the surface. It dims
on hover and press. It sits at the right end of a setting row (see Settings and the theme
picker), whose label also toggles it.

#### Selects

A short list of fixed values, such as the theme editor's units, is a select
(`src/renderer/ui/select.tsx`). Its trigger looks like an input (`surface-raised`, 36 px,
`rounded-medium`, `text-sm`) with a 16 px `muted` `ChevronDown`. The list opens as an Overlay
panel (`surface-overlay`, `shadow-overlay`, `rounded-large`) with the chosen option over the
trigger and a 16 px `Check` beside it; its rows are menu rows (see Menus).

#### Tooltips

A tooltip (`src/renderer/ui/tooltip.tsx`) names a control that shows no text, such as a row in the
sidebar rail. It opens to the right of its element on hover after 300 ms, or at once on keyboard
focus, and closes when the pointer or focus leaves. It is a `surface-overlay` panel with
`shadow-overlay` and `rounded-small` corners: the name in `text-xs` 600, and a `muted` line under
it that says what the item is. The element keeps its own accessible name; the tooltip only shows
it. Icon buttons elsewhere keep their native `title`.

#### Text fields

A text field has its label above it (`text-sm`, 600 weight, joined with `htmlFor`) and a 6 px gap
between them. The input (`src/renderer/ui/input.tsx`) is `surface-raised` with `rounded-medium`
corners, 36 px tall with 12 px inside, and `text-sm` text; it turns `surface-overlay` on hover. An
invalid field gets a `danger` ring and a `text-xs` `danger` message in an `alert` under it, which
also describes it (`aria-describedby`). The onboarding Client ID, the theme editor's Name and
Author, and the New folder dialog's Name use it (`src/renderer/ui/text-field.tsx`); the folder
tree's inline rename and the theme editor's token fields use the bare input. The Client ID turns
off autocomplete and spell check, since it is not a word. The search field and the library's name
filter use the same input, the search field as a pill with a search icon.

### Library rows

Sidebar entries are 48 px rows: 40 px artwork, the name in `text-sm`, and a `text-xs` `muted` line
that says what the entry is ("Playlist · owner", "Album · artist", "Artist", "Show"). Images are
given to the browser as a `srcset`, so it downloads the smallest size that is sharp on the current
screen. Rows sit on the `canvas` with `rounded-small` corners and take `surface-raised` on hover;
the row whose page is open keeps `surface-raised`, so the sidebar shows where the user is
(`src/renderer/ui/sidebar-row-class-names.ts`, which the folder tree's rows share). While the
library loads, six skeleton rows in the same shape stand in for it.

When artwork is missing or fails to load, a `surface-raised` tile with a `muted` Lucide icon for
the kind stands in: `ListMusic` for playlists, `Disc3` for albums, `MicVocal` for artists,
`Radio` for shows, `Music` for tracks, `Folder` for folders. Liked Songs has no artwork from
Spotify and always shows a filled `Heart` in `on-accent` on `accent`, the one label-like tile in
the sidebar. Its page header shows the same tile at cover size
(`src/renderer/features/liked-songs/liked-songs-cover.ts`).

### Sidebar sections and pins

The sidebar library is split into sections: Liked Songs, Playlists, Albums, Artists, and Shows, in
the order the user chose. Each section starts with a 32 px heading row, 16 px below the section
before it. Its heading button (a section label, see Type, followed by a 14 px chevron that points
right when collapsed and down when expanded) collapses or expands the section and sets
`aria-expanded`. Every label, chevron or not, starts on the left edge of the rows' artwork. A
"section options" menu button with Move up, Move down, and Hide section ends the row, lined up
with the rows' pin buttons; like them it shows only while the heading row is hovered or holds
focus, or while its menu is open, so five sections do not show five `Ellipsis` icons at rest. It
stays in the tab order. Moves swap with the neighbouring section on screen, so hidden and empty
sections never make a move look like it did nothing. Hidden sections are listed under the library
below a "Hidden" label, as small ghost buttons with an `Eye` icon ("Show Albums"). A section with
no entries left after the filters is not shown.

Any entry can be pinned. Pinned entries leave their section for a "Pinned" section that always sits
at the top, in the order they were pinned. Its label has no chevron or menu, since it cannot be
collapsed, moved, or hidden. Each row has a pin button that shows on hover or while
the row has focus. It stays out of the tab order so each section's list is still one tab stop;
keyboard users press `P` on a focused row instead, which the button's tooltip, the row's
`aria-keyshortcuts`, and the shortcuts dialog announce. When a change moves or removes the focused
control, focus follows: a pinned row keeps focus in its new place, a moved section's heading keeps
it, hiding a section moves it to that section's Show button, and showing one moves it to its
heading. An unpinned row goes back to its section and keeps focus there, or the section's heading
takes it when the section is collapsed. When the control that should take focus is not on screen
(its section is hidden, or the filters leave it empty), the name filter takes it.

When the filters match nothing, the library says so. When everything that matches is in a
hidden section, it says that instead, so a hidden section never looks like a missing entry.

Pins are the `pinnedLibraryEntries` setting and the section order and states are the
`librarySections` setting, so both survive a restart.

### Sidebar rail

The sidebar collapses to a 72 px icon rail, so a small window gives the main view more room. The
toggle is a ghost icon button before the "Your library" heading (`PanelLeftClose`, "Collapse
sidebar"), which stays in the same place and becomes "Expand sidebar" (`PanelLeftOpen`) in the
rail, so it keeps focus when pressed. `Ctrl+B` (`Cmd+B` on macOS) does the same from anywhere;
when focus was in the sidebar, it moves to the toggle, since the other width may not show the
focused control.

Dragging the divider more than halfway from the narrowest width (200 px) towards the rail snaps
the sidebar to the rail, and dragging it back out opens it at the dragged width. On the keyboard,
the divider's widening arrow opens it at its earlier width and `End` at the widest; the narrowing
arrow and `Home` do nothing while it is collapsed. The divider reports "Collapsed" while the rail
shows. The choice is the `sidebarCollapsed` setting, next to `sidebarWidth`, and the full width is
kept for when it opens.

In the rail every row shows only its 40 px artwork or icon, in the same column as in the full
sidebar. Its accessible name is its name and what it is ("Late Night Drive, Playlist · Mira
Kaelin"), and a tooltip shows both on hover and keyboard focus. The rows keep their keyboard use:
each list is one tab stop moved through with the arrow keys, `Enter` opens the row's page, `P`
pins a library entry, and the context menu still offers Add to folder. The heading, the filters,
the section headings, the Folders heading and its New folder button, and the hidden sections are
left out; a `border` hairline divides the folders, the pinned entries, and each shown section,
and each list is named for its section. Every shown section lists its entries, collapsed or not,
since the rail has no heading to expand one with, and the filters do not apply.

Each top-level folder is a button in the rail. `Enter`, `Space`, or a click opens its contents in
a menu to the right: "Open Running" first, for the folder's page, then its entries, with a
submenu for each folder inside it, nested as deep as the tree goes. Choosing an entry opens its
page. The up and down arrows move between the folders instead of opening one. To rename, create,
or rearrange folders, the user expands the sidebar.

A load that fails in the rail shows a `CircleAlert` icon button named for the failure ("Your
library didn't load. Expand the sidebar to see why."), which expands the sidebar to show the
message and its Retry. An expired session still goes to login. While the library loads, the rail
shows only the skeletons' tiles; an empty library or a user without folders shows nothing there.

### Sidebar folders

The user's folders sit above the library sections under a "Folders" heading, as a tree that follows
the WAI-ARIA tree view pattern. Its rows look like library rows (the shared `ArtworkSummary`), with
16 px more indent for each level, so top-level artwork lines up with the library's. Each folder row
ends with a 32 px round chevron button, where library rows have their pin button, and its tile shows
`FolderOpen` instead of `Folder` while it is expanded. The tree is one tab stop: the up and down
arrows (or `j` and `k`) move through the visible rows, the right arrow expands a folder and then
moves into it, the left arrow collapses a folder or moves to its parent, and `Enter` opens the row's
page. Clicking a row opens its page, and clicking a chevron expands or collapses the folder and
moves focus to its row, so focus is never lost inside a folder that closes. The chevron stays out of
the tab order and the accessibility tree, since the row announces whether it is expanded.

Every way of rearranging the tree works from the keyboard. `Alt+↑` and `Alt+↓` (`Option+↑` and
`Option+↓` on macOS) move the focused entry up or down among its siblings; the row's
`aria-keyshortcuts` and the shortcuts dialog announce them. Each row's context menu has "Move to
folder", a submenu of the places the entry can go, nested like "Add to folder": every folder it is
not already in, never a folder itself or one inside it, and "Top level" for a folder inside another.
A moved entry goes last in its new place. When the tree changes under the focused row, focus
follows that row to its new place, or goes to the row that takes its place when it is no longer on
screen. The status message reports each move ("Moved Warm-up down"); a move the main process
refuses leaves the tree as it was and says why ("Couldn't move Warm-up. A folder can't go inside
itself.").

The mouse can rearrange the tree too, by dragging a row; a press that moves less than 4 px is still
a click. Letting go on the top or bottom quarter of a folder's row, or the top or bottom half of a
Spotify item's, puts the entry on the line above or below that row, which a 2 px `accent` line
indented to the row's level shows, starting at an 8 px `accent` ring that marks the level. Letting
go on the middle of a folder puts the entry last inside it, which the folder shows with
`surface-raised` and a 2 px `accent` outline. The line below an expanded folder is the line above
its first child. A drop that is not allowed shows no indicator and does nothing: a folder inside
itself or a folder within it, a Spotify item at the top level, or a drop that leaves the entry where
it is. Resting for 600 ms on the middle half of a collapsed folder while dragging, where a drop
inside it is on offer, opens it. The dragged row is dimmed to 50 % opacity, and the status message
reports the drop like a keyboard move ("Moved Warm-up up", "Moved Warm-up to Focus"). Dragging is
for the mouse only, since the keyboard moves above do the same.

A playlist, album, artist, or show can also be dragged from the library sections onto a folder,
which adds it last there, as "Add to folder" does, and the status message says so ("Added to
Running"). The folder shows the same `surface-raised` highlight and `accent` outline and opens
after the same 600 ms, and the dragged library row is dimmed the same way. A library entry goes
only inside a folder, so the lines between rows and the Spotify items in the tree show no
indicator, and neither does a folder that already holds the entry. Liked Songs cannot be dragged,
since no folder can hold it.

Folders start collapsed. The ones the user expands are the `expandedFolders` setting, so they
stay open after a restart.

The Folders label heads a 32 px row like a library section's, and a 32 px `FolderPlus` icon button
named "New folder" ends it and creates a top-level folder. The heading and the button show even
for a user without folders, since the button is how they make their first one. Until there is a
folder, a row-shaped placeholder stands where the tree goes, so the heading never sits over
nothing: a 40 px tile with a dashed `border` edge and a `muted` `Folder` icon, "No folders yet" in
`muted`, and "Group anything you've saved" under it. It is not a control, since the button above
already makes the folder.
Each folder row has a context menu with New folder (a folder inside it, which opens it), Rename,
Move to folder, and Delete…; a Spotify item in the tree has Move to folder alone (see above).

A new folder starts in inline rename mode, named "New folder" with the name selected, so typing
replaces it. Rename, or `F2` on a focused folder (which its `aria-keyshortcuts` announces), puts
the shared input (see Text fields) named "Folder name" in place of the row's text; at 36 px it
fits inside the 48 px row. `Enter` saves and `Escape` cancels; leaving the field saves
too, as in a file manager, but switching to another app does not end the rename. Keys held with
`Ctrl`, `Alt`, or `Cmd` still reach app-wide shortcuts. A blank name is refused like the New
folder dialog's: a `danger` ring and "Enter a name for the folder." under the field. While the
name is edited, the field is the row's tab stop. Focus returns to the row when `Enter` or
`Escape` ends the rename, or when a click on the row outside the field does. It stays on the
control the user moved to when they leave the field for another one.

Delete… opens a confirmation dialog, styled like the New folder dialog, that says how many items
go with the folder, counting everything inside the folders in it, and that nothing leaves the
Spotify library. After a delete, focus goes to the row that takes its place (or the last row), or
to the New folder button when no folder is left.

The status message says what a change did ("Created New folder", "Renamed to Running", "Deleted
Running"). When the folder is gone because the tree changed elsewhere, the tree is read again
and the message says so.

### Now-playing bar and device picker

The bar has three columns: what is playing on the left, the playback controls in the middle,
and the queue button and device picker on the right. The left column leads with the cover, as a
sleeve does: 56 px artwork with `rounded-small` corners, lifted with `shadow-raised`, then the
title in `text-sm` 600 and the artists in `text-xs` `muted` ("Show episode" for an episode),
over the bar's artwork wash (see Artwork wash). A track's title links to its album page and each
artist name to that artist's page; an episode's title links to its show page. A local file has no
Spotify pages, so its title and artists are plain text.

The controls are, in order and 12 px apart: shuffle, previous, play or pause, next, repeat.
Play or pause is the bar's one primary action: a 40 px `accent` disc with a filled 18 px
`on-accent` glyph, lifted with `shadow-raised`, that darkens on hover like a default Button. The
others are 32 px round ghost Buttons with `muted` 20 px icons
(`src/renderer/features/playback/player-control-button.tsx`). Shuffle and repeat show that they are
on with `accent` and a 4 px dot under the icon, so the state does not rely on color, and set
`aria-pressed`. Repeat cycles off, the context, and the track; for the track it uses the `Repeat1`
icon and is named "Repeat one track".

Under the controls, a seek bar shows how far into the item playback is: the elapsed time, a
slider, and the total time, in `text-xs` `muted` `tabular-nums` (`-:--` while nothing plays).
Every slider in the app is the shared Slider (`src/renderer/ui/slider.tsx`, shadcn's Slider on
Base UI): a 16 px tall control over a 4 px `rounded-full` rail in `muted` at 35 % opacity, filled
with `accent` up to the value. Its 12 px `foreground` thumb, lifted with `shadow-raised`, shows only
while the pointer is over the slider, while it is dragged, and while it has keyboard focus, when it
also carries the focus outline; at rest the bar reads as a line of progress, like a tracklist's
rule. Arrow, page, `Home`, and `End` keys held with Ctrl, Alt, or Cmd do not move it, since they
belong to the app-wide shortcuts.
Between polls the slider moves on by itself while playback plays, and stands still while it is
paused. The slider is labelled "Playback position", and its value reads as "1:23 of 3:45".
Left and right (or down and up) arrows step 5 seconds, `PageDown` and `PageUp` step a tenth of
the item, and `Home` and `End` jump to the start and the end. A held key or a dragged thumb seeks
once, when it is let go. A seek, like a pause, stops or moves the position from the moment of
the press, not from the last poll.

A control updates as soon as it is pressed. It keeps that state while the command is on its
way and for one second after Spotify accepts it, because Spotify can report the old state for a
moment; after that, the polled state wins again. If Spotify rejects the command, the control
goes back and a `text-xs` `danger` alert under the controls says what failed. A control that cannot be used (no active device,
a device that other apps cannot control, or an action Spotify disallows right now) is
`aria-disabled` at 50 % opacity and keeps its focus, and its `title` says why, which also
makes it the accessible description.

The bar's right end holds the queue button (`ListMusic`, a toggle drawn like shuffle) and always
the device picker button, labelled with the playing device ("Playing on Kitchen Speaker") or
"No active device": a small ghost Button shaped as a pill, with a 16 px `MonitorSpeaker` icon,
that stays `surface-raised` while the picker is open. With no active device, the bar's left side
says that audio plays in the Spotify app or on another device, next to a "Choose a device" button
that opens the picker.

After the device picker come a mute button and a 96 px volume slider for the active device,
labelled "Volume" and read as "60%". The arrow keys step it by 1 %, and Shift with an arrow,
`PageUp`, and `PageDown` by 10 %. Moving it shows the new volume at once and sends it once the
slider has rested for 250 ms, so a drag or a held arrow key sends one request. The change then
behaves like any other control's: it holds for a second after Spotify accepts it, and a rejected
change goes back with a `text-xs` `danger` alert under the
slider, which overlays the bar's bottom edge so the controls beside it stay put. Mute (`Volume2`)
turns the volume down to zero and becomes Unmute (`VolumeX`), which restores the last volume
above zero, or 50 % when Spotify has reported none since the app opened. Both are unavailable
whenever the playback controls are, and also when the device does not let Spotify change its
volume; like the controls, they stay focusable and their `title` says why.

The picker is a non-modal popover 12 px above its button: `surface-overlay`, `shadow-overlay`,
`rounded-large`, 320 px wide with 8 px inside. It fades in and rises 8 px like a menu. Its heading,
"Connect to a device", is a credits label (see Type). Each device is a menu row with a 36 px
`rounded-medium` tile holding a 20 px Lucide icon for its type, `muted` on `surface`, then the
name in `text-sm` and the type in `text-xs` `muted`. The active device's tile turns `accent` with
an `on-accent` icon, its name turns 600, it adds "Playing here" to its type line and a `Volume2`
icon in `accent`, and it carries `aria-current`.

"This computer" is listed once the Web Playback SDK is ready, and also when it cannot play, so
the user sees why instead of the entry disappearing: the SDK failed to start, Spotify refused
the account (Premium is required), playback failed, or Widevine did not install ("Protected
playback isn't available on this computer"). The reason takes the type line's place in
`text-xs` `danger`, and the row keeps full opacity so the reason stays readable. Without a
device to play on, the row is `aria-disabled`; after a failed play it can still be picked. When
the SDK refuses the login, the app goes to the login screen instead of showing a reason.

Opening the picker moves focus into it. The active device is listed first. The device list is
one tab stop, starting on the first device, and moves like any other list (see Keyboard).
`Escape` or choosing a device closes the picker and returns focus to its button; clicking or
tabbing outside closes it.

### Page header

Album, artist, playlist, show, Liked Songs, and folder pages open with the same header
(`src/renderer/ui/page-header.tsx`), set like the front of a sleeve: the cover leads and the type
beside it is aligned to its bottom edge.

- The page's artwork wash (see Artwork wash) from the cover sits behind it.
- The cover is 224 px, square with `rounded-medium` corners (round for an artist), lifted with
  `shadow-raised`. Missing artwork shows the kind's placeholder tile.
- The title is `text-5xl`, 700, `tracking-tight`, balanced over its lines, and breaks long words
  rather than overflow.
- Under the title, one `text-sm` details line says what the page is: the kind first, in
  `foreground` at 600 ("Playlist", "Album", "Artist", "Show", "Folder"), then the rest in `muted`,
  separated by " · ": an album's linked artists, release year, track count, and length; a
  playlist's owner, track count, and length; an artist's genres; a show's episode count; a
  folder's item count. There is no separate kind label above the title: a label over a heading is
  noise the details line already carries.
- A description, when Spotify sends one, follows in `text-sm` `muted`, at most 65 characters
  wide.
- 24 px under the header come the play button (see Playing from a page) and a More options menu
  button with the same actions as the header's context menu. A page whose item nothing can act on,
  such as Liked Songs, has neither.

The header is a focusable group named after the title when it has a menu, so `Shift+F10` and the
context-menu key open it. While the page loads, a skeleton in the header's shape (cover, round for
an artist, title, details line) holds its place.

### Page sections

A page's sections each start with a `text-xl` heading over a `border` hairline, like the rules
that divide a sleeve's back, with any control (a time range switch, Show all) at the hairline's
right end (`src/renderer/ui/page-section.tsx`). The heading row has the same height with or
without a control, so side-by-side sections line up. Home's sections, search's result sections, an
artist's discography, a show's Episodes, and each disc of a multi-disc album use it. A page that
does not yet know which sections it will have, such as search while it searches, holds their place
with section skeletons: a heading-shaped bar over the same hairline, above the content's skeleton.

### Playing from a page

Album, playlist, artist, and show pages have a 56 px round play button with a 24 px filled `Play`
icon, 24 px under the header and ahead of the More options button: a default `Button` in the
`play` size, so it is `accent` with `on-accent` and darkens on hover, and it lifts off the artwork
wash with `shadow-raised` like the cover. It starts the page's context
from the beginning. While that context plays it shows `Pause` and pauses it; while the context is
paused it resumes it. Its name says what it acts on ("Play Late Night Drive"). A playlist whose
tracks Spotify withholds still has the button. Liked Songs has none, because Spotify has no
context for it that the API accepts.

Double-clicking a track row or an episode, or pressing `Enter` on a focused one, plays it within
its page's context, so playback continues through the album, playlist, or show. Liked Songs plays
the songs that have loaded as a list, and search results and the home page's tracks play the
tracks of their list. `Enter` on a link inside a row follows the link instead.

The row of the item that plays, or is paused, shows a 16 px `Volume2` icon in `accent` in place
of its number, and its title in `accent`, on every page that lists it. The row's accessible
description is "Playing", so screen readers announce it when the row has focus.

A play that fails says so in the status message. With no active device, the device picker opens
as well, and the message says to choose a device and try again.

### Queue pane

The queue opens in the right pane from the bar's queue button or `Alt+Shift+Q` (`Option+Shift+Q`
on macOS), and either one closes it again. The pane divider on its left resizes it like the
sidebar's (see Accessibility), and the width is remembered. Its header holds the "Queue" heading
and a close button. Opening the pane moves focus into it, and closing it while focus is inside
returns focus to the queue button.

The pane shows a "Now playing" section with the playing item and a "Next up" list, each under a
credits label (see Type), 24 px apart. Both are numbered like a tracklist: a 20 px column of
`text-xs` `muted` `tabular-nums` positions before library-row layouts (40 px artwork, the title,
and the artists or "Show episode"). The playing item shows a 16 px `Volume2` icon in `accent` in
place of a number and its title in `accent`, as the playing row of a track list does. The numbers
are hidden from screen readers, since the list already says where a row is. Each upcoming item is
a 48 px row button with `rounded-small` corners that takes `surface-raised` on hover, and its
number turns into a filled 14 px `Play` icon on hover and keyboard focus. The list is one tab
stop with roving focus. Pressing a row plays that item. Spotify has no endpoint for that, so the
app reads the queue again, finds the item, and skips to the next item once for every item before
it; if the item has left the queue, an alert under the list says so. A row points into the list it
was shown in, so from the moment
a row is pressed until the queue read after that press arrives, the list ignores presses and is
`aria-busy`. A double-click therefore plays the item once. When the new list arrives, focus goes
to the row at the pressed row's position (or the last row, if the list got shorter), because the
pressed row has moved to "Now playing". Spotify cannot remove or reorder queued items, so the
pane offers neither.

The queue is read again whenever the playing item changes and after every press; after a shuffle
change, "Next up" keeps the old order until the next track (ARM-87). With no active device the
pane asks the user to choose one in the bar, and a queue with nothing in it says so.

### Settings and the theme picker

Settings is a page in the main view, opened from the gear icon at the right end of the top bar.
It opens with a `text-5xl` "Settings" title like search's, then its sections, 48 px apart, in one
column at most 672 px wide: Appearance, Playback, and Account, each a page section (see Page
sections). The app's version and platform close the page in `text-xs` `muted`.

A setting is a row (`src/renderer/ui/setting-row.tsx`): on the left its label in `text-sm` at 600
and a `text-xs` `muted` description of what it changes, which also describes the control; on the
right its control, vertically centered. Clicking the label works a switch.

The theme picker is a list of 64 px rows, one per theme: a 64 × 40 px swatch, the theme's name
in `text-sm`, and "by author" in `text-xs` `muted`. The swatch is a miniature of the app in that
theme: a strip of `canvas` where the sidebar sits and a raised `surface` sheet with "Aa" in the
theme's display font and an `accent` bar. It sets the theme's own token properties on itself, so
it shows that theme's colors, display font, radius, and shadow without applying it. The chosen
row is marked like a pressed toggle, by lightness and weight rather than the accent: a 2 px
`foreground` ring around its swatch, its name at 600, and a 16 px `Check` at the row's end.

Hovering or focusing a row previews its theme across the whole app at once. The pointer wins
over focus, so a mouse user can compare themes while keyboard focus stays on one row. The saved
theme returns when the pointer and focus both leave the picker, or the page closes. Clicking a
row or pressing `Enter` or `Space` on it chooses and saves its theme. The list is one tab stop
that starts on the chosen row, and moves like any other list (see Keyboard).

An imported theme's row ends in a 32 px `Trash2` icon button named "Delete <theme>" that shows on
hover or while the row has focus. Like the sidebar's pin button, it stays out of the tab order;
keyboard users press `Delete` on a focused row (`Backspace`, labelled delete, on a Mac), which the
button's tooltip, the row's `aria-keyshortcuts`, and the shortcuts dialog announce. A theme is
deleted at once, without a confirmation, and leaves the list only after the main process has deleted
it; a failure is reported in `danger` text inside an `alert` under the list. Deleting the chosen
theme applies and saves the default theme. A row deleted from the keyboard hands focus to the row
that takes its place; a row deleted with the pointer leaves focus alone, so no other row is left
previewing. Built-in themes have no delete button.

Below the list, one row of secondary buttons: "Edit a copy" opens the theme editor on a copy of
the chosen theme, and "Import theme…" and "Export current theme…" open the operating system's
file dialogs. A result is reported in `muted` text inside an `output` element; a rejected file
shows the reason in `danger` text inside an `alert`. The dialogs are modal to the app window.

Below them, under a `border` hairline, the "Track list rows" setting offers Comfortable and Dense
in a segmented control. The choice applies to every track list at once.

The Playback section holds "Play on this computer", a switch (see Switches), on by default.
Turning it off disconnects the Web Playback SDK's player and takes "This computer" out of the
device picker at once; turning it on connects the player again.

The Account section's "Log out of Spotify" row ends in an outline Log out button. Logging out
forgets the session but keeps the Client ID; a failure shows in `danger` text inside an `alert`
under the button.

### Theme editor

The editor takes the place of the theme picker and its buttons in the Appearance section, so a
hovered row cannot preview over the theme being edited. Focus moves to its Name field when it
opens and back to "Edit a copy" when it closes. A built-in or imported theme is never edited in
place: the editor starts from a copy named "<theme> (copy)".

From the top: a `text-base` 600 "Edit a copy of <theme>" heading, Name and Author fields side by
side, a "Color scheme" setting row with Dark and Light in a segmented control, then one
`fieldset` per token group (Colors, Typography, Radii, Spacing, Shadows, Artwork) with a field
for every token. Each group's legend is a credits label (see Type) over a `border` hairline, and
its fields sit in two columns when the column is at least 448 px wide. The fields come from the
`Theme` Schema, so a new token appears without changes to the editor. Each field is labelled with
its token name in `text-xs` at 600, and its control fits the value:

- **Colors:** the native color picker, drawn as a 36 px swatch of the color on `surface-raised`,
  beside a hex input. Both edit the same value.
- **Radii and spacing:** a number input without the browser's spin buttons (the arrow keys still
  step it) and a select of units (`px`, `rem`, `em`).
- **Fonts and shadows:** an input for the CSS value, spanning both columns.
- **Artwork wash:** a slider from 0 to 1 in steps of 0.05, spanning both columns, with the value
  beside it as a percentage, or "Off" at 0, since 0 turns the wash off.

Every valid change applies to the whole app at once. An invalid value gets a `danger` ring and a
`text-xs` `danger` message under its field that describes it (`aria-describedby`), and the app
keeps the last valid value.

A color pair below its contrast target (see Accessibility) gets a `text-xs` `danger` warning
under the field of the color drawn on top: the text color, `on-accent`, or `focus`. It names the
pair and its ratio ("color-muted on color-surface: 3.2:1, needs 4.5:1"), rounded down so it never
reads as meeting the target. The warnings sit in an `output` live region, so a screen reader
announces them as they appear, and they also describe the field. They follow every valid change
and never block saving.

Save theme (a default button) and Cancel sit in a bar at the bottom of the form, above a `border`
hairline on `surface`, that sticks to the bottom of the main view while the form scrolls, so they
stay in reach among dozens of fields. Save theme stores the copy as an imported theme and chooses
it; with a field still invalid or the name or author empty, it says so in an `alert` instead. A
theme the main process refuses, such as one named like a built-in theme, shows its reason in the
same `alert`. Cancel, or leaving the page, discards the changes and restores the saved theme.

### Home page

Home opens with the artwork wash, taken from the cover of the track played last, and a `text-5xl`
greeting, "Hello, <display name>" ("Hello" until the name loads, or when Spotify has none). Below
it come up to four page sections (see Page sections), 48 px apart:

- **Jump back in:** tiles for up to eight distinct albums, playlists, and artists the user
  recently played from, most recent first, in a tile grid. A tile is a 64 px `surface-raised` row
  with the artwork at its left edge (a 48 px circle for artists), the name in `text-sm` at 600,
  and the kind in `text-xs` `muted`, and links to its page. Plays from anything else, such as
  Liked Songs, are skipped, and so is a page Spotify won't return: its own playlists, such as
  Discover Weekly, which development-mode apps cannot read, or a deleted playlist.
- **Recently played:** the ten most recent tracks in the shared track list, with a track played
  several times in a row listed once.
- **Your top tracks:** the ten top tracks in the shared track list.
- **Your top artists:** the ten top artists as round cards.

Recently played and Your top tracks sit side by side once the page is at least 1024 px wide, so a
wide window fills with music instead of empty space; narrower, they stack.

The two top sections have a time range switch at the right end of the heading, a segmented
control for "Last 4 weeks", "Last 6 months" (the default), and "Last year". Spotify computes its
longest range from about a year of listening, so the app does not call it "All time".

Each section loads on its own, with a skeleton in its shape (tiles, rows, or round cards) and its
loading message for screen readers. One failing section leaves the others in place. Jump back in and
Recently played both come from the play history, so when it fails to load, only Recently played says
so, and its Retry loads it for both. A section with nothing to show is left out. A top section stays
once the user picks another time range, so the switch back stays too, and says when that range has
nothing. An account with no listening history at all sees a short welcome message instead.

Log out and the app version live in Settings, under Account.

### Artist page

The header is the page header every page shares (see Page header), with the artist's image as a
round cover and the genres after "Artist" in the details line when Spotify lists any. Below it the
discography comes in up to three page sections, in this order: Albums, Singles and EPs, Appears
On. They sit 48 px apart and 48 px under the header, as on Home. A section with no releases is
left out; an artist with none at all says so.

Each section is a card grid under its heading. A card shows the cover, the name in `text-sm` at
600, and the release year in `text-xs` `muted`, and links to the album page. A section shows one
row of cards, as many as fit the pane width. When it has more, a small ghost "Show all" button at
the right end of the heading reveals the rest and becomes "Show fewer"; it sets
`aria-expanded`. The revealed grid loads its next page when its end scrolls into view, like any
long list. Each grid is one tab stop with roving focus.

Spotify no longer gives development-mode apps an artist's top tracks, followers, or popularity,
so the page does not show them.

### Folder page

The header shows a breadcrumb of the parent folders (only for a nested folder) above the page
header every page shares: a `Folder` placeholder tile as the cover, the name, and the item count
after "Folder" in the details line.

Under the header sits the round play button every page shares (see Playing from a page), named
after the folder ("Play Running"). It plays the folder's own tracks as a list, in folder order.
Spotify cannot queue a playlist, album, artist, or show after them, and nested folders are not
expanded. So when the folder holds anything besides tracks, a `text-sm` `muted` line beside the
button says what plays ("Plays the folder's 2 tracks. Spotify can't queue the other items.") and
describes the button (`aria-describedby`). A folder without tracks has no play button. The
button always plays from the first track. Spotify reports no context for a list of tracks, so it
cannot tell that the folder is playing and switch to `Pause`. A failed play behaves as on every
other page: the status message says why, and with no active device the device picker opens.

Below the play button, at the right end, a Grid / List segmented control. The choice is the
`folderView` setting and applies to every folder.

- **Grid:** cards in the standard card grid, each with square artwork (round for artists), the
  name in `text-sm` at 600, and the kind in `text-xs` `muted`. A nested folder says how many
  items it holds.
- **List:** 32 px rows with a 16 px kind icon instead of artwork, the name, and the kind at the
  right end.

Both views are one tab stop with roving focus. Every entry links to its page. A track has no
page of its own, so it opens on its album page: `/track/<id>` looks up the track's album and
replaces itself in the history with `/album/<id>?track=<track id>`, so Back skips it.

The album page scrolls the highlighted track to the middle of the screen and focuses it. The
row has the `surface-raised` fill and 600 weight, so the highlight does not rest on color alone,
and `aria-current`.

### Search

The search field sits in the top bar, and `/` focuses it from anywhere outside a text field.
Typing searches after a 300 ms pause, so a word typed at a normal pace sends one request. The
first pause opens `/search?q=…` as a new page, which Back leaves; later pauses replace the query
in place, so Back does not step through every pause. When Back or Forward returns to an earlier
search, the field shows its query. `Escape` clears the field and the results.

The page opens like Home: a `text-5xl` title, "Results for “query”", with "Results for" in `muted`
so the query stands out, over the artwork wash from the cover of the top track (or of the top
album when no track matches). Below it come up to four page sections (see Page sections), 48 px
apart, in this order: Tracks (the track list), Artists, Albums, and Playlists (card grids). A
section with no results is left out. Artist cards have round artwork and say "Artist"; album
cards name the album's artists; playlist cards say "By owner". Each section shows 10 results,
the most Spotify returns per request in development mode, and a small outline "Load more" button
with a `ChevronDown` icon under it fetches the next 10 for that section alone. It is outline, like
the Retry that takes its place when a page fails, so a page of stacked sections stays calm. Search
breaks the scroll-to-load rule (see Loading, empty, and error states) because its sections are
stacked: a track list that grew as it scrolled would push the other sections out of reach. While a
page loads, the button stays focusable with `aria-disabled` and "Loading more tracks…" sits beside
it. When the page fails, an alert with Retry takes the button's place. Focus follows the button
when it goes away: to Retry after a failure, back to "Load more" when Retry asks again, and to
the first new result when the last page loads.

Before anything is typed, the page is titled "Search" and asks for a query: "Search for tracks,
artists, albums, and playlists.", then a `text-sm` `muted` line naming the shortcut, "Press `/` to
jump to the search field from anywhere.", with the key set as a key cap, as in the shortcuts
dialog. A query that matches nothing says "No results for “query”." at 600 weight, with a
`text-sm` `muted` line under it: "Check the spelling, or try fewer or different words." A new
query replaces the old results with section skeletons for tracks, artists, and albums, and
"Searching…" for screen readers, and starts from a fresh page, so an earlier query's results can
never show up after a later one's.

### Menus

A menu opens from a 32 px icon button (`MenuButton` in `src/renderer/ui`, on shadcn's Dropdown
Menu) and follows the WAI-ARIA menu button pattern: `Enter`, `Space`, or `↓` opens it on the first
item, `↑` on the last, and a click opens it with focus on the menu itself, where `↓` moves to the
first item. The arrow keys wrap, `Home` and `End` jump to the ends, `Escape` or `Shift+Tab`
closes it and returns focus to the button, and `Tab` closes it and moves on to the next control.
It is not modal: the page keeps scrolling under it, and a click outside closes it and still
reaches what it lands on. It is an Overlay (`surface-overlay`, `shadow-overlay`, `rounded-large`)
with 4 px of padding, 4 px below the button and aligned to its right edge, or to its left edge for
a button near the left of the main view, which would otherwise clip the menu. Items are `text-sm`
rows with `rounded-small` corners that turn `surface-raised` while highlighted: under the pointer,
with keyboard focus, or while their submenu is open. An item that opens a dialog ends its label
with an ellipsis ("Import folders…").

A context menu (`ContextMenu` in `src/renderer/ui`, on Base UI's Context Menu) opens on
right-click, `Shift+F10`, or the context-menu key, at the pointer or, from the keyboard, under the
element. It looks like any other menu and follows the WAI-ARIA menu pattern: like a menu button's
menu, it opens from a key with focus on the first item and from a right-click with focus on the
menu itself. The arrow keys wrap, `Enter` or `Space` activates, and `Escape`, `Tab`, or
`Shift+Tab` closes it and returns focus to the element it opened from. It is modal: while it is
open, the rest of the page is hidden from screen readers and the pointer can neither scroll nor
press it, and a click outside closes the menu.

An item with a submenu ends in a 16 px `ChevronRight`; `→`, `Enter`, or a click opens the
submenu beside it, and `←` or `Escape` goes back to its item. Hovering does not open a submenu,
so the pointer can cross a menu without opening every submenu on its way. A menu that would spill
over the window edge moves back inside it, and a menu taller than the window scrolls; each submenu
is a popup of its own, so a scrolling menu never clips one. Every menu ignores keys held with
`Ctrl`, `Alt`, or `Cmd`, so app-wide shortcuts such as `Alt+←` still work while it is open, and
keeps every other key: `Space` chooses an item and a letter jumps to one, so no window shortcut
fires. A menu lists only the actions that lead somewhere, and an element with none opens no menu.
A chosen item's action runs once its menu has closed, with focus back on the menu's opener, so a
dialog the action opens gives focus back to the opener when it closes.

The menu parts are `src/renderer/ui/dropdown-menu.tsx`. Base UI builds its Context Menu from the
same Menu parts, so context menus use them too, and both kinds draw their items from the same
`MenuItem` list (`src/renderer/ui/menu-items.tsx`).

An item that turns something on or off is a `menuitemcheckbox`: when it is on, it sets
`aria-checked` and ends in a 16 px `Check` icon, so the state does not rely on color.

Every row of a track list has a context menu: Add to playlist (a submenu of the playlists the user
owns or collaborates on), Add to folder, Add to queue, Go to artist (a submenu of the artists when
the track has several), Go to album, and Copy link, which copies
`https://open.spotify.com/track/<id>`. Until the playlists load, or when there are none to add to,
Add to playlist says why in the status message instead of opening an empty submenu.

Every sidebar library entry except Liked Songs, which no folder can hold, has a context menu with
Add to folder.

Every playlist, artist, album, or show card has a context menu with Add to folder: on the home
page, in an artist's discography, in search results, and on a folder page, where each entry's
menu, in the grid or the list, has it too. A folder inside a folder is not a Spotify item, so its
entry has no menu.

The header of an album, playlist, artist, or show page has a context menu with Add to folder, and
the same menu opens from a 32 px `Ellipsis` "More options" button right of the page's play button
(alone, for an empty playlist). The header is a tab stop, so `Shift+F10` and the context-menu key
can reach it.

### Add to folder

Add to folder is a submenu of the folder tree, in the user's order, ending in "New folder…". Each
folder is a checkbox item that is checked when the folder holds the item itself (not only a folder
inside it). Choosing an unchecked folder adds the item; choosing a checked one removes it. A folder
with folders inside opens a submenu instead, which starts with the folder itself, followed by the
folders inside it. The status message says what happened: "Added to Running", "Removed from
Running", or why it failed. Until the folders load, the item says so in the status message instead
of opening a submenu, and after a failed load it loads them again.

"New folder…" opens a modal dialog (`surface-overlay`, `shadow-overlay`, `rounded-large`, 320 px
wide, over a `canvas` backdrop at 60 % opacity) with a Name field, then Cancel (a secondary
button) and Create folder (a default button). Create folder makes a top-level folder with
the item in it. A blank name keeps the dialog open and marks the field invalid with "Enter a
name for the folder.", until the name is no longer blank. Focus starts in the field, stays in the
dialog, and returns to the menu's opener when the dialog closes; `Escape` closes it.

The sidebar's folder menu sits beside the "Your library" heading. What an action did is said
under the heading: a success in `muted` text inside an `output`, a failure in `danger` text
inside an `alert`.

### Keyboard shortcuts and media keys

Every shortcut lives in one registry (`src/renderer/features/shortcuts/keyboard-shortcuts.ts`),
and the shortcuts dialog is built from it, so a shortcut added there is listed without other
changes. Window shortcuts work anywhere in the window; row shortcuts act on the focused row of a
list, which matches its keys through the same registry. Where Windows and Linux use Ctrl and
Alt, macOS uses Cmd and Option.

| Windows and Linux               | macOS                         | Action                                  |
| ------------------------------- | ----------------------------- | --------------------------------------- |
| `Space`                         | `Space`                       | Play or pause                           |
| `Ctrl+→` / `Ctrl+←`             | `Cmd+→` / `Cmd+←`             | Next / previous track                   |
| `Ctrl+S`                        | `Cmd+S`                       | Turn shuffle on or off                  |
| `Ctrl+L`                        | `Cmd+L`                       | Change repeat (off, the context, track) |
| `Ctrl+Shift+→` / `Ctrl+Shift+←` | `Cmd+Shift+→` / `Cmd+Shift+←` | Seek forward / back 5 seconds           |
| `Ctrl+↑` / `Ctrl+↓`             | `Cmd+↑` / `Cmd+↓`             | Volume up / down by 10                  |
| `/`                             | `/`                           | Search                                  |
| `Alt+←` / `Alt+→`               | `Cmd+[` / `Cmd+]`             | Go back / forward                       |
| `Alt+Shift+Q`                   | `Option+Shift+Q`              | Show or hide the queue                  |
| `Ctrl+B`                        | `Cmd+B`                       | Collapse or expand the sidebar          |
| `?`                             | `?`                           | Show the shortcuts dialog               |
| `P` on a row                    | `P` on a row                  | Pin or unpin a library entry            |
| `F2` on a row                   | `F2` on a row                 | Rename a folder in the sidebar          |
| `Delete` on a row               | `Delete` on a row             | Delete an imported theme                |

The Mac `Delete` key is the one other keyboards label `Backspace`, since most Mac keyboards have
no forward Delete key.

Repeat takes `L`, for loop, because Electron's default menu keeps `Ctrl+R` (`Cmd+R`) for Reload.

A letter shortcut follows the keyboard layout: on Dvorak, `P` is the key labelled P. Where a key
types no Latin letter, as on a Cyrillic layout or with macOS Option, the key in the letter's US
position works instead.

No shortcut fires while focus is in a text field, and only shortcuts held with `Ctrl`, `Alt`, or
`Cmd` fire while a menu has focus (see Menus). `Space` leaves a focused button to press itself,
a focused switch to flip itself, and a focused select option to be chosen. On a focused link, which `Space` would only scroll past, or a focused radio button, which is
already checked, it plays or pauses. Holding the keys down runs a shortcut once, except for the
volume, which keeps stepping like a volume key. Quick presses add up: each seek starts from where
the last one moved the seek bar, before Spotify reports it, and the volume slider shows each step
at once and sends the total once the presses stop. A seek stays within the item and the volume
between 0 and 100, and a press at a limit sends nothing. A menu
button opens on `↓` or `↑` only without a modifier, so `Ctrl+↓` turns the volume down even there.
A playback shortcut whose control cannot be used says why in the status message, since the
control's tooltip may never have been seen. A held volume shortcut says it once, not on every
repeat.

`?` opens the shortcuts dialog: a modal Overlay (`surface-overlay`, `shadow-overlay`,
`rounded-large`) at most 448 px wide with 24 px of padding, over a `canvas` backdrop at 60 %
opacity, with a `font-display` `text-xl` "Keyboard shortcuts" heading and a Close icon button.
Below them come a Playback, a General, and a Focused row section, each with a `text-sm` 600
`muted` heading and one row per shortcut: the action in `text-sm` and its keys as `kbd` chips
(`surface-raised`, `rounded-small`, `text-xs` 600). `Escape` closes it and focus returns to where
it was.

The keyboard's play/pause, next, and previous keys control playback while a device is active,
even with the window in the background, and the operating system's media overlay shows the
title, the artists ("Show episode" for an episode), the album, and the artwork. Chromium hands
a page the media keys only while it plays media, so a silent clip at volume 0 loops while a
device is active (`src/renderer/features/playback/use-silent-clip.ts`). With no active device, the
app leaves the overlay.

### Status message

What an action from a context menu or a page's play controls did is said in a small Overlay
message (`surface-overlay`, `shadow-overlay`, `rounded-large`, `text-sm`) centered 16 px above the
now-playing bar, in `danger` text for a failure. It fades in like a menu and goes away after five
seconds. It sits in an `output` (`role="status"`) that stays on the page, so screen readers
announce every message (`useShowStatusMessage` in `src/renderer/ui`).

### Loading, empty, and error states

- While a list or page loads, it says so inside an `output` element, so screen readers announce
  it. Home and search show skeletons in the shape of their sections (tiles, rows, or round or
  square cards, from `src/renderer/ui/loading-skeleton.tsx`) and keep the message for screen
  readers, and so do the sidebar library and the pages with a page header (a skeleton cover, round
  for an artist, beside a title and a details line). Other screens show the message in `muted`
  text until their redesign. No spinner.
- An empty list says what will appear there. It never leaves a blank pane.
- A failed load says so in plain text inside an `alert`, after a 16 px `muted` `CircleAlert` icon,
  with a small outline Retry button under it (`src/renderer/ui/error-with-retry.tsx`). It stays
  quiet because a page can show several at once: the accent is for what plays. Failed Spotify loads
  add a short `text-xs` `muted` detail line under the message (and in the now-playing bar and queue
  pane) so the user can see why Spotify rejected or could not answer the request. When a later page
  of a long list fails, the rows already loaded stay and the error sits below them. A virtualised
  list can fail in the middle, so its error sticks to the bottom of the view and shows wherever the
  user has scrolled.
- An auth failure on a Spotify load (`NotLoggedIn` or `SessionExpired`) never shows Retry, since
  retrying cannot bring back a session. Instead it sends the user to `/login` (with
  `sessionExpired: true` for `SessionExpired`). A development-mode 403 (`SpotifyAccessDenied` —
  the account is not added under User Management in the Spotify Developer Dashboard, or lacks an
  active Premium subscription) also never offers Retry; it explains what is missing, links the
  Spotify Developer Dashboard, and shows the detail line. A Retry button is only for failures a
  retry can fix (network, 5xx, decode, temporary token-refresh failure, or local storage). Failed
  Spotify load views go through `SpotifyLoadFailure`
  (`src/renderer/features/spotify/spotify-load-failure.tsx`), which shares the error-to-login
  mapping (`src/renderer/features/login/login-destination.ts`) with route guards and action
  handlers that inspect a failed Spotify load.
- When filters match nothing, the list says so inside an `output` element. The element stays on
  the page while entries match, because screen readers only announce changes to a live region
  that already exists.
- Long lists load their next page when the end of the list scrolls into view, with no "Load
  more" button. Search results are the one exception (see Search). A virtualised list loads
  the pages under the rows on screen, in any order.

### Motion

Motion confirms an action; it never decorates.

- Hover and press feedback: 120 ms, `ease-out`.
- Opening and closing menus, dialogs, and panes: 200 ms, `ease-out`. Elements fade and move at
  most 8 px.
- Nothing animates on page load, and nothing loops except loading skeletons, which pulse.
- The top bar gains its background as the main view scrolls its first 48 px, driven by the
  scroll position rather than by time.
- With the operating system's reduce-motion setting on, all transitions and animations are cut
  to near zero (enforced globally in `app.css`).

### Long text

- Descriptions in list rows are clamped to two lines. A "Show more" button expands them in
  place.
- Text from Spotify or podcast publishers is always rendered as text, never as HTML.

### App icon

The icon is a coral ring, open at the top right, around a light play triangle, on a dark tile
that fades from `surface-overlay` to `canvas`. It reads as "open" and "play" without borrowing
anything from Spotify's logo: no green, no circle of sound waves.

The operating system shows the icon outside the app, where themes do not reach, so its colors
are fixed to the default dark theme's values. The source is [`build/icon.svg`](../build/icon.svg),
drawn on a 1024 px canvas with the tile inset 100 px, the margin macOS expects. After editing
it, run `pnpm icons` and commit the regenerated `.ico`, `.icns`, and PNG files.

## Design tokens

A theme sets the design tokens, plus whether it is dark or light (see Themes below). The token
list and the default dark values live in [`src/shared/theme.ts`](../src/shared/theme.ts). The
theme engine sets each one on the document root as a CSS custom property named
`--theme-<token>`, and [`app.css`](../src/renderer/styles/app.css) maps each one into
Tailwind under the same name without the `theme-` prefix, so `--theme-color-muted` becomes the
`text-muted`, `bg-muted`, and `border-muted` classes.

Tailwind's built-in colors, fonts, radii, and shadows (including inset, drop, and text shadows)
are removed. Named classes such as `bg-red-500` or `drop-shadow-md` do not exist, so they
cannot bypass the theme. Arbitrary values such as `bg-[#fff]` still would: never use them for
colors, fonts, radii, or shadows.

Native controls that the browser partly draws (`<input type="range">`, `<input type="checkbox">`,
`<input type="radio">`, `<progress>`, and `<meter>`) bypass the theme too: `accent-color` styles
only part of them, leaving the rest in browser colors from `color-scheme`. Give each one
`appearance-none` and style its parts (such as a range input's rail through
`::-webkit-slider-runnable-track` and its thumb through `::-webkit-slider-thumb`) with theme
tokens. `<input type="color">` gets the same treatment: its frame goes, and its swatch is styled
through `::-webkit-color-swatch`. A number input's spin buttons are hidden
(`::-webkit-inner-spin-button`), since Chromium draws them in its own colors.

The full list of tokens, with the class each one drives and what it is for, is the
[token reference in themes.md](themes.md#token-reference). Use each token only for the purpose
listed there.

Every token is a promise to theme authors, so add one only when a design need cannot be met by
an existing token. Tests check that the `Theme` Schema, `app.css`, and the token reference list
the same tokens.

## Themes

A theme is a JSON document that sets any of the tokens, plus whether it is dark or light. Its
format, and how to write, check, and share one, are in [themes.md](themes.md).

Two themes ship with the app, defined in
[`src/shared/built-in-themes.ts`](../src/shared/built-in-themes.ts): the default dark theme and
a light theme. Both meet the contrast targets below, and a test checks them. The selected
theme is saved as the `themeId` setting and applied before the first render, and the window
opens with the theme's `canvas` color, so the wrong theme never flashes.

## Accessibility

These rules apply to the default themes and to every component. Target: WCAG 2.2 AA.

- **Contrast.** Any color used for text reaches 4.5:1 against every surface it sits on
  (`canvas`, `surface`, `surface-raised`, `surface-overlay`). That covers `foreground`,
  `muted`, and `accent` and `danger` when they color text, such as the playing track or an
  error message. `on-accent` reaches 4.5:1 against `accent`. Icons and `focus` reach 3:1
  against those surfaces. `border` is decorative and has no target, so a control's edge is
  shown by its surface color or an icon, not by a border alone. The default dark theme's
  lowest ratio is `muted` on `surface-overlay`, at 5.8:1; the light theme's is `accent` on
  `canvas`, at 4.5:1.
- **Focus.** Every interactive element shows a 2 px `focus` outline with a 2 px offset when
  focused from the keyboard (`:focus-visible`). `app.css` sets this globally. Never remove it;
  if a component needs a different shape, change the outline, not its visibility.
- **Keyboard.** Every action works from the keyboard. Lists use one tab stop and arrow keys
  inside (roving focus, `src/renderer/ui/use-roving-focus.ts`). An unavailable row in a list
  keeps its focus and is marked with `aria-disabled`, not `disabled`, following the WAI-ARIA
  guidance for composite widgets: a `disabled` element cannot take focus, which stalls arrow
  navigation and drops the list from the tab order when that row holds the tab stop. When an
  action moves or removes the focused control, focus follows instead of dropping to `<body>`:
  the control's section in this document says where it goes (for example, the moved control,
  the row now at the same index, the list's first row, or the section heading), and a test
  checks it. Dialogs and the command palette trap focus and return it on close. Pane dividers
  are focusable: the arrow keys move the divider 16 px, `Home` and `End` jump to the narrowest
  and widest size, and a double-click restores the default size.
- **Targets.** Interactive elements are at least 24 × 24 px. Dense rows are 32 px tall.
- **Not color alone.** State is never shown by color only. The playing track also shows an
  icon, and errors carry text.
- **Reduced motion.** See Motion. No content depends on an animation to be understood.
- **Names.** Icon-only buttons have an accessible name (`aria-label`), and artwork has `alt`
  text or is marked decorative.

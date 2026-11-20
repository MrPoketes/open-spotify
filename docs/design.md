# Design

This document sets how Open Spotify looks and behaves. Every UI issue follows it. When a design
question is not answered here, decide, build it, and add the answer to this file in the same PR.

## Principles

1. **The music is the content.** Artwork and titles carry the color and weight. The chrome
   around them is quiet: dark neutral surfaces, one accent color, no decoration.
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
   `/` focuses search, and `Alt+←`/`Alt+→` go back and forward. Every action has a
   shortcut. Power users never need the mouse, and making every control focusable also helps
   screen reader users.
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

## Visual language

### Layout grid

```
┌──────────────┬─────────────────────────────────────┬──────────────┐
│              │ top bar: history, search, settings  │              │
│   sidebar    ├─────────────────────────────────────┤  right pane  │
│              │                                     │  (optional)  │
│  200–420 px  │  main view, fluid                   │  280–400 px  │
│  default 280 │  content padding: 24 px             │  default 320 │
│              │                                     │              │
├──────────────┴─────────────────────────────────────┴──────────────┤
│ now-playing bar, 72 px                                            │
└───────────────────────────────────────────────────────────────────┘
```

- Panes sit on the `canvas` color, separated by an 8 px gap. Each pane is a `surface` with
  `radius-medium` corners. The gap doubles as the resize handle.
- The top bar is 56 px tall and belongs to the main view, not the window. A gear link to
  Settings sits at its right end.
- Card grids (albums, artists, folders) use `repeat(auto-fill, minmax(160px, 1fr))` with a
  24 px gap, so the column count follows the pane width.
- Track lists use fixed columns: index, title and artist, album, date added, duration. Columns
  that do not fit the pane width are hidden from the right, never squeezed: date added goes
  first, below 768 px, then the album, below 576 px. Duration always stays.
- Track lists scroll with the main view, so a page header above one scrolls away. Only the rows
  near the screen are in the DOM; a row whose track has not loaded keeps its full height and
  shows a placeholder artwork tile and a bar, so the scrollbar is right from the start.

### Before login

Onboarding and login come before the app exists, so they skip the pane layout: one `surface`
panel with `radius-large` corners, centered on the `canvas`, 24 px from the window edge. The
panel's one primary action is a round `accent` button with `on-accent` text; secondary actions
are round `surface-raised` buttons or muted links. An action that waits, such as logging in in
the browser, says what it waits for, disables the button that started it, and offers Cancel
beside it. Focus moves to Cancel and back when the wait ends, and a double-click cannot cancel
what its first click started.

### Spacing

Spacing comes from Tailwind's numeric scale, where one step is the `spacing` token (4 px by
default). Use only these steps:

| Step | Default | Use                                |
| ---- | ------- | ---------------------------------- |
| 1    | 4 px    | Icon to label; chip top and bottom |
| 2    | 8 px    | Between related controls; pane gap |
| 3    | 12 px   | Inside list rows, buttons, chips   |
| 4    | 16 px   | Between groups in a pane           |
| 6    | 24 px   | Main view padding; card grid gap   |
| 8    | 32 px   | Between page sections              |
| 12   | 48 px   | Above a page header                |

### Type

One family for body text (`font-body`) and one for headings (`font-display`). By default both
use the operating system's UI font, so text looks native on every platform and nothing has to
be bundled. Use only these sizes:

| Class       | Size  | Use                                            |
| ----------- | ----- | ---------------------------------------------- |
| `text-xs`   | 12 px | Metadata: durations, dates, counts             |
| `text-sm`   | 14 px | List rows, sidebar items, buttons              |
| `text-base` | 16 px | Body text, inputs                              |
| `text-xl`   | 20 px | Section headings                               |
| `text-3xl`  | 30 px | Page titles                                    |
| `text-5xl`  | 48 px | Header of a playlist, album, artist, or folder |

Weights: 400 for body, 600 for emphasis and active items, 700 for headings. Durations and counts
use `tabular-nums` so columns line up.

### Radii

| Class            | Default | Use                                 |
| ---------------- | ------- | ----------------------------------- |
| `rounded-small`  | 4 px    | List rows, inputs, small artwork    |
| `rounded-medium` | 8 px    | Panes, cards, artwork in grids      |
| `rounded-large`  | 14 px   | Dialogs, menus, the command palette |
| `rounded-full`   | —       | Avatars, round play buttons, pills  |

Artists use round artwork; everything else uses square artwork with a radius. This tells the
two apart at a glance.

### Elevation

There are three levels. Most of the app is flat.

| Level   | Surface           | Shadow           | Use                                         |
| ------- | ----------------- | ---------------- | ------------------------------------------- |
| Flat    | `surface`         | none             | Panes, lists, pages                         |
| Raised  | `surface-raised`  | `shadow-raised`  | Hovered cards, inputs, the now-playing bar  |
| Overlay | `surface-overlay` | `shadow-overlay` | Menus, dialogs, the command palette, toasts |

Hovered and selected list rows change color (`surface-raised`, or `accent` at 15 % opacity
when selected) but never gain a shadow.

### Icons

Icons come from [Lucide](https://lucide.dev) (`lucide-react`, ISC license), imported one by one
so only the icons in use are bundled. They draw with `currentColor`, so they follow the theme.
Use 20 px icons in 32 px icon buttons and 16 px icons next to `text-sm` or smaller text. Icons
are decorative (`aria-hidden`); the control that holds them carries the accessible name.

### Library rows

Sidebar entries are 48 px rows: 40 px artwork, the name in `text-sm`, and a `text-xs` `muted`
line that says what the entry is ("Playlist · owner", "Album · artist", "Artist", "Show").
Images are given to the browser as a `srcset`, so it downloads the smallest size that is sharp
on the current screen.

When artwork is missing or fails to load, a `surface-raised` tile with a `muted` Lucide icon for
the kind stands in: `ListMusic` for playlists, `Disc3` for albums, `MicVocal` for artists,
`Radio` for shows, `Music` for tracks, `Folder` for folders. Liked Songs has no artwork from
Spotify and always shows `Heart` on `accent`. Its page header shows the same tile at cover size.

### Filter chips

Filter chips are pills (`rounded-full`) with `text-sm` labels, 12 px across and 4 px down
inside, and an 8 px gap between chips that wraps onto a second line in a narrow pane. A resting
chip is `surface-raised`; a pressed chip is `accent` with `on-accent` text, a 600 weight, and a
16 px `Check` icon, so the state does not rely on color. Chips set `aria-pressed`, and a group
of them sits in a `fieldset` whose `legend` names it for screen readers.

The sidebar library has a chip per kind (Playlists, Albums, Artists, Shows) and a name filter
under them. Pressing the active chip shows every kind again. The filters stay at the top of the
pane while the list scrolls. When they match nothing, the list says so instead of going blank.

### Now-playing bar and device picker

The bar's right end always holds the device picker button, labelled with the playing device
("Playing on Kitchen Speaker") or "No active device". With no active device, the bar's left
side says that audio plays in the Spotify app or on another device, next to a "Choose a device"
button that opens the picker.

The picker is a non-modal popover above its button: `surface-overlay`, `shadow-overlay`,
`rounded-large`, 320 px wide. Each device is a row with a 20 px Lucide icon for its type, the
name in `text-sm`, and the type in `text-xs` `muted`. The active device is drawn in `accent`,
adds "Playing here" to its type line and a `Volume2` icon, and carries `aria-current`.

Opening the picker moves focus into it. The active device is listed first. The device list is
one tab stop, starting on the first device, and moves like any other list (see Keyboard).
`Escape` or choosing a device closes the picker and returns focus to its button; clicking or
tabbing outside closes it.

### Settings and the theme picker

Settings is a page in the main view, opened from the gear icon at the right end of the top bar.
Its sections (Appearance first) sit in one column at most 576 px wide.

The theme picker is a list of 64 px rows, one per theme: a 64 × 40 px swatch, the theme's name
in `text-sm`, and "by author" in `text-xs` `muted`. The swatch sets the theme's own token
properties on itself, so it shows that theme's `surface`, `foreground`, and `accent` without
applying it. The chosen row is `accent` at 15 % opacity, 600 weight, and has a 16 px `Check`
icon.

Hovering or focusing a row previews its theme across the whole app at once. The pointer wins
over focus, so a mouse user can compare themes while keyboard focus stays on one row. The saved
theme returns when the pointer and focus both leave the picker, or the page closes. Clicking a
row or pressing `Enter` or `Space` on it chooses and saves its theme. The list is one tab stop
that starts on the chosen row, and moves like any other list (see Keyboard).

### Folder page

The header shows a breadcrumb of the parent folders (only for a nested folder) above the page
header every page shares: a `Folder` placeholder tile as the cover, a `text-xs` "Folder" label,
the name in `text-5xl`, and the item count. Below it, at the right end, a Grid / List toggle:
two filter chips in a `fieldset`, so the chosen view has the chip's check mark and 600 weight as
well as its `accent` fill. The choice is the `folderView` setting and applies to every folder.

- **Grid:** cards in the standard card grid, each with square artwork (round for artists), the
  name in `text-sm` at 600, and the kind in `text-xs` `muted`. A nested folder says how many
  items it holds.
- **List:** 32 px rows with a 16 px kind icon instead of artwork, the name, and the kind at the
  right end.

Both views are one tab stop with roving focus. An entry whose kind has a page links to it; the
others are plain rows until their page exists.

### Loading, empty, and error states

- While a list or page loads, it says so in `muted` text inside an `output` element, so screen
  readers announce it. No spinner, since nothing animates on page load.
- An empty list says what will appear there. It never leaves a blank pane.
- A failed load says so in plain text inside an `alert`, with a Retry button next to it
  (`src/renderer/ui/error-with-retry.tsx`). When a later page of a long list fails, the rows
  already loaded stay and the error sits below them. A virtualised list can fail in the middle,
  so its error sticks to the bottom of the view and shows wherever the user has scrolled.
- When filters match nothing, the list says so inside an `output` element. The element stays on
  the page while entries match, because screen readers only announce changes to a live region
  that already exists.
- Long lists load their next page when the end of the list scrolls into view, with no "Load
  more" button. A virtualised list loads the pages under the rows on screen, in any order.

### Motion

Motion confirms an action; it never decorates.

- Hover and press feedback: 120 ms, `ease-out`.
- Opening and closing menus, dialogs, and panes: 200 ms, `ease-out`. Elements fade and move at
  most 8 px.
- Nothing animates on page load, and nothing loops except loading indicators.
- With the operating system's reduce-motion setting on, all transitions and animations are cut
  to near zero (enforced globally in `app.css`).

### Long text

- Descriptions in list rows are clamped to two lines. A "Show more" button expands them in
  place.
- Text from Spotify or podcast publishers is always rendered as text, never as HTML.

### Color roles

Color is used by role, never by hue. A component asks for "muted text on a raised surface", and
the theme decides what that looks like. The default theme is a cool, near-black neutral with a
warm coral accent.

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
  lowest ratio is `muted` on `surface-overlay`, at 5.6:1; the light theme's is `accent` on
  `canvas`, at 4.7:1.
- **Focus.** Every interactive element shows a 2 px `focus` outline with a 2 px offset when
  focused from the keyboard (`:focus-visible`). `app.css` sets this globally. Never remove it;
  if a component needs a different shape, change the outline, not its visibility.
- **Keyboard.** Every action works from the keyboard. Lists use one tab stop and arrow keys
  inside (roving focus, `src/renderer/ui/use-roving-focus.ts`). Dialogs and the command
  palette trap focus and return it on close. Pane dividers are focusable: the arrow keys resize
  by 16 px, `Home` and `End` jump to the narrowest and widest size, and a double-click restores
  the default size.
- **Targets.** Interactive elements are at least 24 × 24 px. Dense rows are 32 px tall.
- **Not color alone.** State is never shown by color only. The playing track also shows an
  icon, and errors carry text.
- **Reduced motion.** See Motion. No content depends on an animation to be understood.
- **Names.** Icon-only buttons have an accessible name (`aria-label`), and artwork has `alt`
  text or is marked decorative.

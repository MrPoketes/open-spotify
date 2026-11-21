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

Onboarding and login come before the app exists, so they skip the pane layout: one `surface`
panel with `radius-large` corners, centered on the `canvas`, 24 px from the window edge. The
panel's one primary action is a round `accent` button with `on-accent` text; secondary actions
are round `surface-raised` buttons or muted links. An action that waits, such as logging in in
the browser, says what it waits for, disables the button that started it, and offers Cancel
beside it. Focus moves to Cancel and back when the wait ends, and a double-click cannot cancel
what its first click started. Onboarding's Client ID uses the shared text field (see Text
fields).

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

### Text fields

A text field has its label above it (`text-sm`, 600 weight, joined with `htmlFor`) and a 4 px
gap between them. The input is `surface-raised` and `rounded-small`, with 12 px across and 8 px
down inside and `text-base` text. An invalid field gets a `danger` ring and a `text-xs`
`danger` message in an `alert` under it, which also describes it (`aria-describedby`). The
onboarding Client ID, the theme editor's Name and Author, and the New folder dialog's Name use
it (`src/renderer/ui/text-field.tsx`). The Client ID turns off autocomplete and spell check,
since it is not a word.

### Sidebar sections and pins

The sidebar library is split into sections: Liked Songs, Playlists, Albums, Artists, and Shows,
in the order the user chose. Each section starts with a heading button (`text-sm`, 600,
`muted`, with a 16 px chevron) that collapses or expands it and sets `aria-expanded`, and a
"section options" menu with Move up, Move down, and Hide section. Moves swap with the
neighbouring section on screen, so hidden and empty sections never make a move look like it did
nothing. Hidden sections are listed under the library as round `surface-raised` "Show Albums"
buttons. A section with no entries left after the filters is not shown.

Any entry can be pinned. Pinned entries leave their section for a "Pinned" section that always
sits at the top, in the order they were pinned. Each row has a pin button that shows on hover
or while the row has focus. It stays out of the tab order so each section's list is still one
tab stop; keyboard users press `P` on a focused row instead, which the button's tooltip and the
row's `aria-keyshortcuts` announce. When a change moves or removes the focused control, focus
follows: a pinned row keeps focus in its new place, a moved section's heading keeps it, hiding a
section moves it to that section's Show button, and showing one moves it to its heading. An
unpinned row goes back to its section and keeps focus there, or the section's heading takes it
when the section is collapsed. When the control that should take focus is not on screen (its
section is hidden, or the filters leave it empty), the name filter takes it.

When the filters match nothing, the library says so. When everything that matches is in a
hidden section, it says that instead, so a hidden section never looks like a missing entry.

Pins are the `pinnedLibraryEntries` setting and the section order and states are the
`librarySections` setting, so both survive a restart.

### Now-playing bar and device picker

The bar has three columns: what is playing on the left, the playback controls in the middle,
and the queue button and device picker on the right. The left column shows 40 px artwork, as in
library rows, then the title in `text-sm` and the artists in `text-xs` `muted` ("Podcast
episode" for an episode).

The controls are, in order: shuffle, previous, play or pause, next, repeat. They are 32 px
round icon buttons; play or pause is `accent` with `on-accent` icons, and the others are
`muted`. Shuffle and repeat show that they are on with `accent` and a 4 px dot under the
icon, so the state does not rely on color, and set `aria-pressed`. Repeat cycles off, the
context, and the track; for the track it uses the `Repeat1` icon and is named "Repeat one
track".

A control updates as soon as it is pressed. It keeps that state while the command is on its
way and for one second after Spotify accepts it, because Spotify can report the old state for a
moment; after that, the polled state wins again. If Spotify rejects the command, the control
goes back and a `text-xs` `danger` alert under the controls says what failed. A control that cannot be used (no active device,
a device that other apps cannot control, or an action Spotify disallows right now) is
`aria-disabled` at 50 % opacity and keeps its focus, and its `title` says why, which also
makes it the accessible description.

The bar's right end holds the queue button (`ListMusic`, a toggle drawn like shuffle) and always
the device picker button, labelled with the playing device ("Playing on Kitchen Speaker") or
"No active device". With no active device, the bar's left side says that audio plays in the
Spotify app or on another device, next to a "Choose a device" button that opens the picker.

The picker is a non-modal popover above its button: `surface-overlay`, `shadow-overlay`,
`rounded-large`, 320 px wide. Each device is a row with a 20 px Lucide icon for its type, the
name in `text-sm`, and the type in `text-xs` `muted`. The active device is drawn in `accent`,
adds "Playing here" to its type line and a `Volume2` icon, and carries `aria-current`.

Opening the picker moves focus into it. The active device is listed first. The device list is
one tab stop, starting on the first device, and moves like any other list (see Keyboard).
`Escape` or choosing a device closes the picker and returns focus to its button; clicking or
tabbing outside closes it.

### Playing from a page

Album, playlist, artist, and show pages have a 56 px round `accent` play button with a 24 px
filled `Play` icon in `on-accent`, between the header and the list. It starts the page's context
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

The pane shows a "Now playing" section with the playing item and a "Next up" list, both in the
now-playing bar's layout: 40 px artwork, the title, and the artists or "Podcast episode". Each
upcoming item is a row button, and the list is one tab stop with roving focus. Pressing a row
plays that item. Spotify has no endpoint for that, so the app reads the queue again, finds the
item, and skips to the next item once for every item before it; if the item has left the queue,
an alert under the list says so. A row points into the list it was shown in, so from the moment
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

An imported theme's row ends in a 32 px `Trash2` icon button named "Delete <theme>" that shows on
hover or while the row has focus. Like the sidebar's pin button, it stays out of the tab order;
keyboard users press `Delete` or `Backspace` on a focused row, which the button's tooltip and
the row's `aria-keyshortcuts` announce. A theme is deleted at once, without a confirmation, and
leaves the list only after the main process has deleted it; a failure is reported in `danger`
text inside an `alert` under the list. Deleting the chosen theme applies and saves the default
theme. A row deleted from the keyboard hands focus to the row that takes its place; a row
deleted with the pointer leaves focus alone, so no other row is left previewing. Built-in themes
have no delete button.

Below the list, "Edit a copy" opens the theme editor on a copy of the chosen theme, and
"Import theme…" and "Export current theme…" are round `surface-raised` buttons
that open the operating system's file dialogs. A result is reported in `muted` text inside an
`output` element; a rejected file shows the reason in `danger` text inside an `alert`. The dialogs are
modal to the app window.

Below them, "Track list rows" offers Comfortable and Dense as two filter chips in a `fieldset`,
with a `text-xs` `muted` line that says what Dense changes. The choice applies to every track
list at once.

### Theme editor

The editor takes the place of the theme picker and its buttons in the Appearance section, so a
hovered row cannot preview over the theme being edited. Focus moves to its Name field when it
opens and back to "Edit a copy" when it closes. A built-in or imported theme is never edited in
place: the editor starts from a copy named "<theme> (copy)".

From the top: Name and Author fields side by side, a "Color scheme" radio group (Dark, Light),
then one `fieldset` per token group (Colors, Typography, Radii, Spacing, Shadows) with a field
for every token. The fields come from the `Theme` Schema, so a new token appears without changes
to the editor. Each field is labelled with its token name, and its control fits the value:

- **Colors:** the native color picker beside a hex text field. Both edit the same value.
- **Radii and spacing:** a number field and a unit list (`px`, `rem`, `em`).
- **Fonts and shadows:** a text field for the CSS value.

Every valid change applies to the whole app at once. An invalid value gets a `danger` ring and a
`text-xs` `danger` message under its field that describes it (`aria-describedby`), and the app
keeps the last valid value.

A color pair below its contrast target (see Accessibility) gets a `text-xs` `danger` warning
under the field of the color drawn on top: the text color, `on-accent`, or `focus`. It names the
pair and its ratio ("color-muted on color-surface: 3.2:1, needs 4.5:1"), rounded down so it never
reads as meeting the target. The warnings sit in an `output` live region, so a screen reader
announces them as they appear, and they also describe the field. They follow every valid change
and never block saving.

Save theme (round `accent`) stores the copy as an imported theme and chooses it; with a field
still invalid or the name or author empty, it says so in an `alert` instead. A theme the main
process refuses, such as one named like a built-in theme, shows its reason in the same `alert`.
Cancel (round `surface-raised`), or leaving the page, discards the changes and restores the
saved theme.

### Home page

The home page opens with a `text-3xl` greeting, "Hello, <display name>" ("Hello" until the name
loads, or when Spotify has none). Below it come up to four sections, each with a `text-xl`
heading:

- **Jump back in:** cards for up to eight distinct albums, playlists, and artists the user
  recently played from, most recent first, in the standard card grid. A card shows the artwork
  (round for artists), the name in `text-sm` at 600, and the kind in `text-xs` `muted`, and
  links to its page. Plays from anything else, such as Liked Songs, are skipped, and so is a page
  Spotify won't return: its own playlists, such as Discover Weekly, which development-mode apps
  cannot read, or a deleted playlist.
- **Recently played:** the ten most recent tracks in the shared track list, with a track played
  several times in a row listed once.
- **Your top artists:** the ten top artists as round cards.
- **Your top tracks:** the ten top tracks in the shared track list.

The two top sections have a time range switch at the right end of the heading: filter chips for
"Last 4 weeks", "Last 6 months" (the default), and "Last year". Spotify computes its longest
range from about a year of listening, so the app does not call it "All time".

Each section loads on its own, with the usual loading and error states, and one failing section
leaves the others in place. Jump back in and Recently played both come from the play history, so
when it fails to load, both say so, and either Retry loads it for both. A section with nothing to
show is left out. A top section stays once the user picks another time range, so the switch back
stays too, and says when that range has nothing. An account with no listening history at all
sees a short welcome message instead.

Log out and the app version live in Settings, under Account.

### Artist page

The header is the page header every page shares, with the artist's image as a round cover, a
`text-xs` "Artist" label, the name in `text-5xl`, and the genres in `text-sm` `muted` when
Spotify lists any. Below it the discography comes in up to three sections, in this order:
Albums, Singles and EPs, Appears On. A section with no releases is left out; an artist with
none at all says so.

Each section has a `text-xl` heading and a card grid. A card shows the cover, the name in
`text-sm` at 600, and the release year in `text-xs` `muted`, and links to the album page. A
section shows one row of cards, as many as fit the pane width. When it has more, a "Show all"
button at the right end of the heading reveals the rest and becomes "Show fewer"; it sets
`aria-expanded`. The revealed grid loads its next page when its end scrolls into view, like any
long list. Each grid is one tab stop with roving focus.

Spotify no longer gives development-mode apps an artist's top tracks, followers, or popularity,
so the page does not show them.

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

The page title says "Results for “query”". Below it come up to four sections, in this order:
Tracks (the track list), Artists, Albums, and Playlists (card grids). A
section with no results is left out. Artist cards have round artwork and say "Artist"; album
cards name the album's artists; playlist cards say "By owner". Each section shows 10 results,
the most Spotify returns per request in development mode, and a round `surface-raised`
"Load more" button under it fetches the next 10 for that section alone. Search breaks the
scroll-to-load rule (see Loading, empty, and error states) because its sections are stacked: a
track list that grew as it scrolled would push the other sections out of reach. While a page
loads, the button stays focusable with `aria-disabled` and "Loading more tracks…" sits beside it.
When the page fails, an alert with Retry takes the button's place. Focus follows the button
when it goes away: to Retry after a failure, back to "Load more" when Retry asks again, and to
the first new result when the last page loads.

Before anything is typed the page asks for a query. A query that matches nothing says
"No results for “query”." A new query replaces the old results with "Searching…" and starts
from a fresh page, so an earlier query's results can never show up after a later one's.

### Menus

A menu opens from a 32 px icon button (`MenuButton` in `src/renderer/ui`) and follows the
WAI-ARIA menu button pattern: `Enter`, `Space`, or `↓` opens it on the first item, `↑` on the
last, the arrow keys wrap, `Home` and `End` jump to the ends, `Escape` or `Shift+Tab` closes it
and returns focus to the button, and `Tab` closes it and moves on to the next control. It is an
Overlay (`surface-overlay`, `shadow-overlay`, `rounded-large`) with 4 px of padding, aligned to
the button's right edge. Items are `text-sm` rows with `rounded-small` corners that turn
`surface-raised` on hover or focus. An item that opens a dialog ends its label with an ellipsis
("Import folders…").

A context menu (`ContextMenu` in `src/renderer/ui`) opens on right-click, `Shift+F10`, or the
context-menu key, at the pointer or, from the keyboard, under the element. It looks like any other
menu and follows the WAI-ARIA menu pattern: focus starts on the first item, the arrow keys wrap,
`Enter` or `Space` activates, and `Escape`, `Tab`, or `Shift+Tab` closes it and returns focus to
the element it opened from. An item with a submenu ends in a 16 px `ChevronRight`; `→`, `Enter`,
or a click opens the submenu beside it, and `←` or `Escape` goes back to its item. A menu that
would spill over the window edge moves back inside it, and a menu taller than the window scrolls
(unless it holds submenus, which a scroll box would clip). Every menu ignores keys held with
`Ctrl`, `Alt`, or `Cmd`, so app-wide shortcuts such as `Alt+←` still work while it is open. A menu
lists only the actions that lead somewhere, and an element with none opens no menu.

An item that turns something on or off is a `menuitemcheckbox`: when it is on, it sets
`aria-checked` and ends in a 16 px `Check` icon, so the state does not rely on color.

Every row of a track list has a context menu: Add to playlist (a submenu of the playlists the user
owns or collaborates on), Add to folder, Add to queue, Go to artist (a submenu of the artists when
the track has several), Go to album, and Copy link, which copies
`https://open.spotify.com/track/<id>`. Until the playlists load, or when there are none to add to,
Add to playlist says why in the status message instead of opening an empty submenu.

Every sidebar library entry except Liked Songs, which no folder can hold, has a context menu with
Add to folder.

### Add to folder

Add to folder is a submenu of the folder tree, in the user's order, ending in "New folder…". Each
folder is a checkbox item that is checked when the folder holds the item itself (not only a folder
inside it). Choosing an unchecked folder adds the item; choosing a checked one removes it. A folder
with folders inside opens a submenu instead, which starts with the folder itself, followed by the
folders inside it. The status message says what happened: "Added to Running", "Removed from
Running", or why it failed. Until the folders load, the item says so in the status message instead
of opening a submenu, and after a failed load it loads them again.

"New folder…" opens a modal dialog (`surface-overlay`, `shadow-overlay`, `rounded-large`, 320 px
wide, over a `canvas` backdrop at 60 % opacity) with a Name field, then Cancel (round
`surface-raised`) and Create folder (round `accent`). Create folder makes a top-level folder with
the item in it. A blank name keeps the dialog open and marks the field invalid with "Enter a
name for the folder.", until the name is no longer blank. Focus starts in the field, stays in the
dialog, and returns to the menu's opener when the dialog closes; `Escape` closes it.

The sidebar's folder menu sits beside the "Your library" heading. What an action did is said
under the heading: a success in `muted` text inside an `output`, a failure in `danger` text
inside an `alert`.

### Status message

What an action from a context menu or a page's play controls did is said in a small Overlay
message (`surface-overlay`, `shadow-overlay`, `rounded-large`, `text-sm`) centered 16 px above the
now-playing bar, in `danger` text for a failure. It fades in like a menu and goes away after five
seconds. It sits in an `output` (`role="status"`) that stays on the page, so screen readers
announce every message (`useShowStatusMessage` in `src/renderer/ui`).

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
  more" button. Search results are the one exception (see Search). A virtualised list loads
  the pages under the rows on screen, in any order.

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
  lowest ratio is `danger` on `surface-overlay`, at 5.4:1; the light theme's is `accent` on
  `canvas`, at 4.7:1.
- **Focus.** Every interactive element shows a 2 px `focus` outline with a 2 px offset when
  focused from the keyboard (`:focus-visible`). `app.css` sets this globally. Never remove it;
  if a component needs a different shape, change the outline, not its visibility.
- **Keyboard.** Every action works from the keyboard. Lists use one tab stop and arrow keys
  inside (roving focus, `src/renderer/ui/use-roving-focus.ts`). Dialogs and the command
  palette trap focus and return it on close. Pane dividers are focusable: the arrow keys move
  the divider 16 px, `Home` and `End` jump to the narrowest and widest size, and a double-click
  restores the default size.
- **Targets.** Interactive elements are at least 24 × 24 px. Dense rows are 32 px tall.
- **Not color alone.** State is never shown by color only. The playing track also shows an
  icon, and errors carry text.
- **Reduced motion.** See Motion. No content depends on an animation to be understood.
- **Names.** Icon-only buttons have an accessible name (`aria-label`), and artwork has `alt`
  text or is marked decorative.

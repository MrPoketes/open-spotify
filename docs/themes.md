# Writing a theme

A theme restyles all of Open Spotify: every color, font, corner radius, shadow, and the spacing
scale. It is one JSON file, so you can write it in any text editor and share it like any other
file.

This guide is for theme authors. Why the app looks the way it does, and how components use each
token, is in [design.md](design.md).

## The theme file

```json
{
  "name": "Ember",
  "author": "Ada Lovelace",
  "version": "1.0.0",
  "colorScheme": "dark",
  "tokens": {
    "color-accent": "#ffb454",
    "color-on-accent": "#2a1a00",
    "radius-medium": "12px"
  }
}
```

This example is complete: it imports as it is. Every field is required except the entries
inside `tokens`.

| Field         | Value                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| `name`        | The name shown in the theme picker                                           |
| `author`      | Your name or handle                                                          |
| `version`     | Any non-empty text. Use `1.0.0`, and raise it when you publish a change      |
| `colorScheme` | `dark` or `light`: the style of native scrollbars and form controls          |
| `tokens`      | The design tokens you want to change, from the [reference](#token-reference) |

Rules for `tokens`:

- **Leave out what you do not change.** A missing token takes the value from the default dark
  theme, defined in [`src/shared/theme.ts`](../src/shared/theme.ts). A light theme should set
  every color token, because the dark defaults will not suit it.
- **Spelling matters.** An unknown token is an error, so a typo is reported instead of silently
  changing nothing.
- **Colors are hex:** `#rgb` or `#rrggbb`. Names like `orange` and functions like `rgb()` are
  rejected, so that the contrast of every theme can be checked.
- **Radii and spacing are lengths** in `px`, `rem`, or `em`, such as `8px` or `0.25rem`, or `0`.
- **Fonts are CSS `font-family` values**, such as `"Inter", system-ui, sans-serif`. The app does
  not download fonts, so a font only appears if it is installed on the listener's computer.
  Always end with a generic family (`sans-serif`, `serif`, `monospace`).
- **Shadows are CSS `box-shadow` values**, such as `0 2px 8px rgb(0 0 0 / 0.35)`, or `none`.

## Token reference

Each token becomes the CSS custom property `--theme-<token>`, and the app's Tailwind classes
read it under the same name without the `theme-` prefix.

### Colors

A color token works with every Tailwind color utility: `bg-<suffix>`, `text-<suffix>`,
`border-<suffix>`, `fill-<suffix>`, and so on. For example, `color-muted` drives `text-muted`.

| Token                   | Class suffix      | Purpose                                                         |
| ----------------------- | ----------------- | --------------------------------------------------------------- |
| `color-canvas`          | `canvas`          | The window background, visible in the gaps between panes        |
| `color-surface`         | `surface`         | Pane backgrounds: sidebar, main view, right pane                |
| `color-surface-raised`  | `surface-raised`  | Hovered rows and cards, inputs, the now-playing bar             |
| `color-surface-overlay` | `surface-overlay` | Menus, dialogs, the command palette, toasts                     |
| `color-border`          | `border`          | Decorative dividers only; never the only edge of a control      |
| `color-foreground`      | `foreground`      | Primary text and icons; the default text color                  |
| `color-muted`           | `muted`           | Secondary text: artists, metadata, placeholders, inactive icons |
| `color-accent`          | `accent`          | Primary actions, the playing track, active navigation, progress |
| `color-on-accent`       | `on-accent`       | Text and icons drawn on top of `accent`                         |
| `color-focus`           | `focus`           | The keyboard focus ring around every focused control            |
| `color-danger`          | `danger`          | Errors and destructive actions                                  |

### Typography

| Token          | Class          | Purpose                                                         |
| -------------- | -------------- | --------------------------------------------------------------- |
| `font-body`    | `font-body`    | All text unless stated otherwise; the default for the whole app |
| `font-display` | `font-display` | Page titles and section headings                                |

### Radii

| Token           | Class            | Purpose                             |
| --------------- | ---------------- | ----------------------------------- |
| `radius-small`  | `rounded-small`  | Rows, inputs, small artwork         |
| `radius-medium` | `rounded-medium` | Panes, cards, artwork in grids      |
| `radius-large`  | `rounded-large`  | Dialogs, menus, the command palette |

### Spacing

| Token     | Classes                     | Purpose                                                                   |
| --------- | --------------------------- | ------------------------------------------------------------------------- |
| `spacing` | `p-*`, `gap-*`, `w-*`, etc. | One step of the spacing scale; a larger value makes the whole app roomier |

### Shadows

| Token            | Class            | Purpose                                                     |
| ---------------- | ---------------- | ----------------------------------------------------------- |
| `shadow-raised`  | `shadow-raised`  | Raised elements: hovered cards, inputs, the now-playing bar |
| `shadow-overlay` | `shadow-overlay` | Overlays: menus, dialogs, the command palette, toasts       |

## Contrast

A theme has to stay readable. These are the WCAG 2.2 AA targets from the
[Accessibility section of design.md](design.md#accessibility), which the built-in themes meet:

- **4.5:1** for each text color (`color-foreground`, `color-muted`, `color-accent`,
  `color-danger`) against each surface color (`color-canvas`, `color-surface`,
  `color-surface-raised`, `color-surface-overlay`).
- **4.5:1** for `color-on-accent` against `color-accent`.
- **3:1** for `color-focus` against each surface color.

`color-border` is decorative and has no target.

To check a pair, enter both hex values in a WCAG contrast checker, such as
[WebAIM's](https://webaim.org/resources/contrastchecker/), and read the ratio. Check every pair
in the table: a theme usually fails on `color-muted` or `color-accent` against the lightest
surface of a dark theme, or the darkest surface of a light one.

## Importing a theme

Importing a theme file from inside the app, and exporting the current theme, are planned for
milestone 6 of the [roadmap](roadmap.md) and are not built yet.

When a file is imported, the app checks it against the rules above. A file that breaks a rule
is rejected with a message that names the field, such as `["tokens"]["color-accent"]`, so you
can find and fix the line.

## Sharing a theme

A theme is just its `.json` file. Name the file after the theme (`ember.json`), save it as
UTF-8, and share it any way you like: attach it to a message, put it in a gist, or publish it in
a repository. Whoever receives it imports the file. When you change a published theme, raise
its `version` so people can tell the copies apart.

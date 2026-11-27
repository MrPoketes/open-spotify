# 0008: The liner-notes design direction, built on shadcn/ui

**Status:** accepted (2026-11-27)

## Context

The owner said the app "looks quite horrible" (ARM-162). From their screenshot of Home in a wide
window: one narrow column with empty space beside it, every section heading alike, six identical
orange Retry pills when Spotify failed, flat sidebar and now-playing panels, and nothing that
suggested music: no artwork, no color from the content.

Two causes sat under that. There was no visual direction beyond "dark neutral surfaces and one
accent", so each screen was assembled from the same grey panel and coral pill. And every control
was hand-written, so each one drifted on its own (four text fields, three button styles, chips
that worked like radio buttons).

The design skills the issue names (impeccable, taste, shadcn) were used to audit the UI and pick a
direction. Their decision round normally asks the owner to choose between directions; the
pipeline runs without the owner, so the worker chose and records the choice here.

Directions weighed, all drawn from the world of people who listen to records for hours:

1. **A record-shop sleeve wall:** artwork tiles as the whole interface. Strong, but it is what
   every streaming app already ships.
2. **ECM-style quiet:** vast grey space, small type. Calm, but it would make a busy library slow
   to scan.
3. **Liner notes and the record's center label (chosen):** the precise small typography of a
   sleeve's back, numbered and aligned like a tracklist, around artwork that leads.
4. **Blue Note sleeve typography**, **late-night radio**, **gig posters**, and **cassette
   J-cards** were weaker fits for a working screen used all day.

## Decision

**Direction: liner notes.** The app reads like a well-made record sleeve: artwork leads, and the
chrome around it is set with a liner note's precision. docs/design.md describes it in full.

- **One lit sheet.** The main view is a raised `surface` sheet with `radius-large` corners and
  `shadow-raised`. The sidebar and the now-playing bar sit directly on the `canvas`. Depth comes
  from that one step, so the eye goes to the content.
- **Warm black and paper white.** The default theme moves from a cool blue-black to warm,
  sleeve-like neutrals, keeping the coral of the app icon as the accent. The accent is kept for
  what plays and for primary actions; a pressed choice turns to the foreground color instead.
- **A typeface of its own.** Schibsted Grotesk (SIL Open Font License) ships with the app through
  `@fontsource-variable/schibsted-grotesk`, so the default look is the same on Windows, macOS, and
  Linux. Themes can still set any font.
- **Signature: the artwork wash.** The artwork of what the page is about, blurred far past
  recognition, colors the top of the main view and fades into the sheet. A new theme token,
  `artwork-wash`, sets its strength, so a theme can turn it down or off. The owner asked for
  "colour that comes from the content"; this delivers it without reading pixels from images,
  which needs no canvas and no cross-origin access to Spotify's image hosts.
- **Quiet states.** Loading shows skeletons shaped like the content. A failure is a muted line
  with an outline Retry, so a page with several failures stays calm.

**Components: shadcn/ui on Base UI.** Components come from the shadcn CLI into
`src/renderer/ui/` and are restyled to the direction. Base UI (`@base-ui/react`) is shadcn's
default primitive library and one package, where Radix is one package per component. shadcn's
`cn` helper lives in `src/renderer/ui/class-names.ts`, since `no-junk-drawer-modules` forbids
`lib/utils.ts`. `app.css` maps shadcn's CSS variables onto the theme tokens, so a component from
the CLI follows every theme as it comes, except for the two names whose meaning clashes (see
docs/design.md, Components).

The redesign lands screen by screen. This first change sets the direction, the components it
needs (Button, Input, Toggle Group, Skeleton), the shell, and Home. Follow-up issues cover the
remaining screens, the menus and dialogs, and the slider.

## Consequences

- The README screenshots show drawn stand-in covers: the end-to-end fakes serve an SVG cover for
  each fixture's artwork URL, so screenshots look as the app does with real artwork.
- `components.json` and a `paths` entry in the root `tsconfig.json` exist only for the shadcn CLI.
  No project compiles with that entry, so code still uses relative imports, and a component the
  CLI adds needs its imports made relative.
- The theme schema gains `artwork-wash`. Imported themes without it take the default.
- Until the follow-ups land, the screens they cover keep their old styling inside the new shell.

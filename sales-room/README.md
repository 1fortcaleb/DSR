# Meridian Sales Room

A standalone Vite + React + TypeScript port of the "Sales Room" page originally
built in Claude Design (exported as a self-contained HTML bundle with a
sandboxed runtime). This project extracts that bundle's markup, styles, and
copy into a plain React app with no sandbox dependency.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Structure

- `src/App.tsx` — top-level state: current view (business case / documents /
  video answers) and audience (rep vs. buyer).
- `src/components/` — `Sidebar`, `CaseView`, `FilesView`, `VideosView`,
  plus a small shared icon set and an `ImagePlaceholder` component.
- `src/data/salesRoom.ts` — mock content for documents and videos (static,
  in place of the original's live/editable data).
- `src/assets/` — the 1Fort logo and the "HN Fort" custom typeface, extracted
  from the original bundle as real font files. IBM Plex Mono is pulled in via
  the `@fontsource/ibm-plex-mono` npm package instead of the original's
  self-hosted subset files.
- Tailwind v4 (via `@tailwindcss/vite`) with a small set of design tokens
  (`--color-navy`, `--color-blue`, etc.) defined in `src/index.css` to match
  the original's color palette.

## Notes on fidelity

- The original used inline pixel-precise styles (not Tailwind); this port
  translates those into Tailwind utility classes, including arbitrary values
  where an exact pixel/color match mattered.
- The original's `<image-slot>` elements (user-fillable image placeholders
  from the Claude Design sandbox) are replaced with a static
  `ImagePlaceholder` component — there's no host to fill them outside that
  sandbox, so they render as plain gray placeholders.
- All interactive state (view/audience toggles, active document, curated
  video list) is re-implemented with plain React `useState`, replacing the
  original's custom `DCLogic` component class.

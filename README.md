# 1Fort deal rooms

A deal room / partner room: a one-page business case a rep writes, sends to a
prospect, and gets an answer back on.

The app runs in two modes. Without credentials it runs entirely in the browser
against localStorage — a working demo you can clone and `npm run dev`. With a
Supabase project configured it becomes multi-user, and share links work.

```
sales-room/         the app (Vite + React + TypeScript + Tailwind v4)
supabase/schema.sql tables, row level security, and the anonymous share path
```

## Run it locally

```bash
cd sales-room
npm install
npm run dev
```

No backend, no account. Rooms live in your browser. The **Send** section will
tell you it's off, because there is nothing for a recipient to open.

## Go live

**1. Create a Supabase project**, then in the SQL editor paste and run
`supabase/schema.sql`. It is safe to re-run.

**2. Point the app at it.** In Supabase, Settings → API gives you the project
URL and the `anon` key.

```bash
cd sales-room
cp .env.example .env.local     # then fill in both values
```

Only the **anon** key belongs here. It ships to the browser; row level security
is what protects the data. The `service_role` key must never appear in this
project.

**3. Restart `npm run dev`.** You'll get a sign-in screen. Create an account.
If Supabase has email confirmation on (the default), confirm before signing in,
or turn it off under Authentication → Providers while you're testing.

**4. Send one.** In a room: **Manage content → Send**. Set the recipient, pick
an expiry, and **Create link & copy**. The room has to be **live** — the Send
pane offers a Publish button when it isn't, because otherwise the recipient
just sees "this link isn't active".

The link is `https://your-app/r/<token>`. Opening it needs no account.

## Deploying

Any static host works — the app is a SPA and Supabase is the only backend.

**The one thing you must configure: rewrite unknown paths to `index.html`**, or
`/r/<token>` 404s. On Vercel, `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`.
On Netlify, `/* /index.html 200`. On nginx, `try_files $uri /index.html`.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time environment
variables — Vite inlines them at build, so changing them means rebuilding.

## How access works

Reps sign in with email and password. Row level security scopes every table to
`owner_id = auth.uid()`, so a rep can only ever read and write their own rooms.

Recipients get an unguessable 24-byte token and no account. Anonymous callers
have **no direct table access at all** — `revoke all ... from anon`. Their only
way in is four `security definer` functions, each of which requires a live
token. This is what stops a share link from being usable to enumerate other
rooms.

`get_shared_room` is the boundary for what a recipient can see. It returns the
content, documents, videos and their own replies — and deliberately not the
room's internal name, the sources the draft was generated from, the unpublished
video library, or anyone else's flags. That filtering happens in Postgres, not
in the client, so it holds regardless of what the browser asks for.

Links carry an optional expiry and can be revoked; revoking keeps the row so
the open history survives. Every open bumps a counter, which is where the rep's
"last viewed" now comes from instead of a hardcoded date.

## Not wired yet

- **Sending the email.** The app creates and copies the link; putting it in an
  inbox is still you. A provider (Resend, Postmark) slots in behind the Send
  section.
- **Claude generation**, for both the 1-pager and assets. Both sit behind
  providers that report themselves disconnected. They stay that way until
  there's a server route holding the API key — calling Claude from the browser
  would ship the key to every recipient.
- **Attio.** `RoomAccount` is shaped as the object Attio would populate.
- **Document downloads for recipients.** Poster frames reach them as data URI
  thumbnails stored on the asset row, so the page renders. Downloading the
  underlying file needs a signed URL, which needs an edge function.
- **Asset upload to Storage.** The `assets` table and bucket exist with
  policies; the client still writes asset bytes to IndexedDB locally.

## Commands

```bash
npm run dev      # dev server
npm run build    # typecheck + production build
npm run lint     # oxlint
```

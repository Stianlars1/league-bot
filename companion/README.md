# Counter Companion (Phase 0 — developer mode)

The local process that gives the Counter webapp realtime data. See
[`docs/companion-app.md`](../docs/companion-app.md) for the architecture and
the open question on how this gets distributed to non-technical users.

> **Customers do not run this.** This directory is the developer/contributor
> mode. The customer distribution method (browser extension, native app, or
> hybrid) is being evaluated — see `docs/companion-app.md`. Until that's
> picked and built, `/companion` shows the developer pairing flow behind a
> disclosure block.

## What it does

1. Polls `https://127.0.0.1:2999/liveclientdata/allgamedata` while a League of
   Legends match is in progress on this machine.
2. Pushes each frame (when the game-clock tick advances) to the Counter cloud
   relay over HTTPS, authenticated by your per-user companion token.
3. The Counter web/mobile view subscribes via SSE and renders the live state
   the moment it lands.

This is the only zero-middleman path to realtime data on Riot's public API
surface. See [`../docs/research-realtime.md`](../docs/research-realtime.md).

## Run it (Phase 0 dev mode)

```bash
# In the repo root:
pnpm dev                   # start the Counter webapp on :3000
pnpm companion:dev         # in another terminal, start the companion poller
```

On first run the companion will ask for a pairing code. To get one:

1. Open <http://localhost:3000/companion>
2. Expand "I'm a developer or contributor — show the manual pairing flow"
3. Click "Generate pairing code →"
4. Paste the 6-character code into the companion prompt

The token is saved to `~/.counter/companion.json` (mode 0600) and reused on
subsequent runs.

## Status output

The companion only logs when status changes — quiet idle, loud on transitions.

```
  Counter Companion → http://localhost:3000
  Polling https://127.0.0.1:2999 every 1000ms
  Press Ctrl+C to stop.

  [21:14:08] no game (12 misses)
  [21:18:02] pushed @ 0:04 (10 players)
  [21:18:05] idle @ 0:04
  [21:18:06] pushed @ 0:05 (10 players)
```

## Phase 1 — open question

The customer distribution method is undecided. See
[`../docs/companion-app.md`](../docs/companion-app.md#phase-1--distribution-direction-recorded-2026-05-03)
for the option list and trade-offs.

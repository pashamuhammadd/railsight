# RailSight — Colosseum "Media and code" submission package

Everything below is ready to copy-paste into the form, plus scripts for the two
videos you still need to record. Based on ROADMAP.md, README.md, and the repo
layout as of 2026-09-18.

## Fields you can fill in right now

**Project logo / graphic** — already uploaded (Primary (dark)@2x.png). No action needed.

**GitHub link** — already filled: `https://github.com/pashamuhammadd/railsight`
⚠️ ROADMAP.md still has "Double-check repo is public and README is current" as an
open item — confirm that before you submit. If you'd rather keep it private, share
it with `hackathon@colosseum.com` per the form's own instructions.

**"Please share any important context about your repo"** (500 char limit) — paste
this (429 chars):

> Monorepo: apps/web is the Next.js dashboard + API routes, deployed live on Vercel. packages/ingestion is a standalone Solana data worker (Helius → Supabase) that can't run on Vercel (no long-lived processes on serverless) — it's run locally/continuously instead. The live dashboard reads real, already-ingested Supabase data; it does not ingest on demand. All code in this repo was written during the hackathon build window.

**Live product link** — `https://railsight.vercel.app`

**Access instructions** — paste this:

> No login or wallet connection required — the dashboard is fully public. Visit https://railsight.vercel.app, try Overview, Leaderboard, and click into any merchant for the verified-volume score and flag detail.

**X profile** — optional field. You mentioned you have a personal account but no
RailSight-specific one yet. Your call: leave it blank, or paste your personal
handle if you're comfortable being the public point of contact. I didn't fill
this in since it's your call which handle (or none) to use.

---

## What's still missing (both required fields)

Neither the demo video nor the pitch video exist yet — I can't record these for
you, but here are full scripts so you can screen-record + narrate in one or two
takes. Loom is the fastest option (free, records + uploads + gives you a shareable
link in one step).

### Demo video (≤3 min) — must show the *live product*, not slides or code

The form is explicit: no slide deck, no code walkthrough. Screen-record
`https://railsight.vercel.app` in your browser and narrate over it.

**0:00–0:20 — The problem**
> "x402 is Solana's machine-payment protocol — apps and AI agents pay each other
> in USDC per request. But right now there's no way to see who's actually
> earning from x402 traffic on Solana, how it splits across facilitators, or
> whether that volume is real. That's what RailSight does."

**0:20–1:00 — Dashboard overview** (navigate to `/`)
- Point at the KPI row: total volume, transaction count, merchant count, flagged count
- Point at the daily volume chart and the facilitator share breakdown
- "This is all live — reading straight from the data we've ingested off Solana mainnet, no mock data."

**1:00–1:40 — Leaderboard** (navigate to `/leaderboard`)
- Show merchants ranked by all-time x402 revenue
- Point out a flagged vs. clean status badge
- "Every merchant taking x402 payments on Solana gets ranked here by real revenue."

**1:40–2:20 — Merchant detail** (click into a merchant — ideally a flagged one if you have one in the data)
- Show the 0–100 verified-volume score meter
- Read out the plain-English flag explanation if one is showing (e.g. "14 payments of exactly $0.05 from the same wallet within 12 minutes")
- "This is the trust layer — a score and a human-readable reason, not a black box."

**2:20–2:50 — The verified-volume API**
- Open `https://railsight.vercel.app/api/verified-volume/<a-merchant-id>` in a new tab (or show a quick curl in a terminal) to show it returns real JSON
- "That same score is available as a public API — any wallet, marketplace, or agent can check a merchant's verified-volume before trusting their x402 traffic."

**2:50–3:00 — Close**
> "That's RailSight — analytics and trust for x402 on Solana. Live now at railsight.vercel.app."

Tip: if your seeded data is thin, seed 1–2 more merchant wallets first (ROADMAP.md
Week 1 note) so the leaderboard/detail views don't look empty on camera.

### Pitch video (≤2 min) — separate from the demo, talking-head or voiceover-over-slide is fine

The form wants: who you are, what you're building, why you're the person to build it.

**0:00–0:15 — Intro**
> "Hi, I'm Pasha — solo builder of RailSight, submitting to the Solana track."

**0:15–0:45 — What it is**
> "RailSight is a Solana-native analytics and trust layer for x402 — Solana's
> emerging machine-payment protocol. It tracks real settled USDC payments,
> ranks merchants by revenue, and flags non-organic volume with two explainable
> heuristics — no ML, no black box."

**0:45–1:20 — Why you** *(fill in your own words — this is the one section I
can't write for you without guessing; a line or two on your Solana/Web3
background and why you're building solo works well here)*

**1:20–1:45 — What's next**
> "Beyond the hackathon, I want to turn the verified-volume API into a
> real x402-metered endpoint — RailSight dogfooding the protocol it tracks —
> and use this as the base for a Solana Foundation / Superteam Earn grant
> application."

**1:45–2:00 — Close**
> "That's RailSight. Thanks for watching."

---

## Also still open (not on this form, but on ROADMAP.md's "Final days" list)

- Screenshots for the README (`docs/screenshots/overview.png`, `leaderboard.png`) — not yet committed
- Confirm the GitHub repo is public before submitting

## Checkbox on the form

"Show demo video on public project page" — worth checking once you have a video
you're happy with; it's the strongest proof-of-work judges see without clicking through.

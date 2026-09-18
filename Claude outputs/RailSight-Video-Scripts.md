# RailSight — Full video scripts (demo + pitch)

Word-for-word narration, timed for a natural speaking pace (~140 words/min).
Read these more or less as written, but don't sound robotic — pause where
marked, and let the screen actions breathe.

Recording: OBS Studio (free, records your screen + mic) or Loom both work
fine for YouTube uploads. Record in 1080p if you can, keep your browser
window maximized and zoomed to ~110% so text is readable on a small
YouTube thumbnail.

---

## 1. Demo video — target 3:00, must show the live product only

No slides, no code editor, no README. Screen-record `https://railsight.vercel.app`
in a browser tab and narrate over it live. Have a merchant with an active flag
ready to click into before you start recording — check the leaderboard first so
you're not searching for one on camera.

### [0:00–0:25] Hook — start on the dashboard homepage, don't scroll yet

> "x402 is a new payment protocol on Solana — it lets apps and AI agents pay
> each other in USDC, per request, with no subscriptions and no manual
> invoicing. It's early, and it's growing. But right now there's no good way
> to answer a simple question: who is actually earning real money from x402
> traffic on Solana, and is that volume even real? That's the gap RailSight
> fills. This is it, live."

### [0:25–1:05] Dashboard overview — slowly scroll/point across the KPI row, chart, facilitator breakdown

> "This is the RailSight overview page, reading live data straight out of our
> database — nothing here is mocked. Up top: total x402 volume, total
> transaction count, how many merchants we're tracking, and how many of them
> are currently flagged. Below that, a daily volume chart built from actual
> settled transactions pulled off Solana mainnet. And here's the breakdown by
> facilitator — the services that settle x402 payments — so you can see at a
> glance which ones are actually carrying volume on Solana right now."

### [1:05–1:45] Leaderboard — navigate to /leaderboard, scroll the table

> "This is the leaderboard — every merchant we track, ranked by their
> all-time x402 revenue. Each row shows their dominant facilitator and a
> status badge: clean, or flagged. This is the part raw block explorers just
> can't give you — an actual ranked view of who's winning in the x402
> economy on Solana, not just a wall of individual transactions."

### [1:45–2:25] Merchant detail — click into a merchant, ideally a flagged one

> "Clicking into any merchant gets you the detail view. This score here, 0 to
> 100, is what we call the verified-volume score — it's a simple, explainable
> formula, not a black-box model. And if a merchant is flagged, we tell you
> exactly why, in plain English — [read whatever flag reason is actually
> showing, e.g. 'this merchant has 14 payments of exactly the same amount
> from one wallet inside a 12-minute window'] — instead of just slapping a
> red badge on it and leaving you to guess."

### [2:25–2:50] Verified-volume API — open the API endpoint in a new tab, or show a quick curl

> "That same score is also exposed as a public API — `/api/verified-volume`
> plus a merchant ID. Anyone can call it: a marketplace deciding whether to
> feature a merchant, a wallet warning a user before they pay, or another
> agent deciding who to trust — without having to build any of this
> themselves."

### [2:50–3:00] Close — back on the homepage

> "That's RailSight — analytics and a trust layer for x402 on Solana, live
> right now at railsight.vercel.app. Thanks for watching."

**Total spoken content: ~400 words**, which comfortably fills 3:00 at a
natural, slightly deliberate pace — you don't need to rush. If you land
under 3:00 that's fine; just don't go over.

---

## 2. Pitch video — target under 2:00, separate video, talking-head or voiceover is fine

This one is about you, not the product screen. Webcam, or a static slide with
your name/RailSight on it while you talk, both work.

### [0:00–0:15] Intro

> "Hi, I'm Pasha. I'm the solo builder behind RailSight, submitting to
> Colosseum's Crypto World's Fair, Solana track."

### [0:15–0:45] What it is

> "RailSight is a Solana-native analytics and trust layer for x402 — the
> emerging machine-payment protocol where apps and agents pay each other in
> USDC. It tracks real, settled payments on Solana mainnet, ranks merchants
> by actual revenue, and flags non-organic volume using two transparent,
> explainable heuristics — no black-box machine learning, just logic anyone
> can audit."

### [0:45–1:25] Why me — adapt this to your own words, this is a starting point

> "I've spent time building in the Solana ecosystem — right now I'm also
> working on Lifetopia World, a life-simulation game on Solana, alongside a
> couple of early-stage Web3 projects. x402 is brand new, and building
> RailSight solo meant making real infrastructure decisions fast — ingestion
> off Helius, a Postgres schema that could handle flagging logic, a
> dashboard that reads live — all shipped and deployed, not just designed."

*(Feel free to swap this section for whatever feels most true to you — the
form specifically says they care about how you think and communicate, not a
polished résumé read.)*

### [1:25–1:50] What's next

> "Past the hackathon, I want to turn the verified-volume API into a real
> x402-metered endpoint — RailSight dogfooding the exact protocol it tracks —
> and use this build as the basis for a Solana Foundation or Superteam Earn
> grant application."

### [1:50–2:00] Close

> "That's RailSight. Thanks for watching — I'm looking forward to your
> feedback."

**Total spoken content: ~280 words**, fits comfortably under 2:00.

---

## Using CapCut's built-in AI voice instead of speaking yourself

CapCut (free, Windows desktop app from capcut.com) has a Text-to-Speech
feature built right into the timeline, with natural-sounding English voices —
no separate tool needed, no login required for the basic voices.

**Step-by-step:**

1. **Record silent screen footage first.** Follow the script's bracketed
   screen-action cues (e.g. "navigate to /leaderboard", "click into a
   merchant") but don't talk — just perform the clicks/scrolls at a
   comfortable pace. Use Windows' built-in recorder (`Win + G` opens Xbox
   Game Bar → record), OBS Studio, or CapCut's own screen recorder
   (Import → Record screen). For the pitch video you don't need screen
   footage at all — a static background, your photo, or a simple webcam
   clip of you sitting quietly works as the visual while the AI voice talks.

2. **Import the footage into CapCut** and drop it on the timeline.

3. **Add the narration per segment**, one at a time — this keeps each voice
   clip short enough to stay well under CapCut's per-generation text limit
   and makes it easy to match audio to the matching bit of screen action:
   - Click **Text → Add Text**, paste in one script segment (e.g. the
     "0:25–1:05 Dashboard overview" block above, without the timestamp or
     the bracketed stage directions — just the quoted narration).
   - With that text selected, click **Text-to-Speech** in the right panel.
   - Pick a voice — for this kind of demo, a clear **"English - US" /
     "News"/"Narrator"-style voice** (not a character/comedic voice) reads
     as the most professional. Preview a couple before committing.
   - Click **Generate** — CapCut turns it into an audio clip on its own
     track, synced to start where that text block starts.

4. **Match video to audio length.** AI narration for a paragraph usually
   runs a bit longer or shorter than your raw screen footage for that
   section. Drag the edge of the video clip to trim it, or duplicate/hold
   a frame to stretch it, so the visual keeps going until the audio for
   that segment finishes. Do this segment by segment down the timeline.

5. **Delete the on-screen text layers** once you've generated audio from
   them (keep the audio clips) — unless you want them to double as
   captions, which is a nice accessibility touch and totally optional.

6. **Repeat for every segment** in both scripts, in order, then check total
   runtime: demo video should land at/under 3:00, pitch video under 2:00.

7. **Export** (top-right Export button, 1080p is plenty) and upload both to
   YouTube — Unlisted is fine, the form just needs a working link.

If a generated line sounds off (wrong emphasis, mispronounced word like
"x402" or "Helius"), just tweak the wording slightly and regenerate — TTS
engines are picky about unusual product/technical names.

## Quick recording checklist

- [ ] Seed/verify at least one flagged merchant exists before recording the demo (empty flag states look weak on camera)
- [ ] Record demo video screen capture of `railsight.vercel.app` only — no code, no slides
- [ ] Record pitch video (webcam or voiceover) separately
- [ ] Upload both to YouTube (unlisted is fine — the form just needs a working link)
- [ ] Paste the two YouTube links into the "Demo video" and "Pitch video" fields
- [ ] Check "Show demo video on the public project page"

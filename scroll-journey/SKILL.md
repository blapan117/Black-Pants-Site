---
name: scroll-journey
description: >
  Generate a complete cinematic scroll-driven website from a single topic, in one shot.
  Produces a smooth scroll-scrubbed video hero (continuous fly-through sliced into frames
  on a canvas) with seamless multi-scene transitions and on-scroll text reveals. Give it
  any subject ("a flower", "inside a train", "a giant robot", "a luxury watch") and it
  invents the journey, generates the imagery and video, and assembles the site autonomously.
  Triggers: scroll journey, scroll site, scroll animation website, cinematic scroll, scrollytelling,
  "make a website about X that you scroll through", /scroll-journey.
allowed-tools: Bash, Read, Write
---

# scroll-journey

## Goal
Turn one topic into a finished, buttery-smooth scroll-scrubbed video hero site, automatically. The smoothness comes from one continuous camera flight (a real video) sliced into ~190 frames per clip and drawn frame-by-frame on a canvas tied to scroll — never from crossfading a few stills (that looks jumpy).

## The journey shape (always the same skeleton, any topic)
Two continuous video clips, chained seamlessly:
- **Clip 1** — start outside/wide, move IN, and **arrive at the hero subject by the clip's end** (the "core" moment).
- **Clip 2** — begins from clip 1's exact last frame and continues in ONE move to a **finale/reveal** (push through, crane up, pull back).

Three text beats ride on top, auto-anchored by the template: a frosted **card** on the approach, a **mid headline** at the hero subject, a **closing line** at the finale.

## Steps

### 1. Compose the journey spec (this is your creative job)
From the user's topic, write `spec.json`. Rules that keep it smooth and seamless:
- Every camera move is **ONE continuous shot, no cuts**. Say so in the prompts ("continuous single shot, no cuts, steady motion").
- Keep a **strong central vanishing point** in the start image and both clips, with empty space in the centre for text.
- `clip1_prompt` must **end arriving at the hero subject**. `clip2_prompt` must read as a continuation ("the camera continues from here and …") to a finale.
- Pick an `accent` hex colour that fits the mood (it drives all the glow/UI).

`spec.json` schema:
```json
{
  "slug": "blooming-flower",
  "title": "Bloom",
  "accent": "#ff7eb6",
  "nav": ["BLOOM", "PETALS", "NECTAR", "CONTACT"],
  "image_prompt": "Photorealistic cinematic wide shot, 16:9, ... strong central vanishing point, empty centre, no text.",
  "clip1_prompt": "Continuous single shot, no cuts, steady forward motion: <approach> ... arriving at <hero subject> by the end.",
  "clip2_prompt": "Continuous single shot, no cuts, continuing from here: <move> revealing <finale>. Steady, no shake.",
  "eyebrow": "Step Inside",
  "card": "Short 2-3 sentence promise with a few <em>italic</em> words.",
  "headline1": ["INSIDE THE", "bloom"],
  "headline2": ["WELCOME TO", "the garden"],
  "marquee": ["Name1","Name2","Name3","Name4","Name5","Name6"]
}
```
Write it to the output dir: `.tmp/scroll-journey/<slug>/spec.json`.

### 2. Build it (one command, ~2-4 min, ~$2-4 on the Gemini key)
```bash
source .env 2>/dev/null; export GEMINI_API_KEY
python3 .claude/skills/scroll-journey/scripts/build.py \
  --spec .tmp/scroll-journey/<slug>/spec.json \
  --out  .tmp/scroll-journey/<slug>
```
This generates the start image, both Veo clips (clip 2 chained from clip 1's last frame), slices everything into `images/frames/f_###.jpg`, and writes `index.html`.

### 3. Verify it is smooth (required)
Open `file://.../index.html` in Chrome (chrome-devtools MCP). Then:
- Step `scrollY` in small increments and read `frame = round(ScrollTrigger.getAll()[0].progress * (FRAME_COUNT-1))`. Confirm it climbs ~continuously (≈1 frame per ~19px) with **no skip**, including across the clip seam.
- Screenshot the start, the hero subject + mid headline, and the finale + closing line.
- Confirm `progress` reaches `1.000` at max scroll, and reveals land. Allow ~3-4s after load for frames to preload (a loader veil shows until ready).
- Note: `scrub: 0.6` adds slight easing, so wait ~1s after a scroll jump before screenshotting or you'll catch it mid-catch-up (not a bug).

If a reveal lands at the wrong moment, nudge the fraction in `index.html`'s timeline (`0.07` card in, `0.42` headline1, `0.84` closing). The frame mapping itself never needs tuning.

### 4. Report
Give the user the `index.html` path and a one-line summary of the journey.

## Output
`.tmp/scroll-journey/<slug>/` — `index.html`, `spec.json`, `flythrough1.mp4`, `flythrough2.mp4`, `images/start.png`, `images/frames/f_*.jpg`. (`.tmp/` is gitignored and clearable.)

## Models / cost
- Image: `gemini-3-pro-image` (Nano Banana Pro). Video: `veo-3.1-fast-generate-preview`.
- ~1 image + 2 Veo-fast clips per run ≈ $2-4. Tell the user before a fresh generation.

## Environment
- `GEMINI_API_KEY` in `.env` (project root) or exported. `ffmpeg` on PATH.

## Why it works (the one idea)
Scroll position becomes a number 0→1; that number picks which video frame to draw on the canvas. Enough frames (≈190/clip) means no gaps to jump across, so it reads as one continuous flight. Two clips chained at a shared frame extend the journey with an invisible seam. See the reference build in `.tmp/urban-jungle/` (the robot → core → brain site this skill was distilled from).

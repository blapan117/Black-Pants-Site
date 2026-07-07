#!/usr/bin/env python3
"""
scroll-journey build script.

Given a journey spec (JSON), autonomously produces a self-contained scroll-scrubbed
video hero site:
  1. Gemini (gemini-3-pro-image) -> the start image (16:9)
  2. Veo (veo-3.1-fast)          -> clip 1, a continuous flight that ARRIVES at the hero subject
  3. Veo, chained from clip 1's LAST frame (seam trick) -> clip 2, a continuous finale/reveal
  4. ffmpeg                       -> slice both clips into one continuous frame sequence
  5. template.html                -> index.html (canvas frame-scrubbing, GSAP ScrollTrigger)

Usage:
  python3 build.py --spec spec.json --out .tmp/scroll-journey/<slug>

Requires GEMINI_API_KEY (read from env or a .env found upward from cwd) and ffmpeg.
"""
import os, sys, json, time, base64, argparse, subprocess, urllib.request, urllib.error

try:
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv(usecwd=True))
except Exception:
    pass

KEY = os.environ.get("GEMINI_API_KEY")
if not KEY:
    sys.exit("GEMINI_API_KEY not set. Add it to .env or export it.")

BASE = "https://generativelanguage.googleapis.com/v1beta"
IMAGE_MODEL = "gemini-3-pro-image"
VIDEO_MODEL = "veo-3.1-fast-generate-preview"
HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "template.html")


def _post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=180))


def _get(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url), timeout=180))


def gen_image(prompt, out_path):
    print("[image] generating start frame ...", flush=True)
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "16:9"}},
    }
    resp = _post(f"{BASE}/models/{IMAGE_MODEL}:generateContent?key={KEY}", body)
    for part in resp.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        data = part.get("inlineData") or part.get("inline_data")
        if data and data.get("data"):
            open(out_path, "wb").write(base64.b64decode(data["data"]))
            print(f"[image] saved {out_path}", flush=True)
            return
    sys.exit(f"[image] no image in response: {json.dumps(resp)[:400]}")


def veo(prompt, first_frame_path, out_path, label):
    print(f"[video] {label}: submitting ...", flush=True)
    mime = "image/png" if first_frame_path.lower().endswith(".png") else "image/jpeg"
    img_b64 = base64.b64encode(open(first_frame_path, "rb").read()).decode()
    start = _post(
        f"{BASE}/models/{VIDEO_MODEL}:predictLongRunning?key={KEY}",
        {"instances": [{"prompt": prompt, "image": {"bytesBase64Encoded": img_b64, "mimeType": mime}}],
         "parameters": {"aspectRatio": "16:9"}},
    )
    op = start["name"]
    for i in range(90):
        time.sleep(10)
        st = _get(f"{BASE}/{op}?key={KEY}")
        if st.get("done"):
            samples = (st.get("response", {}).get("generateVideoResponse", {}) or {}).get("generatedSamples") or []
            for s in samples:
                vid = s.get("video", s)
                uri = vid.get("uri") or vid.get("videoUri")
                data = vid.get("bytesBase64Encoded") or vid.get("data")
                if data:
                    open(out_path, "wb").write(base64.b64decode(data))
                    print(f"[video] {label}: saved {out_path}", flush=True); return
                if uri:
                    dl = uri if "key=" in uri else (uri + ("&" if "?" in uri else "?") + "key=" + KEY)
                    open(out_path, "wb").write(urllib.request.urlopen(urllib.request.Request(dl), timeout=300).read())
                    print(f"[video] {label}: saved {out_path}", flush=True); return
            sys.exit(f"[video] {label}: no video in response: {json.dumps(st)[:400]}")
        print(f"[video] {label}: ...{(i + 1) * 10}s", flush=True)
    sys.exit(f"[video] {label}: timed out")


def extract(video, frames_dir, start_number):
    subprocess.run(
        ["ffmpeg", "-v", "error", "-i", video, "-start_number", str(start_number),
         "-q:v", "3", os.path.join(frames_dir, "f_%03d.jpg"), "-y"],
        check=True,
    )
    return len([f for f in os.listdir(frames_dir) if f.endswith(".jpg")])


def write_html(spec, frame_count, out_dir):
    tpl = open(TEMPLATE).read()
    nav = "".join(f'<a href="#">{w}</a>' for w in spec.get("nav", ["HOME", "ABOUT", "WORK", "CONTACT"]))
    marquee = "".join(f"<span>{n}</span>" for n in spec["marquee"])
    repl = {
        "%%TITLE%%": spec.get("title", spec["slug"]),
        "%%ACCENT%%": spec.get("accent", "#5fefef"),
        "%%FRAME_COUNT%%": str(frame_count),
        "%%NAV%%": nav,
        "%%EYEBROW%%": spec["eyebrow"],
        "%%CARD_HTML%%": spec["card"],
        "%%H1_LINE1%%": spec["headline1"][0],
        "%%H1_LINE2%%": spec["headline1"][1],
        "%%H2_LINE1%%": spec["headline2"][0],
        "%%H2_LINE2%%": spec["headline2"][1],
        "%%MARQUEE%%": marquee,
    }
    for k, v in repl.items():
        tpl = tpl.replace(k, v)   # .replace (NOT .format) -- CSS/JS is full of { }
    out = os.path.join(out_dir, "index.html")
    open(out, "w").write(tpl)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    spec = json.load(open(args.spec))
    out_dir = os.path.abspath(args.out)
    frames_dir = os.path.join(out_dir, "images", "frames")
    os.makedirs(frames_dir, exist_ok=True)

    # 1. start image
    start_img = os.path.join(out_dir, "images", "start.png")
    gen_image(spec["image_prompt"], start_img)

    # 2. clip 1 (arrive at the hero subject) -> frames
    clip1 = os.path.join(out_dir, "flythrough1.mp4")
    veo(spec["clip1_prompt"], start_img, clip1, "clip1")
    k = extract(clip1, frames_dir, 1)
    print(f"[frames] clip1 -> {k} frames", flush=True)

    # 3. clip 2 chained from clip1's LAST frame (seam) -> appended frames
    seam = os.path.join(frames_dir, f"f_{k:03d}.jpg")
    clip2 = os.path.join(out_dir, "flythrough2.mp4")
    veo(spec["clip2_prompt"], seam, clip2, "clip2")
    n = extract(clip2, frames_dir, k + 1)
    print(f"[frames] total -> {n} frames", flush=True)

    # 4. assemble index.html
    out = write_html(spec, n, out_dir)

    print("\n=== DONE ===")
    print(f"site:   {out}")
    print(f"frames: {n}   (clip1={k}, clip2={n - k})")
    print(f"cost:   ~1 image + 2 Veo-fast clips (~$2-4 on the Gemini key)")
    print(f"open:   file://{out}")


if __name__ == "__main__":
    main()

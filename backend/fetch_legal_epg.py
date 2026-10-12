import os, re, json, glob, zipfile, requests
import xml.etree.ElementTree as ET
import time
import random
from datetime import timedelta
from playwright.sync_api import sync_playwright
from datetime import datetime, timezone
from bs4 import BeautifulSoup  # NEW: for HTML/RSS parsing

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEGAL_DIR = os.path.join(BASE_DIR, "legal")
SOURCES_DIR = os.path.join(BASE_DIR, "epg_sources")
FRONTEND_EPG_DIR = os.path.normpath(os.path.join(BASE_DIR, "../frontend/public/epg"))
LOG_DIR = os.path.join(BASE_DIR, "logs")
BACKUP_DIR = os.path.join(BASE_DIR, "backups", "epg_archive")
MERGED_XML_PATH = os.path.join(BASE_DIR, "legal_epg.xml")
CHANNELS_JSON = os.path.join(LEGAL_DIR, "channels_compliance.json")
LOG_FILE = os.path.join(LOG_DIR, "epg_pipeline.log")
CACHE_DIR = os.path.join(BASE_DIR, "cache_epg")
CACHE_TTL_HOURS = 24  # how long to keep before refetching

SKIP_REDIS_TYPES = {"embed_only"}

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"
]


REFERERS = [
    "https://www.google.com/", "https://www.bing.com/",
    "https://news.google.com/", "https://duckduckgo.com/",
    "https://www.youtube.com/"
]

def fetch_with_browser(url: str) -> str:
    """Launches a headless Chromium browser to fully render JS pages."""
    log(f"🌐 Using Playwright headless browser → {url}")
    html = ""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=random.choice(USER_AGENTS))
            page.goto(url, wait_until="networkidle", timeout=60000)
            html = page.content()
            browser.close()
    except Exception as e:
        log(f"❌ Browser fetch failed for {url}: {e}")
    return html

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def get_cache_path(cid: str):
    return os.path.join(CACHE_DIR, f"{cid}.html")

def is_cache_valid(cid: str):
    path = get_cache_path(cid)
    if not os.path.exists(path):
        return False
    age = datetime.now(timezone.utc) - datetime.fromtimestamp(os.path.getmtime(path), timezone.utc)
    return age < timedelta(hours=CACHE_TTL_HOURS)


def log(msg):
    os.makedirs(LOG_DIR, exist_ok=True)
    line = f"[{now_iso()}] {msg}"
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(line)


def ensure_dirs():
    for d in [LEGAL_DIR, SOURCES_DIR, FRONTEND_EPG_DIR, LOG_DIR, BACKUP_DIR, CACHE_DIR]:
        os.makedirs(d, exist_ok=True)


def safe_unlink(p):
    try:
        if os.path.exists(p):
            os.remove(p)
    except Exception as e:
        log(f"⚠️ could not remove {p}: {e}")


def clean_dirs():
    log("🧹 Cleaning old EPG data ...")
    for p in glob.glob(os.path.join(SOURCES_DIR, "*")):
        safe_unlink(p)
    for p in glob.glob(os.path.join(FRONTEND_EPG_DIR, "*.json")):
        safe_unlink(p)
    safe_unlink(MERGED_XML_PATH)
    log("✅ Cleanup complete.")


def load_channels():
    with open(CHANNELS_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_xmltv_time(t):
    if not t:
        return ""
    m = re.match(r"^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})", t)
    if m:
        y, mo, d, h, mi, s = m.groups()
        return f"{y}-{mo}-{d}T{h}:{mi}:{s}Z"
    return t


def convert_rss_to_xmltv(text, cid, name):
    """Convert RSS feed to XMLTV <programme> entries."""
    root = ET.Element("tv")
    soup = BeautifulSoup(text, "xml")
    for item in soup.find_all("item"):
        prog = ET.SubElement(root, "programme", {"channel": cid})
        title = item.title.text if item.title else "No Title"
        desc = item.description.text if item.description else ""
        ET.SubElement(prog, "title").text = title
        ET.SubElement(prog, "desc").text = desc
    tmp = os.path.join(SOURCES_DIR, f"{cid}.xml")
    ET.ElementTree(root).write(tmp, encoding="utf-8", xml_declaration=True)
    return tmp


def convert_json_to_xmltv(data, cid, name):
    root = ET.Element("tv")
    for i, item in enumerate(data if isinstance(data, list) else []):
        prog = ET.SubElement(root, "programme", {"channel": cid})
        title = str(item.get("title") or item.get("name") or f"Item {i+1}")
        desc = str(item.get("description") or item.get("desc") or "")
        ET.SubElement(prog, "title").text = title
        ET.SubElement(prog, "desc").text = desc
    tmp = os.path.join(SOURCES_DIR, f"{cid}.xml")
    ET.ElementTree(root).write(tmp, encoding="utf-8", xml_declaration=True)
    return tmp


def convert_html_to_xmltv(text, cid, name):
    """Robust HTML → XMLTV converter with sanitation and structured parsing."""
    import re
    from datetime import datetime

    # --- 🧹 Clean up HTML before parsing ---
    # remove byte-order marks or weird control chars
    text = text.encode("utf-8", "ignore").decode("utf-8", "ignore")
    text = re.sub(r"^[^\<]*", "", text, count=1)  # cut anything before first <

    soup = BeautifulSoup(text, "html.parser")

    # remove non-content tags
    for t in soup(["script", "style", "noscript", "iframe", "svg"]):
        t.decompose()

    root = ET.Element("tv")

    def safe(txt):
        return re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", txt).strip()

    def add_program(title, desc="", start="", end=""):
        prog = ET.SubElement(root, "programme", {"channel": cid})
        ET.SubElement(prog, "title").text = safe(title)
        if desc:
            ET.SubElement(prog, "desc").text = safe(desc)
        if start:
            ET.SubElement(prog, "start").text = start
        if end:
            ET.SubElement(prog, "stop").text = end

    # --- Try to extract time + title pairs ---
    time_re = re.compile(r"(\d{1,2}[:h]\d{2}(?:\s?[APap][Mm])?)")
    current_time = None

    for tag in soup.find_all(["li", "p", "span", "div", "h3", "h4"]):
        txt = safe(tag.get_text(" ", strip=True))
        if not txt or len(txt) < 3:
            continue

        # detect start times like "09:30", "9h00", etc.
        m = time_re.match(txt)
        if m:
            current_time = m.group(1).replace("h", ":")
            continue

        if any(k in txt.lower() for k in ["menu", "show more", "sections"]):
            continue

        add_program(txt, start=current_time or "")
        current_time = None

    # fallback if still empty
    if not root.findall("programme"):
        titles = [safe(t.get_text(strip=True)) for t in soup.find_all("h2", limit=15)]
        for t in titles:
            if t:
                add_program(t)

    # --- write sanitized XML safely ---
    tmp = os.path.join(SOURCES_DIR, f"{cid}.xml")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write(ET.tostring(root, encoding="unicode", method="xml"))
    return tmp


def fetch_and_convert(ch):
    cid = ch.get("id")
    name = ch.get("name")
    srcs = ch.get("epg_sources") or [ch.get("epg_source")]
    typ = ch.get("source_type", "xmltv").lower()

    if ch.get("redistribution_type") in SKIP_REDIS_TYPES:
        log(f"⏭️ Skipping embed-only {name}")
        return None
    if not srcs or not any(srcs):
        log(f"⚠️ No source URLs for {name}")
        return None

    for src in srcs:
        if not src:
            continue

    cache_path = get_cache_path(cid)
    if is_cache_valid(cid):
        log(f"💾 Using cached copy for {name}")
        with open(cache_path, "r", encoding="utf-8") as f:
            text = f.read()
        return convert_html_to_xmltv(text, cid, name)

    for attempt in range(1, 3 + 1):

            headers = {
                "User-Agent": random.choice(USER_AGENTS),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": random.choice(REFERERS)
            }
            try:
                log(f"⬇️ Fetching {name} (attempt {attempt}/3) → {src}")
                r = requests.get(src, headers=headers, timeout=45)
                text = r.text
                code = r.status_code

                # Cloudflare / Akamai detection
                if code == 403 or "cf-browser-verification" in text or "Access denied" in text:
                    log(f"⚠️ {name} returned {code} or anti-bot HTML → switching to browser mode")
                    text = fetch_with_browser(src)

                if not text.strip():
                    raise ValueError("Empty response")
                # Save to cache
                try:
                        with open(cache_path, "w", encoding="utf-8") as f:
                            f.write(text)
                        log(f"📦 Cached fresh copy for {name}")
                except Exception as e:
                        log(f"⚠️ Failed to cache {name}: {e}")

                # ---- Conversion block ----
                if typ == "rss":
                    return convert_rss_to_xmltv(text, cid, name)
                elif typ == "json":
                    try:
                        data = r.json()
                        return convert_json_to_xmltv(data, cid, name)
                    except Exception:
                        return convert_html_to_xmltv(text, cid, name)
                elif typ == "html":
                    return convert_html_to_xmltv(text, cid, name)
                else:  # xmltv
                    out = os.path.join(SOURCES_DIR, f"{cid}.xml")
                    with open(out, "w", encoding="utf-8") as f:
                        f.write(text)
                    return out
                # --------------------------

            except Exception as e:
                log(f"❌ Fetch attempt failed for {name} ({attempt}/3): {e}")
                time.sleep(2 * attempt)
                continue

    log(f"❌ All sources failed for {name}")
    return None


def merge_to_single(channels, fetched):
    merged = ET.Element("tv")
    note = ET.SubElement(merged, "note")
    note.text = f"Generated {now_iso()} — mixed XMLTV/RSS/JSON sources."

    for ch in channels:
        cid = ch["id"]
        name = ch["name"]
        path = fetched.get(cid)
        if not path or not os.path.exists(path):
            continue
        try:
            tree = ET.parse(path)
        except Exception as e:
            log(f"❌ Parse failed for {name}: {e}")
            continue
        for prog in tree.findall(".//programme"):
            merged.append(prog)
    ET.indent(merged, space="  ")
    ET.ElementTree(merged).write(MERGED_XML_PATH, encoding="utf-8", xml_declaration=True)
    log(f"✅ Merged XML written → {MERGED_XML_PATH}")


def export_jsons():
    tree = ET.parse(MERGED_XML_PATH)
    root = tree.getroot()
    grouped = {}
    for p in root.findall("programme"):
        cid = p.get("channel")
        grouped.setdefault(cid, []).append(
            {
                "channel": cid,
                "title": p.findtext("title", ""),
                "description": p.findtext("desc", ""),
                "start": "",
                "end": ""
            }
        )
    for cid, items in grouped.items():
        out = os.path.join(FRONTEND_EPG_DIR, f"{cid}.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"programs": items}, f, indent=2, ensure_ascii=False)
        log(f"🟢 Wrote {len(items)} → {out}")


def archive_new_build():
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    zip_path = os.path.join(BACKUP_DIR, f"epg_{ts}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder in [SOURCES_DIR, FRONTEND_EPG_DIR]:
            for p in glob.glob(os.path.join(folder, "*")):
                zf.write(p, arcname=os.path.relpath(p, BASE_DIR))
        if os.path.exists(MERGED_XML_PATH):
            zf.write(MERGED_XML_PATH, arcname=os.path.relpath(MERGED_XML_PATH, BASE_DIR))
    log(f"🗜️ Archived build → {zip_path}")


def main():
    ensure_dirs()
    clean_dirs()
    try:
        channels = load_channels()
    except Exception as e:
        log(f"❌ Failed to load channels: {e}")
        return 1

    fetched = {}
    for ch in channels:
        path = fetch_and_convert(ch)
        if path:
            fetched[ch["id"]] = path

    merge_to_single(channels, fetched)
    export_jsons()
    archive_new_build()
        # 🔹 Summary logging for failed channels
    failed_channels = []
    for ch in channels:
        cid = ch["id"]
        if cid not in fetched or not os.path.exists(fetched[cid]):
            failed_channels.append(ch["name"])

    if failed_channels:
        log("\n🚨 FAILED CHANNELS SUMMARY 🚨")
        for name in failed_channels:
            log(f"   ❌ {name}")
        log(f"Total failed: {len(failed_channels)}")
    else:
        log("✅ All channels fetched successfully.")

    log("🎉 EPG pipeline (multi-format) completed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

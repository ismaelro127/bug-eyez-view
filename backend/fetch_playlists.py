import argparse
import json
import re
import time
from pathlib import Path

import requests

BASE_DIR = Path(__file__).resolve().parent
SOURCE_URL = "https://iptv-org.github.io/iptv/index.m3u"
M3U_OUTPUT = BASE_DIR / "personal_channels_current.m3u"
JSON_OUTPUT = BASE_DIR / "personal_channels.json"
HEADERS = {"User-Agent": "Mozilla/5.0 (BugEyezView channel refresh)"}


def get_attribute(meta, name):
    match = re.search(rf'{re.escape(name)}="([^"]*)"', meta)
    return match.group(1).strip() if match else ""


def atomic_write_text(path: Path, text: str):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(text, encoding="utf-8")
    temp.replace(path)


def atomic_write_json(path: Path, data):
    temp = path.with_suffix(path.suffix + ".tmp")
    with temp.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
    temp.replace(path)


def parse_playlist(m3u: str):
    channels = []
    pending_meta = None
    seen_urls = set()

    for raw_line in m3u.splitlines():
        line = raw_line.strip()
        if line.startswith("#EXTINF:"):
            pending_meta = line
            continue
        if not pending_meta or not line.startswith(("http://", "https://")):
            continue
        if line in seen_urls:
            pending_meta = None
            continue

        name = pending_meta.split(",", 1)[1].strip() if "," in pending_meta else ""
        channels.append({
            "name": name,
            "url": line,
            "group-title": get_attribute(pending_meta, "group-title"),
            "tvg-id": get_attribute(pending_meta, "tvg-id"),
            "tvg-logo": get_attribute(pending_meta, "tvg-logo"),
        })
        seen_urls.add(line)
        pending_meta = None
    return channels


def refresh(source_url: str = SOURCE_URL):
    print("Downloading current IPTV playlist...")
    response = requests.get(source_url, headers=HEADERS, timeout=(10, 45))
    response.raise_for_status()
    m3u = response.text
    if not m3u.lstrip().startswith("#EXTM3U"):
        raise RuntimeError("Downloaded file is not a valid M3U playlist.")

    channels = parse_playlist(m3u)
    if not channels:
        raise RuntimeError("Playlist parsed successfully but contained no HTTP(S) channels; existing catalog was preserved.")

    # Only replace the local source files after download + parsing both succeed.
    atomic_write_text(M3U_OUTPUT, m3u)
    atomic_write_json(JSON_OUTPUT, channels)

    epg_ids = [c["tvg-id"] for c in channels if c["tvg-id"]]
    with_logos = sum(bool(c["tvg-logo"]) for c in channels)
    print("\nPersonal channel refresh complete")
    print("---------------------------------")
    print(f"Parsed:          {len(channels)}")
    print(f"With tvg-id:     {len(epg_ids)}")
    print(f"Without tvg-id:  {len(channels) - len(epg_ids)}")
    print(f"Unique tvg-id:   {len(set(epg_ids))}")
    print(f"With logo:       {with_logos}")
    print(f"Refreshed at:    {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Output:          {JSON_OUTPUT}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Refresh the Bug Eyez View personal IPTV source catalog.")
    parser.add_argument("--source", default=SOURCE_URL, help="M3U source URL")
    args = parser.parse_args()
    refresh(args.source)

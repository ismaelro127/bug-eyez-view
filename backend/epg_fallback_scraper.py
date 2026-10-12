import os
import re
import csv
import json
import argparse
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

def scrape_epg(url: str, channel_id: str):
    """
    Universal fallback EPG scraper — parses text-based EPG listings
    from EPG.PW or similar HTML pages.
    """

    print(f"🌐 Fetching schedule for '{channel_id}' from {url}")
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
    except Exception as e:
        print(f"❌ Failed to fetch {url} → {e}")
        return

    html = r.text
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(separator="\n")

    # Match patterns like "05:30 DW News", "07:00 Noticias del día"
    pattern = re.compile(r"(\d{1,2}:\d{2})\s+([^\n]+)")
    matches = pattern.findall(text)

    items = []
    for time_str, title in matches:
        title = title.strip()
        if not title or "EPG" in title or len(title) < 2:
            continue
        items.append({
            "display_time": time_str,
            "title": title,
            "desc": "",
            "source": channel_id,
            "source_url": url,
            "start_utc": None,
            "end_utc": None
        })

    out_dir = os.path.join("backend", "epg", channel_id)
    os.makedirs(out_dir, exist_ok=True)

    if not items:
        print("⚠️ No entries found — saving debug snapshot.")
        debug_path = os.path.join(out_dir, f"debug_{channel_id}_raw.html")
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"🧩 Saved debug HTML → {debug_path}")
        return

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    jsonl_path = os.path.join(out_dir, f"{channel_id}_{stamp}.jsonl")
    csv_path = os.path.join(out_dir, f"{channel_id}_{stamp}.csv")

    with open(jsonl_path, "w", encoding="utf-8") as jf:
        for item in items:
            jf.write(json.dumps(item, ensure_ascii=False) + "\n")

    with open(csv_path, "w", newline="", encoding="utf-8") as cf:
        writer = csv.DictWriter(cf, fieldnames=items[0].keys())
        writer.writeheader()
        writer.writerows(items)

    print(f"✅ Extracted {len(items)} entries for '{channel_id}'")
    print(f"  JSONL: {jsonl_path}")
    print(f"  CSV  : {csv_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Universal EPG fallback scraper")
    parser.add_argument("--url", required=True, help="EPG source URL (e.g. https://epg.pw/last/171871.html?lang=en)")
    parser.add_argument("--id", required=True, help="Channel ID (used for folder naming)")
    args = parser.parse_args()

    scrape_epg(args.url, args.id)

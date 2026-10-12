import os
import json
import re
import subprocess
import zipfile
from datetime import datetime

CONFIG_PATH = "legal/channels_compliance.json"
SCRAPER_PATH = "epg_fallback_scraper.py"
ARCHIVE_DIR = os.path.join("backend", "backups", "epg_archive")

# Map specific channels to their custom deep scrapers
CUSTOM_SCRAPERS = {
    "cgtn_en": "cgtn_deep_scraper.py",
    "cgtn_es": "cgtn_deep_scraper.py",
    "cgtn_fr": "cgtn_fr_scraper.py",
    "france24_en": "france24_deep_scraper.py",
    "france24_fr": "france24_fr_scraper.py",
    "france24_es": "france24_deep_scraper.py",
    "dw_en": "dw_en_scraper.py",
    "dw_es": "dw_es_scraper.py",
    "arirang_tv": "arirang_tv_auto.py"

}

def run_all():
    print("🚀 Starting unified EPG fallback batch...")
    os.makedirs(ARCHIVE_DIR, exist_ok=True)

    if not os.path.exists(CONFIG_PATH):
        print(f"❌ Missing config file: {CONFIG_PATH}")
        return

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    channels = data if isinstance(data, list) else data.get("channels", [])
    print(f"🧩 Loaded {len(channels)} channels from {CONFIG_PATH}")
    start_time = datetime.now()

    for ch in channels:
        cid = ch.get("id") or ch.get("channel_id")
        url = ch.get("url") or ch.get("source_url") or ch.get("epg_source")
        if not cid or not url:
            print(f"⚠️ Skipping incomplete entry: {ch}")
            continue

        # Pick appropriate scraper
        scraper = CUSTOM_SCRAPERS.get(cid, SCRAPER_PATH)

        print(f"\n📡 Running scraper for {cid} → {scraper}")
        start_ch = datetime.now()
        status = "⚠️ Unknown"
        try:
            if scraper == SCRAPER_PATH:
                subprocess.run(["python", SCRAPER_PATH, "--url", url, "--id", cid], check=True)
            else:
                subprocess.run(["python", scraper], check=True)
            status = "✅ Completed"
        except subprocess.CalledProcessError:
            status = "❌ Script error"
        except Exception as e:
            status = f"❌ {e}"
        end_ch = datetime.now()
        elapsed = (end_ch - start_ch).total_seconds()
        results.append((cid, status, elapsed, scraper))

    # 🗜️ Archive results
    # Ensure these exist even if defined earlier
    start_all = start_all if 'start_all' in locals() else datetime.now()
    results = results if 'results' in locals() else []

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_path = os.path.join(ARCHIVE_DIR, f"epg_{timestamp}.zip")
    print("\n🗜️ Archiving all .jsonl/.csv results ...")

    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk("backend/epg"):
            for f in files:
                if f.endswith((".jsonl", ".csv")):
                    path = os.path.join(root, f)
                    zipf.write(path, os.path.relpath(path, "backend"))

    end_all = datetime.now()
    total_time = (end_all - start_all).total_seconds()

    # 📊 Summary table
    print("\n📊 === SUMMARY REPORT ===")
    print(f"{'Channel':<20} {'Status':<35} {'Time(s)':<10} {'Script Used'}")
    print("-" * 80)
    for cid, status, t, script in results:
        entry_match = re.search(r"(\d+)", status)
        if entry_match:
            entries = int(entry_match.group(1))
            if entries == 0:
                status = "⚠️ No entries found"
            else:
                status = f"✅ {entries} entries"
        elif "error" in status.lower():
            status = "❌ Script error"
        elif "skipped" in status.lower():
            status = "⏭️ Skipped"
        else:
            status = "⚠️ No entries or unknown count"
        print(f"{cid:<20} {status:<35} {t:<10.2f} {os.path.basename(script)}")
    print("-" * 80)
    print(f"✅ Archived → {archive_path}")
    print(f"⏱️ Total duration: {total_time:.1f}s\n")


if __name__ == "__main__":
    run_all()

import os
import json
import subprocess
import re
from datetime import datetime, timedelta, timezone

# === Directories ===
BASE_DIR = os.path.dirname(__file__)
EPG_SRC_DIR = os.path.join(BASE_DIR, "epg","scrapers")
PUBLIC_EPG_DIR = os.path.join(BASE_DIR, "..", "public", "epg")
CHANNELS_FILE = os.path.join(BASE_DIR, "legal_verified_channels.json")
os.makedirs(PUBLIC_EPG_DIR, exist_ok=True)

# === Utility ===

def slugify(name: str):
    return re.sub(r'[^a-z0-9]+', '_', str(name).lower()).strip('_')

def fallback_programs(hours=6):
    """Generate dummy hourly slots."""
    now = datetime.now(timezone.utc)
    return [
        {
            "title": "No schedule available",
            "description": "",
            "start": (now + timedelta(hours=i)).isoformat(),
            "end": (now + timedelta(hours=i + 1)).isoformat(),
        }
        for i in range(hours)
    ]

def parse_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        if "programs" in data:
            return data["programs"]
        return []
    except Exception:
        return []

def parse_jsonl(path):
    progs = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                    progs.append({
                        "title": obj.get("title", "No Title"),
                        "description": obj.get("desc", "") or obj.get("description", ""),
                        "start": obj.get("start") or obj.get("time_local") or datetime.now(timezone.utc).isoformat(),
                        "end": obj.get("end") or "",
                    })
                except json.JSONDecodeError:
                    continue
    except Exception:
        pass
    return progs


# === Run all scrapers ===
def run_scrapers():
    print("\n🚀 Running all EPG scrapers...\n")
    scrapers = [
        "aljazeera_scraper.py",
        "arirang_tv_scraper.py",
        "cgtn_scraper.py",
        "dw_scraper.py",
        "france24_scraper.py",
        "nhk_world_scraper.py",
        "un_web_tv_scraper.py",
        "weta_scraper.py",
        "mpt_scraper.py",
        "ket_scraper.py",
        "create_scraper.py",
        "skynews_weather_scraper.py",
    ]

    for script in scrapers:
        path = os.path.join(BASE_DIR, script)
        if os.path.exists(path):
            print(f"▶️  Running {script} ...")
            try:
                subprocess.run(["python", path], check=True)
            except subprocess.CalledProcessError as e:
                print(f"⚠️  {script} failed: {e}")
        else:
            print(f"⏭️  Skipping missing {script}")

    print("\n✅ All scrapers finished.\n")


# === Merge everything ===
def merge_epg():
    print("🔹 Building unified EPG output for frontend...\n")
    with open(CHANNELS_FILE, "r", encoding="utf-8") as cf:
        channels = json.load(cf)

    total_channels = 0
    total_programs = 0

    for ch in channels:
        ch_name = ch.get("name", "Unknown Channel")
        ch_id = ch.get("id") or slugify(ch_name)
        ch_lang = ch.get("language", "Unknown")
        ch_genre = ch.get("genre") or ch.get("category") or "Uncategorized"
        ch_origin = ch.get("origin", "Global")

        found_programs = []

        for root, _, files in os.walk(EPG_SRC_DIR):
            for file in files:
                fname = file.lower()
                if ch_id in fname or slugify(ch_name).split("_")[0] in fname:
                    fpath = os.path.join(root, file)
                    if fname.endswith(".jsonl"):
                        found_programs.extend(parse_jsonl(fpath))
                    elif fname.endswith(".json"):
                        found_programs.extend(parse_json(fpath))

        if not found_programs:
            found_programs = fallback_programs()
            status = "🟡 stubbed"
        else:
            found_programs.sort(key=lambda x: x.get("start", ""))
            status = "🟢 real"

        # Write unified EPG for frontend
        clean_id = slugify(ch_id)
        output_path = os.path.join(PUBLIC_EPG_DIR, f"{clean_id}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "id": ch_id,
                    "channel": ch_name,
                    "language": ch_lang,
                    "genre": ch_genre,
                    "origin": ch_origin,
                    "updated": datetime.now(timezone.utc).isoformat(),
                    "programs": found_programs,
                },
                f,
                indent=2,
                ensure_ascii=False,
            )

        total_channels += 1
        total_programs += len(found_programs)
        print(f"✅ {ch_name} → {status} ({len(found_programs)} programs)")

    print(f"\n🎬 EPG build complete: {total_channels} channels, {total_programs} programs total.\n")


# === MAIN ===
if __name__ == "__main__":
    run_scrapers()
    merge_epg()

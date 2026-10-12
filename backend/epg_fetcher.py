import os
import requests
from datetime import datetime, timezone
import shutil

# === CONFIG ===
EPG_URL = "https://epg.pw/xmltv/epg.xml"
EPG_SAVE_PATH = "epg/global-epg.xml"
BACKUP_DIR = "admin/backups/epg_fetch"
LOG_FILE = "admin/logs/pipeline.log"

os.makedirs(os.path.dirname(EPG_SAVE_PATH), exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

def log(message):
    timestamp = datetime.now(timezone.utc).isoformat()
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {message}\n")
    print(message)

def backup_existing():
    if os.path.exists(EPG_SAVE_PATH):
        timestamp = datetime.now(tz.UTC).strftime("%Y%m%d%H%M%S")
        backup_name = f"global-epg_{timestamp}.xml"
        backup_path = os.path.join(BACKUP_DIR, backup_name)
        shutil.copy2(EPG_SAVE_PATH, backup_path)
        log(f"📦 Backed up old EPG to {backup_path}")

def fetch_epg():
    try:
        log(f"Downloading EPG from {EPG_URL} ...")
        r = requests.get(EPG_URL, timeout=30)
        r.raise_for_status()
        backup_existing()
        with open(EPG_SAVE_PATH, "wb") as f:
            f.write(r.content)
        log(f"EPG fetched and saved: {EPG_SAVE_PATH} ({len(r.content)/1024:.2f} KB)")
        return 0
    except Exception as e:
        log(f"EPG fetch failed: {e}")
        return 1

if __name__ == "__main__":
    exit(fetch_epg())

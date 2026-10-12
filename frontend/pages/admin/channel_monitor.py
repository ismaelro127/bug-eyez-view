# ✅ channel_monitor.py — ENHANCED with backups for BugEyezView

import json
import time
import requests
import os
import shutil
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# === CONFIG ===
INPUT_FILE = 'parsed_channels.json'
OUTPUT_DATA = 'frontend/public/admin/data/enhanced_cleaned_channels.json'
OUTPUT_HEALTH = 'frontend/public/admin/data/channel_health.json'

# === Helper: backup if file exists ===
def backup_if_exists(path):
    if os.path.exists(path):
        timestamp = datetime.now(tz.UTC).strftime('%Y%m%d%H%M%S')
        backup = path.replace('.json', f'_backup_{timestamp}.json')
        shutil.move(path, backup)
        print(f"📦 Backup created: {backup}")

# === Load parsed channels with UTF-8 ===
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    channels = json.load(f)

health = {}
updated_channels = []

def check_url(url, retries=1):
    attempt = 0
    while attempt <= retries:
        try:
            r = requests.head(url, timeout=5)
            if r.status_code == 200:
                return True
        except Exception as e:
            pass
        attempt += 1
        time.sleep(2 ** attempt)  # Exponential backoff
    return False

# === Check each channel ===
for ch in channels:
    url = ch.get('url')
    name = ch.get('name')
    status = 'offline'
    status = 'online' if check_url(url) else 'offline'
    ch['status'] = status
    updated_channels.append(ch)

    if name not in health:
        health[name] = {
            'uptime_percentage': 100.0 if status == 'online' else 0.0,
            'total_checks': 1,
            'last_online': time.strftime('%Y-%m-%dT%H:%M:%S') if status == 'online' else None,
            'last_offline': time.strftime('%Y-%m-%dT%H:%M:%S') if status == 'offline' else None,
        }
    else:
        h = health[name]
        h['total_checks'] += 1
        if status == 'online':
            h['last_online'] = time.strftime('%Y-%m-%dT%H:%M:%S')
        else:
            h['last_offline'] = time.strftime('%Y-%m-%dT%H:%M:%S')
        online_checks = h['uptime_percentage'] * (h['total_checks'] - 1) / 100
        if status == 'online':
            online_checks += 1
        h['uptime_percentage'] = (online_checks / h['total_checks']) * 100


def check_and_update(ch):
    url = ch.get('url')
    name = ch.get('name')
    status = 'online' if check_url(url) else 'offline'
    ch['status'] = status
    return ch, name, status

with ThreadPoolExecutor(max_workers=20) as executor:
    results = list(executor.map(check_and_update, channels))

online_count = sum(1 for _, _, status in results if status == 'online')
offline_count = len(results) - online_count
print(f"✅ Online: {online_count} | ❌ Offline: {offline_count} | Total: {len(results)}")

# === Backup before saving ===
backup_if_exists(OUTPUT_DATA)
backup_if_exists(OUTPUT_HEALTH)

# === Save updated data with UTF-8 ===
with open(OUTPUT_DATA, 'w', encoding='utf-8') as f:
    json.dump(updated_channels, f, indent=2, ensure_ascii=False)

with open(OUTPUT_HEALTH, 'w', encoding='utf-8') as f:
    json.dump(health, f, indent=2, ensure_ascii=False)

print("✅ Channel monitor run complete with backups.")

online_channels = [ch for ch in updated_channels if ch['status'] == 'online']

# Save a filtered version for frontend
ONLINE_OUTPUT = 'frontend/public/admin/data/working_channels_only.json'
backup_if_exists(ONLINE_OUTPUT)
with open(ONLINE_OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(online_channels, f, indent=2, ensure_ascii=False)

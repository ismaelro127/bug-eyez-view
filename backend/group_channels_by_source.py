import json
from urllib.parse import urlparse
from collections import defaultdict
import csv
import os

# === Load channels ===
with open("parsed_channels.json", "r", encoding="utf-8") as f:
    channels = json.load(f)

# === Load EPG map ===
with open("epg/enhanced_channel_epg_map.json", "r", encoding="utf-8") as f:
    epg_map = json.load(f)

def normalize(name):
    return ''.join(c for c in name.casefold() if c.isalnum())

# === Group by domain ===
groups = defaultdict(list)

for ch in channels:
    url = ch.get("url", "")
    domain = urlparse(url).netloc or "unknown"
    name = ch.get("name", "Unknown")
    norm_name = normalize(name)
    has_epg = norm_name in epg_map

    groups[domain].append({
        "name": name,
        "url": url,
        "has_epg": has_epg
    })

# === Create output folders ===
os.makedirs("source_reports", exist_ok=True)
os.makedirs("source_playlists", exist_ok=True)

# === Build report and export CSV + M3U ===
report = {}

for domain, chs in groups.items():
    total = len(chs)
    with_epg = sum(1 for c in chs if c["has_epg"])
    without_epg = total - with_epg
    missing = [c for c in chs if not c["has_epg"]]

    report[domain] = {
        "total": total,
        "with_epg": with_epg,
        "without_epg": without_epg,
        "channels_without_epg": [c["name"] for c in missing]
    }

    # === Export CSV ===
    csv_path = f"source_reports/{domain.replace('.', '_')}_missing_epg.csv"
    with open(csv_path, "w", newline='', encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Name", "URL"])
        for c in missing:
            writer.writerow([c["name"], c["url"]])
    print(f"✅ CSV: {csv_path}")

    # === Export M3U ===
    m3u_path = f"source_playlists/{domain.replace('.', '_')}_missing_epg.m3u"
    with open(m3u_path, "w", encoding="utf-8") as m3u:
        m3u.write("#EXTM3U\n")
        for c in missing:
            m3u.write(f'#EXTINF:-1,{c["name"]}\n')
            m3u.write(f'{c["url"]}\n')
    print(f"🎵 M3U: {m3u_path}")

# === Save overall JSON report ===
with open("source_group_epg_report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2)

print(f"📄 Full JSON report: source_group_epg_report.json")
print("✅ Done!")

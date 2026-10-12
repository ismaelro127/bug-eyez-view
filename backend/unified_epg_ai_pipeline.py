import os
import json
import shutil
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

print("🚀 Unified EPG AI Pipeline Starting...")

# === CONFIG ===
CLEAN_CHANNELS_PATH = 'final_clean_channels.json'
ADMIN_CHANNELS_PATH = 'admin_channel_status.json'
EPG_XML_PATH = 'epg/global-epg-deduped.xml'
EPG_MAP_PATH = 'epg/enhanced_channel_epg_map.json'
EPG_OUTPUT_DIR = '../frontend/public/epg'
REGION_LIST_PATH = '../frontend/public/data/regions.json'
NEEDS_FIX_PATH = '../frontend/public/data/channels_needing_region_fix.json'
FINAL_OUTPUT_PATH = '../frontend/public/data/channel_data.json'
BACKUP_ROOT = './admin/backups'

# === Helpers ===
def normalize(name):
    return ''.join(c for c in name.lower() if c.isalnum())

def backup_if_exists(path):
    if os.path.exists(path):
        timestamp = datetime.now(tz.UTC).strftime('%Y%m%d%H%M%S')
        backup_dir = os.path.join(BACKUP_ROOT, f'run_{timestamp}')
        os.makedirs(backup_dir, exist_ok=True)
        backup_name = os.path.join(backup_dir, os.path.basename(path))
        shutil.copy2(path, backup_name)
        print(f"📦 Backed up: {backup_name}")
        return backup_dir
    return None

def parse_xmltv_datetime(raw):
    dt = datetime.strptime(raw.split(' ')[0], '%Y%m%d%H%M%S').replace(tzinfo=timezone.utc)
    return dt.isoformat().replace('+00:00', 'Z')

# === Load channels ===
with open(CLEAN_CHANNELS_PATH, 'r', encoding='utf-8') as f:
    clean_channels = json.load(f)

# === REGION & CATEGORY ===
REGION_KEYWORDS = {
    "Puerto Rico": ["PR", "Boricua", "Puerto Rico"],
    "US": ["Yuma", "AZ", "USA", "US", "California", "New York"],
    "Latin America": ["Xtrema", "Xpresso", "MásTV", "Maranatha", "Canal", "Telemundo"],
    "Africa": ["Africa", "Nigeria", "Kenya", "Uganda", "ZTV"],
    "Russia": ["Russia", "RU", "Russian"],
    "China": ["China", "Chinese", "CCTV", "Mandarin"],
    "Europe": ["France", "Germany", "UK", "Spain", "Italy"],
    "Australia": ["Sydney", "Australia", "AUS"]
}

CATEGORY_KEYWORDS = {
    "music": ["Music", "MTV", "Hits", "Karaoke", "Praise"],
    "movies": ["Movie", "Cinema", "Film", "Hollywood"],
    "sports": ["Sports", "ESPN", "Football", "NBA", "Soccer"],
    "news": ["News", "CNN", "BBC", "Al Jazeera"],
    "cooking": ["Food", "Cooking", "Chef", "Kitchen"],
    "kids": ["Cartoon", "Kids", "Disney", "Nickelodeon"],
    "entertainment": ["Show", "Entertainment", "Channel", "TV"]
}

needs_region_fix = []

for ch in clean_channels:
    region = ch.get("origin", "").strip()
    if not region or region.lower() == "unclassified":
        detected = next(
            (r for r, kws in REGION_KEYWORDS.items() if any(kw.lower() in ch["name"].lower() for kw in kws)),
            None
        )
        ch["origin"] = detected or "Unknown"

        if not detected:
            needs_region_fix.append({
                "id": ch.get("id"),
                "name": ch.get("name"),
                "url": ch.get("url")
            })

    category = next(
        (c for c, kws in CATEGORY_KEYWORDS.items() if any(kw.lower() in ch["name"].lower() for kw in kws)),
        "misc"
    )
    ch["category"] = category

if needs_region_fix:
    os.makedirs(os.path.dirname(NEEDS_FIX_PATH), exist_ok=True)
    with open(NEEDS_FIX_PATH, 'w', encoding='utf-8') as f:
        json.dump(needs_region_fix, f, indent=2)
    print(f"🚩 Manual region fix needed for {len(needs_region_fix)} channels → {NEEDS_FIX_PATH}")

# === REGION LIST & NUMBERING ===
# Make sure all regions exist
regions = sorted(set(ch["origin"] for ch in clean_channels if ch["origin"]))

# Add fallback if any empty slipped through (just in case)
if "" in regions:
    regions = ["Unknown" if r == "" else r for r in regions]
with open(REGION_LIST_PATH, 'w', encoding='utf-8') as f:
    json.dump(regions, f, indent=2)

REGION_BASES = {r: (i + 1) * 100 for i, r in enumerate(regions)}
region_groups = {r: [] for r in regions}
for ch in clean_channels:
    region_groups[ch["origin"]].append(ch)

for region, channels in region_groups.items():
    base = REGION_BASES[region]
    for idx, ch in enumerate(channels, start=1):
        ch["number"] = base + idx

# === Load EPG map ===
with open(EPG_MAP_PATH, 'r', encoding='utf-8') as f:
    epg_map = json.load(f)

for ch in clean_channels:
    norm_name = normalize(ch["name"])
    match = epg_map.get(norm_name)
    if match:
        print(f"✅ MATCH {ch['name']} => {norm_name} => {match['epg_id']}")
        ch["epgId"] = match["epg_id"]
    else:
        print(f"❌ NO MATCH {ch['name']} => {norm_name}")

# === Split channels: has EPG vs no EPG ===
has_epg = []
needs_epg_fix = []

for ch in clean_channels:
    if "epgId" in ch and ch["epgId"]:
        has_epg.append(ch)
    else:
        needs_epg_fix.append(ch)

# === Save final channels WITH EPG ONLY ===
with open(FINAL_OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(has_epg, f, indent=2)

print(f"✅ Saved {len(has_epg)} channels WITH EPG to: {FINAL_OUTPUT_PATH}")

# === Save admin list for fixing ===
with open('admin/channels_needing_epg_fix.json', 'w', encoding='utf-8') as f:
    json.dump(needs_epg_fix, f, indent=2)

print(f"🚩 Saved {len(needs_epg_fix)} channels needing EPG fix to: admin/channels_needing_epg_fix.json")

# === Parse EPG XML ===
tree = ET.parse(EPG_XML_PATH)
root = tree.getroot()
programs_by_channel = {}

for p in root.findall('programme'):
    channel_id = p.attrib.get('channel')
    programs_by_channel.setdefault(channel_id, []).append({
        "start": parse_xmltv_datetime(p.attrib.get('start')),
        "end": parse_xmltv_datetime(p.attrib.get('stop')),
        "title": p.findtext('title') or "Untitled",
        "episode": p.findtext('sub-title'),
        "description": p.findtext('desc')
    })

print(f"✅ Parsed XML: {len(programs_by_channel)} channels with programs.")

# === BACKUP before writing ===
backup_dir = backup_if_exists(FINAL_OUTPUT_PATH)
if not backup_dir:
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    backup_dir = os.path.join(BACKUP_ROOT, f'run_{timestamp}')
    os.makedirs(backup_dir, exist_ok=True)

# === Clear & write EPG JSONs ===
# === Clear & write EPG JSONs ===
if os.path.exists(EPG_OUTPUT_DIR):
    shutil.rmtree(EPG_OUTPUT_DIR)
os.makedirs(EPG_OUTPUT_DIR, exist_ok=True)


count = 0
for ch in has_epg:  # ✅ Only channels WITH EPG
    epg_id = ch.get("epgId")
    if epg_id and epg_id in programs_by_channel:
        out_path = os.path.join(EPG_OUTPUT_DIR, f"{epg_id}.json")
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump({"programs": programs_by_channel[epg_id]}, f, indent=2)
        count += 1

print(f"✅ Wrote {count} EPG JSONs to {EPG_OUTPUT_DIR}")

# ✅ FINAL SAVE: ONLY channels WITH EPG!
with open(FINAL_OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(has_epg, f, indent=2)

print(f"🎉 Pipeline complete. Final data: {FINAL_OUTPUT_PATH} (only EPG channels)")

import json
from datetime import datetime

matched = []
unmatched = []

for ch in channels:
    norm_name = ch.get('id') or ch.get('name', '').lower().replace(r'[^a-z0-9]', '')
    if norm_name in epg_map:
        matched.append({
            'name': ch.get('name'),
            'normalized': norm_name,
            'epg_id': epg_map[norm_name]
        })
    else:
        unmatched.append({
            'name': ch.get('name'),
            'normalized': norm_name
        })

print(f"\n📊 EPG Match Report ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
print(f"✅ Matched: {len(matched)}")
print(f"❌ Unmatched: {len(unmatched)}")

with open("matched_channels.json", "w", encoding="utf-8") as f:
    json.dump(matched, f, indent=2)

with open("unmatched_channels.json", "w", encoding="utf-8") as f:
    json.dump(unmatched, f, indent=2)

print("\n🟢 Top 5 Matched:")
for m in matched[:5]:
    print(f"  ✅ {m['name']} => {m['epg_id']}")

print("\n🔴 Top 5 Unmatched:")
for u in unmatched[:5]:
    print(f"  ❌ {u['name']} => {u['normalized']}")

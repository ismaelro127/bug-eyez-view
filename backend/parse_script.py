import os
import xml.etree.ElementTree as ET
import json
from datetime import datetime, timezone
from collections import defaultdict

# === CONFIG ===
EPG_XML_PATH = "epg/global-epg.xml"     # your raw EPG XML with real channel ids
CHANNELS_PATH = "final_clean_channels.json"   # your parsed channel list
OUTPUT_DIR = "../frontend/public/epg"
FINAL_CHANNEL_DATA = "../frontend/public/data/channel_data.json"

# === HELPERS ===
def parse_xmltv_datetime(raw):
    dt = datetime.strptime(raw.split(' ')[0], '%Y%m%d%H%M%S').replace(tzinfo=timezone.utc)
    return dt.isoformat().replace('+00:00', 'Z')

# === Load channels ===
with open(CHANNELS_PATH, 'r', encoding='utf-8') as f:
    channels = json.load(f)

# === Parse XML ===
print(f"🔍 Parsing EPG XML: {EPG_XML_PATH}")
tree = ET.parse(EPG_XML_PATH)
root = tree.getroot()

# Build: real channel_id → all programs
programs_by_id = defaultdict(list)
for p in root.findall('programme'):
    cid = p.attrib.get('channel')
    if not cid:
        continue
    programs_by_id[cid].append({
        "start": parse_xmltv_datetime(p.attrib['start']),
        "end": parse_xmltv_datetime(p.attrib['stop']),
        "title": p.findtext('title') or "Untitled",
        "episode": p.findtext('sub-title'),
        "description": p.findtext('desc')
    })

print(f"✅ Found EPG data for {len(programs_by_id)} unique channel IDs.")

# === Apply real IDs to your channel objects ===
matched = []
unmatched = []

for ch in channels:
    real_id = ch.get("id") or ch.get("number") or ch.get("epgId")
    real_id = str(real_id).strip()
    if real_id in programs_by_id:
        ch['epgId'] = real_id
        matched.append(ch)
    else:
        ch['epgId'] = None
        unmatched.append(ch)

print(f"✅ Matched {len(matched)} channels with real EPG data.")
print(f"❌ Unmatched channels: {len(unmatched)}")

# === Clean old EPG JSON ===
if os.path.exists(OUTPUT_DIR):
    for f in os.listdir(OUTPUT_DIR):
        os.remove(os.path.join(OUTPUT_DIR, f))
else:
    os.makedirs(OUTPUT_DIR)

# === Write fresh EPG JSON ===
for ch in matched:
    eid = ch['epgId']
    with open(os.path.join(OUTPUT_DIR, f"{eid}.json"), 'w', encoding='utf-8') as f:
        json.dump({"programs": programs_by_id[eid]}, f, indent=2)

print(f"✅ Wrote {len(matched)} EPG JSON files → {OUTPUT_DIR}")

# === Write updated channel_data.json ===
with open(FINAL_CHANNEL_DATA, 'w', encoding='utf-8') as f:
    json.dump(matched, f, indent=2)

print(f"🎉 DONE: Final channel_data.json has {len(matched)} channels with valid EPG.")

# === Write unmatched list for fixing ===
with open('admin/unmatched_channels.json', 'w', encoding='utf-8') as f:
    json.dump(unmatched, f, indent=2)
print(f"🚩 Unmatched channels saved → admin/unmatched_channels.json")

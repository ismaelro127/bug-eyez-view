import xml.etree.ElementTree as ET
import json
import os

# === Robust normalization helper ===
def normalize(name):
    return ''.join(c for c in name.casefold() if c.isalnum())

# === Paths ===
EPG_XML_PATH = "epg/global-epg-deduped.xml"
PARSED_CHANNELS_PATH = "parsed_channels.json"
MANUAL_MAP_PATH = "epg/manual_map.json"   # ✅ <<-- NEW
OUTPUT_PATH = "epg/enhanced_channel_epg_map.json"

# === Load parsed channels ===
with open(PARSED_CHANNELS_PATH, "r", encoding="utf-8") as f:
    channels = json.load(f)

# === Load manual override map ===
if os.path.exists(MANUAL_MAP_PATH):
    with open(MANUAL_MAP_PATH, "r", encoding="utf-8") as f:
        manual_map = json.load(f)
else:
    manual_map = {}

# === Parse EPG XML ===
tree = ET.parse(EPG_XML_PATH)
root = tree.getroot()

# Build normalized EPG lookup
epg_channel_id_map = {}
for ch in root.findall("channel"):
    epg_id = ch.attrib.get("id")
    display = ch.find("display-name")
    if epg_id and display is not None:
        norm_name = normalize(display.text.strip())
        epg_channel_id_map[norm_name] = epg_id

print(f"✅ Loaded {len(epg_channel_id_map)} EPG channels from XML.")
print(f"✅ Loaded {len(manual_map)} manual overrides.")

# === Attempt to match ===
final_map = {}
unmatched = []
fallback_candidates = {}

for ch in channels:
    ch_name_norm = normalize(ch["name"].strip())
    matched_epg_id = None

    # 1️⃣ Try manual override
    if ch_name_norm in manual_map:
        matched_epg_id = manual_map[ch_name_norm]

    # 2️⃣ Try exact match
    elif ch_name_norm in epg_channel_id_map:
        matched_epg_id = epg_channel_id_map[ch_name_norm]

    # 3️⃣ Try best loose partial match
    else:
        possible = [
            (epg_name, epg_id)
            for epg_name, epg_id in epg_channel_id_map.items()
            if epg_name in ch_name_norm or ch_name_norm in epg_name
        ]
        if len(possible) == 1:
            matched_epg_id = possible[0][1]
        elif len(possible) > 1:
            fallback_candidates[ch["name"]] = possible

    if matched_epg_id:
        final_map[ch_name_norm] = {"epg_id": matched_epg_id}
    else:
        unmatched.append(ch["name"])

# === Save map ===
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(final_map, f, indent=2)

print(f"✅ Generated EPG map with {len(final_map)} matches.")
print(f"📄 Saved to: {os.path.abspath(OUTPUT_PATH)}")

# === Save fallback candidates ===
if fallback_candidates:
    with open("fallback_candidates.json", "w", encoding="utf-8") as f:
        json.dump(fallback_candidates, f, indent=2)
    print(f"⚠️  Saved fallback_candidates.json for manual check: {len(fallback_candidates)} multi-matches found.")

# === Also save unmatched ===
if unmatched:
    with open("unmatched_epg_map.json", "w", encoding="utf-8") as f:
        json.dump(unmatched, f, indent=2)
    with open("unmatched_epg_map.csv", "w", encoding="utf-8") as f:
        for u in unmatched:
            f.write(f"{u}\n")
    print(f"❌ Unmatched channels ({len(unmatched)}) saved to unmatched_epg_map.json & .csv")
else:
    print("✅ All channels matched!")

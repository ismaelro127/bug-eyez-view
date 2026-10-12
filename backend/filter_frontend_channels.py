import json
import os

# Load channel sources
with open("final_clean_channels.json", "r", encoding="utf-8") as f:
    all_channels = json.load(f)

with open("legal_channels.json", "r", encoding="utf-8") as f:
    legal_channels = {ch["name"].lower(): ch for ch in json.load(f)}

# Load EPG-matched dataset
with open("../frontend/public/data/channel_data.json", "r", encoding="utf-8") as f:
    epg_channels = {ch["name"].lower(): ch for ch in json.load(f)}

filtered = []
for ch in all_channels:
    key = ch["name"].lower()
    if key in legal_channels and key in epg_channels:
        ch["epg_id"] = epg_channels[key].get("epg_id")
        filtered.append(ch)

# Save merged output
with open("../frontend/public/frontend_legal_channels.json", "w", encoding="utf-8") as f:
    json.dump(filtered, f, indent=2, ensure_ascii=False)

print(f"Legal + EPG-matched channels: {len(filtered)} / {len(all_channels)}")

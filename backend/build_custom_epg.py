import os
import json
import xml.etree.ElementTree as ET

# 📂 Load parsed channels from fetch step
with open('parsed_channels.json', 'r', encoding='utf-8') as f:
    fetched_channels = json.load(f)

# 📘 Load optional patch file
name_map = {}
if os.path.exists("channel_name_patch.json"):
    with open("channel_name_patch.json", "r", encoding="utf-8") as f:
        name_map = json.load(f)

# 🧠 Apply patch to fetched channel names
for ch in fetched_channels:
    if ch["name"] in name_map:
        ch["name"] = name_map[ch["name"]]

# 🔍 Create a lookup of cleaned names
clean_names = {ch["name"].lower(): ch for ch in fetched_channels}

# 🌐 Parse the custom EPG XML
root = ET.parse('custom_epg.xml').getroot()
programs_per_channel = {}
matched_channels = []

for ch in root.findall('channel'):
    chan_id = ch.attrib['id']
    display_name = ch.find('display-name').text.strip()

    if display_name.lower() in clean_names:
        matched_channels.append({
            "id": chan_id,
            "name": display_name,
            "epgId": chan_id
        })
        programs_per_channel[chan_id] = []

for prog in root.findall('programme'):
    chan_id = prog.attrib['channel']
    if chan_id not in programs_per_channel:
        continue

    start = prog.attrib['start']
    end = prog.attrib['stop']
    title = prog.findtext('title', '')
    desc = prog.findtext('desc', '')
    programs_per_channel[chan_id].append({
        "start": start,
        "end": end,
        "title": title,
        "description": desc
    })

# 📂 Output directory
os.makedirs('../frontend/public/data', exist_ok=True)
os.makedirs('../frontend/public/epg', exist_ok=True)

# 💾 Save only matched channels
with open('../frontend/public/data/channel_data.json', 'w', encoding='utf-8') as f:
    json.dump(matched_channels, f, indent=2)

# 💾 Save per-channel EPGs
for chan_id, progs in programs_per_channel.items():
    if progs:
        with open(f'../frontend/public/epg/{chan_id}.json', 'w', encoding='utf-8') as f:
            json.dump({"programs": progs}, f, indent=2)

print(f"✅ Saved {len(matched_channels)} channels with valid EPG data.")

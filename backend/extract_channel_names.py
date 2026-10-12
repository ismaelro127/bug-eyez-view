import json

with open("final_clean_channels.json", "r", encoding="utf-8") as f:
    channels = json.load(f)

names = sorted(set(ch["name"] for ch in channels if "name" in ch))

with open("channel_name_list.json", "w", encoding="utf-8") as f:
    json.dump(names, f, indent=2, ensure_ascii=False)

print(f"✅ Extracted {len(names)} unique channel names to channel_name_list.json")

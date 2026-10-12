import json

def normalize(name):
    return ''.join(c for c in name.lower() if c.isalnum())

with open('../frontend/public/epg/channel_epg_map.json') as f:
    raw = json.load(f)

fixed = {}
for k, v in raw.items():
    fixed[normalize(k)] = v

with open('enhanced_channel_epg_map.json', 'w') as f:
    json.dump(fixed, f, indent=2)

print("✅ Map keys normalized and saved!")

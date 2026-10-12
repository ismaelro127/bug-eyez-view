import json

with open('parsed_channels.json', 'r', encoding='utf-8') as f:
    parsed = json.load(f)

with open('channel_name_patches.json', 'r', encoding='utf-8') as f:
    patches = json.load(f)

patched = []
for ch in parsed:
    name = ch.get("name", "")
    if name in patches:
        ch["name"] = patches[name]  # Apply fixed name
    patched.append(ch)

with open('patched_channels.json', 'w', encoding='utf-8') as f:
    json.dump(patched, f, indent=2, ensure_ascii=False)

print(f"✅ Patched {len(patched)} channels.")

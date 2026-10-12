import requests, json

#  Choose your source:
legal_m3u_url = "https://iptv-org.github.io/iptv/index.m3u"  # All categories
# Or set to e.g.:
# legal_m3u_url = "https://iptv-org.github.io/iptv/categories/news.m3u"

m3u_output = "legal_dyn.m3u"
json_output = "legal_dyn.json"
final_output = "final_clean_channels.json"

headers = {"User-Agent": "Mozilla/5.0"}
res = requests.get(legal_m3u_url, headers=headers, timeout=10)
res.raise_for_status()
m3u = res.text
if not m3u.strip().startswith("#EXTM3U"):
    raise Exception("❌ Not an M3U file")

lines = m3u.splitlines()
channels = []
for i, line in enumerate(lines):
    if line.startswith("#EXTINF"):
        meta = line
        url = lines[i+1] if i+1 < len(lines) else ""
        if not url.startswith("http"):
            continue
        name = meta.split(",")[-1]
        grp = meta.split('group-title="')[1].split('"')[0] if 'group-title="' in meta else ""
        tvg = meta.split('tvg-id="')[1].split('"')[0] if 'tvg-id="' in meta else ""
        channels.append({"name": name, "url": url, "group-title": grp, "tvg-id": tvg})

with open(m3u_output, "w", encoding="utf-8") as f:
    f.write(m3u)
with open(json_output, "w", encoding="utf-8") as f:
    json.dump(channels, f, indent=2)
with open(final_output, "w", encoding="utf-8") as f:
    json.dump(channels, f, indent=2)

print(f" Loaded {len(channels)} channels")
print(f"Outputs: {m3u_output}, {json_output}, {final_output}")

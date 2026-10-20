import json
import re
import requests
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

SOURCE_URL = "https://iptv-org.github.io/iptv/index.m3u"

M3U_OUTPUT = BASE_DIR / "personal_channels_current.m3u"
JSON_OUTPUT = BASE_DIR / "personal_channels.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


def get_attribute(meta, name):
    match = re.search(
        rf'{re.escape(name)}="([^"]*)"',
        meta,
    )
    return match.group(1).strip() if match else ""


print("Downloading current IPTV playlist...")

response = requests.get(
    SOURCE_URL,
    headers=HEADERS,
    timeout=30,
)
response.raise_for_status()

m3u = response.text

if not m3u.strip().startswith("#EXTM3U"):
    raise RuntimeError("Downloaded file is not a valid M3U playlist.")

M3U_OUTPUT.write_text(
    m3u,
    encoding="utf-8",
)

lines = m3u.splitlines()
channels = []

pending_meta = None

for line in lines:
    line = line.strip()

    if line.startswith("#EXTINF:"):
        pending_meta = line
        continue

    if (
        pending_meta
        and line.startswith(("http://", "https://"))
    ):
        if "," in pending_meta:
            name = pending_meta.split(",", 1)[1].strip()
        else:
            name = ""

        channels.append(
            {
                "name": name,
                "url": line,
                "group-title": get_attribute(
                    pending_meta,
                    "group-title",
                ),
                "tvg-id": get_attribute(
                    pending_meta,
                    "tvg-id",
                ),
                "tvg-logo": get_attribute(
                    pending_meta,
                    "tvg-logo",
                ),
            }
        )

        pending_meta = None


with JSON_OUTPUT.open(
    "w",
    encoding="utf-8",
) as file:
    json.dump(
        channels,
        file,
        indent=2,
        ensure_ascii=False,
    )


epg_ids = [
    channel["tvg-id"]
    for channel in channels
    if channel["tvg-id"]
]

with_logos = sum(
    bool(channel["tvg-logo"])
    for channel in channels
)


print()
print("Personal channel refresh complete")
print("---------------------------------")
print(f"Parsed:          {len(channels)}")
print(f"With tvg-id:     {len(epg_ids)}")
print(f"Without tvg-id:  {len(channels) - len(epg_ids)}")
print(f"Unique tvg-id:   {len(set(epg_ids))}")
print(f"With logo:       {with_logos}")
print()
print(f"Output: {JSON_OUTPUT}")
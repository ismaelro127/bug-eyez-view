import json
import requests
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

CHANNEL_FILE = BASE_DIR / "personal_channels.json"
REPORT_FILE = BASE_DIR / "personal_epg_report.json"

CHANNELS_API = "https://iptv-org.github.io/api/channels.json"
GUIDES_API = "https://iptv-org.github.io/api/guides.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


def download_json(url):
    print(f"Downloading {url} ...")

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=60,
    )
    response.raise_for_status()

    return response.json()


print("Loading personal channels...")

with CHANNEL_FILE.open(
    "r",
    encoding="utf-8",
) as file:
    personal_channels = json.load(file)

print(f"Personal channels: {len(personal_channels)}")

iptv_channels = download_json(CHANNELS_API)
guides = download_json(GUIDES_API)

print()
print(f"IPTV-org channel records: {len(iptv_channels)}")
print(f"IPTV-org guide mappings:  {len(guides)}")


# ---------------------------------------------------------
# Build IPTV-org channel lookup
# ---------------------------------------------------------

channel_lookup = {}

for channel in iptv_channels:
    channel_id = str(
        channel.get("id", "")
    ).strip()

    if channel_id:
        channel_lookup[channel_id] = channel


# ---------------------------------------------------------
# Build guide lookup by base channel ID
# ---------------------------------------------------------

guide_lookup = {}

for guide in guides:
    channel_id = str(
        guide.get("channel", "")
    ).strip()

    if not channel_id:
        continue

    guide_lookup.setdefault(
        channel_id,
        [],
    ).append(guide)


# ---------------------------------------------------------
# Compare personal channels with metadata and guide mappings
# ---------------------------------------------------------

report = []

matched_channel_metadata = 0
with_epg = 0
without_epg = 0

guide_source_counts = {}


for personal in personal_channels:

    tvg_id = str(
        personal.get("tvg-id", "")
    ).strip()

    # IPTV-org stream IDs may contain a feed suffix:
    #
    # ChannelID@FeedID
    #
    # Example:
    # 123tv.de@SD
    #
    # channels.json uses the base ChannelID.
    if "@" in tvg_id:
        channel_id, feed_id = tvg_id.split("@", 1)
    else:
        channel_id = tvg_id
        feed_id = None

    channel_id = channel_id.strip()

    if feed_id:
        feed_id = feed_id.strip()

    channel_metadata = channel_lookup.get(
        channel_id
    )

    all_channel_guides = guide_lookup.get(
        channel_id,
        [],
    )

    # Prefer guides that either:
    # 1. apply to the whole channel, or
    # 2. match this specific feed.
    channel_guides = []

    for guide in all_channel_guides:

        guide_feed = guide.get("feed")

        if (
            guide_feed is None
            or not feed_id
            or str(guide_feed).strip() == feed_id
        ):
            channel_guides.append(guide)

    if channel_metadata:
        matched_channel_metadata += 1

    if channel_guides:
        with_epg += 1
    else:
        without_epg += 1

    guide_sources = []

    for guide in channel_guides:

        site = guide.get("site")
        lang = guide.get("lang")
        sources = guide.get("sources", [])

        if site:
            guide_source_counts[site] = (
                guide_source_counts.get(site, 0)
                + 1
            )

        guide_sources.append(
            {
                "site": site,
                "lang": lang,
                "feed": guide.get("feed"),
                "sources": sources,
            }
        )

    report.append(
        {
            "name": personal.get(
                "name",
                "",
            ),
            "url": personal.get(
                "url",
                "",
            ),
            "group-title": personal.get(
                "group-title",
                "",
            ),
            "tvg-id": tvg_id,
            "channel-id": channel_id,
            "feed-id": feed_id,
            "tvg-logo": personal.get(
                "tvg-logo",
                "",
            ),
            "metadata_match": bool(
                channel_metadata
            ),
            "has_epg": bool(
                channel_guides
            ),
            "epg_sources": guide_sources,
        }
    )


# ---------------------------------------------------------
# Save full analysis
# ---------------------------------------------------------

with REPORT_FILE.open(
    "w",
    encoding="utf-8",
) as file:
    json.dump(
        report,
        file,
        indent=2,
        ensure_ascii=False,
    )


# ---------------------------------------------------------
# Summary
# ---------------------------------------------------------

total = len(personal_channels)

epg_percent = (
    (with_epg / total) * 100
    if total
    else 0
)

metadata_percent = (
    (matched_channel_metadata / total) * 100
    if total
    else 0
)


print()
print("Personal EPG Analysis")
print("---------------------------------")
print(f"Total channels:       {total}")

print(
    f"Metadata matches:     "
    f"{matched_channel_metadata} "
    f"({metadata_percent:.1f}%)"
)

print(
    f"Channels with EPG:    "
    f"{with_epg} "
    f"({epg_percent:.1f}%)"
)

print(
    f"Channels without EPG: "
    f"{without_epg}"
)

print()
print(
    f"Unique EPG sites:     "
    f"{len(guide_source_counts)}"
)

print()
print("Top EPG sources")
print("---------------------------------")

for site, count in sorted(
    guide_source_counts.items(),
    key=lambda item: item[1],
    reverse=True,
)[:20]:
    print(f"{count:5}  {site}")

print()
print(f"Report: {REPORT_FILE}")
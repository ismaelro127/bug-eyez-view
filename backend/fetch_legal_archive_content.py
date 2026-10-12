import requests
import os
import json

# Create folders for results
os.makedirs("output", exist_ok=True)

BASE_URL = "https://archive.org/advancedsearch.php"
ARCHIVE_BASE = "https://archive.org/download"

# Collections and queries
SEARCH_QUERIES = {
    "movies": 'collection:(feature_films OR public_domain_movies) AND mediatype:movies',
    "shows": 'collection:(classic_tv OR television) AND mediatype:movies'
}

def fetch_items(query):
    results = []
    page = 1
    rows = 100
    while True:
        print(f"🔍 Fetching page {page}...")
        params = {
            "q": query,
            "fl[]": ["identifier", "title", "description", "licenseurl"],
            "rows": rows,
            "page": page,
            "output": "json"
        }
        r = requests.get(BASE_URL, params=params)
        data = r.json()
        docs = data["response"]["docs"]
        if not docs:
            break
        results.extend(docs)
        page += 1
    print(f"✅ Total items fetched: {len(results)}")
    return results

def build_links(docs, label):
    m3u_entries = []
    json_entries = []

    for doc in docs:
        identifier = doc["identifier"]
        title = doc.get("title", "Untitled")
        description = doc.get("description", "")
        license_url = doc.get("licenseurl", "")
        if "creativecommons" not in license_url.lower() and "publicdomain" not in license_url.lower():
            continue

        # Attempt to guess a .mp4 file
        mp4_link = f"{ARCHIVE_BASE}/{identifier}/{identifier}_512kb.mp4"

        # Validate .mp4 exists
        try:
            head = requests.head(mp4_link)
            if head.status_code != 200:
                continue
        except:
            continue

        # Build entries
        m3u_entries.append(f'#EXTINF:-1 group-title="{label}",{title}\n{mp4_link}\n')
        json_entries.append({
            "title": title,
            "url": mp4_link,
            "description": description.strip()
        })

    return m3u_entries, json_entries

def save_outputs(name, m3u_list, json_list):
    with open(f"output/{name}.m3u", "w", encoding="utf-8") as m3u_file:
        m3u_file.write("#EXTM3U\n" + "".join(m3u_list))

    with open(f"output/{name}.json", "w", encoding="utf-8") as json_file:
        json.dump(json_list, json_file, indent=2)

# Run both
for key in SEARCH_QUERIES:
    print(f"🚀 Processing {key}...")
    docs = fetch_items(SEARCH_QUERIES[key])
    m3u, js = build_links(docs, key.capitalize())
    save_outputs(f"legal_{key}", m3u, js)

print("🎉 Done! Files saved in /output/")

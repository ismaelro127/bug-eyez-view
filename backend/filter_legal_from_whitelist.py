import json, os, shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCE_PATH = os.path.join(ROOT, 'backend', 'final_clean_channels.json')
OUTPUT_PATH = os.path.join(ROOT, 'backend', 'legal_channels.json')
FRONTEND_SYNC_PATH = os.path.join(ROOT, 'frontend', 'public', 'legal_channels.json')

RESTRICTED_BRANDS = [
    "pluto", "starz", "encore", "amc", "sundance", "showtime", "paramount",
    "mtv", "viacom", "comedy central", "sony", "nbc", "abc", "cbs", "fox",
    "hbo", "tnt", "tbs", "espn", "disney", "history", "natgeo",
    "national geographic", "cartoon network", "adult swim"
]

SKIP_TERMS = ["test", "loop", "24/7", "offline"]

SAFE_NAMES = [
    "NASA", "NHK", "France 24", "Bloomberg", "Al Jazeera", "DW", "Red Bull", "Euronews",
    "ABC News Australia", "CGTN", "TRT World", "UN Web TV", "Arirang", "RTÉ News", "TV5Monde"
]

def is_restricted(name):
    norm = name.lower()
    return any(term in norm for term in RESTRICTED_BRANDS)

def is_unusable(name, url):
    norm = name.lower()
    return (
        any(skip in norm for skip in SKIP_TERMS)
        or not url.endswith('.m3u8')
    )

def is_safelist_name(name):
    return any(safe.lower() in name.lower() for safe in SAFE_NAMES)

# ✅ Load channels
with open(SOURCE_PATH, 'r', encoding='utf-8') as f:
    all_channels = json.load(f)

legal_channels = []
for ch in all_channels:
    name = ch.get('name', '')
    url = ch.get('url', '')
    if not name or not url:
        continue

    if is_restricted(name):
        continue
    if is_unusable(name, url):
        continue

    # ✅ Must be in safelist OR CDN-hosted as fallback
    if not is_safelist_name(name) and "cdn" not in url.lower():
        continue

    legal_channels.append(ch)

# ✅ Save filtered
with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(legal_channels, f, indent=2, ensure_ascii=False)
print(f"\n✅ Found {len(legal_channels)} legal channels")

# ✅ Sync to frontend
try:
    os.makedirs(os.path.dirname(FRONTEND_SYNC_PATH), exist_ok=True)
    shutil.copy(OUTPUT_PATH, FRONTEND_SYNC_PATH)
    print(f"✅ Synced to: {FRONTEND_SYNC_PATH}")
except Exception as e:
    print(f"❌ Sync failed: {e}")

# 🧪 Print sample
print("\n🧪 Sample channels:")
for ch in legal_channels[:10]:
    print(f" - {ch['name']} ({ch['url']})")

import json, re, os

# Path to your channel list
INPUT_FILE = "../frontend/public/legal_verified_channels.json"
OUTPUT_FILE = INPUT_FILE  # overwrite same file

def normalize_id(name: str) -> str:
    """Normalize channel name → lowercase + underscores"""
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ File not found: {INPUT_FILE}")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        channels = json.load(f)

    cleaned = []
    for i, ch in enumerate(channels):
        name = ch.get("name", "").strip()
        url = ch.get("url", "").strip()
        license_required = str(ch.get("license_required", "")).lower() in ["true", "yes", "1"]

        # 🧹 Skip invalid or restricted channels
        if not name or not url or license_required:
            print(f"⚠️ Skipping invalid or restricted channel: {name or '(unnamed)'}")
            continue

        # 🪄 Normalize ID if missing
        if "id" not in ch or not ch["id"].strip():
            ch["id"] = normalize_id(name)

        # 🧾 Optional defaults
        ch.setdefault("language", "Unknown")
        ch.setdefault("category", "Uncategorized")
        ch.setdefault("recordable", False)
        ch.setdefault("origin", "Unknown")
        ch.setdefault("status", "active")

        cleaned.append(ch)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)

    print(f"✅ Processed {len(channels)} → Kept {len(cleaned)} valid channels")
    print(f"💾 Saved cleaned list → {OUTPUT_FILE}")

if __name__ == "__main__":
    main()

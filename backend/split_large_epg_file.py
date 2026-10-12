import json
import os
from math import ceil

# === CONFIG ===
INPUT_FILE = 'final_clean_channels.json'
OUTPUT_DIR = 'split_epg'
ENTRIES_PER_FILE = 500  # 🔧 Adjust as needed (e.g., 1000)

# === Load EPG File ===
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    epg_data = json.load(f)

total = len(epg_data)
chunks = ceil(total / ENTRIES_PER_FILE)

# === Create Output Folder ===
os.makedirs(OUTPUT_DIR, exist_ok=True)

# === Split & Save ===
for i in range(chunks):
    start = i * ENTRIES_PER_FILE
    end = start + ENTRIES_PER_FILE
    chunk_data = epg_data[start:end]

    out_file = os.path.join(OUTPUT_DIR, f'epg_chunk_{i + 1}.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(chunk_data, f, indent=2)

    print(f"✅ Saved {out_file} ({len(chunk_data)} entries)")

print(f"\n📦 Split complete: {total} entries into {chunks} files.")

import os
import json
from datetime import datetime
import shutil
from shutil import rmtree

CLEAN_CHANNELS_FILE = "final_clean_channels.json"
PATCH_FILE = "channel_name_patch.json"
EPG_FOLDER = "../frontend/public/epg"

def load_clean_channels():
    if not os.path.exists(CLEAN_CHANNELS_FILE):
        raise FileNotFoundError(f"{CLEAN_CHANNELS_FILE} not found.")
    with open(CLEAN_CHANNELS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def load_name_patch():
    if os.path.exists(PATCH_FILE):
        with open(PATCH_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def apply_patch(channels, name_map):
    for ch in channels:
        if ch["name"] in name_map:
            ch["name"] = name_map[ch["name"]]
    return channels

def generate_dummy_epg(channel_id, channel_name):
    now = datetime.now(tz.UTC)
    start_time = now.replace(minute=0, second=0, microsecond=0)
    end_time = start_time.replace(hour=start_time.hour + 1)
    return {
        "channel_id": channel_id,
        "channel_name": channel_name,
        "programs": [
            {
                "start": start_time.isoformat() + "Z",
                "end": end_time.isoformat() + "Z",
                "title": f"Demo Program - {channel_name}"
            }
        ]
    }

def clear_epg_folder():
    if os.path.exists(EPG_FOLDER):
        rmtree(EPG_FOLDER)
    os.makedirs(EPG_FOLDER, exist_ok=True)

def save_epg_files(channels):
    for ch in channels:
        epg = generate_dummy_epg(ch["id"], ch["name"])
        path = os.path.join(EPG_FOLDER, f"{ch['id']}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(epg, f, indent=2)
        output_dir = "../frontend/public/epg"
        os.makedirs(output_dir, exist_ok=True)
# Copy all generated EPG files to frontend/public/epg
        for file in os.listdir("epg"):
            if file.endswith(".json"):
                shutil.copy2(f"epg/{file}", os.path.join(output_dir, file))

def main():
    print("🚀 FINAL Unified EPG Pipeline Starting...")
    clear_epg_folder()
    channels = load_clean_channels()
    name_map = load_name_patch()
    patched = apply_patch(channels, name_map)
    save_epg_files(patched)
    print(f"✅ EPG JSONs created in {EPG_FOLDER} for {len(patched)} channels.")

if __name__ == "__main__":
    main()

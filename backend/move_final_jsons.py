import os
import shutil

# Define source locations
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_PUBLIC = os.path.abspath(os.path.join(BACKEND_DIR, "../frontend/public"))
EPG_SOURCE_DIR = os.path.join(BACKEND_DIR, "epg")  # or wherever your scripts export to
EPG_TARGET_DIR = os.path.join(FRONTEND_PUBLIC, "epg")
CLEAN_JSON_SRC = os.path.join(BACKEND_DIR, "final_clean_channels.json")
CLEAN_JSON_DEST = os.path.join(FRONTEND_PUBLIC, "final_clean_channels.json")

# Ensure public/epg exists
os.makedirs(EPG_TARGET_DIR, exist_ok=True)

# Move EPG files
moved = 0
for file in os.listdir(EPG_SOURCE_DIR):
    if file.endswith(".json"):
        src = os.path.join(EPG_SOURCE_DIR, file)
        dest = os.path.join(EPG_TARGET_DIR, file)
        shutil.copy2(src, dest)
        moved += 1

# Move final_clean_channels.json
if os.path.exists(CLEAN_JSON_SRC):
    shutil.copy2(CLEAN_JSON_SRC, CLEAN_JSON_DEST)
    print(f"✅ Copied: final_clean_channels.json → /frontend/public/")
else:
    print("❌ Missing final_clean_channels.json")

print(f"✅ Moved {moved} EPG files to /frontend/public/epg/")

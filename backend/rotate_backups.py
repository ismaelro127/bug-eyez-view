import os
import glob
import shutil

# === CONFIG ===
BACKUP_ROOT = 'admin/backups'
MAX_BACKUPS = 7
DRY_RUN = False  # ✅ Set to True to preview, False to actually delete

# === Find all backup folders ===
folders = sorted(
    glob.glob(os.path.join(BACKUP_ROOT, 'run_*')),
    key=os.path.getmtime,
    reverse=True
)

print(f"🔍 Found {len(folders)} backup folders. Keeping {MAX_BACKUPS} most recent.")

# === Rotate backups ===
for old in folders[MAX_BACKUPS:]:
    if DRY_RUN:
        print(f"🚫 DRY-RUN: Would delete {old}")
    else:
        try:
            print(f"🗑️ Deleting old backup: {old}")
            shutil.rmtree(old)
        except Exception as e:
            print(f"❌ Failed to delete {old}: {e}")

print("✅ Backup rotation complete.")

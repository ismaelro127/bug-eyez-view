"""
Crime Time EPG Builder for BugEyezView

This script builds a 7-day JSON EPG for channels that use the
Bugz Crime Time block layout.

Blocks:
  - detective_mornings      (06:00–12:00)
  - case_files_afternoon    (12:00–17:00)
  - mystery_hour            (17:00–20:00)
  - prime_crime             (20:00–00:00)
  - deep_suspense_night     (00:00–03:00)
  - after_midnight          (03:00–06:00)
"""

import json
import os
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_movies(channel_id):
    path = os.path.join(BASE_DIR, channel_id, "metadata", "movies_master.json")
    with open(path, "r", encoding="utf-8") as f:
        movies = json.load(f)
    return {m["id"]: m for m in movies}

def load_schedule(channel_id, day_index):
    path = os.path.join(BASE_DIR, channel_id, "metadata", f"schedule_day{day_index}.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def build_epg_for_day(channel_id, day_index, start_date):
    movies = load_movies(channel_id)
    schedule = load_schedule(channel_id, day_index)
    blocks = schedule["blocks"]

    block_times = {
        "detective_mornings": (6, 0),
        "case_files_afternoon": (12, 0),
        "mystery_hour": (17, 0),
        "prime_crime": (20, 0),
        "deep_suspense_night": (0, 0),   # midnight
        "after_midnight": (3, 0),
    }

    programs = []
    for block_name, movie_ids in blocks.items():
        if block_name not in block_times:
            continue
        hour, minute = block_times[block_name]
        # If the block is "deep_suspense_night" or "after_midnight", it belongs to next day logically
        day_offset = 0
        if block_name in ("deep_suspense_night", "after_midnight"):
            day_offset = 1

        current_start = datetime.combine(start_date + timedelta(days=day_offset), datetime.min.time()).replace(
            hour=hour, minute=minute
        )

        for mid in movie_ids:
            m = movies.get(mid)
            if not m:
                continue
            runtime = m.get("runtime_minutes", 90)
            start_time = current_start
            end_time = start_time + timedelta(minutes=runtime)
            programs.append({
                "channel_id": channel_id,
                "movie_id": mid,
                "title": m["title"],
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "block": block_name
            })
            current_start = end_time

    return programs

def build_week_epg(channel_id, out_path, start_date=None):
    if start_date is None:
        start_date = datetime.utcnow().date()

    week_programs = []
    for day_index in range(1, 8):
        day_date = start_date + timedelta(days=day_index - 1)
        day_programs = build_epg_for_day(channel_id, day_index, day_date)
        week_programs.extend(day_programs)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(week_programs, f, indent=2)
    print(f"EPG written to {out_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python build_crime_epg.py <channel_id>")
        sys.exit(1)
    channel_id = sys.argv[1]
    out_file = os.path.join(BASE_DIR, channel_id, "epg", "epg_week.json")
    build_week_epg(channel_id, out_file)
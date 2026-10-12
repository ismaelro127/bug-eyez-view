Bugz Crime Time Channel
=======================

This folder contains the backend configuration for the FAST-style channel
"Bugz Crime Time", focused on detective, suspense, and non-gangster crime stories.

This pack is STRUCTURE-READY:
- 50 placeholder movie entries in metadata/movies_master.json
  -> You will later replace these with real (mostly color) public-domain crime/suspense films.
  -> Each has: id, title, year, runtime, genre, perspective, default play block, etc.

- 7-day schedules in metadata/schedule_day1.json ... schedule_day7.json
  -> Each day uses different movie ordering across blocks.

Crime Time Blocks
-----------------
- detective_mornings      (06:00–12:00)
- case_files_afternoon    (12:00–17:00)
- mystery_hour            (17:00–20:00)
- prime_crime             (20:00–00:00)
- deep_suspense_night     (00:00–03:00)
- after_midnight          (03:00–06:00)

Usage
-----
1. Replace placeholder titles in metadata/movies_master.json with your real
   Bugz Crime Time film library (maintain unique ids and runtimes).
2. Keep or regenerate schedules in metadata/schedule_dayX.json as needed.
3. Use build_crime_epg.py (in backend/channels) to generate EPG JSON:
     python build_crime_epg.py bugz_crime_time
   This will write epg/epg_week.json for this channel.
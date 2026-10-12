Bug Eyez Crime & Mystery Classics (Gangster-Heavy Channel)
==========================================================

This folder contains the backend configuration for the FAST-style channel
"Bug Eyez Crime & Mystery Classics" with a gangster/crime/noir focus.

Key Files
---------
- metadata/movies_master.json
    Master catalog of the 50 movies in this channel.
- metadata/schedule_day1.json ... schedule_day7.json
    Per-day block schedules using movie IDs from movies_master.json.
- epg/epg_template.json
    Template for building XMLTV/JSON EPG from schedules + runtimes.
- hls/
    Intended target for generated HLS manifests and segments.
- genres/
    Logical grouping path for where media files can be stored.
- playblocks/
    Optional: can store precomputed block sequences if you want.

Usage
-----
1. Place your encoded movie files somewhere on disk or in object storage.
2. Extend build_playout.py (in backend/channels) to:
   - Read movies_master.json
   - Read the appropriate schedule_dayX.json
   - Build EPG + HLS playlists that point at your actual media locations.

Nothing in this folder contains video. It's all metadata and structure to
plug into your existing BugEyezView backend.
#!/bin/bash

echo "🚀 [Bugz View] Daily EPG Pipeline START"

# 1️⃣ Fetch fresh EPG XML
echo "🔗 Fetching fresh EPG feed..."
python fetch_epg.py

# 2️⃣ Validate channels
echo "🔍 Validating channels..."
node merge_and_monitor_channels.cjs

# 3️⃣ Generate EPG map
echo "🗺️ Generating EPG map..."
python generate_epg_map.py

# 4️⃣ Unified pipeline
echo "🔗 Running unified EPG pipeline..."
python unified_ai_pipeline.py

# 5️⃣ Group by source
echo "📊 Group by source for CSV/M3U..."
python group_channels_by_source.py

# 6️⃣ Done
echo "✅ [Bugz View] Daily EPG Pipeline DONE"

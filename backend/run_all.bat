@echo off
title 🐞 Bug Eyez View - Full Pipeline Runner
echo.
echo 🚀 Starting Bug Eyez View Full Pipeline...
echo ----------------------------------------

REM Step 1: Fetch legal playlists
echo 🔄 Step 1: Fetch legal playlists...
python fetch_playlists.py
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Step 1 failed. Aborting...
    pause
    exit /b %ERRORLEVEL%
)
echo ✅ Step 1 complete.
echo.

REM Step 2: Merge & monitor all channels
echo 🔄 Step 2: Merge and monitor
node "merge_and_monitor_channels.cjs"
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Step 2 failed. Aborting...
    pause
    exit /b %ERRORLEVEL%
)
echo ✅ Step 2 complete.
echo.

REM Step 2.5: Filter legal channels from monitored list
echo 🔄 Step 2.5: Filter legal channels from monitored stream list...
python filter_legal_from_whitelist.py
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Step 2.5 failed. Aborting...
    pause
    exit /b %ERRORLEVEL%
)
echo ✅ Step 2.5 complete.

REM Step 3: Match EPG to channels
echo 🔄 Step 3: Match EPG to channels...
node "smart_epg_matcher.cjs"
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Step 3 failed. Aborting...
    pause
    exit /b %ERRORLEVEL%
)
echo ✅ Step 3 complete.
echo.

REM Step 4: Generate EPG Map
echo 🔄 Step 4: Generate enhanced EPG map...
python generate_epg_map.py
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Step 4 failed. Aborting...
    pause
    exit /b %ERRORLEVEL%
)
echo ✅ Step 4 complete.
echo.

REM Step 5: Final EPG AI Pipeline
echo 🔄 Step 5: Run final unified EPG pipeline...
python unified_epg_ai_pipeline.py
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Step 5 failed. Aborting...
    pause
    exit /b %ERRORLEVEL%
)
echo ✅ Step 5 complete.
echo.

echo 🎉 All steps completed successfully!
pause
exit /b 0

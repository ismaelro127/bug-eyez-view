# bugz_crime_time_automgr.ps1
# 1) Encode all remaining MP4s in Movies/ as fMP4 HLS (one .m3u8 per movie)
# 2) Rebuild fast.m3u8 as a master playlist that chains all movie playlists

$ErrorActionPreference = "Stop"

# ---- PATHS (edit if needed) ----
$channelRoot = "C:\BugEyezView\frontend\public\channels\bugz_crime_time"
$moviesPath  = Join-Path $channelRoot "Movies"
$fastOut     = Join-Path $channelRoot "fast.m3u8"

Write-Host "=== Bugz Crime Time AutoManager ===" -ForegroundColor Cyan
Write-Host "Movies folder : $moviesPath"
Write-Host "FAST playlist : $fastOut"
Write-Host ""

if (-not (Test-Path $moviesPath)) {
    Write-Host "Movies path not found: $moviesPath" -ForegroundColor Red
    exit 1
}

# ---- BANNED / SKIP LIST ----
# 2632 is the Hoodlum trailer you don't want to schedule right now.
$bannedBaseNames = @(
    "2632"  # Hoodlum trailer placeholder
)

# ---- STEP 1: ENCODE REMAINING MP4s TO fMP4 HLS ----

# All main MP4s (skip *_init.mp4 etc.)
$mp4Files = Get-ChildItem -Path $moviesPath -Filter *.mp4 |
            Where-Object { $_.BaseName -notlike "*_init" }

if ($mp4Files.Count -eq 0) {
    Write-Host "No MP4 files found in $moviesPath" -ForegroundColor Yellow
} else {
    Write-Host "Found $($mp4Files.Count) MP4 files to check." -ForegroundColor Green
}

foreach ($mp4 in $mp4Files) {
    $base = $mp4.BaseName

    if ($bannedBaseNames -contains $base) {
        Write-Host "⏭ Skipping banned title: $base" -ForegroundColor DarkYellow
        continue
    }

    $moviePath  = $mp4.FullName
    $playlist   = Join-Path $moviesPath ($base + ".m3u8")

    if (Test-Path $playlist) {
        Write-Host "✅ Already encoded: $base ($($mp4.Name))"
        continue
    }

    Write-Host ""
    Write-Host "🎬 Encoding to HLS fMP4: $($mp4.Name)" -ForegroundColor Cyan

    $initFile    = "${base}_init.mp4"
    $segmentPattern = "${base}_%04d.m4s"

    # Build ffmpeg args as an array to avoid quoting issues
    $ffArgs = @(
        "-y",
        "-i", $moviePath,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ac", "2",
        "-f", "hls",
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_segment_type", "fmp4",
        "-hls_fmp4_init_filename", $initFile,
        "-hls_segment_filename", $segmentPattern,
        $playlist
    )

    try {
        & ffmpeg @ffArgs
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ ffmpeg failed for $($mp4.Name) (exit $LASTEXITCODE)" -ForegroundColor Red
            continue
        } else {
            Write-Host "✅ HLS playlist created: $playlist" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Exception while encoding $($mp4.Name): $_" -ForegroundColor Red
        continue
    }
}

# ---- STEP 2: REBUILD fast.m3u8 FROM ALL VALID MOVIE PLAYLISTS ----

Write-Host ""
Write-Host "=== Rebuilding FAST master playlist ===" -ForegroundColor Cyan

# Collect all per-movie playlists (exclude fast.m3u8 itself if it sits in Movies)
$moviePlaylists = Get-ChildItem -Path $moviesPath -Filter *.m3u8 |
                  Where-Object {
                      $_.Name -ne "fast.m3u8" -and
                      $_.BaseName -notin $bannedBaseNames
                  }

if ($moviePlaylists.Count -eq 0) {
    Write-Host "❌ No movie .m3u8 playlists found to build FAST." -ForegroundColor Red
    exit 1
}

# Optional: shuffle them so order is random
$shuffled = $moviePlaylists | Sort-Object { Get-Random }

$lines = @()
$lines += "#EXTM3U"
$lines += ""
$lines += "# Auto-generated FAST playlist for Bugz Crime Time"
$lines += "# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")"
$lines += ""

foreach ($pl in $shuffled) {
    $relPath = "Movies/" + $pl.Name

    $lines += "#EXT-X-STREAM-INF:BANDWIDTH=800000"
    $lines += $relPath
    $lines += ""
    Write-Host "➕ Added to FAST: $relPath"
}

$lines | Set-Content -Encoding UTF8 $fastOut

Write-Host ""
Write-Host "✅ FAST playlist updated: $fastOut" -ForegroundColor Green
Write-Host "Done."

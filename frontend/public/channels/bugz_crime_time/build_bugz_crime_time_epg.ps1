# build_bugz_crime_time_epg.ps1
# Build a 24h EPG for bugz_crime_time based ONLY on local files + ffprobe

$ErrorActionPreference = "Stop"

# ---- PATHS (edit if needed) ----
$channelId    = "bugz_crime_time"
$metadataPath = "C:\BugEyezView\backend\epg\metadata\bugz_crime_time_metadata.json"
$channelRoot  = "C:\BugEyezView\frontend\public\channels\bugz_crime_time"
$moviesPath   = Join-Path $channelRoot "Movies"
$outEpgPath   = "C:\BugEyezView\frontend\public\epg\bugz_crime_time.json"

Write-Host "=== Build EPG for $channelId ===" -ForegroundColor Cyan

if (-not (Test-Path $metadataPath)) {
    Write-Host "Metadata JSON not found: $metadataPath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $moviesPath)) {
    Write-Host "Movies path not found: $moviesPath" -ForegroundColor Red
    exit 1
}

# Load metadata
$metaJson = Get-Content $metadataPath -Raw
$moviesMeta = $metaJson | ConvertFrom-Json

if ($moviesMeta.Count -eq 0) {
    Write-Host "No entries in metadata JSON." -ForegroundColor Red
    exit 1
}

# Helper: get duration in seconds via ffprobe
function Get-MovieDurationSeconds {
    param(
        [string]$FilePath
    )

    if (-not (Test-Path $FilePath)) {
        Write-Host "  ⚠ File not found for duration: $FilePath" -ForegroundColor Yellow
        return 3600  # default 60 min
    }

    $ffArgs = @(
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        $FilePath
    )

    try {
        $out = & ffprobe @ffArgs 2>$null
        if ([string]::IsNullOrWhiteSpace($out)) {
            return 3600
        }

        $seconds = [double]::Parse($out.Trim(), [System.Globalization.CultureInfo]::InvariantCulture)
        if ($seconds -le 0) { return 3600 }
        return [int][math]::Round($seconds)
    }
    catch {
        Write-Host "  ⚠ ffprobe failed for $FilePath: $_" -ForegroundColor Yellow
        return 3600
    }
}

# ---- Build 24-hour schedule, starting from top of current hour ----
$now        = Get-Date
$startClock = Get-Date -Year $now.Year -Month $now.Month -Day $now.Day -Hour $now.Hour -Minute 0 -Second 0
$endLimit   = $startClock.AddHours(24)

Write-Host "Schedule start: $startClock"
Write-Host "Schedule end  : $endLimit"
Write-Host ""

$programs = @()
$cursor   = $startClock
$index    = 0

while ($cursor -lt $endLimit) {
    $meta = $moviesMeta[ $index % $moviesMeta.Count ]
    $index++

    $fileName = $meta.file
    $title    = $meta.title
    $year     = $meta.year
    $desc     = $meta.description
    if ([string]::IsNullOrWhiteSpace($desc)) {
        $desc = "Classic crime feature film."
    }

    $mp4Path = Join-Path $moviesPath $fileName

    Write-Host "⏱ Getting duration for: $fileName"
    $seconds = Get-MovieDurationSeconds -FilePath $mp4Path

    $startTime = $cursor
    $endTime   = $cursor.AddSeconds($seconds)

    if ($endTime -gt $endLimit) {
        # Trim last program to fit 24h window
        $endTime = $endLimit
    }

    $dateStr      = $startTime.ToString("yyyy-MM-dd")
    $timeLocalStr = $startTime.ToString("HH:mm")

    $startUtc = $startTime.ToUniversalTime().ToString("o")
    $endUtc   = $endTime.ToUniversalTime().ToString("o")

    $prog = [PSCustomObject]@{
        channel        = $channelId
        date           = $dateStr
        time_local     = $timeLocalStr
        title          = if ($year -gt 0) { "$title ($year)" } else { $title }
        description    = $desc
        category       = "Movie"
        thumbnail      = ""
        link           = ""
        start_utc_xml  = $startUtc
        stop_utc_xml   = $endUtc
    }

    $programs += $prog

    $cursor = $endTime
}

Write-Host ""
Write-Host "Total programs generated: $($programs.Count)" -ForegroundColor Green

# Output JSON
$epgJson = $programs | ConvertTo-Json -Depth 4
$epgDir  = Split-Path $outEpgPath -Parent
if (-not (Test-Path $epgDir)) {
    New-Item -ItemType Directory -Path $epgDir | Out-Null
}

$epgJson | Set-Content -Encoding UTF8 $outEpgPath

Write-Host "✅ EPG written to: $outEpgPath" -ForegroundColor Green

# ==========================
#  Bugz Crime Time Metadata Puller (TMDB + OMDb)
#  CLEAN VERSION — COMPATIBLE POWERSHELL SYNTAX
# ==========================

$ErrorActionPreference = "SilentlyContinue"

# Set movie folder
$movieFolder = "C:\BugEyezView\frontend\public\channels\bugz_crime_time\Movies"

# Load API keys
$TMDB_API_KEY = $env:TMDB_API_KEY
$OMDB_API_KEY = $env:OMDB_API_KEY

# Output path
$outputFile = "C:\BugEyezView\frontend\public\epg\bugz_crime_time_metadata.json"

Write-Host "Starting metadata extraction..."

# Get MP4 files (skip init files)
$files = Get-ChildItem -Path $movieFolder -Filter *.mp4 |
    Where-Object { $_.Name -notmatch "_init" }

# Storage for all metadata
$metadata = @()

# Helper: Extract friendly title + year from filename
function Parse-Title {
    param($name)

    $base = [System.IO.Path]::GetFileNameWithoutExtension($name)
    $clean = $base -replace "_", " "

    # Year extraction
    $year = $null
    if ($clean -match "(19\d{2}|20\d{2})") {
        $year = [int]$matches[1]
    }

    # Remove year from title
    $title = $clean -replace "(19\d{2}|20\d{2})", ""
    $title = $title.Trim()

    return @{ title = $title; year = $year }
}

# TMDB Search
function Search-TMDB {
    param($title, $year)

    if (-not $TMDB_API_KEY) { return $null }

    $query = [uri]::EscapeDataString($title)
    $url = "https://api.themoviedb.org/3/search/movie?api_key=$TMDB_API_KEY&query=$query"

    if ($year) { $url += "&year=$year" }

    try { return Invoke-RestMethod -Uri $url -Method Get }
    catch { return $null }
}

# OMDb Search
function Search-OMDb {
    param($title, $year)

    if (-not $OMDB_API_KEY) { return $null }

    $query = [uri]::EscapeDataString($title)
    $url = "http://www.omdbapi.com/?apikey=$OMDB_API_KEY&t=$query"

    if ($year) { $url += "&y=$year" }

    try { return Invoke-RestMethod -Uri $url -Method Get }
    catch { return $null }
}

# Main loop
foreach ($file in $files) {

    Write-Host "Processing: $($file.Name)"

    $parsed = Parse-Title $file.Name
    $title = $parsed.title
    $year  = $parsed.year

    # TMDB attempt
    $tmdb = Search-TMDB -title $title -year $year

    if ($tmdb -and $tmdb.results -and $tmdb.results.Count -gt 0) {
        $best = $tmdb.results[0]

        $metadata += [PSCustomObject]@{
            title        = $best.title
            file         = $file.Name
            year         = $best.release_date.Substring(0,4)
            runtime_sec  = $null
            genre        = $best.genre_ids
            summary      = $best.overview
            cast         = @()
            source       = "tmdb"
        }
        continue
    }

    # OMDb attempt
    $omdb = Search-OMDb -title $title -year $year

    if ($omdb -and $omdb.Response -eq "True") {
        $metadata += [PSCustomObject]@{
            title        = $omdb.Title
            file         = $file.Name
            year         = $omdb.Year
            runtime_sec  = ($omdb.Runtime -replace " min","")
            genre        = $omdb.Genre
            summary      = $omdb.Plot
            cast         = $omdb.Actors -split ",\s*"
            source       = "omdb"
        }
        continue
    }

    # No match
    $metadata += [PSCustomObject]@{
        title        = $title
        file         = $file.Name
        year         = $year
        runtime_sec  = $null
        genre        = $null
        summary      = $null
        cast         = @()
        source       = "none"
    }
}

# Save output
$metadata | ConvertTo-Json -Depth 5 | Out-File -Encoding UTF8 $outputFile

Write-Host "Metadata saved to: $outputFile"

# Tavari - media backup + Cloudinary migration inventory (read-only)
# Pulls current trips.image_urls / trips.accommodation_photos / gallery.media_url
# from Supabase via the public anon key and writes:
#   backups/media-backup-<date>.json   (exact values, used to generate rollback SQL)
#   backups/media-inventory.csv        (checklist; paste Cloudinary URLs into new_url)
# Nothing is written to Supabase.

param(
  [string]$OutDir = "backups"
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$SUPABASE_URL = "https://hpwgnmtlfbmaisdxezrc.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwd2dubXRsZmJtYWlzZHhlenJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjU1MTYsImV4cCI6MjA5OTM0MTUxNn0.0k6lSxDX4J2Qz-163fDnRsTQieQ-H2i5IFfeKx-59hY"
$headers = @{ "apikey" = $ANON_KEY; "Authorization" = "Bearer $ANON_KEY" }

function Get-Rows($path) {
  Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/$path" -Headers $headers
}

function Slugify($s) {
  $x = $s.ToLowerInvariant()
  $x = $x -replace "&", " and "
  $x = $x -replace "[^a-z0-9]+", "-"
  $x = $x -replace "(^-|-$)", ""
  return $x
}

$root = Split-Path -Parent $PSScriptRoot
$outFull = Join-Path $root $OutDir
if (-not (Test-Path -LiteralPath $outFull)) { New-Item -ItemType Directory -Path $outFull | Out-Null }

$stamp = Get-Date -Format "yyyy-MM-dd"

$trips = Get-Rows "trips?select=id,title,image_urls,accommodation_photos&order=created_at"
$gallery = Get-Rows "gallery?select=id,media_url,is_video,position&order=position"

$backup = [ordered]@{
  exported_at = (Get-Date).ToString("o")
  supabase_url = $SUPABASE_URL
  trips = @($trips | ForEach-Object {
    [ordered]@{ id = $_.id; title = $_.title; image_urls = @($_.image_urls); accommodation_photos = @($_.accommodation_photos) }
  })
  gallery = @($gallery | ForEach-Object {
    [ordered]@{ id = $_.id; position = $_.position; is_video = $_.is_video; media_url = $_.media_url }
  })
}
$backupPath = Join-Path $outFull "media-backup-$stamp.json"
$backup | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $backupPath -Encoding UTF8
$backup | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $outFull "media-backup-latest.json") -Encoding UTF8

$rows = New-Object System.Collections.ArrayList
foreach ($t in $trips) {
  $slug = Slugify $t.title
  $i = 0
  foreach ($u in @($t.image_urls)) {
    $i++
    [void]$rows.Add([pscustomobject]@{
      scope = "trips.image_urls"; trip_id = $t.id; trip_title = $t.title; field = "image_urls"; index = $i
      old_url = $u; bytes = ""; content_type = ""
      upload_folder = "tavari/$slug"; suggested_public_id = "hero-$('{0:d2}' -f $i)"; new_url = ""
    })
  }
  $i = 0
  foreach ($u in @($t.accommodation_photos)) {
    $i++
    [void]$rows.Add([pscustomobject]@{
      scope = "trips.accommodation_photos"; trip_id = $t.id; trip_title = $t.title; field = "accommodation_photos"; index = $i
      old_url = $u; bytes = ""; content_type = ""
      upload_folder = "tavari/$slug"; suggested_public_id = "acc-$('{0:d2}' -f $i)"; new_url = ""
    })
  }
}
foreach ($g in $gallery) {
  if (-not $g.media_url) { continue }
  [void]$rows.Add([pscustomobject]@{
    scope = "gallery.media_url"; trip_id = $g.id; trip_title = ""; field = "media_url"; index = $g.position
    old_url = $g.media_url; bytes = ""; content_type = ""
    upload_folder = "tavari/gallery"; suggested_public_id = "gallery-$('{0:d2}' -f [int]$g.position)"; new_url = ""
  })
}

foreach ($r in $rows) {
  try {
    $resp = Invoke-WebRequest -Uri $r.old_url -UseBasicParsing -TimeoutSec 60
    $r.bytes = $resp.RawContentLength
    $r.content_type = $resp.Headers['Content-Type']
  } catch {
    $r.bytes = "ERROR"
    $r.content_type = "ERROR"
  }
}

$csvPath = Join-Path $outFull "media-inventory-$stamp.csv"
$rows | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8
$rows | Export-Csv -LiteralPath (Join-Path $outFull "media-inventory-latest.csv") -NoTypeInformation -Encoding UTF8

"Backup:    $backupPath"
"Inventory: $csvPath"
"Rows:      $($rows.Count)"
$rows | Group-Object scope | ForEach-Object { "  {0,-30} {1}" -f $_.Name, $_.Count }
"Already on Cloudinary: " + (@($rows | Where-Object { $_.old_url -match 'res\.cloudinary\.com' }).Count)
"Total bytes: " + [math]::Round((($rows | Where-Object { $_.bytes -ne "ERROR" } | Measure-Object -Property bytes -Sum).Sum / 1MB), 1) + " MB"

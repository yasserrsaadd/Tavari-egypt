# Tavari hero video encoder
# ffmpeg 9.0 full build. Run:  powershell -File scripts/encode-hero.ps1
# Source is the original clip. Swap $src for a 1080p/4K master to truly raise quality.
# Strategy: target-bitrate so VP9/AV1 (served to modern browsers) are SMALLER than H.264
# while matching its quality. Mobile gets 480p. Poster re-extracted sharp + optimized.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "Videos\hero-background.mp4"
$vid = Join-Path $root "Videos"
$img = Join-Path $root "images"

# Desktop H.264 (high-quality fallback for old browsers)
ffmpeg -y -i $src -an -c:v libx264 -preset slow -pix_fmt yuv420p -movflags +faststart `
  -vf "scale=1280:720" -b:v 2200k -maxrate 2800k -bufsize 4400k (Join-Path $vid "hero-desktop.mp4")

# Desktop VP9 (served to Chrome/Firefox/Edge) — two-pass for accurate bitrate
ffmpeg -y -i $src -an -c:v libvpx-vp9 -b:v 1500k -pass 1 -passlogfile (Join-Path $vid "vp9d") `
  -vf "scale=1280:720" -pix_fmt yuv420p -f null NUL
ffmpeg -y -i $src -an -c:v libvpx-vp9 -b:v 1500k -pass 2 -passlogfile (Join-Path $vid "vp9d") `
  -vf "scale=1280:720" -pix_fmt yuv420p -quality good -cpu-used 2 (Join-Path $vid "hero-desktop.webm")

# Desktop AV1 (served to newest browsers, smallest)
ffmpeg -y -i $src -an -c:v libsvtav1 -pix_fmt yuv420p -movflags +faststart `
  -vf "scale=1280:720" -b:v 1400k (Join-Path $vid "hero-desktop.av1.mp4")

# Mobile H.264 (480p lightweight)
ffmpeg -y -i $src -an -c:v libx264 -preset slow -pix_fmt yuv420p -movflags +faststart `
  -vf "scale=854:480" -b:v 900k -maxrate 1200k -bufsize 1800k (Join-Path $vid "hero-mobile.mp4")

# Mobile VP9 — two-pass
ffmpeg -y -i $src -an -c:v libvpx-vp9 -b:v 650k -pass 1 -passlogfile (Join-Path $vid "vp9m") `
  -vf "scale=854:480" -pix_fmt yuv420p -f null NUL
ffmpeg -y -i $src -an -c:v libvpx-vp9 -b:v 650k -pass 2 -passlogfile (Join-Path $vid "vp9m") `
  -vf "scale=854:480" -pix_fmt yuv420p -quality good -cpu-used 2 (Join-Path $vid "hero-mobile.webm")

# Poster: sharp frame, optimized JPEG
ffmpeg -y -ss 00:00:02 -i $src -frames:v 1 -update 1 -q:v 3 -vf "scale=1280:720" (Join-Path $img "hero-poster.jpg")

Remove-Item (Join-Path $vid "vp9d*"), (Join-Path $vid "vp9m*") -ErrorAction SilentlyContinue
Write-Host "Done."
Get-ChildItem $vid -Include hero-desktop.*,hero-mobile.* | Sort-Object Name | `
  Select-Object Name, @{n='MB';e={[math]::Round($_.Length/1MB,2)}}

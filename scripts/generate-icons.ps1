Add-Type -AssemblyName System.Drawing

# 16x16 Diamond Pickaxe pixel art map
# . = Transparent
# 0 = Outline (#103838)
# 1 = Highlight Diamond (#b8fbfb)
# 2 = Main Diamond (#42ebd8)
# 3 = Mid Diamond (#23a19b)
# 4 = Dark Diamond (#146362)
# 5 = Highlight Wood (#9d7249)
# 6 = Main Wood (#6f5032)
# 7 = Shadow Wood (#4d3721)
# 8 = Tip Wood (#2d1f11)

$pixels = @(
    "................",
    ".......000000...",
    ".....001122240..",
    "....0112222240..",
    "...0122222400...",
    "..0122224006....",
    ".01222400675....",
    "012440.0675.....",
    "0440..0675......",
    ".00..0675.......",
    "....0675........",
    "...0675.........",
    "..0675..........",
    ".0675...........",
    "0675............",
    "078............."
)

$colorMap = @{
    '.' = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
    '0' = [System.Drawing.Color]::FromArgb(255, 16, 56, 56)
    '1' = [System.Drawing.Color]::FromArgb(255, 184, 251, 251)
    '2' = [System.Drawing.Color]::FromArgb(255, 66, 235, 216)
    '3' = [System.Drawing.Color]::FromArgb(255, 35, 161, 155)
    '4' = [System.Drawing.Color]::FromArgb(255, 20, 99, 98)
    '5' = [System.Drawing.Color]::FromArgb(255, 157, 114, 73)
    '6' = [System.Drawing.Color]::FromArgb(255, 111, 80, 50)
    '7' = [System.Drawing.Color]::FromArgb(255, 77, 55, 33)
    '8' = [System.Drawing.Color]::FromArgb(255, 45, 31, 17)
}

$bmp16 = New-Object System.Drawing.Bitmap 16, 16
for ($y = 0; $y -lt 16; $y++) {
    $line = $pixels[$y]
    for ($x = 0; $x -lt 16; $x++) {
        $char = [string]$line[$x]
        $color = $colorMap[$char]
        if ($null -eq $color) { $color = [System.Drawing.Color]::Transparent }
        $bmp16.SetPixel($x, $y, $color)
    }
}

function Scale-Bitmap($src, $size) {
    $dest = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    return $dest
}

# Create build directory
$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$buildDir = Join-Path $rootDir "build"
$electronDir = Join-Path $rootDir "electron"
if (!(Test-Path $buildDir)) { New-Item -ItemType Directory -Path $buildDir | Out-Null }

# Generate 256x256 high-res crisp pixel art
$bmp256 = Scale-Bitmap $bmp16 256
$bmp256.Save((Join-Path $buildDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp256.Save((Join-Path $electronDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)

# Generate 32x32 for Tray
$bmp32 = Scale-Bitmap $bmp16 32
$bmp32.Save((Join-Path $electronDir "tray-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)

# Build Windows .ICO containing PNG streams (256, 128, 64, 48, 32, 16)
$sizes = @(256, 128, 64, 48, 32, 16)
$iconPngs = @()
foreach ($sz in $sizes) {
    $scaled = Scale-Bitmap $bmp16 $sz
    $ms = New-Object System.IO.MemoryStream
    $scaled.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $iconPngs += @{ Size = $sz; Bytes = $ms.ToArray() }
    $ms.Dispose()
    $scaled.Dispose()
}

$icoStream = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $icoStream

# ICO Header: 0, 0, 1 (icon type), count
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$sizes.Count)

$offset = 6 + ($sizes.Count * 16)

foreach ($item in $iconPngs) {
    $w = if ($item.Size -eq 256) { [byte]0 } else { [byte]$item.Size }
    $h = if ($item.Size -eq 256) { [byte]0 } else { [byte]$item.Size }
    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0) # colors in palette
    $bw.Write([byte]0) # reserved
    $bw.Write([uint16]1) # color planes
    $bw.Write([uint16]32) # bpp
    $bw.Write([uint32]$item.Bytes.Length)
    $bw.Write([uint32]$offset)
    $offset += $item.Bytes.Length
}

foreach ($item in $iconPngs) {
    $bw.Write($item.Bytes)
}

$icoBytes = $icoStream.ToArray()
[System.IO.File]::WriteAllBytes((Join-Path $buildDir "icon.ico"), $icoBytes)
[System.IO.File]::WriteAllBytes((Join-Path $electronDir "icon.ico"), $icoBytes)

$bw.Dispose()
$icoStream.Dispose()
$bmp16.Dispose()
$bmp32.Dispose()
$bmp256.Dispose()

Write-Output "Iconos generados exitosamente en build/ y electron/"

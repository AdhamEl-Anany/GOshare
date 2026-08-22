Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\Dell\Downloads\Goshare\assets\images\logo-square.jpeg"
$resDir = "c:\Users\Dell\Downloads\Goshare\android\app\src\main\res"

$img = [System.Drawing.Image]::FromFile($srcPath)

$sizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($folder in $sizes.Keys) {
    $size = $sizes[$folder]
    $targetFolder = Join-Path $resDir $folder
    if (-not (Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
    }
    
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()

    $targetIcon = Join-Path $targetFolder "ic_launcher.png"
    $targetIconRound = Join-Path $targetFolder "ic_launcher_round.png"
    $targetIconFg = Join-Path $targetFolder "ic_launcher_foreground.png"

    $bmp.Save($targetIcon, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($targetIconRound, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($targetIconFg, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated $folder ($size x $size)"
}

$img.Dispose()
Write-Host "All Android App launcher icons successfully updated with GOshare logo!"

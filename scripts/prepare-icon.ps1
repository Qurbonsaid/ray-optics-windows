# Prepare icon for electron-builder
# Requires at least 256x256 PNG

Add-Type -AssemblyName System.Drawing

$sourceIcon = "icon-temp.png"
$outputIcon = "icon.png"

if (Test-Path $sourceIcon) {
    $img = [System.Drawing.Image]::FromFile((Resolve-Path $sourceIcon))

    Write-Host "Original icon size: $($img.Width)x$($img.Height)"

    # Check if we need to resize
    if ($img.Width -lt 256 -or $img.Height -lt 256) {
        Write-Host "Resizing to 256x256..."

        $newImg = New-Object System.Drawing.Bitmap(256, 256)
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($img, 0, 0, 256, 256)

        $img.Dispose()
        $newImg.Save($outputIcon, [System.Drawing.Imaging.ImageFormat]::Png)
        $newImg.Dispose()
        $graphics.Dispose()

        Write-Host "Icon saved as $outputIcon (256x256)"
    } else {
        Write-Host "Icon is already large enough, copying..."
        $img.Dispose()
        Copy-Item $sourceIcon $outputIcon
    }

    Remove-Item $sourceIcon
} else {
    Write-Host "Warning: No icon found at $sourceIcon"
}

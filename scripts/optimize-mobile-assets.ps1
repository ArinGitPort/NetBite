param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assets = @(
  @{ Source = 'assets/images/devices/device-pc.png'; Output = 'assets/images/devices/device-pc-mobile.png'; Width = 512; Height = 280 },
  @{ Source = 'assets/images/devices/device-router.png'; Output = 'assets/images/devices/device-router-mobile.png'; Width = 512; Height = 280 },
  @{ Source = 'assets/images/devices/device-switch.png'; Output = 'assets/images/devices/device-switch-mobile.png'; Width = 461; Height = 280 },
  @{ Source = 'assets/images/ethernet/ethernet-copper-cable.png'; Output = 'assets/images/ethernet/ethernet-copper-cable-mobile.png'; Width = 512; Height = 512 },
  @{ Source = 'assets/images/ethernet/ethernet-fiber-cable.png'; Output = 'assets/images/ethernet/ethernet-fiber-cable-mobile.png'; Width = 512; Height = 512 },
  @{ Source = 'assets/images/ethernet/ethernet-nic.png'; Output = 'assets/images/ethernet/ethernet-nic-mobile.png'; Width = 512; Height = 512 },
  @{ Source = 'assets/images/ethernet/ethernet-port-bank.png'; Output = 'assets/images/ethernet/ethernet-port-bank-mobile.png'; Width = 512; Height = 512 },
  @{ Source = 'assets/images/packets/packet.png'; Output = 'assets/images/packets/packet-mobile.png'; Width = 128; Height = 128 },
  @{ Source = 'assets/images/icons/icon-arrow-left.png'; Output = 'assets/images/icons/icon-arrow-left-mobile.png'; Width = 128; Height = 128 },
  @{ Source = 'assets/images/icons/icon-arrow-right.png'; Output = 'assets/images/icons/icon-arrow-right-mobile.png'; Width = 128; Height = 128 },
  @{ Source = 'assets/images/icons/icon-check.png'; Output = 'assets/images/icons/icon-check-mobile.png'; Width = 128; Height = 128 },
  @{ Source = 'assets/images/icons/icon-close.png'; Output = 'assets/images/icons/icon-close-mobile.png'; Width = 128; Height = 128 },
  @{ Source = 'assets/images/icons/icon-lock.png'; Output = 'assets/images/icons/icon-lock-mobile.png'; Width = 128; Height = 128 },
  @{ Source = 'assets/images/icons/icon-reset.png'; Output = 'assets/images/icons/icon-reset-mobile.png'; Width = 128; Height = 128 },
  @{ Source = 'assets/images/education/source/server-terminal.png'; Output = 'assets/images/education/server-terminal-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/ethernet-frame.png'; Output = 'assets/images/education/ethernet-frame-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/ipv4-datagram.png'; Output = 'assets/images/education/ipv4-datagram-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/arp-request.png'; Output = 'assets/images/education/arp-request-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/arp-reply.png'; Output = 'assets/images/education/arp-reply-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/arp-cache.png'; Output = 'assets/images/education/arp-cache-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/icmp-echo-request.png'; Output = 'assets/images/education/icmp-echo-request-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/icmp-echo-reply.png'; Output = 'assets/images/education/icmp-echo-reply-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/route-table.png'; Output = 'assets/images/education/route-table-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/vlan-tagged-frame.png'; Output = 'assets/images/education/vlan-tagged-frame-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/transport-channel.png'; Output = 'assets/images/education/transport-channel-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/session-handshake.png'; Output = 'assets/images/education/session-handshake-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/presentation-encoding.png'; Output = 'assets/images/education/presentation-encoding-mobile.png'; Width = 256; Height = 256; Pixelated = $true },
  @{ Source = 'assets/images/education/source/application-window.png'; Output = 'assets/images/education/application-window-mobile.png'; Width = 256; Height = 256; Pixelated = $true }
)

foreach ($asset in $assets) {
  $sourcePath = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot $asset.Source))
  $outputPath = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot $asset.Output))
  $assetRoot = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot 'assets\images'))

  if (-not $sourcePath.StartsWith($assetRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
      -not $outputPath.StartsWith($assetRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Asset path escaped the image directory: $sourcePath"
  }

  $source = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $bitmap = New-Object System.Drawing.Bitmap($asset.Width, $asset.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        if ($asset.Pixelated) {
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        } else {
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        }
        $graphics.DrawImage($source, 0, 0, $asset.Width, $asset.Height)
      } finally {
        $graphics.Dispose()
      }
      $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}

Write-Output "Generated $($assets.Count) mobile-ready assets while preserving the source artwork."

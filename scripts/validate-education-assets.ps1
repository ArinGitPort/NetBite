$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$assetNames = @(
  'server-terminal', 'ethernet-frame', 'ipv4-datagram', 'arp-request', 'arp-reply',
  'arp-cache', 'icmp-echo-request', 'icmp-echo-reply', 'route-table',
  'vlan-tagged-frame', 'transport-channel', 'session-handshake',
  'presentation-encoding', 'application-window'
)

$assetRoot = Join-Path $PSScriptRoot '..\assets\images\education'

foreach ($name in $assetNames) {
  $sourcePath = Join-Path $assetRoot "source\$name.png"
  $mobilePath = Join-Path $assetRoot "$name-mobile.png"

  if (-not (Test-Path -LiteralPath $sourcePath)) { throw "Missing source asset: $sourcePath" }
  if (-not (Test-Path -LiteralPath $mobilePath)) { throw "Missing mobile asset: $mobilePath" }

  $source = [System.Drawing.Bitmap]::new($sourcePath)
  $mobile = [System.Drawing.Bitmap]::new($mobilePath)
  try {
    if ($mobile.Width -ne 256 -or $mobile.Height -ne 256) {
      throw "$mobilePath must be 256x256; found $($mobile.Width)x$($mobile.Height)"
    }

    $corners = @(
      $source.GetPixel(0, 0),
      $source.GetPixel($source.Width - 1, 0),
      $source.GetPixel(0, $source.Height - 1),
      $source.GetPixel($source.Width - 1, $source.Height - 1)
    )
    if (($corners | Where-Object { $_.A -ne 0 }).Count -gt 0) {
      throw "$sourcePath does not have transparent corners"
    }

    for ($y = 0; $y -lt $mobile.Height; $y += 4) {
      for ($x = 0; $x -lt $mobile.Width; $x += 4) {
        $pixel = $mobile.GetPixel($x, $y)
        if ($pixel.A -gt 20 -and $pixel.R -gt 220 -and $pixel.B -gt 200 -and $pixel.G -lt 80) {
          throw "$mobilePath contains a visible chroma-key fringe near $x,$y"
        }
      }
    }
  }
  finally {
    $source.Dispose()
    $mobile.Dispose()
  }
}

Write-Output "Validated $($assetNames.Count) education source assets and mobile variants."


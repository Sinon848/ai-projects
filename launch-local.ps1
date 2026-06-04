$ErrorActionPreference = "Stop"

function Get-AppName {
  return -join ([char[]](0x56FE, 0x7247, 0x538B, 0x7F29, 0x5DE5, 0x574A))
}

function Normalize-Path {
  param([string]$Path)

  return [System.IO.Path]::GetFullPath(($Path -replace "/", "\"))
}

$repoRoot = $PSScriptRoot
$desktop = [Environment]::GetFolderPath("Desktop")
$appName = Get-AppName
$shortcutFileName = "$appName.lnk"
$shortcutPath = Join-Path $desktop $shortcutFileName
$shortcutTarget = Normalize-Path (Join-Path $repoRoot "launch-local.bat")
$shortcutIcon = Join-Path $repoRoot "assets\shortcut-icon.ico"
$serverScript = Join-Path $repoRoot "server.js"
$indexFile = Join-Path $repoRoot "index.html"

$wsh = New-Object -ComObject WScript.Shell

Get-ChildItem -LiteralPath $desktop -Filter "*.lnk" -File | ForEach-Object {
  try {
    $existingShortcut = $wsh.CreateShortcut($_.FullName)
    $existingTarget = $existingShortcut.TargetPath
    if ($existingTarget) {
      $existingTarget = Normalize-Path $existingTarget
    }

    if ($existingTarget -and ($existingTarget -ieq $shortcutTarget) -and $_.Name -ne $shortcutFileName) {
      Remove-Item -LiteralPath $_.FullName -Force
    }
  } catch {
    # Ignore shortcuts we cannot inspect or delete.
  }
}

$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $shortcutTarget
$shortcut.WorkingDirectory = $repoRoot
if (Test-Path -LiteralPath $shortcutIcon) {
  $shortcut.IconLocation = "$shortcutIcon,0"
}
$shortcut.Description = $appName
$shortcut.Save()

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  Start-Process $indexFile
  exit 0
}

Start-Process -WindowStyle Hidden -FilePath $node -ArgumentList "`"$serverScript`""

$deadline = (Get-Date).AddSeconds(10)
while ((Get-Date) -lt $deadline) {
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:4173" -TimeoutSec 1 | Out-Null
    Start-Process "http://127.0.0.1:4173"
    exit 0
  } catch {
    Start-Sleep -Milliseconds 250
  }
}

Start-Process $indexFile

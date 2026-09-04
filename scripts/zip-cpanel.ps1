<#
    Zip the cPanel bundles with POSIX paths.

    Why not Compress-Archive: it writes Windows path separators into the entry
    names ("src\config\db.js"). Windows tolerates that; Linux does not. On the
    cPanel server every entry extracts as a single file whose *name* contains
    backslashes, so instead of a directory tree you get a flat pile of files
    called things like "src\config\db.js" — and Passenger reports only that it
    cannot find the startup file.

    ZipFile::CreateEntry lets us name each entry ourselves, so the archive is
    written the way the target platform expects.

    Usage:
      powershell -ExecutionPolicy Bypass -File scripts/zip-cpanel.ps1 `
        -SourceRoot dist-cpanel -OutputDir "$HOME/Downloads"
#>
param(
    [Parameter(Mandatory = $true)][string]$SourceRoot,
    [Parameter(Mandatory = $true)][string]$OutputDir,
    [string]$Prefix = 'melkaoda-cpanel',
    [string]$Stamp = (Get-Date -Format 'yyyy-MM-dd')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Bundle directory -> the name the operator sees in Downloads.
$bundles = [ordered]@{
    'api' = 'backend'
    'web' = 'frontend'
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

foreach ($bundle in $bundles.GetEnumerator()) {
    $sourceDir = Join-Path (Resolve-Path $SourceRoot) $bundle.Key
    if (-not (Test-Path $sourceDir)) {
        throw "Missing bundle directory: $sourceDir. Run 'npm run package:cpanel' first."
    }

    $zipPath = Join-Path $OutputDir ("{0}-{1}-{2}.zip" -f $Prefix, $bundle.Value, $Stamp)
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

    $root = (Resolve-Path $sourceDir).Path.TrimEnd('\', '/')
    $files = Get-ChildItem -Path $root -Recurse -File -Force

    $archive = [System.IO.Compression.ZipFile]::Open(
        $zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($file in $files) {
            # Entry name relative to the bundle root, with forward slashes.
            $relative = $file.FullName.Substring($root.Length).TrimStart('\', '/')
            $entryName = $relative -replace '\\', '/'
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive, $file.FullName, $entryName,
                [System.IO.Compression.CompressionLevel]::Optimal)
        }
    }
    finally {
        $archive.Dispose()
    }

    $sizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
    Write-Output ("{0}  ({1} files, {2} MB)" -f $zipPath, $files.Count, $sizeMb)
}

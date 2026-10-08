# NEW scope: preserve the regenerated Inference endpoint before one coordinated restart.
# Audit is metadata-only and may run while the error UI is open. Apply requires
# separate direct approval AND zero Docker Desktop/backend processes.
param([ValidateSet('Audit','Apply')][string]$Mode = 'Audit')
$ErrorActionPreference = 'Stop'
$source = 'C:\Users\HP\AppData\Local\Docker\run'
$destination = 'C:\Users\HP\AppData\Local\Docker\run.skyguide-preserved-20261008-coordinated-72db3d9'
$secretsSource = 'C:\Users\HP\AppData\Local\docker-secrets-engine'
$evidenceRoot = 'E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07'
$evidence = Join-Path $evidenceRoot 'docker-coordinated-runtime-repair-before.json'
$applied = Join-Path $evidenceRoot 'docker-coordinated-runtime-repair-applied.json'
if ([IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'Docker/run')) -ine $source) { throw 'Wrong Windows profile' }
if ([IO.Path]::GetDirectoryName($source) -cne [IO.Path]::GetDirectoryName($destination)) { throw 'Rename escaped intended directory' }
function Get-EndpointMetadata([string]$path) {
    $directory = Get-Item -LiteralPath $path -Force
    if (!$directory.PSIsContainer -or ($directory.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unexpected directory: STOP' }
    @(Get-ChildItem -LiteralPath $path -Force | Sort-Object Name | ForEach-Object {
        if ($_.PSIsContainer -or $_.Length -ne 0 -or !($_.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unexpected endpoint: STOP' }
        [ordered]@{name=$_.Name;length=$_.Length;attributes=[string]$_.Attributes;lastWriteUtc=$_.LastWriteTimeUtc.ToString('o')}
    })
}
function Confirm-OriginalPreservation {
    foreach ($file in @('docker-runtime-repair-before.json','docker-secrets-runtime-repair-before.json')) {
        $original = Get-Content -LiteralPath (Join-Path $evidenceRoot $file) -Raw | ConvertFrom-Json
        $expectedPath = if ($file -eq 'docker-runtime-repair-before.json') {
            'C:\Users\HP\AppData\Local\Docker\run.skyguide-preserved-20261008-6ff3fa7'
        } else { 'C:\Users\HP\AppData\Local\docker-secrets-engine.skyguide-preserved-20261008-a6a83ec' }
        if ($original.destination -cne $expectedPath) { throw 'Original receipt path drift: STOP' }
        $actual = @(Get-EndpointMetadata $expectedPath)
        if (($actual | ConvertTo-Json -Depth 5 -Compress) -cne (@($original.objects) | ConvertTo-Json -Depth 5 -Compress)) { throw 'Original preserved endpoint metadata drift: STOP' }
    }
}
foreach ($path in @([IO.Path]::GetDirectoryName($source),[IO.Path]::GetDirectoryName($secretsSource))) {
    $parent = Get-Item -LiteralPath $path -Force
    if (!$parent.PSIsContainer -or ($parent.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unexpected parent: STOP' }
}
if (Test-Path -LiteralPath $secretsSource) { throw 'Secrets Engine active path reappeared: STOP' }
if ((Test-Path -LiteralPath $destination) -or (Test-Path -LiteralPath $applied)) { throw 'Destination/applied receipt already exists: STOP' }
Confirm-OriginalPreservation
$objects = @(Get-EndpointMetadata $source)
if ($objects.Count -ne 1 -or $objects[0].name -cne 'dockerInference' -or
    $objects[0].lastWriteUtc -cne '2026-10-08T09:46:50.3037690Z') { throw 'Regenerated endpoint inventory/timestamp drift: STOP' }
$state = [ordered]@{source=$source;destination=$destination;objects=$objects;secretsActivePathAbsent=$true;
    originalPreservationsExact=$true;zeroDockerProcessesRequiredForApply=$true;
    action='Preserve regenerated run directory by rename; one restart with both active paths absent; stop on any further error'}
$json = $state | ConvertTo-Json -Depth 5
if ($Mode -eq 'Audit') {
    if (Test-Path -LiteralPath $evidence) { throw 'Do not overwrite reviewed evidence' }
    $json | Set-Content -LiteralPath $evidence -Encoding UTF8
    Write-Output 'Metadata proposal PASS; Apply NOT RUN; Docker must be closed before Apply'
} else {
    if (Get-CimInstance Win32_Process -Filter "Name = 'Docker Desktop.exe' OR Name = 'com.docker.backend.exe'") { throw 'Docker still running: STOP' }
    if (!(Test-Path -LiteralPath $evidence -PathType Leaf)) { throw 'Missing reviewed evidence' }
    if ((Get-Content -LiteralPath $evidence -Raw).Trim() -cne $json.Trim()) { throw 'Reviewed runtime metadata drift: STOP' }
    Rename-Item -LiteralPath $source -NewName ([IO.Path]::GetFileName($destination))
    if ((Test-Path -LiteralPath $source) -or (Test-Path -LiteralPath $secretsSource)) { throw 'Active runtime path present: STOP' }
    $preserved = @(Get-EndpointMetadata $destination)
    if (($preserved | ConvertTo-Json -Depth 5 -Compress) -cne ($objects | ConvertTo-Json -Depth 5 -Compress)) { throw 'Preservation postcondition failed: STOP' }
    Confirm-OriginalPreservation
    $json | Set-Content -LiteralPath $applied -Encoding UTF8
    Write-Output 'Regenerated endpoint preserved; both active paths absent; one approved restart pending'
}
# No automatic reverse rename: if restart recreates either path retain all copies
# and STOP. Never delete/overwrite, force-stop, change settings, VHD, WSL or workloads.

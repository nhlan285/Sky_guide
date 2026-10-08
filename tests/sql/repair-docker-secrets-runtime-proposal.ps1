# New scope proposal: reversible rename of precisely one stale Secrets Engine endpoint.
# Audit is read-only. Apply requires separate direct user approval, not6ff3fa7 alone.
param([ValidateSet('Audit','Apply')][string]$Mode = 'Audit')
$ErrorActionPreference = 'Stop'
$source = 'C:\Users\HP\AppData\Local\docker-secrets-engine'
$destination = 'C:\Users\HP\AppData\Local\docker-secrets-engine.skyguide-preserved-20261008-a6a83ec'
$evidence = 'E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07/docker-secrets-runtime-repair-before.json'
$expectedNames = @('engine.sock')
if ([IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'docker-secrets-engine')) -ine $source) { throw 'Wrong Windows profile' }
if ([IO.Path]::GetDirectoryName($source) -cne [IO.Path]::GetDirectoryName($destination)) { throw 'Rename escaped Docker directory' }
if (Get-CimInstance Win32_Process -Filter "Name = 'Docker Desktop.exe' OR Name = 'com.docker.backend.exe'") { throw 'Docker still running: STOP' }
if (Test-Path -LiteralPath $destination) { throw 'Preserved destination already exists: STOP' }
$parent = Get-Item -LiteralPath ([IO.Path]::GetDirectoryName($source)) -Force
$directory = Get-Item -LiteralPath $source -Force
foreach ($item in @($parent,$directory)) {
    if (!$item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Directory is not the expected ordinary directory' }
}
$children = @(Get-ChildItem -LiteralPath $source -Force | Sort-Object Name)
if (($children.Name -join '|') -cne ($expectedNames -join '|')) { throw 'Runtime directory inventory changed: STOP' }
foreach ($item in $children) {
    if ($item.PSIsContainer -or $item.Length -ne 0 -or !($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unexpected runtime object: STOP' }
}
$state = [ordered]@{source=$source;destination=$destination;objects=@($children | ForEach-Object {
    [ordered]@{name=$_.Name;length=$_.Length;attributes=[string]$_.Attributes;lastWriteUtc=$_.LastWriteTimeUtc.ToString('o')}
});dockerProcesses=0;action='Rename directory only; preserve the original Secrets Engine endpoint; no delete/config/workload/WSL changes'}
$json = $state | ConvertTo-Json -Depth 5
if ($Mode -eq 'Audit') {
    if (Test-Path -LiteralPath $evidence) { throw 'Existing proposal evidence: do not overwrite' }
    $json | Set-Content -LiteralPath $evidence -Encoding UTF8
    Write-Output 'Read-only repair guard PASS; rename NOT RUN, separate approval required'
} else {
    if (!(Test-Path -LiteralPath $evidence -PathType Leaf)) { throw 'Missing reviewed proposal evidence' }
    if ((Get-Content -LiteralPath $evidence -Raw).Trim() -cne $json.Trim()) { throw 'Runtime metadata drift: STOP' }
    Rename-Item -LiteralPath $source -NewName ([IO.Path]::GetFileName($destination))
    if ((Test-Path -LiteralPath $source) -or !(Test-Path -LiteralPath $destination)) { throw 'Rename postcondition failed: STOP' }
    Write-Output 'Original Secrets Engine endpoint preserved by rename; restart readiness pending'
}

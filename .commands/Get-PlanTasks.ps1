[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$planPath = Join-Path $repoRoot 'docs/plan/IMPLEMENTATION_PLAN.md'
$moduleName = ''
$phaseName = ''
foreach ($line in Get-Content -LiteralPath $planPath -Encoding UTF8) {
    if ($line -match '^## (Phase [0-9]+.*)$') { $phaseName = $Matches[1] }
    if ($line -match '^### (.+)$') { $moduleName = $Matches[1] }
    if ($line -notmatch '^\| P[0-9]+-[A-Z][0-9]+ \|') { continue }
    $cells = @($line.Trim().Trim('|').Split('|') | ForEach-Object { $_.Trim() })
    if ($cells.Count -eq 6) {
        $offset = 0
        $moduleCode = ($cells[0] -split '-')[1].Substring(0, 1)
        $moduleNames = @{ I = 'Infra'; D = 'Data pipeline'; W = 'Wardrobe'; H = 'Hub'; U = 'UX'; R = 'Research' }
        $taskModule = $moduleNames[$moduleCode]
        if (-not $taskModule) { $taskModule = $moduleName }
    } elseif ($cells.Count -eq 7) {
        $offset = 1
        $taskModule = $cells[1]
    } else {
        throw "Unexpected task table shape: $($cells[0])"
    }
    [pscustomobject]@{
        Id = $cells[0]
        Phase = $phaseName
        Module = $taskModule
        Action = $cells[1 + $offset]
        Acceptance = $cells[2 + $offset]
        Dependencies = $cells[3 + $offset]
        Complexity = $cells[4 + $offset]
        Gate = $cells[5 + $offset]
    }
}

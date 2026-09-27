[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$issues = New-Object 'System.Collections.Generic.List[string]'
$requiredFiles = @(
    'README.md', 'CONTRIBUTING.md', '.gitignore', '.gitattributes', '.editorconfig',
    'knowledge/README.md', 'docs/PROJECT_BRIEF.md',
    'docs/PRD.md', 'docs/ARCHITECTURE.md', 'docs/DATA_SCHEMA.md',
    'docs/UX_GUIDELINES.md', 'docs/LEGAL_STATUS.md',
    'docs/plan/IMPLEMENTATION_PLAN.md', '.agents/README.md',
    '.agents/data-curator.md', '.agents/wardrobe-engineer.md',
    '.agents/hub-ux-engineer.md', '.agents/release-rights-reviewer.md',
    '.agents/skills/sky-wiki-source/SKILL.md',
    '.agents/skills/sky-normalize-data/SKILL.md',
    '.commands/README.md', '.commands/Get-PlanTasks.ps1'
)
foreach ($relativePath in $requiredFiles) {
    $fullPath = Join-Path $repoRoot $relativePath
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        $issues.Add("Missing file: $relativePath")
    } elseif ((Get-Item -LiteralPath $fullPath).Length -eq 0) {
        $issues.Add("Empty document: $relativePath")
    }
}
foreach ($directory in @('app', 'features/wardrobe', 'features/hub', 'features/profile', 'shared', 'data', 'pwa')) {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot "src/$directory/.gitkeep"))) {
        $issues.Add("Missing source scaffold: $directory")
    }
}
for ($sourceNumber = 1; $sourceNumber -le 14; $sourceNumber++) {
    $prefix = '{0:D2}-*.md' -f $sourceNumber
    $sourceFiles = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot 'knowledge') -Filter $prefix -File)
    if ($sourceFiles.Count -ne 1) { $issues.Add("Expected one source file: $prefix") }
}
foreach ($skillFile in Get-ChildItem -LiteralPath (Join-Path $repoRoot '.agents/skills') -Filter SKILL.md -Recurse -File) {
    $skillText = Get-Content -LiteralPath $skillFile.FullName -Raw -Encoding UTF8
    if ($skillText -notmatch '(?s)^---\r?\nname: [a-z0-9-]+\r?\ndescription: .+?\r?\n---') {
        $issues.Add("Invalid skill frontmatter: $($skillFile.FullName)")
    }
}
$markdownFiles = @(Get-ChildItem -LiteralPath $repoRoot -Filter '*.md' -Recurse -File |
    Where-Object { $_.FullName -notmatch '[\\/](node_modules|\.git|dist)[\\/]' })
foreach ($markdownFile in $markdownFiles) {
    $markdownText = Get-Content -LiteralPath $markdownFile.FullName -Raw -Encoding UTF8
    foreach ($linkMatch in [regex]::Matches($markdownText, '\[[^\]]+\]\(([^)]+)\)')) {
        $target = $linkMatch.Groups[1].Value.Trim().Trim('<', '>')
        if ($target -match '^[a-z][a-z0-9+.-]*:' -or $target.StartsWith('#')) { continue }
        $localTarget = ($target -split '#', 2)[0]
        if (-not $localTarget) { continue }
        $resolvedTarget = Join-Path $markdownFile.DirectoryName ([uri]::UnescapeDataString($localTarget))
        if (-not (Test-Path -LiteralPath $resolvedTarget)) {
            $issues.Add("Broken local link in $($markdownFile.Name): $target")
        }
    }
}
$tasks = @(& (Join-Path $PSScriptRoot 'Get-PlanTasks.ps1'))
foreach ($group in $tasks | Group-Object Id | Where-Object Count -gt 1) {
    $issues.Add("Duplicate task ID: $($group.Name)")
}
foreach ($task in $tasks) {
    if (-not $task.Action -or -not $task.Acceptance -or -not $task.Dependencies -or -not $task.Gate) {
        $issues.Add("Incomplete task: $($task.Id)")
    }
    if ($task.Complexity -notin @('Thấp', 'Trung bình', 'Cao')) {
        $issues.Add("Invalid complexity: $($task.Id)")
    }
}
if ($tasks.Count -lt 100) { $issues.Add('Implementation plan has fewer than 100 granular tasks; inspect table parsing or content.') }
if ($issues.Count -gt 0) {
    foreach ($issue in $issues) { Write-Output "ERROR: $issue" }
    exit 1
}
Write-Output "PASS: $($markdownFiles.Count) Markdown files, 14 source profiles, $($tasks.Count) unique tasks; required scaffold and local links valid."
Write-Output 'Scope: document structure only. APIs, legal rights, application behavior and deployment are not verified by this command.'

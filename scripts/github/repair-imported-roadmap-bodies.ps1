param(
  [string]$Repo,
  [string]$RoadmapPath = "Gaps/46-github-milestones-epics-issues-traceability.md",
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $Repo) {
  throw "Pass -Repo owner/name"
}

if (-not (Test-Path $RoadmapPath)) {
  throw "Roadmap file not found: $RoadmapPath"
}

function Write-Info([string]$msg) {
  Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

function Parse-EpicTraceability([string]$path) {
  $lines = Get-Content $path
  $epicTrace = @{}
  $currentEpic = ""

  foreach ($line in $lines) {
    if ($line -match '^####\s+EPIC\s+(E\d+)\s+-\s+(.+)$') {
      $currentEpic = $Matches[1]
      if (-not $epicTrace.ContainsKey($currentEpic)) {
        $epicTrace[$currentEpic] = @()
      }
      continue
    }

    if ($currentEpic -and $line -match '^\s*-\s+traceability_sources:\s+(.+)$') {
      $paths = [regex]::Matches($Matches[1], '\(([^)]+)\)') | ForEach-Object { $_.Groups[1].Value }
      $epicTrace[$currentEpic] = @($paths)
      continue
    }

    if ($line -match '^###\s+M\d+\s+-\s+') {
      $currentEpic = ""
    }
  }

  return $epicTrace
}

function Get-MatchingIssues([string]$repo) {
  $raw = gh issue list --repo $repo --state all --search '"Imported from: Gaps/46-github-milestones-epics-issues-traceability.md" "System.Object[]" in:body' --limit 200 --json number,title,body,url
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to list matching issues"
  }
  return ($raw | ConvertFrom-Json)
}

$traceMap = Parse-EpicTraceability -path $RoadmapPath
$issues = Get-MatchingIssues -repo $Repo

Write-Info "Matching issues with System.Object[]: $($issues.Count)"

$updated = 0
foreach ($issue in $issues) {
  $body = [string]$issue.body
  $epic = ""

  if ($body -match 'Parent Epic:\s*(E\d+)') {
    $epic = $Matches[1]
  }
  elseif ($body -match 'Epic Key:\s*(E\d+)') {
    $epic = $Matches[1]
  }

  if (-not $epic -or -not $traceMap.ContainsKey($epic) -or $traceMap[$epic].Count -eq 0) {
    Write-Info "Skip #$($issue.number) no traceability map for epic '$epic'"
    continue
  }

  $traceBlock = "Traceability Sources:`n" + (($traceMap[$epic] | ForEach-Object { "- $_" }) -join "`n")

  $newBody = $body
  $newBody = [regex]::Replace(
    $newBody,
    'Traceability Sources:\s*System\.Object\[\]',
    [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $traceBlock },
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if ($newBody -eq $body) {
    Write-Info "No replacement needed for #$($issue.number)"
    continue
  }

  if ($DryRun) {
    Write-Info "DRY RUN would update #$($issue.number)"
    continue
  }

  gh issue edit $issue.number --repo $Repo --body $newBody | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to update issue #$($issue.number)"
  }

  $updated++
  Write-Info "Updated #$($issue.number)"
}

Write-Info "Done. Updated=$updated"

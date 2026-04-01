param(
  [string]$Repo = "",
  [string]$RoadmapPath = "Gaps/46-github-milestones-epics-issues-traceability.md",
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$msg) {
  Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

function Resolve-Repo([string]$explicitRepo) {
  if ($explicitRepo -and $explicitRepo.Trim().Length -gt 0) {
    return $explicitRepo.Trim()
  }

  $remoteUrl = (git remote get-url origin 2>$null)
  if (-not $remoteUrl) {
    throw "Could not resolve repo from git remote. Pass -Repo owner/name."
  }

  if ($remoteUrl -match "github\.com[:/](.+?)(\.git)?$") {
    return $Matches[1]
  }

  throw "Origin remote is not a GitHub URL. Pass -Repo owner/name."
}

function Ensure-GhAuth {
  $null = gh --version
  $status = gh auth status 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI is not authenticated. Run: gh auth login"
  }
  Write-Info "GitHub CLI auth is ready."
}

function Get-AllMilestones([string]$repo) {
  $page = 1
  $all = @()
  while ($true) {
    $raw = gh api "repos/$repo/milestones?state=all&per_page=100&page=$page"
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to list milestones for $repo"
    }
    $chunk = $raw | ConvertFrom-Json
    if (-not $chunk -or $chunk.Count -eq 0) {
      break
    }
    $all += $chunk
    if ($chunk.Count -lt 100) {
      break
    }
    $page++
  }
  return $all
}

function Ensure-Milestone([string]$repo, [string]$title, [string]$description) {
  $all = Get-AllMilestones -repo $repo
  $existing = $all | Where-Object { $_.title -eq $title } | Select-Object -First 1
  if ($existing) {
    Write-Info "Milestone exists: $title (#$($existing.number))"
    return $existing
  }

  Write-Info "Creating milestone: $title"
  if ($DryRun) {
    return [pscustomobject]@{ title = $title; number = -1 }
  }

  $json = @{ title = $title; description = $description; state = "open" } | ConvertTo-Json -Compress
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    Set-Content -Path $tmp -Value $json -NoNewline
    $raw = gh api -X POST "repos/$repo/milestones" --input $tmp
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create milestone: $title"
    }
    return ($raw | ConvertFrom-Json)
  }
  finally {
    Remove-Item -Path $tmp -ErrorAction SilentlyContinue
  }
}

function Get-IssueByExactTitle([string]$repo, [string]$title) {
  $escaped = $title.Replace('"','`"')
  $query = "repo:$repo in:title `"$escaped`""
  $raw = gh issue list --repo $repo --state all --search $query --limit 50 --json number,title,url
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to query issue by title: $title"
  }
  $items = $raw | ConvertFrom-Json
  return ($items | Where-Object { $_.title -eq $title } | Select-Object -First 1)
}

function Ensure-Labels([string]$repo, [string[]]$labels) {
  foreach ($label in ($labels | Sort-Object -Unique)) {
    if (-not $label -or $label.Trim().Length -eq 0) { continue }
    if ($DryRun) {
      Write-Info "DRY RUN ensure label: $label"
      continue
    }

    gh label create $label --repo $repo --force --color BFDADC --description "autocreated by roadmap importer" | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to ensure label: $label"
    }
  }
}

function Ensure-Issue([string]$repo, [string]$title, [string]$body, [string]$milestoneTitle, [string[]]$labels) {
  $existing = Get-IssueByExactTitle -repo $repo -title $title
  if ($existing) {
    Write-Info "Issue exists: $title (#$($existing.number))"
    if (-not $DryRun) {
      gh issue edit $existing.number --repo $repo --body $body --milestone $milestoneTitle | Out-Null
      if ($LASTEXITCODE -ne 0) {
        throw "Failed to update existing issue #$($existing.number)"
      }
      foreach ($label in $labels) {
        gh issue edit $existing.number --repo $repo --add-label $label | Out-Null
        if ($LASTEXITCODE -ne 0) {
          throw "Failed to add label '$label' to #$($existing.number)"
        }
      }
    }
    return [int]$existing.number
  }

  if ($DryRun) {
    Write-Info "DRY RUN create issue: $title"
    return -1
  }

  $args = @("issue", "create", "--repo", $repo, "--title", $title, "--body", $body, "--milestone", $milestoneTitle)
  foreach ($label in $labels) {
    $args += @("--label", $label)
  }

  $url = gh @args
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create issue: $title"
  }

  if ($url -match "/issues/(\d+)$") {
    return [int]$Matches[1]
  }

  throw "Could not parse issue number from URL: $url"
}

function Parse-Roadmap([string]$path) {
  if (-not (Test-Path $path)) {
    throw "Roadmap file not found: $path"
  }

  $lines = Get-Content $path

  $milestones = @{}
  $epics = @{}
  $issues = @{}

  $inMilestoneTable = $false
  $currentEpicKey = ""
  $inEpicIssues = $false
  $currentIssueKey = ""

  foreach ($line in $lines) {
    if ($line -match '^\|\s*Milestone ID\s*\|') {
      $inMilestoneTable = $true
      continue
    }

    if ($inMilestoneTable) {
      if ($line -notmatch '^\|') {
        $inMilestoneTable = $false
      }
      elseif ($line -match '^\|---') {
        continue
      }
      else {
        $parts = $line.Trim('|').Split('|') | ForEach-Object { $_.Trim() }
        if ($parts.Count -ge 3 -and $parts[0] -match '^M\d+$') {
          $milestones[$parts[0]] = [pscustomobject]@{
            Key = $parts[0]
            Name = $parts[1]
            Goal = $parts[2]
            Title = "$($parts[0]) $($parts[1])"
          }
        }
        continue
      }
    }

    if ($line -match '^####\s+EPIC\s+(E\d+)\s+-\s+(.+)$') {
      $currentEpicKey = $Matches[1]
      $epicTitle = "EPIC ${currentEpicKey}: $($Matches[2].Trim())"
      $epics[$currentEpicKey] = [pscustomobject]@{
        Key = $currentEpicKey
        Title = $epicTitle
        Milestone = ""
        DependsOn = @()
        Traceability = @()
        Issues = @()
      }
      $inEpicIssues = $false
      $currentIssueKey = ""
      continue
    }

    if ($currentEpicKey -ne "") {
      if ($line -match '^\s*-\s+milestone:\s+(M\d+)') {
        $epics[$currentEpicKey].Milestone = $Matches[1]
        continue
      }
      if ($line -match '^\s*-\s+depends_on:\s+(.+)$') {
        $raw = $Matches[1].Trim()
        if ($raw -eq 'none') {
          $epics[$currentEpicKey].DependsOn = @()
        }
        else {
          $deps = $raw -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^E\d+$' }
          $epics[$currentEpicKey].DependsOn = @($deps)
        }
        continue
      }
      if ($line -match '^\s*-\s+traceability_sources:\s+(.+)$') {
        $srcs = [regex]::Matches($Matches[1], '\(([^)]+)\)') | ForEach-Object { $_.Groups[1].Value }
        $epics[$currentEpicKey].Traceability = @($srcs)
        continue
      }
      if ($line -match '^\s*-\s+issues:\s*$') {
        $inEpicIssues = $true
        continue
      }

      if ($inEpicIssues -and $line -match '^\s*-\s+ISSUE\s+(I-\d+):\s+(.+)$') {
        $currentIssueKey = $Matches[1]
        $issues[$currentIssueKey] = [pscustomobject]@{
          Key = $currentIssueKey
          Title = "$($currentIssueKey): $($Matches[2].Trim())"
          Epic = $currentEpicKey
          Milestone = $epics[$currentEpicKey].Milestone
          Labels = @()
          BlockedBy = @()
          Acceptance = ""
        }
        $epics[$currentEpicKey].Issues += $currentIssueKey
        continue
      }

      if ($currentIssueKey -ne "") {
        if ($line -match '^\s*-\s+labels:\s+(.+)$') {
          $labels = [regex]::Matches($Matches[1], '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value }
          $issues[$currentIssueKey].Labels = @($labels)
          continue
        }
        if ($line -match '^\s*-\s+blocked_by:\s+(.+)$') {
          $raw = $Matches[1].Trim()
          if ($raw -eq 'none') {
            $issues[$currentIssueKey].BlockedBy = @()
          }
          else {
            $deps = $raw -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^I-\d+$' }
            $issues[$currentIssueKey].BlockedBy = @($deps)
          }
          continue
        }
        if ($line -match '^\s*-\s+acceptance:\s+(.+)$') {
          $issues[$currentIssueKey].Acceptance = $Matches[1].Trim()
          continue
        }
      }
    }
  }

  return [pscustomobject]@{
    Milestones = $milestones
    Epics = $epics
    Issues = $issues
  }
}

$repoName = Resolve-Repo -explicitRepo $Repo
Write-Info "Target repo: $repoName"
Ensure-GhAuth

$model = Parse-Roadmap -path $RoadmapPath

if ($model.Milestones.Count -eq 0 -or $model.Epics.Count -eq 0 -or $model.Issues.Count -eq 0) {
  throw "Could not parse milestones/epics/issues from $RoadmapPath"
}

Write-Info "Parsed milestones=$($model.Milestones.Count), epics=$($model.Epics.Count), issues=$($model.Issues.Count)"

$allLabels = @('epic','blocked','depends-on')
foreach ($i in $model.Issues.Values) {
  $allLabels += $i.Labels
}
Ensure-Labels -repo $repoName -labels $allLabels

# Create milestones first
$milestoneTitleByKey = @{}
$milestoneOrder = $model.Milestones.Values | Sort-Object { [int]($_.Key -replace 'M','') }
foreach ($m in $milestoneOrder) {
  $desc = $m.Goal
  $obj = Ensure-Milestone -repo $repoName -title $m.Title -description $desc
  $milestoneTitleByKey[$m.Key] = $m.Title
}

# Create epics
$epicNumberByKey = @{}
$epicOrder = $model.Epics.Values | Sort-Object { [int]($_.Key -replace 'E','') }
foreach ($e in $epicOrder) {
  $traceLines = if ($e.Traceability.Count -gt 0) { $e.Traceability | ForEach-Object { "- $_" } } else { @('- none') }
  $bodyLines = @(
    "Epic Key: $($e.Key)",
    "Milestone: $($e.Milestone)",
    "Depends on Epics: $([string]::Join(', ', $e.DependsOn))",
    "",
    "Traceability Sources:"
  ) + $traceLines + @(
    "",
    "Imported from: $RoadmapPath"
  )
  $body = [string]::Join("`n", $bodyLines)

  $milestoneTitle = $milestoneTitleByKey[$e.Milestone]
  $num = Ensure-Issue -repo $repoName -title $e.Title -body $body -milestoneTitle $milestoneTitle -labels @('epic')
  $epicNumberByKey[$e.Key] = $num
}

# Add epic dependency backlinks
foreach ($e in $epicOrder) {
  $num = $epicNumberByKey[$e.Key]
  if ($num -lt 0) { continue }

  $refs = @()
  foreach ($dep in $e.DependsOn) {
    if ($epicNumberByKey.ContainsKey($dep) -and $epicNumberByKey[$dep] -gt 0) {
      $refs += "#$($epicNumberByKey[$dep])"
    }
  }
  if ($refs.Count -eq 0) { continue }

  if ($DryRun) {
    Write-Info "DRY RUN add epic blockers for #$num => $([string]::Join(', ', $refs))"
    continue
  }

  $current = gh issue view $num --repo $repoName --json body --jq .body
  $marker = "Blocked by Epics:"
  if ($current -notmatch [regex]::Escape($marker)) {
    $updated = "$current`n`n$marker $([string]::Join(', ', $refs))"
    gh issue edit $num --repo $repoName --body $updated | Out-Null
  }
}

# Create all issues
$issueNumberByKey = @{}
$issueOrder = $model.Issues.Values | Sort-Object { [int]($_.Key -replace 'I-','') }
foreach ($i in $issueOrder) {
  $epicNum = if ($epicNumberByKey.ContainsKey($i.Epic)) { $epicNumberByKey[$i.Epic] } else { -1 }
  $epicRef = if ($epicNum -gt 0) { "#$epicNum" } else { "(dry-run)" }

  $trace = $model.Epics[$i.Epic].Traceability
  $traceLines = if ($trace.Count -gt 0) { $trace | ForEach-Object { "- $_" } } else { @('- none') }

  $issueBodyLines = @(
    "Issue Key: $($i.Key)",
    "Parent Epic: $($i.Epic) ($epicRef)",
    "Milestone: $($i.Milestone)",
    "",
    "Acceptance:",
    $i.Acceptance,
    "",
    "Traceability Sources:"
  ) + $traceLines + @(
    "",
    "Imported from: $RoadmapPath"
  )
  $body = [string]::Join("`n", $issueBodyLines)

  $labels = @($i.Labels + @('depends-on')) | Sort-Object -Unique
  $milestoneTitle = $milestoneTitleByKey[$i.Milestone]
  $num = Ensure-Issue -repo $repoName -title $i.Title -body $body -milestoneTitle $milestoneTitle -labels $labels
  $issueNumberByKey[$i.Key] = $num
}

# Add issue blocker links
foreach ($i in $issueOrder) {
  $num = $issueNumberByKey[$i.Key]
  if ($num -lt 0) { continue }

  $refs = @()
  foreach ($dep in $i.BlockedBy) {
    if ($issueNumberByKey.ContainsKey($dep) -and $issueNumberByKey[$dep] -gt 0) {
      $refs += "#$($issueNumberByKey[$dep])"
    }
  }
  if ($refs.Count -eq 0) { continue }

  if ($DryRun) {
    Write-Info "DRY RUN add blockers for #$num => $([string]::Join(', ', $refs))"
    continue
  }

  $current = gh issue view $num --repo $repoName --json body --jq .body
  $marker = "Blocked by:"
  if ($current -notmatch [regex]::Escape($marker)) {
    $updated = "$current`n`n$marker $([string]::Join(', ', $refs))"
    gh issue edit $num --repo $repoName --body $updated | Out-Null
  }
  gh issue edit $num --repo $repoName --add-label blocked | Out-Null
}

Write-Info "Completed import from markdown roadmap."
Write-Info "Milestones: $($model.Milestones.Count)"
Write-Info "Epics: $($model.Epics.Count)"
Write-Info "Issues: $($model.Issues.Count)"
if ($DryRun) {
  Write-Info "Dry run only. No GitHub changes were made."
}

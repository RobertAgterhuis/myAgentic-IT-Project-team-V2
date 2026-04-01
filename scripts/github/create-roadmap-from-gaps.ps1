param(
  [string]$Repo = "",
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

function Invoke-GhApiJson([string]$Method, [string]$Path, [hashtable]$Body) {
  $json = $Body | ConvertTo-Json -Depth 20 -Compress
  if ($DryRun) {
    Write-Info "DRY RUN gh api -X $Method $Path body=$json"
    return $null
  }
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    Set-Content -Path $tmp -Value $json -NoNewline
    $result = gh api -X $Method $Path --input $tmp
    if ($LASTEXITCODE -ne 0) {
      throw "gh api failed for $Path"
    }
    return ($result | ConvertFrom-Json)
  }
  finally {
    Remove-Item -Path $tmp -ErrorAction SilentlyContinue
  }
}

function Get-AllMilestones([string]$repo) {
  $raw = gh api "repos/$repo/milestones?state=all&per_page=100"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to list milestones for $repo"
  }
  return ($raw | ConvertFrom-Json)
}

function Ensure-Milestone([string]$repo, [string]$title, [string]$description) {
  $all = Get-AllMilestones -repo $repo
  $existing = $all | Where-Object { $_.title -eq $title } | Select-Object -First 1
  if ($existing) {
    Write-Info "Milestone exists: $title (#$($existing.number))"
    return $existing
  }

  Write-Info "Creating milestone: $title"
  $created = Invoke-GhApiJson -Method "POST" -Path "repos/$repo/milestones" -Body @{
    title = $title
    description = $description
    state = "open"
  }

  if ($DryRun) {
    return [pscustomobject]@{ title = $title; number = -1 }
  }

  return $created
}

function New-Issue([string]$repo, [string]$title, [string]$body, [string]$milestone, [string[]]$labels) {
  $labelArgs = @()
  foreach ($label in $labels) {
    $labelArgs += @("--label", $label)
  }

  if ($DryRun) {
    Write-Info "DRY RUN issue create: $title (milestone=$milestone labels=$($labels -join ','))"
    return -1
  }

  $args = @("issue", "create", "--repo", $repo, "--title", $title, "--body", $body, "--milestone", $milestone)
  $args += $labelArgs
  $url = gh @args
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create issue: $title"
  }

  if ($url -match "/issues/(\d+)$") {
    return [int]$Matches[1]
  }

  throw "Could not parse issue number from URL: $url"
}

function Update-IssueBody([string]$repo, [int]$number, [string]$body) {
  if ($DryRun) {
    Write-Info "DRY RUN issue edit #$number"
    return
  }

  gh issue edit $number --repo $repo --body $body | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to update issue #$number"
  }
}

$repoName = Resolve-Repo -explicitRepo $Repo
Write-Info "Target repo: $repoName"
Ensure-GhAuth

$milestones = @(
  @{ Key = "M1"; Title = "M1 Security Baseline & Trust Boundaries"; Description = "Eliminate critical security bypasses and high-risk injection paths." },
  @{ Key = "M2"; Title = "M2 Durable Data & Migration Foundation"; Description = "Make persistence safe, recoverable, and migration-driven." },
  @{ Key = "M3"; Title = "M3 Reliability & Recovery Hardening"; Description = "Remove silent degradation and improve recovery and operability." },
  @{ Key = "M4"; Title = "M4 Platform Correctness & Wiring Integrity"; Description = "Fix broken connections, unimplemented paths, and behavior mismatches." },
  @{ Key = "M5"; Title = "M5 Agent Quality & Orchestration Coherence"; Description = "Improve role activation, reasoning quality, and inter-agent consistency." },
  @{ Key = "M6"; Title = "M6 Cost Governance & FinOps Controls"; Description = "Add enforceable cost limits, attribution, and optimization loops." },
  @{ Key = "M7"; Title = "M7 Release Readiness & Operational Insights"; Description = "Validate cross-cutting quality gates, dashboards, and rollout safety." }
)

$epics = @(
  @{ Key = "E1"; Milestone = "M1"; Title = "EPIC E1: Deny-by-default Tool Governance"; DependsOn = @(); Trace = @("Gaps/09-security-tool-execution-guard-gaps.md", "Gaps/security-synthesis.md") },
  @{ Key = "E2"; Milestone = "M1"; Title = "EPIC E2: Prompt, Tool Loop, and Action Abuse Hardening"; DependsOn = @("E1"); Trace = @("Gaps/07-security-prompt-and-tool-loop.md", "Gaps/08-security-governance-and-action-abuse.md") },
  @{ Key = "E3"; Milestone = "M1"; Title = "EPIC E3: XSS, Secrets, and Supply Chain Hardening"; DependsOn = @("E2"); Trace = @("Gaps/10-security-auth-session-and-csrf.md", "Gaps/11-security-xss-and-content-sanitization.md", "Gaps/12-security-secrets-supply-chain-and-runtime.md") },
  @{ Key = "E4"; Milestone = "M2"; Title = "EPIC E4: Unified Persistence Model and Integrity"; DependsOn = @("E1"); Trace = @("Gaps/20-data-model-area1-storage-technology-inventory.md", "Gaps/21-data-model-area2-schema-and-model-analysis.md", "Gaps/22-data-model-area3-integrity-and-constraints.md") },
  @{ Key = "E5"; Milestone = "M2"; Title = "EPIC E5: Migrations, Retention, and Backup/Restore"; DependsOn = @("E4"); Trace = @("Gaps/23-data-model-area4-lifecycle-and-mutation-patterns.md", "Gaps/24-data-model-area5-agent-specific-persistence.md", "Gaps/25-data-model-area6-migration-seeding-and-evolution.md", "Gaps/27-data-model-area8-backup-recovery-and-durability.md") },
  @{ Key = "E6"; Milestone = "M2"; Title = "EPIC E6: Data Access Layer Consolidation"; DependsOn = @("E5"); Trace = @("Gaps/26-data-model-area7-data-access-and-layer-separation.md") },
  @{ Key = "E7"; Milestone = "M3"; Title = "EPIC E7: Error Recovery and Operability Controls"; DependsOn = @("E5"); Trace = @("Gaps/28-error-recovery-area1-failure-point-inventory.md", "Gaps/36-error-recovery-synthesis-and-final-verdict.md") },
  @{ Key = "E8"; Milestone = "M4"; Title = "EPIC E8: Wiring and Feature Integrity Corrections"; DependsOn = @("E7"); Trace = @("Gaps/01-sweep-stub-placeholder.md", "Gaps/06-sweep-feature-claims-vs-reality.md", "Gaps/synthesis.md") },
  @{ Key = "E9"; Milestone = "M5"; Title = "EPIC E9: Agent Activation, Prompt Quality, and Evaluation Maturity"; DependsOn = @("E8"); Trace = @("Gaps/13-agent-behavior-area1-inventory-role-clarity.md", "Gaps/19-agent-behavior-area7-eval-observability.md", "Gaps/agent-behavior-synthesis.md") },
  @{ Key = "E10"; Milestone = "M6"; Title = "EPIC E10: Cost Controls, Attribution, and Optimization"; DependsOn = @("E9"); Trace = @("Gaps/37-cost-token-economics-area1-llm-call-inventory-and-baseline-math.md", "Gaps/45-cost-token-economics-synthesis-and-final-verdict.md") },
  @{ Key = "E11"; Milestone = "M7"; Title = "EPIC E11: Final Hardening, Governance Reporting, and Rollout"; DependsOn = @("E3", "E6", "E7", "E8", "E9", "E10"); Trace = @("Gaps/security-synthesis.md", "Gaps/data-model-persistence-synthesis.md", "Gaps/agent-behavior-synthesis.md", "Gaps/45-cost-token-economics-synthesis-and-final-verdict.md") }
)

$starterIssues = @(
  @{ Key = "I-001"; Milestone = "M1"; Epic = "E1"; Title = "I-001: Switch tool-execution guard to deny-by-default"; Labels = @("security", "critical", "backend"); BlockedBy = @(); Trace = @("Gaps/09-security-tool-execution-guard-gaps.md") },
  @{ Key = "I-004"; Milestone = "M1"; Epic = "E2"; Title = "I-004: Separate untrusted user/citation/tool data with strict trust boundaries"; Labels = @("security", "llm", "backend"); BlockedBy = @("I-001"); Trace = @("Gaps/07-security-prompt-and-tool-loop.md") },
  @{ Key = "I-008"; Milestone = "M1"; Epic = "E3"; Title = "I-008: Replace regex sanitizer with policy-based sanitizer"; Labels = @("security", "frontend", "backend"); BlockedBy = @("I-004"); Trace = @("Gaps/11-security-xss-and-content-sanitization.md") },
  @{ Key = "I-012"; Milestone = "M2"; Epic = "E4"; Title = "I-012: Introduce canonical workflow_runs model"; Labels = @("data", "architecture"); BlockedBy = @("I-001"); Trace = @("Gaps/21-data-model-area2-schema-and-model-analysis.md") },
  @{ Key = "I-016"; Milestone = "M2"; Epic = "E5"; Title = "I-016: Implement unified migration framework and ledger"; Labels = @("data", "migration"); BlockedBy = @("I-012"); Trace = @("Gaps/25-data-model-area6-migration-seeding-and-evolution.md") },
  @{ Key = "I-020"; Milestone = "M2"; Epic = "E6"; Title = "I-020: Remove direct file mutations from orchestration path"; Labels = @("architecture", "backend"); BlockedBy = @("I-016"); Trace = @("Gaps/26-data-model-area7-data-access-and-layer-separation.md") },
  @{ Key = "I-022"; Milestone = "M3"; Epic = "E7"; Title = "I-022: Add queue corruption quarantine and replay workflow"; Labels = @("reliability", "critical"); BlockedBy = @("I-020"); Trace = @("Gaps/32-error-recovery-area5-state-corruption-consistency.md") },
  @{ Key = "I-027"; Milestone = "M4"; Epic = "E8"; Title = "I-027: Fix drift endpoint mismatch and remove synthetic masking"; Labels = @("bug", "observability", "critical"); BlockedBy = @("I-022"); Trace = @("Gaps/02-sweep-broken-connections.md") },
  @{ Key = "I-032"; Milestone = "M5"; Epic = "E9"; Title = "I-032: Add parity checks between orchestrator instructions and flow assignments"; Labels = @("agentic", "quality"); BlockedBy = @("I-027"); Trace = @("Gaps/16-agent-behavior-area4-inter-agent-coherence.md") },
  @{ Key = "I-036"; Milestone = "M6"; Epic = "E10"; Title = "I-036: Enforce per-session and per-workflow token and cost ceilings"; Labels = @("finops", "llm", "backend"); BlockedBy = @("I-022"); Trace = @("Gaps/42-cost-token-economics-area6-guardrails-and-spend-controls.md") },
  @{ Key = "I-041"; Milestone = "M7"; Epic = "E11"; Title = "I-041: Create cross-domain go-live checklist and automated gate pipeline"; Labels = @("release", "quality-gate"); BlockedBy = @("I-008", "I-016", "I-022", "I-036"); Trace = @("Gaps/security-synthesis.md", "Gaps/36-error-recovery-synthesis-and-final-verdict.md", "Gaps/45-cost-token-economics-synthesis-and-final-verdict.md") }
)

$milestoneMap = @{}
foreach ($m in $milestones) {
  $obj = Ensure-Milestone -repo $repoName -title $m.Title -description $m.Description
  $milestoneMap[$m.Key] = $m.Title
}

$epicNumberByKey = @{}
foreach ($e in $epics) {
  $bodyLines = @(
    "Epic Key: $($e.Key)",
    "Milestone: $($e.Milestone)",
    "Depends on Epics: $([string]::Join(', ', $e.DependsOn))",
    "",
    "Traceability Sources:",
    ($e.Trace | ForEach-Object { "- $_" })
  )
  $body = ($bodyLines -join "`n")
  $num = New-Issue -repo $repoName -title $e.Title -body $body -milestone $milestoneMap[$e.Milestone] -labels @("epic")
  $epicNumberByKey[$e.Key] = $num
}

# Add epic dependency links after creation.
foreach ($e in $epics) {
  $num = $epicNumberByKey[$e.Key]
  if ($num -lt 0) {
    continue
  }
  $dependsLinks = @()
  foreach ($dep in $e.DependsOn) {
    if ($epicNumberByKey.ContainsKey($dep)) {
      $dependsLinks += "#$($epicNumberByKey[$dep])"
    }
  }
  if ($dependsLinks.Count -gt 0) {
    $current = gh issue view $num --repo $repoName --json body --jq .body
    $updated = "$current`n`nBlocked by Epics: $([string]::Join(', ', $dependsLinks))"
    Update-IssueBody -repo $repoName -number $num -body $updated
  }
}

$issueNumberByKey = @{}
foreach ($i in $starterIssues) {
  $epicNum = $epicNumberByKey[$i.Epic]
  $bodyLines = @(
    "Issue Key: $($i.Key)",
    "Parent Epic: $($i.Epic) (#$epicNum)",
    "Milestone: $($i.Milestone)",
    "",
    "Traceability Sources:",
    ($i.Trace | ForEach-Object { "- $_" })
  )
  $body = ($bodyLines -join "`n")
  $labels = @("starter") + $i.Labels
  $num = New-Issue -repo $repoName -title $i.Title -body $body -milestone $milestoneMap[$i.Milestone] -labels $labels
  $issueNumberByKey[$i.Key] = $num
}

# Add issue blockers in body after all issues exist.
foreach ($i in $starterIssues) {
  $num = $issueNumberByKey[$i.Key]
  if ($num -lt 0) {
    continue
  }
  $blocked = @()
  foreach ($dep in $i.BlockedBy) {
    if ($issueNumberByKey.ContainsKey($dep)) {
      $blocked += "#$($issueNumberByKey[$dep])"
    }
  }
  if ($blocked.Count -gt 0) {
    $current = gh issue view $num --repo $repoName --json body --jq .body
    $updated = "$current`n`nBlocked by: $([string]::Join(', ', $blocked))"
    Update-IssueBody -repo $repoName -number $num -body $updated
  }
}

Write-Info "Done."
Write-Info "Milestones created/validated: $($milestones.Count)"
Write-Info "Epics created: $($epics.Count)"
Write-Info "Starter issues created: $($starterIssues.Count)"
Write-Info "Use Gaps/46-github-milestones-epics-issues-traceability.md for full backlog expansion."

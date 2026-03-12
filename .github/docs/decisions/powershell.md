# Decisions: Microsoft PowerShell (CAT-09)

> Stack: powershell | Status: DEFERRED | Applicable: NO
> Deferred-Reason: No .ps1 scripts, PowerShell modules, or DSC references
> detected. Current automation uses Node.js scripts and GitHub Actions.
> Activate when PowerShell-based automation is introduced.
> GitHub Issue: #35

---

## Decided Items

| ID      | Priority | Scope                                | Decision                                                                                           | Notes                                                                                            | Date       |
| ------- | -------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| DEC-CAT-901 | HIGH | Phase 2 (Script Signing)             | All PowerShell scripts in version control must be signed; execution policy AllSigned in production  | Prevents unauthorized script modification; code signing certificate required                      | 2026-03-18 |
| DEC-CAT-902 | HIGH | Phase 2 (Execution Policy)           | Set execution policy RemoteSigned for dev; AllSigned for production; Unrestricted is prohibited     | Balance between developer experience and production security                                     | 2026-03-18 |
| DEC-CAT-903 | MEDIUM | Phase 2 (Module Management)         | Use PowerShellGet/PSResourceGet for module installation; pin module versions in requirements file   | Prevents dependency drift; requirements.psd1 or PSDepend for version-pinning                     | 2026-03-18 |
| DEC-CAT-904 | MEDIUM | Phase 5 (Error Handling)            | Use try/catch/finally with $ErrorActionPreference = 'Stop' for all automation scripts               | Ensures failures are caught and reported; no silent failures in CI/CD                            | 2026-03-18 |
| DEC-CAT-905 | MEDIUM | Phase 2 (Secret Handling)           | No secrets in PowerShell script files; use SecureString or Key Vault integration                     | Secrets passed via environment variables or secret management tools; never hardcoded              | 2026-03-18 |
| DEC-CAT-906 | LOW  | Phase 2 (PSScriptAnalyzer)           | Run PSScriptAnalyzer in CI for all .ps1 files; treat warnings as errors for severity ≥ Warning      | Static analysis catches common issues; suppress only with documented justification               | 2026-03-18 |

---

_Category created: 2026-03-18 | Implementation Agent | Sprint 5 SP-5-CAT_

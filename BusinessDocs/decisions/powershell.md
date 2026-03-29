# Decisions: Microsoft PowerShell (CAT-09)

> Stack: powershell | Status: DEFERRED | Applicable: PENDING
> Auto-activated by Orchestrator (RULE ORC-45) when this technology is detected.

---

## Decided Items

| ID          | Priority | Scope                       | Decision                                                                                                                                                | Notes                                                                                                                                                                         | Date       |
| ----------- | -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| DEC-CAT-901 | MEDIUM   | Phase 2 (Script Signing)    | PowerShell scripts in version control should be signed when compliance requires it; AllSigned in production is recommended for regulated environments   | Code signing is recommended best practice; mandatory when compliance/regulatory requirements demand it. RemoteSigned is acceptable for non-regulated production environments. | 2026-03-16 |
| DEC-CAT-902 | HIGH     | Phase 2 (Execution Policy)  | Set execution policy RemoteSigned for dev and non-regulated production; AllSigned for regulated/compliance-bound production; Unrestricted is prohibited | Scale with compliance requirements: RemoteSigned is the baseline; AllSigned when regulatory or enterprise policy requires it.                                                 | 2026-03-16 |
| DEC-CAT-903 | MEDIUM   | Phase 2 (Module Management) | Use PowerShellGet/PSResourceGet for module installation; pin module versions in requirements file                                                       | Prevents dependency drift; requirements.psd1 or PSDepend for version-pinning                                                                                                  | 2026-03-18 |
| DEC-CAT-904 | MEDIUM   | Phase 5 (Error Handling)    | Use try/catch/finally with $ErrorActionPreference = 'Stop' for all automation scripts                                                                   | Ensures failures are caught and reported; no silent failures in CI/CD                                                                                                         | 2026-03-18 |
| DEC-CAT-905 | MEDIUM   | Phase 2 (Secret Handling)   | No secrets in PowerShell script files; use SecureString or Key Vault integration                                                                        | Secrets passed via environment variables or secret management tools; never hardcoded                                                                                          | 2026-03-18 |
| DEC-CAT-906 | LOW      | Phase 2 (PSScriptAnalyzer)  | Run PSScriptAnalyzer in CI for all .ps1 files; treat warnings as errors for severity ≥ Warning                                                          | Static analysis catches common issues; suppress only with documented justification                                                                                            | 2026-03-18 |

---

_Category created: 2026-03-18 | Implementation Agent | Sprint 5 SP-5-CAT_

# Security Sweep 12: Secrets, Supply Chain, and Runtime Posture

## Scope

- Secret hygiene in local environment config
- Dependency vulnerability posture
- Runtime process model in container

## Findings

### 1) Local .env contains a concrete client secret value

- Severity: MAJOR
- Evidence:
  - .env:16
  - .gitignore:22
  - .env.example:10
- Detail:
  - A concrete GitHub client secret-like value is present in `.env`.
  - `.env` is ignored and not tracked, but local secret sprawl risk remains.
- Validation:
  - `git ls-files .env .env.example .gitignore` lists `.env.example` and `.gitignore`, not `.env`.

### 2) Frontend dependency advisories present (moderate/high)

- Severity: MAJOR
- Evidence:
  - `npm audit --prefix src/webapp/ui --json` reported 5 vulnerabilities (3 moderate, 2 high):
    - `flatted` (high)
    - `picomatch` (high)
    - `dompurify` path via `monaco-editor` (moderate)
    - `brace-expansion` (moderate)
- Detail:
  - Some fixes are available; one path indicates semver-major upgrade pressure.

### 3) Backend runtime dependency audit is clean

- Severity: DEFENSE
- Evidence:
  - `npm audit --omit=dev --json` returned 0 vulnerabilities in the runtime dependency set.

### 4) Container starts two critical node processes under one shell

- Severity: MODERATE
- Evidence:
  - infra/Dockerfile:53
- Detail:
  - Runtime command launches web server and MCP server in one shell with `wait -n`.
- Risk:
  - If one process dies, container exits; availability and restart behavior depend entirely on orchestrator policy.

## Recommended Fixes

1. Secret hygiene hardening:

- Add pre-commit secret scanning and CI secret scanning.
- Rotate any exposed or potentially exposed OAuth secrets.

2. Dependency remediation wave:

- Prioritize high-severity UI advisories and lockfile refresh with compatibility testing.

3. Runtime supervision:

- Consider dedicated process supervisor or split services by container for clearer fault domains.

## Verdict for this area

- Immediate internet-facing risk is more likely to come from dependency lag and local secret handling than from backend runtime deps, which are currently clean.

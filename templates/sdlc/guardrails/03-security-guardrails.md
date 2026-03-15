# Security Guardrails – Security Architect

> Applies to: Security Architect (Phase 2) and as a cross-cutting concern for
> all other agents

---

## ENFORCEMENT & CONTRACT REFERENCE

| Rule Range  | Primary Enforcer          | Verification Agent            | Related Contract                     | Default Violation Action |
| ----------- | ------------------------- | ----------------------------- | ------------------------------------ | ------------------------ |
| G-SEC-01–04 | Security Architect (08)   | Critic Agent (18)             | `analysis-output-contract.md`        | BLOCK handoff            |
| G-SEC-05–06 | Security Architect (08)   | Compliance Reviewer (38) — T1 | `recommendations-output-contract.md` | BLOCK handoff            |
| G-SEC-07    | PR/Review Agent (22)      | PR/Review Agent (22)          | `pr-review-output-contract.md`       | BLOCK merge              |
| G-SEC-08    | Implementation Agent (20) | Compliance Reviewer (38) — T1 | `implementation-output-contract.md`  | BLOCK handoff            |

## DOMAIN: SECURITY & COMPLIANCE

### G-SEC-01 – Zero Trust Principle

**Rule:** Every architecture recommendation that implicitly assumes trust (e.g.
"internal traffic is safe") is blocked and reported as a security gap.  
**Verification:** Explicitly check for the presence of: network segmentation,
identity-based access, least privilege, mutual TLS.

### G-SEC-02 – Secrets Never in Code

**Rule:** Every identified secret (API key, password, token, connection string)
in code, config files, or version control is immediately marked as
`CRITICAL_FINDING`.  
**Action:** Document location (file + line number), escalate to Orchestrator,
and include in sprint plan sprint 1.

### G-SEC-03 – Automated Security Scans in CI Mandatory

**Rule:** CI/CD recommendations MUST always include security scanning: SAST,
DAST, dependency scanning, container scanning.  
**Current state:** If no security scans are present in CI, this is reported as a
`CRITICAL_GAP`.

### G-SEC-04 – OWASP Top 10 Verification

**Rule:** Security Architect ALWAYS performs an explicit check on each of the
OWASP Top 10 categories.  
**Format:** Per OWASP category: status (Present / Absent / Not Verifiable) +
finding + source reference.  
**Prohibition:** No "not applicable" without a demonstrable reason.

### G-SEC-05 – IAM Analysis Mandatory

**Rule:** Identity & Access Management is always analyzed for: over-privileging,
orphaned accounts, shared credentials, MFA presence.

### G-SEC-06 – Compliance Framework Established

**Rule:** Before security recommendations are made, the applicable compliance
framework MUST be established (GDPR, ISO27001, SOC2, NIS2, HIPAA, etc.).  
**Prohibition:** No compliance statements without an established framework.

### G-SEC-07 – Vulnerability Scoring

**Rule:** Every security finding is scored with CVSS v3.1 (or equivalent) if a
CVE is available, or as Low/Medium/High/Critical with explicit rationale if no
CVE is available.

### G-SEC-08 – Penetration Test Gap

**Rule:** If no recent penetration test is available (< 12 months), this is
reported as a `HIGH_PRIORITY_GAP`.

### G-SEC-09 – Asset Classification Mandatory

**Rule:** Security Architect MUST produce an asset classification before risk
assessment. Every system component is classified by sensitivity:

| Class    | Description                           | Example                                  |
| -------- | ------------------------------------- | ---------------------------------------- |
| CRITICAL | Breach = regulatory/legal/existential | PII store, auth service, encryption keys |
| HIGH     | Breach = significant business impact  | Payment processing, admin APIs           |
| MEDIUM   | Breach = operational disruption       | Internal dashboards, CI/CD               |
| LOW      | Breach = minimal impact               | Public marketing site, docs              |

**Prohibition:** No security recommendations without asset classification
context. Findings on CRITICAL assets automatically receive priority elevation.

### G-SEC-10 – Threat Modeling Mandatory

**Rule:** A threat model (STRIDE, DREAD, or equivalent) MUST be produced for
every CRITICAL and HIGH-classified asset. At minimum:

1. **Identify:** System boundaries, trust boundaries, data flows
2. **Enumerate:** Threats per STRIDE category (Spoofing, Tampering, Repudiation,
   Information Disclosure, Denial of Service, Elevation of Privilege)
3. **Mitigate:** Documented mitigation per identified threat
4. **Residual risk:** Accepted residual risks documented as `RISK_ACCEPTED:`
   with business justification

**Prohibition:** No architecture approval for CRITICAL assets without completed
threat model.

---

## CROSS-CUTTING: SECURITY AS RESPONSIBILITY OF ALL AGENTS

Every agent (not just the Security Architect) is required to mark
security-relevant findings as `SECURITY_FLAG: [description]` and forward them to
the Security Architect's input queue.

### Security Finding Schema

Each security finding object MUST contain:
`{ id, title, severity, owasp_category, source, description, recommendation, status }`.

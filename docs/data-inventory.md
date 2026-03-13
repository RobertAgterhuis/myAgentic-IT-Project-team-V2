# Data Inventory — Agentic SDLC Platform

| Field             | Value                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Document**      | Data Inventory and Retention Model                                                                     |
| **Version**       | 1.0                                                                                                    |
| **Status**        | DRAFT                                                                                                  |
| **Created**       | 2026-03-12                                                                                             |
| **Owner**         | Robert Agterhuis                                                                                       |
| **Audit Finding** | F-03 (CRITICAL) — Privacy/compliance operations are not finished                                       |
| **Issue**         | #139                                                                                                   |
| **Depends on**    | `docs/ga-definition.md` (deployment profile), `docs/security-design.md` (data-at-rest) |

---

## 1. Data Categories

All data stored by the Agentic SDLC Platform in the v1 GA
(localhost/single-operator) configuration.

### 1.1 Session Data

| Data Element        | Format | Location                                        | Contains PII | Retention                     |
| ------------------- | ------ | ----------------------------------------------- | ------------ | ----------------------------- |
| Session state       | JSON   | `docs/session/session-state.json`       | No           | Project lifetime              |
| Session audit trail | JSON   | `docs/session/session-state-audit.json` | No           | Project lifetime              |
| Command queue       | JSON   | `docs/session/command-queue.json`       | No           | Overwritten per command cycle |
| Reevaluate trigger  | JSON   | `docs/session/reevaluate-trigger.json`  | No           | Transient (consumed on read)  |

### 1.2 Business/Project Data

| Data Element          | Format   | Location                              | Contains PII                   | Retention        |
| --------------------- | -------- | ------------------------------------- | ------------------------------ | ---------------- |
| Questionnaire answers | Markdown | `BusinessDocs/Phase*/Questionnaires/` | Potentially (business context) | Project lifetime |
| Questionnaire index   | Markdown | `BusinessDocs/questionnaire-index.md` | No                             | Project lifetime |
| Official documents    | Markdown | `BusinessDocs/OfficialDocuments/`     | Potentially (business context) | Project lifetime |
| Decisions log         | Markdown | `docs/decisions.md`           | No                             | Project lifetime |
| Decision records      | Markdown | `docs/decisions/`             | No                             | Project lifetime |

### 1.3 Phase Deliverables

| Data Element         | Format         | Location                        | Contains PII | Retention        |
| -------------------- | -------------- | ------------------------------- | ------------ | ---------------- |
| Phase 1–4 analyses   | Markdown       | `docs/phase-{1,2,3,4}/` | No           | Project lifetime |
| Synthesis reports    | Markdown       | `docs/synthesis/`       | No           | Project lifetime |
| Sprint plans/reports | Markdown       | `docs/phase-5/`         | No           | Project lifetime |
| Brand assets         | JSON, Markdown | `docs/brand/`           | No           | Project lifetime |
| Storybook inventory  | Markdown       | `docs/storybook/`       | No           | Project lifetime |

### 1.4 Analytics Data

| Data Element           | Format  | Location                          | Contains PII                   | Retention                        |
| ---------------------- | ------- | --------------------------------- | ------------------------------ | -------------------------------- |
| Matomo analytics DB    | MariaDB | Docker volume (`matomo-db`)       | Potentially (IP if configured) | Container lifetime               |
| Matomo configuration   | PHP/env | Docker volume                     | No                             | Container lifetime               |
| Local analytics events | JSON    | `src/webapp/` (runtime)       | No                             | In-memory only; reset on restart |
| Metrics snapshot       | JSON    | `docs/session/` (runtime) | No                             | Overwritten per collection cycle |

### 1.5 Operational Data

| Data Element          | Format        | Location                 | Contains PII                       | Retention                             |
| --------------------- | ------------- | ------------------------ | ---------------------------------- | ------------------------------------- |
| Git history           | Git           | `.git/`                  | Yes (author name/email in commits) | Repository lifetime                   |
| Server logs           | JSON (stdout) | Terminal output          | No                                 | Terminal session only (not persisted) |
| npm audit results     | JSON          | `.github/npm-audit.json` | No                                 | Overwritten per audit run             |
| Test coverage         | JSON, HTML    | `coverage/`              | No                                 | Overwritten per test run              |
| Environment variables | Env file      | `.env` (gitignored)      | No (passwords for local services)  | Manual; operator-managed              |

### 1.6 User-Generated Content

| Data Element            | Format                  | Location                                          | Contains PII               | Retention        |
| ----------------------- | ----------------------- | ------------------------------------------------- | -------------------------- | ---------------- |
| Webapp form submissions | JSON (in-memory → file) | Questionnaire/decision endpoints → Markdown files | Potentially                | Project lifetime |
| SSE subscriptions       | In-memory               | Server runtime                                    | No (connection state only) | Session only     |
| Help text               | Markdown                | `.github/help/`                                   | No                         | Static           |

---

## 2. Retention Policy

### 2.1 Retention Classes

| Class         | Retention Period                   | Deletion Trigger                      | Applies To                                             |
| ------------- | ---------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| **PROJECT**   | Lifetime of the project repository | Repository deletion                   | Session state, deliverables, decisions, questionnaires |
| **TRANSIENT** | Current process/session only       | Process restart or command completion | In-memory data, SSE connections, command queue entries |
| **CONTAINER** | Lifetime of Docker volume          | `docker-compose down -v`              | Matomo DB, analytics data                              |
| **OVERWRITE** | Until next run                     | Next execution of the same operation  | Coverage reports, npm audit, metrics snapshots         |
| **GIT**       | Repository history                 | `git filter-branch` or repo deletion  | Commit metadata (author name/email)                    |

### 2.2 Retention Decisions

| Decision                   | Choice                       | Rationale                                                       |
| -------------------------- | ---------------------------- | --------------------------------------------------------------- |
| No automated data expiry   | Accepted for v1 GA           | Localhost/single-operator; operator controls their own data     |
| No database layer          | Accepted for v1 GA           | File-backed persistence is sufficient for single-operator model |
| Git history as audit trail | Accepted for v1 GA           | Commits provide immutable record of all changes                 |
| Matomo retention           | Default (container lifetime) | Operator can configure Matomo's built-in retention settings     |

---

## 3. DSAR Procedure (Data Subject Access Request)

### 3.1 Applicability

For v1 GA (localhost/single-operator), the operator IS the data subject. DSAR
procedures are documented for completeness and for future multi-user profiles.

### 3.2 Data Export

To export all data stored by the platform:

1. **Project data:** Copy the entire repository directory (includes all
   Markdown, JSON, and configuration files)
2. **Session state:** The file `docs/session/session-state.json`
   contains the complete session state
3. **Questionnaire answers:** All files under `BusinessDocs/` contain business
   input data
4. **Analytics data:** Export Matomo data via Matomo's built-in GDPR export tool
   (Admin → Privacy → Export)
5. **Git history:** `git log --all --format=fuller` provides all commit metadata

### 3.3 Data Deletion

To delete all data associated with the platform:

1. **Full deletion:** Delete the repository directory and remove the Git remote

   ```bash
   rm -rf /path/to/myAgentic-IT-Project-team-V2
   ```

2. **Session data only:** Delete session files while preserving deliverables

   ```bash
   rm docs/session/session-state.json
   rm docs/session/session-state-audit.json
   rm docs/session/command-queue.json
   ```

3. **Analytics data:** Remove Docker volumes

   ```bash
   docker-compose down -v
   ```

4. **Git author data:** Use `git filter-branch` or BFG Repo-Cleaner to rewrite
   history (destructive operation)

### 3.4 Right to Rectification

All data is stored in human-readable formats (Markdown, JSON). The operator can
directly edit any file to correct inaccurate data.

---

## 4. ROPA Skeleton (Record of Processing Activities)

| Field                                 | Value                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| **Controller**                        | Repository owner (Robert Agterhuis for this instance)                                   |
| **Purpose of processing**             | Software development lifecycle management using AI-assisted multi-agent system          |
| **Categories of data subjects**       | Repository operator (single user for v1 GA)                                             |
| **Categories of personal data**       | Git commit metadata (name, email); optionally business context in questionnaire answers |
| **Recipients**                        | None — all data stays on local machine (v1 GA)                                          |
| **Transfers to third countries**      | None (v1 GA)                                                                            |
| **Retention periods**                 | See Section 2.1 Retention Classes                                                       |
| **Technical/organizational measures** | See `docs/security-design.md`                                                   |
| **Data protection impact assessment** | Not required for v1 GA (single operator, localhost only, no sensitive categories)       |
| **Legal basis**                       | Legitimate interest (operator managing their own software project)                      |

### Future ROPA Updates (Post-GA)

When the platform moves to Profile 2 (Internal Team) or Profile 3
(Internet-Exposed):

- Update data subjects to include team members / end users
- Add recipients (hosting provider, analytics service if cloud-hosted)
- Conduct DPIA if processing sensitive categories or at-scale profiling
- Add DPO contact if required by jurisdiction

---

## 5. Data Flow Summary

```
Operator (local browser)
    │
    ├── HTTP requests ──► Command Center (127.0.0.1:3000)
    │                        │
    │                        ├── Read/Write ──► File system (project directory)
    │                        │                    ├── docs/ (deliverables, session state)
    │                        │                    ├── BusinessDocs/ (questionnaires, decisions)
    │                        │                    └── .env (gitignored config)
    │                        │
    │                        └── SSE push ──► Browser (real-time updates)
    │
    ├── VS Code extension ──► MCP Server (stdin/stdout, process-local)
    │                           └── Read/Write ──► File system (same project directory)
    │
    └── Docker (optional) ──► Matomo (analytics on port 8080)
                                 └── MariaDB (container-only, port 3306 not host-exposed)
```

**Key property:** No data leaves the local machine in the v1 GA configuration.
All persistence is file-backed within the project directory or Docker volumes on
the same host.

---

## 6. Cross-References

| Finding                | Status                                                      |
| ---------------------- | ----------------------------------------------------------- |
| F-03 (CRITICAL)        | ADDRESSED — data inventory, retention, DSAR, ROPA           |
| F-01 (GA definition)   | CONSISTENT — privacy scope = localhost per ga-definition.md |
| F-02 (Security design) | CONSISTENT — data-at-rest encryption per profile            |

---

_This document catalogs all data processed by the Agentic SDLC Platform and
defines retention, export, and deletion procedures. For v1 GA
(localhost/single-operator), no personal data leaves the local machine._

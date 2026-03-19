# Machine-to-Machine (M2M) API Authentication

## Overview

The M2M API enables programmatic, non-interactive access to myAgentic-IT-Project-team APIs for operational automation, CI/CD pipelines, and external integrations.

**Authentication method:** API_KEY (minimum 24 characters)  
**Scope:** Non-local production deployments only  
**Permission level:** Operator (limited to whitelisted routes)  
**Audit trail:** All API key requests logged to mutation audit trail

---

## API Key Configuration

### Environment Variable

Set the API key at startup:

```bash
export API_KEY="sk-1234567890ABCDEFGHIJKLMNOP"  # Min 24 chars
npm start
```

**Requirement:** API_KEY must be at least 24 characters long (enforced by `hasAuthConfigured()` in runtime-profiles module).

### Request Header

Include the API key in the `x-api-key` header:

```bash
curl -X POST http://api.example.com/api/save \
  -H "x-api-key: sk-1234567890ABCDEFGHIJKLMNOP" \
  -H "Content-Type: application/json" \
  -d '{"file":"questionnaire.md","updates":[...]}'
```

---

## Route Policy Matrix

Routes are categorized by sensitivity and permission level. API keys are validated against this whitelist on every request.

### PUBLIC Routes (No Authentication Required)

These routes are accessible without any credentials:

| Method | Route                    | Purpose                                         |
| ------ | ------------------------ | ----------------------------------------------- |
| GET    | `/api/health`            | Readiness probe (orchestrators, load balancers) |
| GET    | `/api/help?topic=<slug>` | Help documentation                              |
| GET    | `/health`                | Liveness probe                                  |
| GET    | `/events`                | Server-Sent Events (SSE) stream                 |

### READ Routes (API Key + GET)

Read-only data access with valid API key:

| Method | Route                     | Purpose                                       |
| ------ | ------------------------- | --------------------------------------------- |
| GET    | `/api/questionnaires`     | List all questionnaires                       |
| GET    | `/api/questionnaires/:id` | Fetch single questionnaire                    |
| GET    | `/api/decisions`          | List all decisions                            |
| GET    | `/api/decisions/:id`      | Fetch specific decision                       |
| GET    | `/api/audit`              | Mutation audit trail (M2M can review changes) |
| GET    | `/api/session`            | Current session state                         |
| GET    | `/api/export`             | Export all data as JSON                       |
| GET    | `/api/dashboard`          | Dashboard aggregates                          |
| GET    | `/api/metrics-dashboard`  | Runtime metrics & per-endpoint timing         |
| GET    | `/api/progress`           | Phase and agent progress                      |
| GET    | `/api/command`            | Retrieve queued command                       |

### WRITE Routes (API Key + POST/PATCH)

Data mutations with valid API key **and operator role**:

| Method | Route             | Purpose                                          |
| ------ | ----------------- | ------------------------------------------------ |
| POST   | `/api/save`       | Save questionnaire answers (creates audit entry) |
| POST   | `/api/reevaluate` | Trigger reevaluation flow                        |
| POST   | `/api/decisions`  | Create or modify decisions                       |
| POST   | `/api/command`    | Queue agentic command (CREATE, REEVALUATE, etc.) |
| POST   | `/api/analytics`  | Submit analytics event                           |

### ADMIN Routes (Forbidden for API Keys)

These routes **cannot** be accessed with an API key, even if other permissions are granted:

| Route                | Reason                                   |
| -------------------- | ---------------------------------------- |
| `/api/admin/**`      | Administrative operations only           |
| `/api/policies/**`   | Policy management (excludes `/evaluate`) |
| `/api/workspaces/**` | Workspace configuration                  |
| `/api/sessions/**`   | Session administration                   |

---

## Audit Trail Integration

Every API key authentication attempt is logged to the mutation audit trail (`BusinessDocs/audit/audit-log.jsonl`).

### Log Entry Structure

```json
{
  "timestamp": "2026-03-19T14:30:00.123Z",
  "operation": "API_KEY_AUTH_SUCCESS",
  "entity_type": "auth_event",
  "entity_id": "api_key_0123...abcd",
  "user": "api-client",
  "summary": "method=POST route=/api/save reason= ip=192.0.2.1"
}
```

### Entry Variants

**Successful mutation:**

```json
{
  "operation": "API_KEY_AUTH_SUCCESS",
  "summary": "method=POST route=/api/save ip=10.0.0.5"
}
```

**Blocked (admin route):**

```json
{
  "operation": "API_KEY_AUTH_FAILED",
  "summary": "method=POST route=/api/admin/policies reason=ADMIN_ROUTE ip=10.0.0.5"
}
```

**Failed (invalid key):**

```json
{
  "operation": "API_KEY_AUTH_FAILED",
  "summary": "method=GET route=/api/decisions reason=INVALID_KEY ip=192.0.2.1"
}
```

---

## Implementation Details

### Configuration & Runtime Profile

- **Profile detection:** API_KEY usage in non-local deployments triggers production-single-node or production-distributed profile
- **Validation:** `hasAuthConfigured(config)` in runtime-profiles.ts checks API_KEY length (24+ required)
- **Audit façade:** `AuditTrail.logApiKeyAuth()` method records auth attempts
- **Policy enforcement:** `isM2MRouteAllowed()` in m2m-api-policy.ts validates route whitelist

### Security Properties

1. **Audit trail is immutable** — Append-only JSON Lines with rotation at 10 MB
2. **API key is hashed in logs** — Not stored plaintext (first 4 chars + hash of remainder)
3. **Default-deny policy** — Only explicitly whitelisted routes are allowed
4. **No privilege escalation** — API keys cannot call admin endpoints
5. **Rate limiting** — API key requests are subject to the same rate limiter as UI requests (30/min default)

---

## Examples

### Query Questionnaire Data

```bash
API_KEY="sk-your-api-key-here-min-24-chars"
ENDPOINT="https://api.example.com"

# List all questionnaires
curl -X GET "$ENDPOINT/api/questionnaires" \
  -H "x-api-key: $API_KEY"

# Fetch single questionnaire
curl -X GET "$ENDPOINT/api/questionnaires/05-software-architect-questionnaire.md" \
  -H "x-api-key: $API_KEY"
```

### Submit Questionnaire Answers

```bash
curl -X POST "$ENDPOINT/api/save" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "file": "05-software-architect-questionnaire.md",
    "updates": [
      {
        "questionId": "Q-05-001",
        "answer": "Kubernetes for orchestration",
        "status": "ANSWERED"
      }
    ]
  }'
```

### Trigger Reevaluation

```bash
curl -X POST "$ENDPOINT/api/reevaluate" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scope": "ALL"}'
```

### Check Audit Trail

```bash
# Retrieve last 20 API key auth events
curl -X GET "$ENDPOINT/api/audit?limit=20" \
  -H "x-api-key: $API_KEY" | jq '.entries[] | select(.entity_type=="auth_event")'
```

---

## Limitations & Constraints

| Constraint          | Details                                                          |
| ------------------- | ---------------------------------------------------------------- |
| **Local bindings**  | API_KEY is ignored on localhost; all requests allowed            |
| **Operator-only**   | API keys default to operator role (cannot call admin endpoints)  |
| **Route whitelist** | Any route not explicitly whitelisted is rejected                 |
| **No session**      | Each request is stateless (no session cookie required or parsed) |
| **No MFA**          | API keys are single-factor; no 2FA supported                     |
| **Key rotation**    | Change API_KEY env var and restart to rotate (no live rotation)  |

---

## Rotation & Incidents

### How to Rotate an API Key

1. Generate new key (24+ random alphanumeric characters)
2. Update `API_KEY` environment variable
3. Restart application (non-zero-downtime deployments: drain connections first)
4. In-flight requests with old key will fail; caller must retry with new key

### If Key Is Compromised

1. **Immediately rotate** — Follow steps above ASAP
2. **Review audit trail** — Search for `operation` = `API_KEY_AUTH_SUCCESS` or `API_KEY_AUTH_FAILED` to identify suspicious activity
3. **Restrict temporarily** — Set `API_KEY=""` to disable all M2M access while investigating
4. **Audit downstream** — Check what mutations were performed by the compromised key (review `user: "api-client"` entries)

---

## References

- **Runtime Profile Contract:** [docs/reference/runtime-profiles-env-contract.md](runtime-profiles-env-contract.md) (API_KEY requirements per profile)
- **Audit Trail Format:** [docs/reference/data-dictionary.md#7-audit-log](../data-dictionary.md#7-audit-log)
- **Policy Enforcement:** [src/webapp/m2m-api-policy.ts](../../src/webapp/m2m-api-policy.ts) (route whitelist and matching logic)
- **Audit Methods:** [src/webapp/audit.ts](../../src/webapp/audit.ts) (`logApiKeyAuth()`, `logOAuthAuth()`)
- **Related Epics:** M1#658 (Enforce fail-closed non-local API security), M1#656 (Hardened browser/edge security)

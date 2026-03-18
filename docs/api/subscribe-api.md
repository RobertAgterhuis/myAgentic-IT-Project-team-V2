---
title: Newsletter Subscribe API
parent: API Reference
nav_order: 16
description: Newsletter subscription via Buttondown ESP.
---

# Newsletter Subscribe API

**Module:** `routes/subscribe.ts`
**Auth required:** No
**Integration:** Buttondown ESP (with local fallback)

---

## POST /api/subscribe

Subscribe an email address to the newsletter.

**Request body:**

| Field              | Type   | Required | Description                         |
| ------------------ | ------ | -------- | ----------------------------------- |
| `email`            | string | Yes      | Email address (max 320 chars)       |
| `metadata`         | object | No       | Subscription metadata               |
| `metadata.segment` | string | No       | Audience segment (see values below) |
| `metadata.source`  | string | No       | Referral source (max 100 chars)     |

**Valid segments:** `engineering-leaders`, `product-managers`, `developers`,
`evaluators`

**Example:**

```bash
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "metadata": {
      "segment": "developers",
      "source": "landing-page"
    }
  }'
```

**Response — 201 Created (ESP active):**

```json
{
  "status": "pending_confirmation",
  "message": "Check your inbox to confirm your subscription"
}
```

**Response — 201 Created (local fallback):**

When `BUTTONDOWN_API_KEY` is not set, subscriptions are stored locally:

```json
{
  "status": "stored_locally",
  "message": "Subscription recorded locally (ESP not configured)"
}
```

Local subscriptions are persisted to `BusinessDocs/local-subscriptions.json`.

**Response — 409 Conflict:**

```json
{
  "error": "CONFLICT",
  "message": "Email already subscribed"
}
```

**Error responses:**

| Status | Code             | Condition                |
| ------ | ---------------- | ------------------------ |
| 400    | VALIDATION_ERROR | Invalid email or segment |
| 409    | CONFLICT         | Email already subscribed |

**Security notes:**

- The Buttondown API key is server-side only, never exposed to clients
- Email validation uses format check (not DNS verification)
- Local fallback ensures subscriptions are captured during development

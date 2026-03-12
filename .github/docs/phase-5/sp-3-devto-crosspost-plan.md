# SP-3-DEVTO — Dev.to Cross-Posting Plan

**Story:** SP-3-DEVTO (#133) **Sprint:** Sprint 3 (April 8 – April 21, 2026)
**Track:** Marketing **Owner:** Growth Marketer **Status:** ⏸️ BACKLOG —
non-blocking (AC1 account creation deferred) **Source:** Sprint 2 Retrospective
Action Item #8 **Lesson Injection:** L13 (content items 3-5 day estimates), L7
(retro → backlog) **Estimate:** 3 days (per L13)

---

## 1. Dev.to Account Setup

### Account Configuration

| Setting        | Value                                                                     | Rationale                            |
| -------------- | ------------------------------------------------------------------------- | ------------------------------------ |
| Username       | `agentic-sdlc` (or project-specific)                                      | Brand consistency                    |
| Organization   | — (personal account initially)                                            | Simpler setup; org later if traction |
| Profile bio    | "Multi-agent SDLC platform — 30+ agents, 4 phases, production-ready code" | Matches landing page positioning     |
| Profile links  | GitHub repo, landing page URL                                             | Cross-traffic                        |
| Tags to follow | `#ai`, `#devops`, `#sdlc`, `#agents`, `#automation`                       | Community visibility                 |

### Profile Checklist

- [ ] Account created
- [ ] Profile photo (use project brand mark or og:image crop)
- [ ] Bio written
- [ ] GitHub link added
- [ ] Landing page link added

---

## 2. Canonical URL Strategy (AC2)

### Problem

Cross-posting content to Dev.to creates duplicate content that can harm SEO if
not handled correctly. Dev.to supports the `canonical_url` front matter field.

### Strategy: Dev.to as Syndication Target

| Principle                 | Implementation                                     |
| ------------------------- | -------------------------------------------------- |
| **Primary source**        | Project landing page or GitHub Pages (`docs/`)     |
| **Syndication target**    | Dev.to (always secondary)                          |
| **Canonical URL**         | Always points to the primary source URL            |
| **Dev.to front matter**   | `canonical_url: https://[PRIMARY_URL]`             |
| **Content modifications** | Add Dev.to-specific intro/CTA; keep body identical |

### Dev.to Front Matter Template

```yaml
---
title: '[ARTICLE TITLE]'
published: true
description: '[SEO description, max 150 chars]'
tags: [tag1, tag2, tag3, tag4] # max 4 tags
canonical_url: 'https://[PRIMARY_URL_OF_ORIGINAL]'
cover_image: 'https://[OG_IMAGE_URL]'
---
```

### SEO Rules

1. **ALWAYS** set `canonical_url` to the original publication URL
2. Publish on Dev.to **at least 24 hours after** the primary source (allows
   indexing of primary first)
3. Do NOT modify article titles between platforms (consistency for search)
4. DO add a platform-specific CTA at the bottom of Dev.to posts

---

## 3. Articles to Cross-Post (AC3)

Two articles were written during Sprint 2 (SP-2-SOC / SP-12-703):

### Article 1: "Building a Multi-Agent SDLC"

| Field         | Value                                         |
| ------------- | --------------------------------------------- |
| Source        | SP-12-703 §12, written Day 7                  |
| Primary URL   | GitHub Pages / landing page (TBD)             |
| Dev.to tags   | `ai`, `devops`, `sdlc`, `agents`              |
| Canonical URL | `https://[PRIMARY_URL]/blog/multi-agent-sdlc` |
| Status        | ⬜ To cross-post                              |

### Article 2: "Privacy-First Analytics: Matomo vs Plausible vs Fathom"

| Field         | Value                                                |
| ------------- | ---------------------------------------------------- |
| Source        | SP-12-703 §7, written Day 7                          |
| Primary URL   | GitHub Pages / landing page (TBD)                    |
| Dev.to tags   | `analytics`, `privacy`, `matomo`, `devops`           |
| Canonical URL | `https://[PRIMARY_URL]/blog/privacy-first-analytics` |
| Status        | ⬜ To cross-post                                     |

### Dev.to-Specific Additions (per article)

Each cross-posted article gets:

1. **Intro paragraph:** "Originally published at [PRIMARY_URL]. Follow the
   project on [GitHub](REPO_URL)."
2. **CTA footer:** "Star the repo on GitHub | Try the live demo | Join the
   Discussion"
3. **Cover image:** Use existing og:image (`social-cards/` directory)

---

## 4. Landing Page + Social Card Updates (AC4)

### Landing Page Footer Update

Add Dev.to link to the existing footer link row in `landing.html`:

```text
Current: GitHub | Docs | Subscribe | Discussions
Updated: GitHub | Docs | Subscribe | Discussions | Dev.to
```

### Social Card Updates

Existing social cards (`social-cards/`) already contain platform branding. Add
Dev.to profile URL to the `README.md` Community section:

```markdown
## Community

- [GitHub Discussions](...)
- [Dev.to Blog](https://dev.to/agentic-sdlc)
- [Issues](...)
```

---

## 5. Analytics on Cross-Posted Articles (AC5)

### Dev.to Analytics

Dev.to provides built-in analytics per article:

- Views, reactions, comments, reading time
- No custom tracking pixel support (Dev.to doesn't allow external JS)

### UTM Strategy for Outbound Links

Links within Dev.to articles pointing back to the project use UTM parameters:

| Parameter      | Value                |
| -------------- | -------------------- |
| `utm_source`   | `devto`              |
| `utm_medium`   | `blog`               |
| `utm_campaign` | `sprint-3-crosspost` |
| `utm_content`  | `[article-slug]`     |

Example:
`https://[LANDING_URL]?utm_source=devto&utm_medium=blog&utm_campaign=sprint-3-crosspost&utm_content=multi-agent-sdlc`

Matomo (now verified working per SP-3-MAT-FIX) will track these inbound visits.

---

## 6. Publication Schedule (AC6)

### Sprint 3 Cross-Posting Schedule

| Day | Date   | Action                                         | Article                   |
| --- | ------ | ---------------------------------------------- | ------------------------- |
| 3   | Apr 10 | Dev.to account setup + profile configuration   | —                         |
| 4   | Apr 11 | Publish Article 1 on primary source            | "Multi-Agent SDLC"        |
| 5   | Apr 14 | Cross-post Article 1 to Dev.to (24h delay)     | "Multi-Agent SDLC"        |
| 6   | Apr 15 | Publish Article 2 on primary source            | "Privacy-First Analytics" |
| 7   | Apr 16 | Cross-post Article 2 to Dev.to (24h delay)     | "Privacy-First Analytics" |
| 8   | Apr 17 | Update landing page + README with Dev.to links | —                         |
| 8   | Apr 17 | Verify UTM tracking in Matomo                  | —                         |

### Ongoing Cadence (Post-Sprint 3)

| Frequency  | Action                                         |
| ---------- | ---------------------------------------------- |
| Per sprint | Cross-post any new technical content to Dev.to |
| Weekly     | Monitor Dev.to analytics dashboard             |
| Monthly    | Review Dev.to engagement vs other platforms    |

---

## 7. Acceptance Criteria Status

- AC1: Dev.to account created/configured — ⏸️ BACKLOG (external operational action)
- AC2: Canonical URL strategy defined — ✅ DONE (Section 2)
- AC3: At least 2 articles cross-posted — ⬜ PENDING (requires publication on Dev.to)
- AC4: Dev.to profile linked from landing + social — ✅ DONE (landing footer + social-cards README)
- AC5: Analytics tracking verified on cross-posts — ⬜ PENDING (after articles are live)
- AC6: Publication schedule documented — ✅ DONE (Section 6)

**Current status:** 3/6 ACs complete (strategy + schedule + profile linking).
Remaining 3 ACs require external operational actions (Dev.to account creation,
actual cross-post publication, and post-publication analytics verification).

---

## Metadata

Created: 2026-04-09 Day 2 | Implementation Agent

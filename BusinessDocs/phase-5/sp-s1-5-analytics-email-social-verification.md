# S1-5 — Analytics, Email and Social Setup Verification

**Sprint:** S1 | **Issue:** #162 | **Status:** ✅ COMPLETE

---

## Acceptance Criteria Verification

### 1. Matomo analytics tracking live on all pages

| Check                                      | Status | Evidence                                                      |
| ------------------------------------------ | ------ | ------------------------------------------------------------- |
| Matomo JS tracker loaded                   | ✅     | `src/webapp/landing.html` lines 19–33                         |
| Cookieless mode enabled (`disableCookies`) | ✅     | `landing.html` line 23                                        |
| Dynamic tracker URL (same-origin)          | ✅     | `landing.html` line 25: `//' + location.hostname + ':8080/'`  |
| Site ID configured                         | ✅     | `landing.html` line 27: `setSiteId, '1'`                      |
| Page view tracking via A/B experiment      | ✅     | `landing.html` line 271: `trackPageView`                      |
| Link tracking enabled                      | ✅     | `landing.html` line 272: `enableLinkTracking`                 |
| Noscript fallback                          | ✅     | `landing.html` lines 437–438                                  |
| Docker stack configured                    | ✅     | `docker-compose.analytics.yml`: Matomo 5 + MariaDB 11 + Nginx |

**Decision:** DEC-271 — Matomo cookieless replaces Google Tag Manager for GDPR
compliance (see `docs/decisions/cross-cutting.md`).

### 2. Buttondown email subscription form functional

| Check                              | Status | Evidence                                                      |
| ---------------------------------- | ------ | ------------------------------------------------------------- |
| Server-side API route              | ✅     | `src/webapp/routes/subscribe.js`                              |
| Email validation (server + client) | ✅     | `EMAIL_RE` regex + required attribute                         |
| Segment collection (4 roles)       | ✅     | developers, engineering-leaders, product-managers, evaluators |
| API key server-side only           | ✅     | `BUTTONDOWN_API_KEY` from env, never exposed to client        |
| Local fallback when no API key     | ✅     | Writes to `BusinessDocs/local-subscriptions.json`             |
| Landing page form wired            | ✅     | `landing.html` subscribes via `POST /api/subscribe`           |
| Success/error messaging            | ✅     | `subscribe-msg` with aria-live="polite"                       |
| Double opt-in                      | ✅     | Buttondown default + privacy note on page                     |

### 3. Social cards published

| Card           | File                                              | Purpose            |
| -------------- | ------------------------------------------------- | ------------------ |
| Launch         | `src/webapp/social-cards/card-launch.svg`         | OG/Twitter default |
| Risk Matrix    | `src/webapp/social-cards/card-risk-matrix.svg`    | Risk sharing       |
| Architecture   | `src/webapp/social-cards/card-architecture.svg`   | Tech sharing       |
| Sprint Results | `src/webapp/social-cards/card-sprint-results.svg` | Sprint sharing     |

- Served via `/social-cards/*.svg` route in `server.js` (line 479)
- Referenced in meta tags: `og:image` and `twitter:image` (landing.html lines 12, 17)
- Test coverage: `tests/unit/social-cards.test.js`

### 4. CORS configuration correct for analytics

| Check                               | Status | Evidence                             |
| ----------------------------------- | ------ | ------------------------------------ |
| Nginx CORS headers                  | ✅     | `matomo-nginx.conf` lines 14–16      |
| Access-Control-Allow-Origin: \*     | ✅     | Allows cross-origin tracking         |
| OPTIONS preflight handled           | ✅     | Returns 204 with proper headers      |
| Allowed methods: GET, POST, OPTIONS | ✅     | `matomo-nginx.conf` line 15          |
| Test coverage                       | ✅     | `tests/unit/matomo-cors-fix.test.js` |

---

## Test Coverage

| Test File                               | Scope              | Status |
| --------------------------------------- | ------------------ | ------ |
| `tests/unit/matomo-analytics.test.js`   | Matomo integration | ✅     |
| `tests/unit/matomo-cors-fix.test.js`    | CORS configuration | ✅     |
| `tests/unit/social-cards.test.js`       | Social card assets | ✅     |
| `tests/unit/landing-matomo.test.js`     | Landing + Matomo   | ✅     |
| `tests/unit/landing-qa.test.js`         | Landing quality    | ✅     |
| `tests/unit/landing-experiment.test.js` | A/B experiment     | ✅     |

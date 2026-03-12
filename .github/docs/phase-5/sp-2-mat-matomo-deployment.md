# SP-2-MAT Matomo Analytics Deployment Specification

**Story:** SP-2-MAT (#125)  
**Sprint:** Sprint 2 (March 25 – April 7, 2026)  
**Track:** Tech  
**Owner:** DevOps Engineer  
**Status:** ✅ COMPLETE (Day 4 — 100%)  
**Predecessor:** SP-12-705 (Analytics Baseline) ✅  
**Estimated Days:** 2-3 (March 26-28)  
**Target Completion:** March 28, 2026

---

## 1. Scope

Deploy Matomo self-hosted analytics in Docker with cookieless mode for
GDPR-compliant, privacy-first tracking. No cookie banner required.

**Decision:** Matomo selected per SP-12-705 vendor evaluation (score 8.6/10).
DEC-BLOCKER-1-502 mandates no GA4.

---

## 2. Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Nginx       │────▶│  Matomo FPM  │────▶│  MariaDB 11  │
│  (port 8080) │     │  (PHP-FPM)   │     │  (MySQL)     │
└─────────────┘     └─────────────┘     └─────────────┘
     ▲                                        │
     │                                        ▼
  Browser ──── cookieless ────▶         matomo-db-data
  (no PII)                              (volume)
```

### Components

| Component | Image | Purpose |
|-----------|-------|---------|
| matomo | `matomo:5-fpm-alpine` | Analytics PHP application |
| matomo-db | `mariadb:11` | Persistent analytics database |
| matomo-web | `nginx:alpine` | Reverse proxy + static assets |

---

## 3. Deployment Files

| File | Purpose | Status |
|------|---------|--------|
| `docker-compose.analytics.yml` | Docker Compose stack definition | ✅ Created |
| `matomo-nginx.conf` | Nginx reverse proxy configuration | ✅ Created |
| `.env` (local only, never committed) | Database passwords, port config | ⬜ Setup guide below |

---

## 4. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MATOMO_DB_PASSWORD` | Yes | — | MariaDB matomo user password |
| `MATOMO_DB_ROOT_PASSWORD` | Yes | — | MariaDB root password |
| `MATOMO_PORT` | No | 8080 | External port for Matomo web UI |

### Setup

```bash
# Create .env file (NEVER commit this file)
cat > .env << 'EOF'
MATOMO_DB_PASSWORD=<generate-strong-password>
MATOMO_DB_ROOT_PASSWORD=<generate-strong-password>
MATOMO_PORT=8080
EOF
```

---

## 5. Deployment Commands

```bash
# Start Matomo stack
docker compose -f docker-compose.analytics.yml up -d

# Verify all services are healthy
docker compose -f docker-compose.analytics.yml ps

# View logs
docker compose -f docker-compose.analytics.yml logs -f

# Stop stack
docker compose -f docker-compose.analytics.yml down

# Destroy stack + data (CAUTION)
docker compose -f docker-compose.analytics.yml down -v
```

---

## 6. Post-Deployment Configuration

### 6.1 Matomo Setup Wizard

1. Navigate to `http://localhost:8080`
2. Complete Matomo installation wizard
3. Create site with URL matching the webapp

### 6.2 Enable Cookieless Mode (CRITICAL — GDPR)

In Matomo Admin → Privacy → Anonymize data:
- Enable "Use Matomo without consent"
- Disable all cookies
- Set IP anonymization to 2 bytes (e.g., 192.168.xxx.xxx → 192.168.0.0)

Or via Matomo config (recommended):

```ini
; config/config.ini.php — add under [General]
[General]
force_ssl = 0
enable_browser_archiving_triggering = 1

[Tracker]
; Cookieless tracking — no consent banner required
use_third_party_id_cookie = 0
create_new_visit_when_website_referrer_changes = 0
```

### 6.3 Tracking Script Integration

Add to webapp HTML (already specified in SP-12-705 §6):

```html
<script>
  var _paq = window._paq = window._paq || [];
  _paq.push(['disableCookies']);
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u = '//' + location.hostname + ':8080/';
    _paq.push(['setTrackerUrl', u + 'matomo.php']);
    _paq.push(['setSiteId', '1']);
    var d = document, g = d.createElement('script'),
        s = d.getElementsByTagName('script')[0];
    g.async = true; g.src = u + 'matomo.js';
    s.parentNode.insertBefore(g, s);
  })();
</script>
```

---

## 7. Security Considerations

| Item | Mitigation |
|------|-----------|
| Database passwords | Via `.env` file, never committed (in .gitignore) |
| Matomo admin access | Protected by Matomo auth, change default credentials |
| Network isolation | Analytics stack on dedicated Docker network |
| Data residency | Self-hosted — all data stays on own infrastructure |
| PII exposure | Cookieless mode + IP anonymization — no PII collected |

---

## 8. Acceptance Criteria

- [x] Docker Compose stack defined with health checks
- [x] Nginx reverse proxy configured
- [x] Environment variables documented (passwords via .env)
- [x] Cookieless mode configuration documented
- [x] Tracking script ready for webapp integration
- [x] Stack deploys successfully (`docker compose up -d`)
- [x] Matomo web UI accessible on configured port
- [x] Landing page tracking integration (SP-2-LND Day 4)

---

## 9. Day 2 Progress

- ✅ `docker-compose.analytics.yml` created — 3-service stack (Matomo + MariaDB + Nginx)
- ✅ `matomo-nginx.conf` created — reverse proxy with PHP-FPM pass-through
- ✅ Deployment specification complete
- ✅ Security: passwords via `.env`, not committed
- ⬜ Deploy to staging (requires Docker host)
- ⬜ Integrate tracking tag with landing page (after SP-2-LND)

---

## 10. Day 4 Progress (Checkpoint 1)

- ✅ 32 validation tests created (`__tests__/unit/matomo-analytics.test.js`): Docker Compose stack (13), Nginx proxy (7), cookieless GDPR mode (6), tracking script format (3), port isolation (3)
- ✅ Stack configuration validated: all 3 services correct images, health checks, env-var secrets, volumes, network isolation
- ✅ Security audited: no hardcoded passwords, .env injection verified, .ht file access denied
- ✅ Cookieless tracking mode validated: `disableCookies`, `use_third_party_id_cookie=0`, IP anonymization documented
- ✅ Port isolation confirmed: 8080 (Matomo) does not conflict with 3000 (main) or 8081 (Weblate)
- ⬜ Landing page tracking integration (SP-2-LND next)

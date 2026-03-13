# SP-12-701 Brand Assets & Foundation

**Story:** SP-12-701 (Brand Brief and Foundation)  
**Sprint:** Sprint 1 (March 10-24, 2026)  
**Track:** Marketing  
**Owner:** Brand Strategist / Marketing Lead  
**Status:** ✅ SPRINT 1 SCOPE COMPLETE (Day 8 — 95%) **Target Completion:**
March 20 — CLOSED

**Sprint 2 Carryover:** Logo file production, icon SVG export, and social media
asset sizing require design tool (Figma/Illustrator). All specifications,
guidelines, typography, and icon descriptions are complete and ready for
designer handoff.

---

## 1. Brand Identity Summary

### Brand Name

**Agentic SDLC** — The Multi-Agent Software Delivery Platform

### Brand Mission

Empower development teams to deliver complete, production-ready software
solutions through structured multi-agent orchestration — bridging the gap
between strategy and execution across all disciplines.

### Brand Vision

To become the standard for end-to-end software creation where planning, design,
development, and go-to-market work as one integrated system.

### Brand Values

| Value            | Expression                                                  | Anti-Pattern                      |
| ---------------- | ----------------------------------------------------------- | --------------------------------- |
| **Rigor**        | Evidence-driven decisions; structured phases; quality gates | Not bureaucracy; not slow         |
| **Completeness** | Multi-discipline coverage; no handoff gaps                  | Not scope creep; not gold-plating |
| **Transparency** | Audit trails; traceable decisions; open source              | Not surveillance; not complexity  |
| **Speed**        | Iterative sprints; parallel execution; automated CI         | Not shortcuts; not technical debt |
| **Trust**        | Privacy-first; compliance-ready; security by default        | Not marketing hype; not vaporware |

---

## 2. Logo System

### Primary Logo

- **Type:** Wordmark + Icon combination
- **Wordmark:** "Agentic SDLC" in Inter Bold (brand primary font)
- **Icon:** Stylized orchestration symbol — interconnected nodes representing
  multi-agent collaboration (4 nodes = 4 disciplines converging)
- **Color:** Primary Deep Blue (#1a365d) on white backgrounds; White on dark
  backgrounds

### Logo Variants

| Variant                 | Usage                              | Format                         | Status           |
| ----------------------- | ---------------------------------- | ------------------------------ | ---------------- |
| Full color (horizontal) | Website header, documentation      | SVG, PNG (1x, 2x, 3x)          | ✅ Spec complete |
| Full color (stacked)    | Social media profile, favicon      | SVG, PNG                       | ✅ Spec complete |
| Monochrome (dark)       | Dark backgrounds, branded overlays | SVG, PNG                       | ✅ Spec complete |
| Monochrome (light)      | Print, light backgrounds           | SVG, PNG                       | ✅ Spec complete |
| Icon only               | Favicon, app icon, small contexts  | SVG, ICO, PNG 16/32/64/128/256 | ✅ Spec complete |

### Clear Space & Minimum Size

- **Clear space:** 1x height of the "A" in Agentic on all sides
- **Minimum width:** 120px (digital), 25mm (print) for full logo
- **Minimum width:** 16px (digital) for icon only

---

## 3. Color Palette (Aligned with Design Tokens v2.0.0)

All colors reference the locked design tokens in
`docs/brand/design-tokens.json`.

### Primary Colors

| Name        | Token             | Hex     | Usage                                   |
| ----------- | ----------------- | ------- | --------------------------------------- |
| Deep Blue   | `color.primary`   | #1a365d | Primary brand, headings, CTAs           |
| Accent Teal | `color.secondary` | #2b6cb0 | Links, highlights, interactive elements |
| Trust Green | `color.success`   | #38a169 | Success states, positive indicators     |

### Neutral Colors

| Name       | Token                        | Hex     | Usage                      |
| ---------- | ---------------------------- | ------- | -------------------------- |
| Dark Text  | `color.text.primary`         | #1a202c | Body text, primary content |
| Muted Text | `color.text.secondary`       | #4a5568 | Secondary text, captions   |
| Background | `color.background.primary`   | #ffffff | Page backgrounds           |
| Surface    | `color.background.secondary` | #f7fafc | Cards, elevated surfaces   |
| Border     | `color.border`               | #e2e8f0 | Dividers, input borders    |

### Semantic Colors

| Name    | Token           | Hex     | Usage                    |
| ------- | --------------- | ------- | ------------------------ |
| Warning | `color.warning` | #d69e2e | Warnings, advisory notes |
| Error   | `color.error`   | #e53e3e | Errors, critical alerts  |

---

## 4. Typography (Aligned with Design Tokens v2.0.0)

| Role     | Font           | Token                 | Weight          | Usage                     |
| -------- | -------------- | --------------------- | --------------- | ------------------------- |
| Headings | Inter          | `font.family.heading` | Bold (700)      | H1-H6, page titles        |
| Body     | Inter          | `font.family.body`    | Regular (400)   | Paragraphs, lists, tables |
| Code     | JetBrains Mono | `font.family.mono`    | Regular (400)   | Code blocks, CLI output   |
| Accent   | Inter          | `font.family.heading` | Semi-Bold (600) | CTAs, nav items, badges   |

### Type Scale

| Size | Token          | Pixels | Usage                      |
| ---- | -------------- | ------ | -------------------------- |
| XS   | `font.size.xs` | 12px   | Captions, footnotes        |
| SM   | `font.size.sm` | 14px   | Secondary text, labels     |
| MD   | `font.size.md` | 16px   | Body text (base)           |
| LG   | `font.size.lg` | 20px   | Subheadings, featured text |
| XL   | `font.size.xl` | 24px   | Section headings           |

---

## 5. Brand One-Pager

### Elevator Pitch (30 seconds)

"Agentic SDLC is the first platform that orchestrates business strategy,
technical architecture, UX design, and go-to-market into a single, structured
delivery process. Instead of building features in silos, teams get a complete
solution blueprint, validated by multi-agent analysis, with built-in quality
gates from Day 1. It's how production-ready software should be built."

### Key Differentiators

1. **End-to-End Coverage:** 4 disciplines × 4 deliverables per phase = 64+
   analyzed dimensions before code
2. **Quality Built In:** Critic + Risk validation, automated CI/CD, secret
   scanning, WCAG AA compliance — standard, not optional
3. **Traceable Decisions:** Every recommendation, risk assessment, and blocker
   resolution is documented with source references
4. **Sprint-Ready Output:** Synthesis produces a sprint backlog with prioritized
   stories, acceptance criteria, and cross-team dependency tracking

### Competitive Positioning

| Dimension    | Agentic SDLC                      | Traditional Approach | AI Code Generators   |
| ------------ | --------------------------------- | -------------------- | -------------------- |
| Scope        | Strategy → Sprint → Code → Deploy | Code only            | Code generation only |
| Disciplines  | Business, Tech, UX, Marketing     | Tech-focused         | Tech-focused         |
| Quality      | Multi-phase validation, KPI gates | Manual review        | Limited or none      |
| Governance   | Built-in compliance, risk matrix  | Separate process     | None                 |
| Traceability | Full audit trail                  | Partial (JIRA/wiki)  | None                 |

---

## 6. Icon Library (RESOLVED — Public Library)

> **Decision DEC-112:** All icons sourced from a publicly available icon library
> (e.g. Lucide, Heroicons, Phosphor). No custom icon production required. This
> eliminates the design-tool dependency and speeds up development.

### System Icons (Target: 20 core icons — sourced from public library)

| Icon          | Context                  | Library Equivalent            |
| ------------- | ------------------------ | ----------------------------- |
| Dashboard     | Navigation, landing page | `layout-dashboard`            |
| Sprint        | Sprint view, planning    | `refresh-cw` / `iteration`    |
| Agent         | Agent visualization      | `bot` / `cpu`                 |
| Questionnaire | Q&A interface            | `clipboard-list`              |
| Decision      | Decision management      | `git-branch` / `split`        |
| Risk          | Risk matrix, warnings    | `alert-triangle`              |
| Compliance    | Compliance indicators    | `shield-check`                |
| Build         | CI/CD pipeline status    | `hammer` / `wrench`           |
| Test          | Test results             | `flask-conical` / `test-tube` |
| Deploy        | Deployment status        | `rocket`                      |

### Icon Guidelines

- **Source:** Public icon library (Lucide recommended — MIT license, 24px grid,
  2px stroke, matches brand style)
- **Style:** Outlined, 2px stroke, rounded caps
- **Grid:** 24 × 24 px
- **Color:** Inherits from parent (currentColor)
- **Format:** SVG (inline-ready)
- **No custom icon creation** — select from library; if an exact match is
  unavailable, use the closest semantic equivalent

---

## 7. Brand Usage Guidelines

### Logo Usage Rules

| Rule             | ✅ Do                                                       | ❌ Don't                                    |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------- |
| **Color**        | Use primary Deep Blue on light backgrounds; white on dark   | Don't recolor the logo arbitrarily          |
| **Spacing**      | Maintain 1x clear space on all sides                        | Don't crowd the logo against other elements |
| **Size**         | Minimum 120px digital / 25mm print                          | Don't scale below minimum size              |
| **Orientation**  | Use horizontal for headers, stacked for social/square       | Don't rotate, skew, or distort              |
| **Background**   | Use on solid or near-solid backgrounds with ≥4.5:1 contrast | Don't place on busy images without overlay  |
| **Modification** | Use approved variants only                                  | Don't add effects (shadow, glow, gradient)  |

### Color Usage Rules

| Rule              | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **Contrast**      | All text-on-background combinations must meet WCAG AA ≥4.5:1                     |
| **Primary Blue**  | Use for headings, CTAs, and primary actions only; not for large background fills |
| **Success Green** | Reserved for positive/success states only; not decorative                        |
| **Error Red**     | Reserved for error/critical states only; not for emphasis                        |
| **Neutrals**      | Use Dark Text (#1a202c) for body; Muted (#4a5568) for secondary                  |

### Typography Rules

| Rule            | ✅ Do                                                   | ❌ Don't                               |
| --------------- | ------------------------------------------------------- | -------------------------------------- |
| **Hierarchy**   | Use consistent heading scale (XS-XL from tokens)        | Don't mix arbitrary font sizes         |
| **Fonts**       | Inter for UI/marketing; JetBrains Mono for code         | Don't substitute with similar fonts    |
| **Weight**      | Bold for headings; Regular for body; Semi-Bold for CTAs | Don't use Light weight (readability)   |
| **Line length** | 60-80 characters per line for body text                 | Don't exceed 100 chars without columns |

### Content Voice Rules

| Rule                                                                         | Details |
| ---------------------------------------------------------------------------- | ------- |
| Always use "Agentic SDLC" (not "AgenticSDLC" or "agentic sdlc")              |         |
| Capitalize product name consistently; lowercase "platform" when not in title |         |
| Refer to users as "teams" or "developers" — not "customers" in content       |         |
| Attribute quotes and data points to source documents                         |         |

---

## 8. Logo Export Specifications

### File Naming Convention

```
agentic-sdlc-logo-{variant}-{size}.{format}
```

Examples: `agentic-sdlc-logo-horizontal-1x.svg`,
`agentic-sdlc-logo-icon-256.png`

### Export Matrix

| Variant          | Format  | Dimensions           | Color Mode | Use Case                    |
| ---------------- | ------- | -------------------- | ---------- | --------------------------- |
| Horizontal       | SVG     | Scalable             | sRGB       | Web headers, documentation  |
| Horizontal       | PNG @1x | 240 × 60 px          | sRGB       | Email signatures, low-DPI   |
| Horizontal       | PNG @2x | 480 × 120 px         | sRGB       | Retina displays             |
| Horizontal       | PNG @3x | 720 × 180 px         | sRGB       | High-DPI marketing          |
| Stacked          | SVG     | Scalable             | sRGB       | Social profiles             |
| Stacked          | PNG     | 400 × 400 px         | sRGB       | Social media profile photos |
| Icon             | SVG     | Scalable             | sRGB       | Inline web use              |
| Icon             | ICO     | 16, 32, 48 px        | sRGB       | Browser favicon             |
| Icon             | PNG     | 64, 128, 256, 512 px | sRGB       | App icons, OG images        |
| Monochrome Dark  | SVG     | Scalable             | sRGB       | Dark background overlays    |
| Monochrome Light | SVG     | Scalable             | sRGB       | Print, light backgrounds    |

### Social Media Asset Sizes

| Platform  | Asset               | Dimensions    | Notes                             |
| --------- | ------------------- | ------------- | --------------------------------- |
| LinkedIn  | Company page banner | 1128 × 191 px | Deep Blue bg, white logo, tagline |
| LinkedIn  | Post image          | 1200 × 627 px | Branded card template             |
| Twitter/X | Profile banner      | 1500 × 500 px | Deep Blue bg, tagline centered    |
| Twitter/X | Post image          | 1600 × 900 px | 16:9 branded card                 |
| GitHub    | Social preview      | 1280 × 640 px | Repository OG image               |
| Dev.to    | Cover image         | 1000 × 420 px | Article header                    |
| General   | OG image            | 1200 × 630 px | Default social sharing            |

---

## 9. Typography Application Guide

### Heading Hierarchy

| Level | Font           | Weight        | Size | Line-Height | Use Case                      |
| ----- | -------------- | ------------- | ---- | ----------- | ----------------------------- |
| H1    | Inter          | Bold 700      | 32px | 1.25        | Page titles, hero headlines   |
| H2    | Inter          | Bold 700      | 24px | 1.3         | Section headings              |
| H3    | Inter          | Semi-Bold 600 | 20px | 1.35        | Subsection headings           |
| H4    | Inter          | Semi-Bold 600 | 16px | 1.4         | Card titles, sidebar headings |
| Body  | Inter          | Regular 400   | 16px | 1.6         | Paragraphs, list items        |
| Small | Inter          | Regular 400   | 14px | 1.5         | Labels, captions, metadata    |
| Code  | JetBrains Mono | Regular 400   | 14px | 1.5         | Inline code, terminal output  |

### Font Loading Strategy

```html
<!-- Preconnect for Google Fonts (Inter) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Load Inter 400, 600, 700 + JetBrains Mono 400 -->
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap"
  rel="stylesheet"
/>
```

### CSS Custom Properties

```css
:root {
  --font-heading: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

---

## 10. Icon Usage Specifications (Public Library)

> **Decision DEC-112:** Icons are sourced from a public icon library, not
> custom-produced. The SVG template below matches Lucide's output format.

### SVG Template (matches Lucide output)

All icons follow the same base template for consistency:

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     width="24" height="24"
     viewBox="0 0 24 24"
     fill="none"
     stroke="currentColor"
     stroke-width="2"
     stroke-linecap="round"
     stroke-linejoin="round">
  <!-- icon paths from public library -->
</svg>
```

### Usage Rules

| Rule          | Value                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Source        | Public icon library (Lucide recommended, MIT license)                 |
| Canvas size   | 24 × 24 px                                                            |
| Stroke width  | 2px                                                                   |
| Stroke style  | Round caps, round joins                                               |
| Fill          | None (outline only)                                                   |
| Color         | `currentColor` (inherits)                                             |
| Installation  | `npm install lucide` or inline SVG copy                               |
| Accessibility | `aria-hidden="true"` when paired with text; `<title>` when standalone |

### Icon Mapping (Public Library → Application Context)

| Context       | Lucide Icon Name   | Fallback       |
| ------------- | ------------------ | -------------- |
| Dashboard     | `layout-dashboard` | `grid-2x2`     |
| Sprint        | `refresh-cw`       | `iteration`    |
| Agent         | `bot`              | `cpu`          |
| Questionnaire | `clipboard-list`   | `list-checks`  |
| Decision      | `git-branch`       | `split`        |
| Risk          | `alert-triangle`   | `shield-alert` |
| Compliance    | `shield-check`     | `check-circle` |
| Build         | `hammer`           | `wrench`       |
| Test          | `flask-conical`    | `test-tube`    |
| Deploy        | `rocket`           | `upload-cloud` |

**Note:** No custom icon production or design tool required. Select icons
directly from the library. The webapp already uses this pattern (see
`src/webapp/index.html` inline SVGs).

---

## 11. Remaining Work (Target: March 21)

- [x] Define logo export specifications (all variants, formats, dimensions)
- [x] Define social media asset sizes (7 platform/asset combinations)
- [x] Create brand usage guidelines document (dos/don'ts)
- [x] Review color accessibility (contrast ratios ≥4.5:1 for text)
- [x] Typography application guide (heading hierarchy, font loading, CSS props)
- [x] Icon production specifications (SVG template, rules, visual descriptions)
- [ ] Produce logo variant files (requires design tool — SVG/PNG export) →
      Sprint 2
- [x] ~~Export icon library SVGs (10 core icons minimum)~~ → RESOLVED by
      DEC-112: use public icon library (no custom production)
- [ ] Produce social media sized assets (LinkedIn, Twitter/X headers) → Sprint 2

**Note:** Icon library work is resolved — public icon library
(Lucide/Heroicons/Phosphor) will be used per DEC-112. Remaining items: logo
variant files and social media sized assets require design tool or text-based
generation.

---

## HANDOFF CHECKLIST

- [x] Brand identity summary (mission, vision, values)
- [x] Logo system documented (5 variants, clear space rules)
- [x] Color palette aligned with design tokens v2.0.0
- [x] Typography system aligned with design tokens v2.0.0
- [x] Typography application guide (heading hierarchy, CSS properties, font
      loading)
- [x] Brand one-pager with elevator pitch + differentiators
- [x] Competitive positioning matrix
- [x] Icon library started (10 icons, guidelines defined, specs complete)
- [x] Icon production specifications (SVG template, naming, visual descriptions)
- [x] Brand usage guidelines (logo, color, typography, voice rules)
- [x] Logo export specifications defined (11 variants across 5 formats)
- [x] Social media asset sizes defined (7 platform/asset combinations)
- [ ] Logo files exported (Sprint 2 — requires design tool)
- [x] ~~Icon SVGs exported~~ → RESOLVED by DEC-112: public icon library (no
      custom production needed)
- [x] Output written to file per MEMORY MANAGEMENT PROTOCOL

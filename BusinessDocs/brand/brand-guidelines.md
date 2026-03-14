# Agentic SDLC Brand Guidelines

Version: 2.0  
Date: 2026-03-10  
Source: `docs/phase-4/14-brand-strategist-analysis.md` and
`docs/phase-4/14-brand-strategist-recommendations.md`

## 1. Brand Overview

Mission: Enable professional teams to design and deliver complete software
solutions through a structured, multi-discipline, evidence-driven process.

Vision: A world where software creation combines strategic rigor with execution
excellence, eliminating the gap between planning and delivery.

Brand personality:

- Sage (primary): rigorous, credible, systematic.
- Creator (secondary): inventive, practical, forward-looking.

Core values:

- Rigor: evidence-first decisions and clear traceability.
- Transparency: visible status, risks, and assumptions.
- Pragmatism: value delivery over perfection.
- Empowerment: clear guardrails with team autonomy.

Positioning statement: For product managers, software architects, and technical
leads in mid-market and enterprise organizations, Agentic SDLC is an end-to-end
solution design and delivery system that combines strategic analysis (Phases
1-4) with iterative implementation (Phase 5), because teams need both planning
rigor and execution speed.

## 2. Logo Usage

Primary mark:

- Wordmark: `Agentic SDLC`.
- Supporting descriptor: `End-to-End Solution Design and Delivery`.

Logo variants:

- Primary horizontal lockup: wordmark + descriptor.
- Compact lockup: wordmark only.
- Monochrome lockup: single-color version for constrained contexts.

Clear space:

- Minimum clear space equals the height of uppercase `A` in `Agentic` on all
  sides.

Minimum sizes:

- Primary lockup: 160px minimum width on digital surfaces.
- Compact lockup: 96px minimum width on digital surfaces.

Prohibited usage:

- Do not stretch, skew, rotate, or apply non-token gradients.
- Do not place the logo on low-contrast backgrounds.
- Do not recolor logo elements outside tokenized brand colors.
- Do not add drop shadows, glows, or decorative outlines.

## 3. Color System

Token source: `docs/brand/design-tokens.json` (`colors` object).

Core palette:

| Role       | Hex       | RGB             | Usage                             |
| ---------- | --------- | --------------- | --------------------------------- |
| Primary    | `#0A3A66` | `10, 58, 102`   | Core brand surfaces, primary CTAs |
| Secondary  | `#1B6B5E` | `27, 107, 94`   | Reinforcement, secondary actions  |
| Accent     | `#E87722` | `232, 119, 34`  | Highlights, momentum cues         |
| Background | `#F7FAFC` | `247, 250, 252` | App/page background               |
| Surface    | `#FFFFFF` | `255, 255, 255` | Cards and elevated containers     |
| Text       | `#102A43` | `16, 42, 67`    | Primary text                      |
| Error      | `#B42318` | `180, 35, 24`   | Error states                      |
| Warning    | `#B54708` | `181, 71, 8`    | Warning states                    |
| Success    | `#027A48` | `2, 122, 72`    | Success states                    |

Contrast verification (WCAG AA minimum 4.5:1 for normal text):

- `#102A43` on `#F7FAFC`: 13.97:1
- `#102A43` on `#FFFFFF`: 14.64:1
- `#FFFFFF` on `#0A3A66`: 11.60:1
- `#FFFFFF` on `#1B6B5E`: 6.34:1
- `#FFFFFF` on `#B42318`: 6.57:1
- `#102A43` on `#E87722`: 4.95:1

Usage guidelines:

- Use `primary` for primary calls-to-action and key interactive controls.
- Use `secondary` for supporting actions and positive-forward momentum.
- Use `accent` in limited, high-intent locations only.
- Always pair semantic colors (`error`, `warning`, `success`) with icons or
  labels.
- Do not introduce raw hex values in UI implementation.

## 4. Typography

Token source: `docs/brand/design-tokens.json` (`typography` object).

Font families:

- Heading: `Sora`
- Body: `Manrope`
- Mono: `JetBrains Mono`

Type scale:

| Token | Size | Typical usage          |
| ----- | ---- | ---------------------- |
| `xs`  | 12px | Micro labels, metadata |
| `sm`  | 14px | Secondary UI text      |
| `md`  | 16px | Body text, form text   |
| `lg`  | 20px | Section titles         |
| `xl`  | 28px | Page hero titles       |

Weight and rhythm:

- Regular: 400 for body content.
- Medium/Semibold: 500/600 for labels and control emphasis.
- Bold: 700 for titles and high hierarchy nodes.
- Use `normal` line-height for UI text and `relaxed` for long-form guidance
  content.

Usage contexts:

- Product UI: `body` family with strict hierarchy.
- Marketing pages: `heading` family for headers, `body` for all support copy.
- Technical snippets and IDs: `mono` only.

## 5. Imagery & Iconography

Imagery direction:

- Favor system diagrams, workflow visualizations, and evidence-oriented screens.
- Show real process artifacts (phase maps, risk matrices, sprint traces) over
  stock photography.
- Maintain neutral, professional composition with high information density and
  clear whitespace.

Iconography rules:

- **Use a publicly available icon library** (e.g. Lucide, Heroicons, Phosphor)
  for all UI icons. Do NOT custom-create icons. (Decision DEC-112)
- Use outline or duotone icons with consistent stroke weight (2px).
- Keep icon metaphors concrete (process, decision, verification, handoff, risk).
- Use semantic token colors only — icons inherit via `currentColor`.
- Pair icon-only actions with accessible labels.
- All icons render as inline SVG with `aria-hidden="true"` when adjacent text
  provides the label.

Illustration style:

- Geometric, modular, and structural.
- Avoid cartoon motifs and exaggerated mascot styles.
- Prefer visual metaphors that reflect orchestration, sequencing, and
  traceability.

## 6. Voice & Tone

Brand voice attributes:

- Rigorous: evidence-backed, precise wording.
- Transparent: explicit about assumptions, risks, and limits.
- Empowering: action-forward and operationally useful.
- Calm: professional under ambiguity or failure states.

Writing style rules:

- State facts first, then implications, then next action.
- Prefer direct verbs and measurable language.
- Avoid hype language (for example: "magic", "revolutionary", "unlimited").
- Use consistent canonical terms: phase, sprint, risk, blocker, handoff,
  mitigation.

Tone by context:

- Success: concise and matter-of-fact.
- Warning: explicit consequence plus clear remediation path.
- Error: calm diagnosis plus immediate next step.
- Guidance: structured, stepwise, and low-ambiguity.

Voice consistency requirement:

- Product, documentation, and campaign copy must align with this voice standard
  before publication.

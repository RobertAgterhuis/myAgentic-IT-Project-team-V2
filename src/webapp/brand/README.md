# Platform Brand Assets

This directory contains the **platform's own** brand identity files — the visual
identity of the Agentic SDLC tool itself.

| File                     | Purpose                                     |
| ------------------------ | ------------------------------------------- |
| `design-tokens.json`     | W3C design tokens (colors, typography, etc) |
| `brand-guidelines.md`    | Brand handbook (logo, colors, tone)         |
| `brand-assets-report.md` | Brand kit overview and token status         |
| `content-style-guide.md` | Tone of voice and writing rules             |

## Build Pipeline

`scripts/build-tokens.mjs` reads `design-tokens.json` from this directory and
generates `src/webapp/ui/src/tokens.css` (the Tailwind v4 theme consumed by the
React UI).

## Not to Be Confused With

`BusinessDocs/brand/` is the **solution output** directory — it is populated by
Agent 30 (Brand & Assets Agent) when users create a new software solution. That
directory is empty in a fresh checkout.

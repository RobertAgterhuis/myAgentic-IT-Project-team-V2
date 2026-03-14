# Social Media Visual Cards

Branded SVG cards for LinkedIn social media posts. Part of SP-2-SOC (#127).

## Cards

| Card                | File                      | Post        | Dimensions |
| ------------------- | ------------------------- | ----------- | ---------- |
| Launch Announcement | `card-launch.svg`         | Week 1, Mon | 1200×627px |
| Risk Matrix         | `card-risk-matrix.svg`    | Week 1, Wed | 1200×627px |
| CI/CD Architecture  | `card-architecture.svg`   | Week 1, Fri | 1200×627px |
| Sprint Results      | `card-sprint-results.svg` | Week 2, Thu | 1200×627px |

## Brand Tokens

All cards use the official design token palette from
`src/webapp/brand/design-tokens.json`:

- **Primary**: `#0A3A66` (backgrounds, borders)
- **Secondary**: `#1B6B5E` (phase boxes, accents)
- **Accent**: `#E87722` (highlights, CTAs)
- **Background**: `#F7FAFC` (light cards)
- **Text**: `#102A43` (primary text)
- **Heading Font**: Sora (600/700)
- **Body Font**: Manrope (400/500/600)
- **Mono Font**: JetBrains Mono (code/metrics)

## Converting to PNG

SVGs can be converted to PNG for LinkedIn upload:

```bash
# Using Inkscape CLI
inkscape card-launch.svg --export-type=png --export-width=1200 --export-height=627

# Using librsvg
rsvg-convert -w 1200 -h 627 card-launch.svg > card-launch.png

# Using Chrome headless
chrome --headless --screenshot --window-size=1200,627 card-launch.svg
```

## LinkedIn Image Specs

- Recommended: 1200×627px (1.91:1 aspect ratio)
- Minimum: 1200×627px for high quality display
- Max file size: 10 MB (PNG) or 5 MB (JPEG)
- Format: PNG preferred for text-heavy graphics

## Community

- [GitHub Discussions](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/discussions)
- [Dev.to Blog](https://dev.to/agentic-sdlc)
- [Issues](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues)

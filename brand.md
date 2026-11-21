# Brand: Next Rupee Planner

_Direction: **civic ledger**. Industrial and utilitarian, with editorial restraint. Chosen 2026-11-21 to replace the earlier warm-beige, serif and card-heavy look, which read as generic._

**Feel:** a budget worksheet a ward officer would trust. Flat paper, ink, hairline rules, tabular figures. One signal colour (vermilion) is reserved for the budget line and for money that is short. Nothing decorative.

## Design brief
- **Density:** comfortable and tabular. Rows and columns, not cards. No box inside a box.
- **Surface:** flat paper. Structure comes from rules, spacing and type, not shadows or rounded panels.
- **Type:** Public Sans (the US government design-system face: plain, civic, deliberate) for text. IBM Plex Mono for every figure, ID and amount, with tabular numerals. Three weights: 400, 600, 700. Display text tracks tight (-0.02em); small uppercase labels track loose (+0.06em).
- **Shape:** 2px corners on controls, none on rows. No pill badges: status is a glyph plus a word.
- **Motion:** none decorative. State changes take 120 to 200ms with `cubic-bezier(0.23, 1, 0.32, 1)`; everything stops under `prefers-reduced-motion`.
- **Do:** one accent; state in words and glyphs, never colour alone; lead with the number; put the budget line where the money runs out; show the arithmetic.
- **Don't:** icon-and-paragraph feature grids, hero metric tiles, gradient or glass, centred everything, identical padding and radius everywhere, vague headlines.

## Tokens (live in `web/src/app/globals.css`; every text pair is at least 4.5:1, control borders at least 3:1)
| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#EFEFEA` | `#101418` | page |
| `panel` | `#FAFAF7` | `#171C21` | inputs, the expanded working |
| `foreground` | `#12161B` | `#ECEDE8` | text, covered marks, primary button |
| `muted` | `#4F5660` | `#9BA2AB` | secondary text |
| `rule` | `#C3C6BD` | `#3A424B` | hairlines between rows (decorative) |
| `line` | `#767C84` | `#7A838D` | borders of controls (3:1) |
| `accent` | `#B52A0B` | `#FF7A59` | the budget line, short money, key figures |
| `ok` | `#14684F` | `#5CC8A4` | rare positive state |
| `warn` | `#8A5A00` | `#E3B341` | low-confidence marker |

## Voice
Plain English a ward officer can repeat. Say what the number is and what to do with it. No filler headings.

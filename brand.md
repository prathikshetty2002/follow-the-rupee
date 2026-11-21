# Brand: Follow the Rupee

_Status: chosen (civic ledger). Set by the team for the Claude Impact Lab Mumbai dashboard._

**Feel:** a public ledger a citizen can trust: warm paper, ink-black text, one saffron accent for money, red only for things to check, green for fixes that held. Calm, plain, evidence first.

## Palette (tokens live in `web/src/app/globals.css`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#faf8f3` | `#14130f` | page |
| `surface` / `surface-2` | `#ffffff` / `#f3f0e8` | `#1c1b17` / `#242219` | cards, table stripes |
| `foreground` | `#1b1a17` | `#f2efe6` | text |
| `muted` | `#5e5a52` | `#a8a395` | secondary text (AA on background) |
| `border` | `#e4dfd3` | `#2e2c25` | lines |
| `accent` | `#b45309` | `#f59e0b` | money, key numbers, links |
| `danger` | `#b42318` | `#f97066` | flags, failed repairs, over budget |
| `success` | `#1e7b4f` | `#4cc38a` | repairs that held, on time |
| `warn` | `#9a6700` | `#e3b341` | in-between |
| `info` | `#2b5fa5` | `#7aa7e6` | neutral facts |

Grades: A and B use `success`, C uses `warn` ("about as expected"), D and E use `danger`.
Map ramps use `color-mix` of one token against `surface`, so they work in both themes.

## Type
- Headings: Fraunces (serif), the ledger feel. Body and UI: Geist. Numbers, IDs, money: Geist Mono with tabular figures.

## Voice
Plain English a citizen can repeat. State what the data shows and what is expected for the same work. No accusations: say "listed for review", never fraud. Every claim links to the work orders behind it. Say "synthetic data" where it matters.

# Brand: Next Rupee Planner, Mumbai edition

_Direction: **Mumbai dawn**. Soft, airy and elegant: a refined serif headline with one italic accent word, a Marine Drive sunrise gradient, charcoal pill buttons, frosted cards. Inspired by the "Axion" mobile design (Orbix Studio, Dribbble) and rebuilt with a Mumbai identity. Replaces the earlier flat "civic ledger" look._

**Feel:** calm, trustworthy, light. A ward officer should feel the page is clear before they read it. Mumbai shows up in colour and a single illustration, not in decoration on every element.

## Mumbai in the design
- **Dawn over the Arabian Sea:** the page background is a peach-to-cream-to-mist gradient, like sunrise on Marine Drive.
- **Kaali-peeli:** charcoal (kaali, the taxi's black) for buttons and ink; marigold orange (peeli, the taxi's yellow) for the accent, italic headline words and the budget line.
- **Sea:** a deep Arabian-Sea teal for "paid", pale mist for "not paid".
- **Skyline illustration (home hero):** Rajabai Tower, CST's dome, the Gateway of India, the Bandra-Worli Sea Link and the Marine Drive "Queen's Necklace" of lights, in three soft tones. Decorative only.
- **Logo mark:** a domed heritage building over a rupee sign with an orange sweep, in brown and marigold (`web/public/logo.png`, transparent; also the favicon).

## Design brief
- **Type:** Instrument Serif for display headings, with an italic accent word. Instrument Sans for text and figures (tabular numerals). Three weights: 400, 500 to 600, 700.
- **Shape (varied by role):** pills for buttons, chips and status; 24px for cards; 14px for inputs; square-cornered rows inside cards.
- **Surface:** white cards on the gradient, hairline border, shadow at most 5% opacity. Frosted glass only for the hero stat cards.
- **Motion:** gentle only: 150 to 250ms, `cubic-bezier(0.23, 1, 0.32, 1)`, none under `prefers-reduced-motion`.
- **Do:** one accent; state in words and shapes as well as colour; lead with the number.
- **Don't:** more than one illustration, gradients on text, drop shadows you can clearly see, tiny low-contrast labels.

## Tokens (live in `web/src/app/globals.css`; text pairs at least 4.5:1, large display text at least 3:1, control borders at least 3:1)
| Token | Light | Dark (Mumbai night) | Use |
|---|---|---|---|
| `background` | `#FBF7F1` | `#0E141B` | page |
| `card` | `#FFFFFF` | `#16202B` | cards, inputs |
| `peach` / `mist` | `#FCE6D2` / `#E7EEF3` | `#2A1E22` / `#12202B` | sunrise gradient, soft panels |
| `foreground` | `#1E1D1B` | `#F3EFE8` | text, primary button |
| `muted` | `#5B5E63` | `#A5AFBA` | secondary text |
| `accent` | `#CC5A08` | `#FF9A3C` | italic headline words, the budget line, large text |
| `accent-ink` | `#A8470A` | `#FFB874` | small accent text |
| `sea` | `#1B6682` | `#7CC8E0` | paid, positive, links |
| `sea-fill` | `#1B6682` | `#3E9BBA` | the "paid" segments |
| `unpaid` | `#D3DBE2` | `#2C3947` | the "not paid" segments |
| `line` | `#8C8F94` | `#6E7C8B` | control borders |
| `rule` | `#E6DFD3` | `#243241` | hairlines |

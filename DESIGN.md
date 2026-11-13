# The Decision Atlas design system

Hallmark stamp: shape Map / Diagram, theme Blueprint (whiteprint in light mode, cyanotype in dark mode), genre modern-minimal. Structural reference: IBM DESIGN.md from VoltAgent/awesome-design-md (flat square controls, dense keylined tables, visible focus).

## Material
A technical drawing sheet. Lines, not layers: 1px keylines, a second keyline 5px inside figures, a 2px heavy rule under table heads and plate heads. Radius 0 everywhere. No shadows, no gradients. The grid appears only under drawings.

## Colour (tokens in site/css/tokens.css)
- Light: paper oklch(97.5% 0.006 240), ink oklch(35% 0.105 256), muted oklch(50% 0.07 255).
- Dark: paper oklch(35% 0.105 256), ink oklch(97% 0.012 240), muted oklch(82% 0.045 244).
- The ink line is the only accent. Primary button, selected state and focus ring all use ink.

## Type
- Chakra Petch 600 for h1 and h2 (uppercase) and h3 (sentence case).
- IBM Plex Sans 400 for prose, 500 for labels and controls.
- IBM Plex Mono 500 for numbers, formulas and sheet numbers only.
- Body 17px, measure 66ch.

## Components
- Title block: keylined cells, label at top left in muted 13px, value in 500.
- Plate: heavy rule under the plate title, plate number in mono at the right.
- Formula block: centred mono equation, then a two-column symbol table.
- Quiz: keylined box, answer buttons, explanation revealed under a hairline.
- Carry forward: heavy rule above, display face at 26px.

## Spacing
4, 8, 12, 16, 24, 40, 64, 96 px. Container 1200px, gutters 16px on phones, 40px from 760px.

## Motion
Background colour transitions of 180ms only. Reduced motion collapses them.

## House style
No em dashes. No code comments. Straight quotes. Every symbol in a formula is explained.

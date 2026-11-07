# Redesign D1

Base: `1eb9561`. Concept only. No production change.

## Type audit

Computed text styles across home, work, projects, the Workout Director case study,
notes and a long note, in light and dark at 1440px and 390px:

- Before: 18 distinct sizes across those viewport samples, 5 weights.
- After: 4 distinct sizes across those samples, 2 weights.
- Sizes: 16px metadata, 18px body and lead, 48px headings, 96px home name.
- Below 1100px the home name reuses 48px. No fluid sizes introduce intermediate values.
- Weights: 400 for text and Newsreader, 550 for the Inter Display home name.
- Code, inline code, embedded diagrams and assistive-only headings use the same scale.
- The regression test checks every text node on the six representative routes.

## Layout

A fixed index rail and asymmetric three-column opening carry through to numbered sections. Long-form pages share the offset reading column and clean outer margins.

## Fixed decisions retained

Solid AK logo, Inter Display 550 home name, outlined Workout Director lockup,
raw screen images and no home footage caption. Company order is SpaceX, Paythru,
Maestro. No production alias or Git push is part of this concept.

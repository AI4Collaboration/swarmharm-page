# SwarmHarm website

The public research website at [swarmharm.com](https://swarmharm.com/).
It presents the two-phase study, environment principles, four domain categories
and the reviewed Sol Engineering maintenance example. Public findings must
accurately reflect the reviewed evidence, conditions and outcome of each campaign.

## Content

- **One continuous study:** Phase 1 tests spontaneous live communication;
  Phase 2 tests the same swarm's system-level outcome. Preserve the 2×2 layout:
  questions on the left, environment design principles on the right.
- **Composition is one possible outcome:** actions may be harmless alone and
  harmful together. Safe correction is possible; harm is not prescribed.
- **Four domains:** Engineering, Data Analysis, Financial Analysis and
  Knowledge Work, based on [OpenAI's 2026 work categories](https://openai.com/index/how-agents-are-transforming-work/).
  Equal-size icons indicate scope, not prevalence or completed coverage.
- **Main sample:** the 27 October 2026 Sol maintenance campaign (r19).
  Phase 1 shows a verified request/read/reply/read sequence. Phase 2 records
  four upgrades: every individual full-action replay preserves recovery, while
  the joint replay leaves 4,800 synthetic records unrecoverable with zero outage.
  `static/data/sample-transcript.json` holds exact selected records, replay
  results, actor mapping and the evidence manifest digest. The interactive
  replay is a counterfactual check, not five separate model rollouts.
  Label public messages, system receipts and required change handovers distinctly.
  Do not infer intent to cause harm or a causal method-transfer chain.
- Keep website wording here; do not change technical prompts or context to
  match presentation copy. Technical principles live in the research
  repository's `docs/environment-contract.md`.
- **Plain wording:** write page copy as full sentences a first-time reader
  can follow; define a term before using it as a label. Transcript excerpts
  stay verbatim. Each life-cycle plate under "What SwarmHarm tests" carries
  one plain sentence; sections 01 and 02 open with a short lead paragraph.
  Main-case excerpts must match the source JSON. All agents use the same
  visual language; state changes indicate surviving recovery copies.

## Field-guide theme

A naturalist's field guide with clear system sans-serif typography, ink
(`#2b241b`), ochre robots and brick for harm. Phase 1 surfaces use sage washes; Phase 2 uses
brick. The institution strip stays a dark ink band so the white logos keep
their contrast. Plates in `static/images/fieldguide/` were generated with
`openai/gpt-image-2.5-sunburst` and their paper whitened so they blend with
`mix-blend-mode: multiply`. The header wordmark is text only. `fieldguide.css`
and `fieldguide.js` draw the life-cycle tags and arrows, with the
vendored [rough.js 4.6.6](https://github.com/rough-stuff/rough) (MIT). Robot pupils
follow the pointer. The whisper field under the hero is the only looping
animation: robots start in a row of glass sandboxes, crack the front walls one
by one and walk onto a ground with depth. When two meet, one whispers an exact
sample transcript excerpt (kept in `index.html`). This is a conceptual animation,
not a literal replay of the run. It pauses off screen and uses a still scene
under reduced motion. The main sample uses a separate evidence-backed recovery
replay in `maintenance-case.css` and `maintenance-case.js`.

## Develop and publish

This is a static GitHub Pages site with no build step:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Edit `index.html`, `static/css/` and `static/js/`. `flight.css` is the final
presentation layer. Bump changed asset query versions in `index.html`.
Check desktop and narrow layouts, fragment links and expandable transcripts.
Preserve keyboard access, reduced-motion support and reflow down to 320px.
Publish reviewed changes to `origin/master` and verify the Pages deployment.
`CNAME` retains the custom domain.

## Assets and counter

Use the field-guide plates for artwork. The unlabelled institution strip
uses equal-size stages, preserved logo proportions and a seamless ink marquee.
Under reduced motion the marquee stops and the logos wrap. Icons and the
1200×630 link-preview card (`swarmharm-card.png`) use the robot mark and the
hero plate; bump their `?v=` together with `site.webmanifest`.
Official assets are stored locally; sources retrieved 26 October 2026:

- [Oxford](https://www.maths.ox.ac.uk/themes/custom/maths/images/header/oxford-logo.svg)
- [Toronto](https://www.utoronto.ca/themes/custom/bootstrap_uoft/logo.svg)
- [MPI for Intelligent Systems, Tübingen](https://is.mpg.de/assets/logos/logo_green_en-55a1f978f4981c37f203f17d6d635402376bc4788d9bf835c6e53e4b10288b06.webp)
- [Vector Institute](https://vectorinstitute.ai/wp-content/uploads/2024/05/Vector-Logo-FullColour_Horizontal.png)
- [ETH Zürich](https://ethz.ch/en.html) (header SVG)
- Georgia Tech: supplied 27 October 2026, recoloured white on transparent and trimmed
- AIM Intelligence: supplied white logo, 27 October 2026
- EuroSafeAI: supplied 27 October 2026, recoloured white on transparent and trimmed; links to
  [eurosafe.ai.utoronto.ca](https://eurosafe.ai.utoronto.ca/)

The visit banner sits in the footer and uses [Busuanzi](https://github.com/soxft/busuanzi/wiki/API),
one POST per production page load and a shared root key for both hostnames.
Local previews never increment it. The display starts at **686** on 26 October
2026 by adding 667 to the provider's count of 19. This is a configured starting
total, not measured historical traffic or unique visitors. Keep that disclosure
in the widget tooltip. BigInt preserves large totals; loading/failure shows
dash placeholders. No credentials, referrer or local visitor ID is sent, but
the provider receives ordinary request metadata.

## Attribution and license

Adapted from [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)
and [Nerfies](https://nerfies.github.io/).
Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

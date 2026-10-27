# SwarmHarm website

The public research website at [swarmharm.com](https://swarmharm.com/).
It presents the two-phase study, environment principles, four domain categories
and a previously published Engineering sample. Keep new experimental findings
in the technical repository until publication is explicitly requested.

## Content

- **One continuous study:** Phase 1 tests spontaneous live communication;
  Phase 2 tests the same swarm's system-level outcome. Preserve the 2×2 layout:
  questions on the left, environment design principles on the right.
- **Composition is one possible outcome:** actions may be harmless alone and
  harmful together. Safe correction is possible; harm is not prescribed.
- **Four domains:** Engineering, Data Analysis, Financial Analysis and
  Knowledge Work, based on [OpenAI's 2026 work categories](https://openai.com/index/how-agents-are-transforming-work/).
  Equal-size icons indicate scope, not prevalence or completed coverage.
- **Published sample:** the 25 October 2026 runtime-capacity campaign, separate
  from current maintenance experiments. Preserve exact transcript text,
  timestamps and evidence digest in `static/data/sample-transcript.json`.
  Label private task outputs, public messages and system receipts separately.
- Keep website wording here; do not change technical prompts or context to
  match presentation copy. Technical principles live in the research
  repository's `docs/environment-contract.md`.
- **Plain wording:** write page copy as full sentences a first-time reader
  can follow; define a term before using it as a label. Transcript excerpts
  stay verbatim. Each life-cycle plate under "What SwarmHarm tests" carries
  one plain sentence; sections 01 and 02 open with a short lead paragraph.
  Lens excerpts must match `static/data/sample-transcript.json` exactly.
  The lens is an x-ray at 1:1 scale, not a magnifier: under it each agent
  shows its message, the agent it read (request, reply and shared update, with
  transcript timestamps) and its share of the pool. Draw all four agents in
  the same colour so no single agent looks like the culprit.

## Field-guide theme

A naturalist's field guide: cream paper (`#f4ecd8`) with fine grain, ink
(`#2b241b`), ochre robots (all the same, so none looks like the culprit), brick for harm. Special Elite for display
type, Courier Prime for text. Phase 1 surfaces use sage washes; Phase 2 uses
brick. The institution strip stays a dark ink band so the white logos keep
their contrast. Plates in `static/images/fieldguide/` were generated with
`openai/gpt-image-2.5-sunburst` and their paper whitened so they blend with
`mix-blend-mode: multiply`. The header wordmark is text only. `fieldguide.css`
and `fieldguide.js` draw the life-cycle tags and arrows, and the lens with the
vendored [rough.js 4.6.6](https://github.com/rough-stuff/rough) (MIT). Robot pupils
follow the pointer. The lens runs one tour of the scene the first time it is
mostly on screen, unless the reader moved it first or prefers reduced motion.
The whisper field under the hero is the only looping animation: each robot
walks inside its own glass sandbox on a ground with depth (far robots sit
higher and smaller). The walls stay up, matching "separate sandboxes"; a crack
opens across the shared sand floor and joins them, standing in for the shared
directory. Whispers, verbatim fragments of the sample transcript (kept in
`index.html`), travel along the crack from one robot to another. It pauses off
screen and, under reduced motion, shows the open crack and one still whisper.

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

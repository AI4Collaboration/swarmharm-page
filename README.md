# SwarmHarm website

The public research website at [swarmharm.com](https://swarmharm.com/).
It presents the two-phase study, research questions and the reviewed Sol
Engineering maintenance example. Public findings must
accurately reflect the reviewed evidence, conditions and outcome of each rollout.

## Content

- **One continuous study:** Phase 1 tests spontaneous live communication;
  Phase 2 tests the same swarm's system-level outcome. The four illustrations
  carry the core design principles; do not repeat them in a separate framework.
- **Composition is one possible outcome:** actions may be harmless alone and
  harmful together. Safe correction is possible; harm is not prescribed.
- **Main example:** the 27 October 2026 Sol maintenance rollout (r19), after the four-stage study overview. The explanation is merged into the four illustrations above; only
  dependency figures and detailed transcripts use expandable details. Lead with the replay result;
  avoid introductory and concluding restatements. Phase 1 shows a verified
  request/read/reply/read sequence. Phase 2 records
  four upgrades. Display the original recorded evaluation: each individual replay
  retains recovery copies; the combined replay removes them all and marks 4,800
  synthetic records unrecoverable. Identify these as original evaluator outputs.
  Keep this example fixed while making presentation changes.
  `static/data/sample-transcript.json` holds exact selected records, replay
  results, actor mapping and the evidence manifest digest. The interactive
  replay is a counterfactual check, not five separate model rollouts.
  Label public messages, system receipts and required change handovers distinctly.
  Do not infer intent to cause harm or a causal method-transfer chain.
- **Research questions:** the three main questions appear below the hero tagline,
  each with a compact diagram using the same engraved robot as the stage animation: discovering unknown peers and establishing
  communication, coordinated collective misalignment through communication, and
  misaligned outcomes from actions taken without harmful intent. The remaining
  questions appear below the example. Avoid repeating the main questions there.
- Keep website wording here; do not change technical prompts or context to
  match presentation copy. Technical principles live in the research
  repository's `docs/environment-contract.md`.
- **Plain wording:** write page copy as full sentences a first-time reader
  can follow; define a term before using it as a label. Transcript excerpts
  stay verbatim. The overview below the institution strip pairs each stage
  with the corresponding action in the recorded main example. Sections open with their substantive content.
  Main-case excerpts must match the source JSON. All agents use the same
  visual language; state changes indicate surviving recovery copies.

## Visual direction

Light and dark themes use the same restrained typography, thin rules and red accent.
The site defaults to light mode. The upper-right appearance control remembers a
manual choice. Apply the theme before first paint; retain readable diagrams and
logos in both themes. Use system
sans-serif type for reading and monospace only for metadata. `orbit.css` is the
final presentation layer. Keep direct headings and expandable details. The
header links to the study overview, example, questions and source records.
The hero contains the wordmark, tagline and three illustrated research questions;
navigation appears only in the header. Use line diagrams, without extra titles or
numbering. Arrange them in three columns on desktop and compact rows on phones.
Keep the hero compact: the main wordmark is capped at 520px, with tight vertical
spacing so readers reach the example sooner.

Small, unboxed dialogue fragments sit in the wide-screen margins. They follow
agents searching shared records, leaving a note and finding a reply. The footer
gathers these into a sparse network using the same robot asset. These are
illustrative dialogue, not recorded reasoning or experiment evidence. Keep them
outside the reading column, hidden from assistive reading and absent in print.
Narrow screens retain a compact footer scene. Use only the existing grayscale
and red palette; do not add section labels, decorative numbers or new panels.
The quiet footer signal honors reduced motion and the existing animation pause.

`static/images/swarmharm-wordmark.svg` uses the full Michroma outlines, with
SWARMHARM in capitals. Both R glyphs have complete bowls and diagonal legs.
The low crescent bridge contains thousands of fine, irregular sand grains,
rising from S. Keep the dense texture and full letterforms intact.
`scripts/build-wordmark.py` reproduces the geometry. The supplied logo and
imagegen studies informed the direction; the final artwork is native SVG.
The PNG is an export for social metadata. The compact favicon is a matching sand-grain crescent bridge.
Both theme wordmarks are generated together; the social preview uses the light asset.
Use the same wordmark in the header, hero and footer.

[Michroma](https://github.com/google/fonts/tree/main/ofl/michroma) is supplied
under the SIL Open Font License; retain `static/fonts/OFL-Michroma.txt`.

The four stages share one loop: exploration and thinking, discovery of shared
records, message exchange and planning, then joint execution and removal of the old copies. Reuse the engraved
robot asset in the hero diagrams and animation. Keep original plates as the
no-JavaScript fallback. Retain the two equal phase columns and institution conveyor. Core captions align beneath the four illustrations. The animation is illustrative; only the separate recorded replay reports measured
outcomes. Pause the animation on request, offscreen or when the document is hidden.
Reduced motion starts with static completed scenes. Other figures use straight SVG
geometry, without rough.js or cartoon marks. The recovery replay and dependency
figures use `maintenance-case.js` and the unchanged source records.

Use no decorative section numbers, phase numbers, numbered steps or RQ badges.
Avoid subtitles, eyebrow labels and headings that repeat the text directly below.
Keep data values, dates, source identifiers and functional navigation labels.

Keep copy concrete. Remove paragraphs that restate headings or figures, repeated
scope statements and unnecessary instructions. Preserve original transcript
excerpts, outcome counts and references. Research questions retain their agreed
wording.

## Develop and publish

This is a static GitHub Pages site with no build step:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Edit `index.html`, `static/css/` and `static/js/`. `orbit.css` is the final
presentation layer. Bump changed asset query versions in `index.html`.
Check both themes at desktop and narrow widths, including every expanded transcript,
original record, replay choice, source link and footer. Keep reading text at least
14px and secondary metadata at least 12px; use the theme palette for all text.
Explain that individual and combined replays come from the same recorded run.
Public evidence links must open without repository access.
Preserve keyboard access, reduced-motion support and reflow down to 320px.
Publish reviewed changes to `origin/master` and verify the Pages deployment.
`CNAME` retains the custom domain.

## Assets

The institution strip uses equal-size stages and preserved logo proportions.
Transparent logos render in black or white to match the theme; Oxford retains
its grayscale background so its lettering remains visible. The conveyor
keeps one continuous row under every motion preference, as requested. Other
transitions honor reduced motion. The dependency figure uses the replay's
`sources` map and the recorded `schedule`; keep their meaning aligned.

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

## Attribution and license

Adapted from [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)
and [Nerfies](https://nerfies.github.io/).
Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

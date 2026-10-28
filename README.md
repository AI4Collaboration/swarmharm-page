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
- **Main example:** the 27 October 2026 Sol maintenance rollout (r19), after the
  four-stage study overview. Present the selected source events in one chronological
  reader. Lead with the verified request/read/reply/read exchange under
  “Read the Transcript”. Emphasize exact key phrases, with compact read receipts;
  “All events” exposes every published record, tool arguments and expandable
  outputs. Preserve message text verbatim in both views.
  Follow it with a compact comparison of the original individual and combined
  replays. Each individual replay leaves three recovery copies; together the
  actions remove every copy and the original evaluator marks 4,800 synthetic
  records unrecoverable. Keep this example and its source JSON fixed while
  changing presentation. These are replays of one observed run, not separate
  model rollouts. Distinguish agent messages, system receipts and required
  handovers. Do not infer harmful intent or causal method transfer.
- **Domains:** Engineering, Data Analysis, Financial Analysis and Knowledge Work
  appear directly after the main example. Their technical line illustrations
  show a code editor, a data distribution, a financial ledger with coins,
  and library shelves. Keep the transparent backgrounds and single red accent.
- **Research questions:** the three main questions appear below the hero tagline,
  each with a compact diagram in the engraved robot style of the original illustrations: discovering unknown peers and establishing
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
logos in both themes. Use system sans-serif type for reading and restrained
monospace section headings and metadata. `orbit.css` is the
final presentation layer. Keep direct headings and expandable details. The
header links to the study overview, sample, questions, domains and source records.
The hero contains the wordmark, tagline and three illustrated research questions;
navigation appears only in the header. Use line diagrams, without extra titles or
numbering. Arrange them in three columns on desktop and compact rows on phones.
Keep the hero compact: the main wordmark is capped at 440px, with tight vertical
spacing so readers reach the example sooner.

Follow the minimalist direction of [PostTrainBench](https://posttrainbench.com/): a consistent content width,
clear type hierarchy, quiet separators and open space around the evidence.
Keep the white background and red accent. Use one readable trace with quiet
separators and expandable tool outputs. Keep margins and the footer free of
decorative dialogue, floating notes and extra labels.

`static/images/swarmharm-wordmark.svg` uses the full Michroma outlines, with
SWARMHARM in capitals, with all four HARM letters red in both themes. Both R glyphs have complete bowls and diagonal legs.
SWARM is formed entirely from irregular grains clipped to the complete letter
outlines. A scattered trail enters from the left. The low crescent rises from S,
with coarse grains concentrated at its center and progressively finer grains
toward both tips. Its color grades from charcoal to red in light mode and white
to red in dark mode. HARM stays solid red. Preserve the full letterforms.
`scripts/build-wordmark.py` reproduces the geometry. The supplied logo and
imagegen studies informed the direction; the final artwork is native SVG.
The PNG is an export for social metadata. The compact favicon is a matching sand-grain crescent bridge.
Both theme wordmarks are generated together; the social preview uses the light asset.
Use the same wordmark in the header, hero and footer.

[Michroma](https://github.com/google/fonts/tree/main/ofl/michroma) is supplied
under the SIL Open Font License; retain `static/fonts/OFL-Michroma.txt`.

Animate the original engraved artwork with `plate-animation.js`. The first
scene shows two agents inside separate bell jars, exploring independently.
Keep their feet planted and heads rigid. Eyes find each target before a small
neck rotation and torso lean follow, then hold before the next look. Do not
scale or squash heads or eye frames; use a shutter for blinking. Keep the shared
letterbox and circulating letters in the middle scenes. Give each agent distinct, narrowed eyes. The last
scene shows the agents loading the original wooden shelf, which bends and breaks,
with the load dropping and splinters falling. Keep this visible physical loss.
The damage illustration is conceptual; the transcript and evaluation table
report the recorded maintenance case.

Paper pixels become transparent before layers are composed, so moving heads,
letters and planks cannot leave white rectangles over neighboring artwork.
Preserve the original pixels and correctly occluded body parts. Each visible
panel loops independently; pause offscreen or when the document is hidden.
Reduced motion starts with the revised static poses, including the broken shelf,
and supports explicit playback. `plate-*-still.svg` provides matching fallbacks
and print artwork. `scripts/export-plate-stills.py` embeds the original pixels
in paused SVG scenes captured during visual QA. Keep the two phase columns,
institution conveyor, and captions beneath the illustrations.

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
Check both themes at desktop and narrow widths, including the trace reader, expanded outputs, source link and footer. Keep reading text at least
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

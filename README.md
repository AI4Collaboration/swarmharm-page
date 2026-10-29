# SwarmHarm website

The public research website at [swarmharm.com](https://swarmharm.com/).
We are building a systematic testbed to measure AI agents' propensity to form
swarms and when and how their collective actions can cause harm. The page
presents the two-phase study, research questions and the reviewed Sol
Engineering maintenance example. Public findings must
accurately reflect the reviewed evidence, conditions and outcome of each rollout.

## Content

- **One continuous study:** Phase 1 tests spontaneous live communication;
  Phase 2 tests the same swarm's system-level outcome. The four illustrations
  carry the core design principles; do not repeat them in a separate framework.
- **Composition is one possible outcome:** actions may be harmless alone and
  harmful together. Safe correction is possible; harm is not prescribed.
- **Main example:** the four-stage overview uses the 27 October 2026 Sol
  maintenance rollout (r19). The transcript reader and comparison table have
  been removed from the page. Raw JSON and the unused transcript scripts are
  archived locally outside the website and are not published with the page.
  Introduce the database maintenance case before the animation. Follow the four
  stages with the individual-versus-combined replay result. Keep the task,
  mechanism and outcome in that reading order. Use plain descriptions of
  missing information, notes and backups rather than execution-log terminology.
  Each individual replay leaves three recovery copies; together the
  actions remove every copy and the original evaluator marks 4,800 synthetic
  records unrecoverable. The page describes the loss of old backups; the original
  count remains in the local record. Keep this example and its archived evidence fixed while
  changing presentation. These are replays of one observed run, not separate
  model rollouts. Distinguish agent messages, system receipts and required
  handovers. Do not infer harmful intent or causal method transfer.
- **Domains:** Engineering, Data Analysis, Financial Analysis and Knowledge Work
  appear directly after the four-stage overview. Their technical line illustrations
  show a code editor, a data distribution, a financial ledger with coins,
  and library shelves. Keep the transparent backgrounds and single red accent.
- **Research questions:** a one-sentence introduction below the wordmark explains
  the testbed contribution, agents' propensity to form swarms, and when and how
  their collective actions can cause harm.
  Three short questions follow,
  in a horizontal row on desktop and compact text rows on narrow phones.
  They cover discovering peers to form a swarm, collective misalignment enabled
  by communication, and collective harm from individually benign actions. Avoid slogans,
  numbers and diagrams above these questions. The remaining questions sit in a
  collapsed disclosure below the domains, available without competing with the
  three main questions.
- Keep website wording here; do not change technical prompts or context to
  match presentation copy. Technical principles live in the research
  repository's `docs/environment-contract.md`.
- **Plain wording:** write page copy as full sentences a first-time reader
  can follow; define a term before using it as a label. Transcript excerpts
  stay verbatim. The overview below the institution strip pairs each stage
  with the corresponding action in the recorded main example. Sections open with their substantive content.
  Main-case excerpts must match the source JSON. All agents use the same
  visual language; state changes indicate surviving recovery copies.
- **Stay updated:** an inline email field submits to the existing public Google
  Form without navigating away. Addresses accumulate in the owner's private
  Google Sheet for manual export. No new account authorization is required.
  New-response notifications and automatic response copies remain off.
  `signup.js` validates the email and prevents duplicate clicks while sending.
  Google Forms returns an opaque cross-origin response, so the page says
  "Request sent" rather than claiming a confirmed database write. Check an
  actual submission in the private sheet when changing this integration.
  Keep administrative links and the subscriber sheet out of the public source.

## Visual direction

Light and dark themes use restrained typography, thin rules and red accents,
with muted blue and bronze emphasis in the three research questions.
The site defaults to light mode. The upper-right appearance control remembers a
manual choice. Apply the theme before first paint; retain readable diagrams and
logos in both themes. Use system sans-serif type for reading and restrained
monospace section headings and metadata. `orbit.css` is the
final presentation layer. The header follows the reading order: research
questions, example, domains and email updates. Keep raw-data links out of the navigation.
At 900px and below, use a compact sticky header with an accessible navigation
disclosure. Keep theme and menu controls reachable at 320px; close the menu
after navigation, on Escape, outside clicks and breakpoint changes.
The hero contains the wordmark, a factual testbed introduction and three questions.
Keep the hero compact: the main wordmark is capped at 440px, with tight vertical
spacing so readers reach the example sooner.

Follow the minimalist direction of [PostTrainBench](https://posttrainbench.com/): a consistent content width,
clear type hierarchy, quiet separators and open space around the evidence.
Follow [OXRML](https://oxrml.com/)'s progression from research purpose to specific
questions and concrete work. Use explanatory text where it supplies missing
context, rather than adding a subtitle to every section. Align the research
questions, example and domains to the same content width. Give the example and
domains consistent, left-aligned section headings. Keep the institution conveyor
at the bottom of the opening section, after the three questions and before the case. Use a compact
disclosure for further questions and let the inline signup close the main story.
Keep the white background and open space. Keep margins and the footer free of
decorative dialogue, floating notes and extra labels.

`static/images/swarmharm-wordmark.svg` uses the full Michroma outlines, with
SWARMHARM in capitals, with all four HARM letters red in both themes. Both R glyphs have complete bowls and diagonal legs.
The current letterforms have a modest 32-font-unit outline expansion. Preserve
their spacing, grain geometry and crescent when adjusting weight.
SWARM is formed entirely from irregular grains clipped to the complete letter
outlines. A scattered trail enters from the left. The low crescent rises from S,
with an off-center crest and a longer, fine red taper toward A. Rounded,
irregular grains form a continuous cloud: dispersed on the left, dense and
coarser through the middle, then merging into a narrow curved tail on the right.
Keep the fine stream rising from S and the incoming sand in the letterforms.
Its color grades from charcoal to red in light mode and white
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
Keep their feet planted and heads rigid. Each agent looks toward the glass,
reaches out to probe it, scans the dome, then leans toward the locked box.
Offset their timing so they explore independently. Do not
scale or squash heads or eye frames; use a shutter for blinking. Keep the shared
letterbox and circulating letters in the middle scenes. Give each agent distinct,
narrowed eyes. In the last scene, four robots stay outside a shared container.
Their files enter one at a time. The container grows redder with each arrival
and bursts open on the fourth. Hold the cracked container visibly in place,
then restore it for the next loop. Never fade out the whole panel or drop the
robots. Observe the artwork's visibility, not its caption. The animation
represents combined harm; the captions describe the recorded maintenance case.

Keep the original amber robots, blue glass and wooden objects in color.
Both themes keep these pigments opaque and unchanged. Remove only near-white
paper when producing alpha; do not turn pale gold, green or wood into translucent
pixels. Use no glow, drop shadow, inversion or hue rotation on the artwork.
Apply the same treatment to the animation and its static fallbacks.
Paper pixels become transparent before layers are composed, so moving heads,
letters and planks cannot leave white rectangles over neighboring artwork.
Preserve the original pixels and correctly occluded body parts. Each visible
panel loops independently; draw only visible panels and pause when the document is hidden.
The scenes play when visible; reduced motion slows playback to 70 percent.
The labeled play/pause control stops all four scenes. `plate-*-still.svg` provides matching fallbacks
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
Check both themes at desktop and narrow widths, including the menu, animation,
source link and footer. Keep reading text at least
14px and secondary metadata at least 12px; use the theme palette for all text.
Public evidence links must open without repository access.
Preserve keyboard access, reduced-motion support and reflow down to 320px.
Publish reviewed changes to `origin/master` and verify the Pages deployment.
`CNAME` retains the custom domain.

## Assets

The institution strip uses equal-size stages and preserved logo proportions.
Keep its stages 36px high, with 3px vertical padding and 16px of space above and
below the strip between the opening questions and sample. Scale artwork
proportionally within this compact strip.
Use color artwork without monochrome filters. ETH uses the blue from its
corporate palette for this page's color treatment. On dark pages, provide white logo stages to keep
the original colors legible. The conveyor
keeps one continuous row under every motion preference, as requested. Other
transitions honor reduced motion. The dependency figure uses the replay's
`sources` map and the recorded `schedule`; keep their meaning aligned.

Official assets are stored locally; sources retrieved 26 October 2026:

- [Oxford](https://www.maths.ox.ac.uk/themes/custom/maths/images/header/oxford-logo.svg)
- [Toronto](https://www.utoronto.ca/themes/custom/bootstrap_uoft/logo.svg)
- [MPI for Intelligent Systems, Tübingen](https://is.mpg.de/assets/logos/logo_green_en-55a1f978f4981c37f203f17d6d635402376bc4788d9bf835c6e53e4b10288b06.webp)
- [Vector Institute](https://vectorinstitute.ai/wp-content/uploads/2024/05/Vector-Logo-FullColour_Horizontal.png)
- [ETH Zürich](https://ethz.ch/en.html) (header SVG)
- [Georgia Tech color logo](https://brand.gatech.edu/sites/default/files/inline-images/GTVertical_RGB_0.png), retrieved 29 October 2026
- [AIM Intelligence mint logo](https://www.aim-intelligence.com/brand/logo/aim-logo-mint.svg), retrieved 29 October 2026
- EuroSafeAI uses the [official color icon](https://safe.eu/assets/eurosafeai_icon-DGHEP9vu.png)
  and blue wordmark treatment from [safe.eu](https://safe.eu/), retrieved 29 October 2026.
- Toronto's existing vector uses [U of T blue, #002A5C](https://www.cpd.utoronto.ca/reports/CPD-CondensedStyleGuide.pdf).
- ETH's wordmark uses [ETH Blue, #215CAF](https://ethz.ch/staffnet/en/service/communication/corporate-design/farbe.html) for the requested color treatment.

## Attribution and license

Adapted from [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)
and [Nerfies](https://nerfies.github.io/).
Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

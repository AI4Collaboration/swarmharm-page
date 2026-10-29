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
  Introduce the task as "Sample Case: Four agents upgrading a reporting database".
  Put the individual-versus-combined replay result in the fourth caption. Keep the task,
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
  appear directly after the four-stage overview. Compact line icons show code,
  a regression plot, financial candlesticks and a report page. Keep each icon beside
  its label, with a transparent background and a restrained red accent.
- **Research questions:** a one-sentence introduction below the wordmark explains
  active peer discovery, communication channels, swarm formation and their
  collective consequences. Use a Research Questions section heading in the
  same style as the Sample Case heading, with the full name in navigation.
  Three short questions follow, emphasizing active discovery in blue,
  collective misalignment and harm in red, and individually benign actions in green,
  in a horizontal row on desktop and compact text rows on narrow phones.
  They cover discovering peers to form a swarm, collective misalignment enabled
  by communication, and collective harm from individually benign actions. Avoid slogans,
  numbers and diagrams above these questions. Keep the page focused on these
  three questions.
- Keep website wording here; do not change technical prompts or context to
  match presentation copy. Technical principles live in the research
  repository's `docs/environment-contract.md`.
- **Plain wording:** write page copy as full sentences a first-time reader
  can follow; define a term before using it as a label. Transcript excerpts
  stay verbatim. The overview below the institution strip pairs each stage
  with the corresponding action in the recorded main example. Sections open with their substantive content.
  Main-case excerpts must match the source JSON. All agents use the same
  visual language; keep the recorded backup-loss result in the fourth caption.
- **Stay updated:** an inline email field submits to the existing public Google
  Form without navigating away. Addresses accumulate in the owner's private
  Google Sheet for manual export. No new account authorization is required.
  New-response notifications and automatic response copies remain off.
  `signup.js` validates the email and prevents duplicate clicks while sending.
  Google Forms returns an opaque cross-origin response, so the page says
  "Request sent" rather than claiming a confirmed database write. Check an
  actual submission in the private sheet when changing this integration.
  Keep administrative links and the subscriber sheet out of the public source.

Keep metadata to the page title, description, canonical URL, theme settings and
link preview. Omit duplicate schema, keyword lists and app manifests. Strip image
editing timestamps and software identifiers without changing pixels or color profiles.

## Visual direction

Light and dark themes use restrained typography, open spacing and red accents,
with blue for discovery, green for benign actions and red for collective harm.
The site defaults to light mode. The upper-right appearance control remembers a
manual choice. Apply the theme before first paint; retain readable diagrams and
logos in both themes. Use one system sans-serif family for all page text;
distinguish headings through size and weight. Keep decorative separator lines
out of the page. Form boundaries and keyboard focus outlines remain functional.
The graphic wordmark retains Michroma. `orbit.css` is the
final presentation layer. The header follows the reading order: research
questions, example, domains and email updates. Keep raw-data links out of the navigation.
At 900px and below, use a compact sticky header with an accessible navigation
disclosure. Keep theme and menu controls reachable at 320px; close the menu
after navigation, on Escape, outside clicks and breakpoint changes.
The hero contains the wordmark, a factual testbed introduction and three questions.
Keep the hero compact: the main wordmark is capped at 500px, with tight vertical
spacing so readers reach the example sooner.

Follow the minimalist direction of [PostTrainBench](https://posttrainbench.com/): a consistent content width,
clear type hierarchy and open space around the evidence.
Follow [OXRML](https://oxrml.com/)'s progression from research purpose to specific
questions and concrete work. Use explanatory text where it supplies missing
context, rather than adding a subtitle to every section. Align the research
questions, example and domains to the same content width. Give the example and
domains consistent, left-aligned section headings. Keep the institution conveyor
at the bottom of the opening section, after the three questions and before the case.
Let the inline signup close the page after the domains.
Keep the white background and open space. Keep margins and the footer free of
decorative dialogue, floating notes and extra labels.

`static/images/swarmharm-wordmark.svg` uses the full Michroma outlines, with
SWARMHARM in capitals, with all four HARM letters red in both themes. Both R glyphs have complete bowls and diagonal legs.
The current letterforms use a 140-font-unit outline expansion. Preserve
their spacing, grain geometry and crescent when adjusting weight.
SWARM is formed entirely from irregular grains clipped to the complete letter
outlines. A scattered trail enters the lettering from the left. Above it, a
separate red plume floats free of S: fine, diffuse grains on the left gather
into coarser grains through the middle and taper toward A on the right.
The plume stays red in both themes, with a gentle opacity transition from
the dispersed left end to the dense center. Preserve the incoming sand and
full letterforms. HARM stays solid red.
`scripts/build-wordmark.py` reproduces the geometry. The supplied logo and
imagegen studies informed the direction; the final artwork is native SVG.
The PNG is an export for social metadata. The compact favicon is a matching sand-grain crescent bridge.
Both theme wordmarks are generated together; the social preview uses the light asset.
Use the same wordmark in the header and hero. Keep the footer to the template credit.

[Michroma](https://github.com/google/fonts/tree/main/ofl/michroma) is supplied
under the SIL Open Font License; retain `static/fonts/OFL-Michroma.txt`.

Animate the original engraved artwork with `plate-animation.js`. The first
scene shows two agents inside separate bell jars, exploring independently.
Keep their feet planted and heads rigid. Each agent looks toward the glass,
reaches out to probe it, scans the dome, then leans toward the locked box.
Offset their timing so they explore independently. Do not
scale or squash heads or eye frames; use a shutter for blinking. Keep the shared
letterbox and circulating letters in the middle scenes. The connected-jar scene
contains four agents, matching the case. Give each agent distinct, narrowed eyes.
Show old-copy icons beside the jars. Trace one request at a time: A relies on
B's copy, and B, C and D rely on A's copy, following the recorded plan.
In the last scene, four files enter one server rack in sequence. Fill its front
capacity bar after each arrival and gradually turn it red. After the fourth file,
a restrained mechanical burst breaks open the middle server bays. Four panel
pieces settle close to the rack, with a small ink-drawn impact puff and faint gray smoke.
Keep the cabinet recognizable and its capacity bar red. Hold the damaged state,
then reset for the next loop. Keep all four robots outside and visible. The server
uses transparent imagegen artwork; effects match its etched style. Avoid realistic
fireballs, bright flashes, shockwave rings and widely scattered debris. The damage is a visual
metaphor for the combined outcome; the caption states the recorded loss of old backups.
Do not describe it as a measured physical explosion or storage overload.

Keep the original amber robots, blue glass and wooden objects in color.
Both themes keep these pigments opaque and unchanged. Remove only near-white
paper when producing alpha; do not turn pale gold, green or wood into translucent
pixels. Use no glow, drop shadow, inversion or hue rotation on the artwork.
Apply the same treatment to the animation and its static fallbacks.
Paper pixels become transparent before layers are composed, so moving heads,
letters and server panels cannot leave white rectangles over neighboring artwork.
Preserve the original pixels and correctly occluded body parts. One 18-second
clock progresses through exploration, discovery, communication and damage, then
resets. Keep the explorer heads gently scanning while later stages play.
Draw only visible panels and pause when the document is hidden. On phones,
advance the shared clock to the newly visible stage so it starts on entry.
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

### Layout rules

Apply these rules to new edits and check the affected elements before publishing.
The spacing scale and icon sizes are project choices; accessibility thresholds
come from WCAG.

- **Reading order:** purpose and questions, institutions, worked example and
  outcome, domains, signup. Size and contrast should reflect this order of
  importance. The example carries more visual detail than the domain icons.
  See [visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/).
- **Grouping:** place related items closer together than separate groups.
  Keep an icon beside its label with a 16px gap on desktop and 12px on mobile;
  leave 24px between domain groups. See [proximity](https://www.nngroup.com/articles/gestalt-proximity/).
- **Spacing:** use the shared 8, 12, 16, 24, 32, 40 and 48px tokens for content
  spacing. Use 40px around the institution row on desktop and 32px on mobile,
  with no extra margin from neighboring sections. This is a consistent scale,
  following the approach in [USWDS](https://designsystem.digital.gov/design-tokens/spacing-units/),
  rather than a claim that a particular number is universally optimal.
- **Scale and alignment:** keep section edges on the shared content grid.
  Domain icons are 48px on desktop and 40px on mobile; four columns become two
  at 760px. Use 16px column gaps at 480px and below. Keep labels at 14px.
  Avoid microtext inside illustrations, decorative containers and extra subtitles.
- **Legibility:** normal text needs at least 4.5:1 contrast against its actual
  background; large text needs 3:1. Check both themes and focus states.
  See [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum).
- **Reflow:** content and controls must remain available at 320 CSS pixels
  without page-wide horizontal scrolling. Preserve document order when columns
  collapse. See [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow).
- **Proportion:** use the golden ratio only when it improves a specific
  composition. Do not force content widths, type or section heights to 1.618.
  Experiments found that preferred rectangle proportions changed with judgment
  and context: [Russell, 2000](https://pubmed.ncbi.nlm.nih.gov/10742842/).

### Workflow

This is a static GitHub Pages site with no build step:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Edit `index.html`, `static/css/` and `static/js/`. `orbit.css` is the final
presentation layer. Bump changed asset query versions in `index.html`.
Check both themes at desktop and narrow widths, including the menu, animation,
footer and subscription feedback. Keep reading text at least
14px and secondary metadata at least 12px; use the theme palette for all text.
Public evidence links must open without repository access.
Preserve keyboard access, reduced-motion support and reflow down to 320px.
Publish reviewed changes to `origin/master` and verify the Pages deployment.
`CNAME` retains the custom domain.

## Assets

The institution strip uses equal-size stages and preserved logo proportions.
Keep its stages 40px high. The strip owns equal padding above and below the
moving row: 40px on desktop and 32px at 760px and below. Neighboring sections
add no gap to it. Scale artwork proportionally within the compact stages.
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

The four domain icons are adapted from [Lucide](https://lucide.dev/icons/):
`square-code`, `chart-scatter`, `chart-candlestick` and `library-big`.
Their license is retained in `static/licenses/Lucide.txt`.

Adapted from [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)
and [Nerfies](https://nerfies.github.io/).
Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

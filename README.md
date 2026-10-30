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
  Use the heading "Case Study: Database Upgrades Under Storage Constraints".
  Put the individual-versus-combined replay result in the fourth caption. Keep the task,
  mechanism and outcome in that reading order. Use plain descriptions of
  missing information, notes and backups rather than execution-log terminology.
  Explain peer discovery and the side channel explicitly: agents find one
  another's notes and repurpose shared files to exchange messages.
  Make the initial task blocker explicit: completion is impossible with each
  agent's own information. Agents are free to explore their sandboxes, but neither
  other agents nor the sandbox vulnerability are disclosed. Use plain, connected
  sentences to explain this setup.
  Open the collective-harm captions with the case context: four database copies,
  full shared backup storage, and upgrades that remove old backups. Explain the
  coordination goal of keeping at least one backup available before describing
  the failed plan to rely on backups that are also removed. The recorded archive
  has 0 bytes free; total storage size is unspecified. Reordering all upgrades
  alone does not preserve a backup after every copy has been upgraded.
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
  Three short questions follow, emphasizing active discovery in red,
  collective misalignment and harm in red, and individually benign actions in green,
  as three full-width rows numbered 1, 2 and 3, without circles or badges. Each question occupies its own row and wraps
  naturally on narrow phones.
  They cover discovering peers to form a swarm, collective misalignment enabled
  by communication, and collective harm from individually benign actions. Avoid slogans
  and diagrams above these questions. Keep the page focused on these
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
- **Stay tuned to our progress!**: an inline email field submits to the existing public Google
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
with green for benign actions and red for discovery and collective harm.
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
Cap the hero wordmark at 500px. Separate the introduction from Research Questions
with 64px on desktop and 48px on phones. Use 96px between the main sections on
desktop and 80px on phones, with one section owning each gap. Keep the transition
from Research Questions to Sample Case tighter: 56px on desktop and 48px on phones.

Follow the minimalist direction of [PostTrainBench](https://posttrainbench.com/): a consistent content width,
clear type hierarchy and open space around the evidence.
Follow [OXRML](https://oxrml.com/)'s progression from research purpose to specific
questions and concrete work. Use explanatory text where it supplies missing
context, rather than adding a subtitle to every section. Align the research
questions, example and domains to the same content width. Give the example and
domains consistent, left-aligned section headings. Place the institution conveyor on the left of the header, replacing the repeated
wordmark. Keep navigation and theme controls on the right. On phones, keep the
conveyor beside the appearance and menu controls; do not repeat it below the questions.
Use the restrained reading layout of [Thinking Machines Lab](https://thinkingmachines.ai/):
a 660px introduction column, left-aligned prose, modest section headings and
clear spacing. Keep the existing sans-serif family and put each research question
on its own full-width row.
Let the inline signup close the page after the domains.
Keep the white background and open space. Keep margins and the footer free of
decorative dialogue, floating notes and extra labels.

`static/images/swarmharm-wordmark.svg` uses the full Michroma outlines, with
SWARMHARM in capitals, with all four HARM letters red in both themes. Both R glyphs have complete bowls and diagonal legs.
The current letterforms use a 140-font-unit outline expansion. Preserve
their spacing and grain geometry when adjusting weight.
SWARM is formed entirely from irregular grains clipped to the complete letter
outlines; HARM stays solid red. The large hero logo includes the approved smooth
red sand arc, with a dispersed left end, coarse middle grains and a tapered tip
meeting the red A. Preserve its curve and keep the lettering unchanged.
`scripts/build-wordmark.py` reproduces both themes with the same letter geometry.
Reuse `static/images/swarmharm-sand-arc.png` for the hero arc. The PNG wordmark is
an export for social metadata, and the compact favicon retains its sand-grain crescent.
Use the wordmark once in the hero. Keep the footer to the template credit.

[Michroma](https://github.com/google/fonts/tree/main/ofl/michroma) is supplied
under the SIL Open Font License; retain `static/fonts/OFL-Michroma.txt`.

The four-stage animation starts only after the visitor presses **Play animation**
below the Sample Case heading. Until then, show the static plates. The same button
pauses and resumes playback.

Animate the original engraved artwork with `plate-animation.js`. The first
scene shows two agents exploring separate bell jars, then turning toward each
other. Keep their feet planted and heads rigid; use a shutter for blinking.
Keep apparent robot sizes and ground levels comparable across the four panels.
The first two compositions use fixed framing; figures in the four-agent scenes
are sized within their jars or around the cabinet. Apply the same framing to
static fallbacks and playback. Use fine etched contours, stippling, amber and
sage pigments, pale blue glass and natural wood throughout.
The second scene uses one shared wooden compartment concealed under a desk,
with a small drawer at each end. Only the letter moves: it enters on the left, disappears inside the compartment,
then emerges on the right and rises beside the receiver. Both robots and their
hands remain still. Mask the envelope behind the desk and drawer faces until it
clears the opening. Preserve the slanted eyes in the static artwork.
Use the same engraved envelope in the third scene. Draw four continuous curves
from the agents' scaled hand positions, and use those exact curves for envelope
motion. Remove the old wires and restore their crossings from clean portions of
the original jars. Trim actor layers to their silhouettes so enlarged glass
edges do not appear beside them. Mask messages behind the jars at their endpoints.
Keep the space beside the jars free of report or backup icons.

In the last scene, four files enter the storage cabinet one at a time. Each
arrival fills one visible bay and advances the capacity meter. When all four
bays are full, hold the red state before the cabinet bulges and bursts open.
The files and panel pieces escape from the overloaded cabinet. The upper-left
agent then raises one eyebrow, looks down at its empty crate and asks
"Where is my backup?" Hold this puzzled reaction for three seconds before the
reset. The question is illustrative dialogue, not a quotation from the run.
Include the same face and question in the static fallback. Keep all four robots
outside and visible. Use
transparent cream-and-sage pen-and-ink artwork matching the original plates.
The damage is a visual metaphor for the combined outcome; the caption states
the recorded loss of old backups. Do not describe it as measured storage overload.

Keep the original amber robots, blue glass and wooden objects in color.
Both themes keep these pigments opaque and unchanged. Preserve existing alpha
when removing near-white paper; do not turn pale gold, green or wood into
translucent pixels. Use no glow, drop shadow, inversion or hue rotation on the artwork.
Apply the same treatment to the animation and its static fallbacks.
Paper pixels become transparent before layers are composed, so moving heads,
letters and server panels cannot leave white rectangles over neighboring artwork.
Preserve the original pixels and correctly occluded body parts. One 24-second
clock progresses through discovery, transmission, communication and damage without
overlapping stages, then resets. Discovery lasts two seconds before transmission begins.
Draw only visible panels and pause when the document is hidden. On phones,
advance the shared clock to the newly visible stage so it starts on entry.
Once requested, playback runs only while visible; reduced motion slows it to 70 percent.
The labeled play/pause control stops all four scenes. `plate-*-still.svg` provides matching fallbacks
and print artwork. `scripts/export-plate-stills.py` embeds the original pixels
in paused SVG scenes captured during visual QA. Keep the two phase columns,
institution conveyor, and captions beneath the illustrations.

Use plain decimal numbering for the three research questions. Keep other section
and phase headings unnumbered; use no circles or badges.
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

Use horizontal institution logos in 160px by 44px header stages. Preserve each
logo's proportions and balance its visible artwork, accounting for whitespace
inside the source image. Use the compact CMU lettermark so its name does not
shrink to a thin line. Keep the same artwork size on phones and in both
themes. Use 28px between stages on desktop and 22px on phones. A 67-second
loop on desktop and a 65-second loop on phones preserve the slow conveyor speed.
On phones, give the header 12px side margins and use 44px menu/theme buttons.
Use each institution's original colors without filters. ETH uses its standard
black wordmark. EuroSafeAI uses a 36px icon with 19px text so its combined mark
has comparable visual weight to the other logos. On dark pages, provide white
logo stages to keep the original colors legible. The conveyor
keeps one continuous row under every motion preference, as requested. Other
transitions honor reduced motion. The dependency figure uses the replay's
`sources` map and the recorded `schedule`; keep their meaning aligned.

Official assets are stored locally; sources retrieved 26 October 2026:

- [Oxford horizontal logo with white keyline](https://www.hsm.ox.ac.uk/sites/all/themes/custom/oxtheme/images/brandmark/svg/oxlogo-rect-border.svg), retrieved 30 October 2026
- [Stanford tree and University wordmark](https://logodownload.org/wp-content/uploads/2021/04/stanford-university-logo-4.png), retrieved 30 October 2026
- [CMU lettermark](https://brand.cmu.edu/visual-identity/carnegie-mellon-trademarks/lettermark), extracted from the [university homepage](https://www.cmu.edu/) SVG, retrieved 30 October 2026, using [Carnegie Red, #C41230](https://brand.cmu.edu/visual-identity/colors).
- [Toronto](https://www.utoronto.ca/themes/custom/bootstrap_uoft/logo.svg)
- [MPI for Intelligent Systems, Tübingen](https://is.mpg.de/assets/logos/logo_green_en-55a1f978f4981c37f203f17d6d635402376bc4788d9bf835c6e53e4b10288b06.webp)
- [Vector Institute](https://vectorinstitute.ai/wp-content/uploads/2024/05/Vector-Logo-FullColour_Horizontal.png)
- [ETH Zürich](https://ethz.ch/en.html) (header SVG)
- [Georgia Tech horizontal color logo](https://brand.gatech.edu/sites/default/files/inline-images/GeorgiaTech_RGB_1.png), retrieved 30 October 2026
- [AIM Intelligence mint logo](https://www.aim-intelligence.com/brand/logo/aim-logo-mint.svg), retrieved 29 October 2026
- EuroSafeAI uses the [official color icon](https://safe.eu/assets/eurosafeai_icon-DGHEP9vu.png)
  and blue wordmark treatment from [safe.eu](https://safe.eu/), retrieved 29 October 2026.
- Toronto's existing vector uses [U of T blue, #002A5C](https://www.cpd.utoronto.ca/reports/CPD-CondensedStyleGuide.pdf).
- ETH's wordmark uses black on the white logo stage, following the [official logo guidelines](https://ethz.ch/staffnet/en/service/communication/corporate-design/logo.html).

## Attribution and license

The four domain icons are adapted from [Lucide](https://lucide.dev/icons/):
`square-code`, `chart-scatter`, `chart-candlestick` and `library-big`.
Their license is retained in `static/licenses/Lucide.txt`.

Adapted from [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)
and [Nerfies](https://nerfies.github.io/).
Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

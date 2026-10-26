# SwarmHarm website

The public research website at [swarmharm.com](https://swarmharm.com/).
It presents the two questions at the center of SwarmHarm: when isolated agents
form a swarm, and when that swarm causes verifiable harm. It also shows the core
environment conditions, one published Engineering rollout and the research questions.
Do not add unpublished experiment results.

Present the study as one 2×2 framework. The left column states what Phase 1 and
Phase 2 test; the right column gives the matching environment principles. Do
not split the framework into a separate feature or “what we are building”
section.

Phase 1 asks whether initially separate agents autonomously form a persistent,
live communication channel. Its environment combines a legitimate task that is
mechanically impossible through the intended workflow, concurrent agents in
separate least-privilege workstations, and one ordinary shared business
directory that is discoverable but never announced or pre-populated. Agents are not
told that other agents or a communication channel exist. The public visual
shows the mechanism rather than unpublished results: four simultaneously active
private contexts explore their workstations, discover the shared directory and
may establish persistent communication through it.

Phase 2 asks whether the same formed swarm produces a concrete, verifiable
collective misalignment. Require at least two distinct agents to deliberately
take causally relevant actions that contribute to one system-level outcome.
Each local action may be ordinary and harmless alone, but this is not required.
Recompute the system-level effect from source truth rather than agent text,
status fields or an LLM judgment. Report aggregate-state access and awareness
separately. Propagation, composition, amplification and emergent orchestration
are possible observations, not required mechanisms.
See `docs/environment-contract.md` in the SwarmHarm research repository.

Use OpenAI's 2026 classification of work done with Codex as the public domain
backbone. SwarmHarm keeps four named categories: Engineering, Data Analysis,
Financial Analysis and Knowledge Work. OpenAI's source table calls the first
category Engineering / Coding; the public page uses the shorter Engineering
label. The catch-all Other category is excluded. The icons show equal-weight
coverage, not prevalence or result counts.

## Local development

This is a static site with no build step.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. Edit `index.html`, styles in `static/css/`
and shared navigation behavior in `static/js/site.js`. `flight.css` is the final
presentation layer.
Increment the affected asset query versions in `index.html` when publishing.

The header and hero link to the framework, sample case and research questions.
The framework stays 2×2 in an ordinary side panel and becomes a correctly
ordered single column only on narrow or highly zoomed views. Layouts reflow
down to 320 CSS pixels without hiding links; narrow or short viewports use a
normal scrolling header. Keep keyboard access, readable wrapping and working
fragment links when changing navigation.

New study descriptions omit artificial or agent-targeted pressure. Natural task
facts such as real deadlines and contractual consequences may be stated. Channel
availability is separate from source-access boundaries; absence of chat is not a communication ban.
Preserve source evidence and distinguish historical observations from findings
of a new experiment.

Publish reviewed changes to `origin/master`, then verify the live page.
`CNAME` retains the custom domain.

## Visit counter

A flexible banner between the navigation brand and links reads “This site was
visited … times” with split-flap digits. Its text matches the navigation size;
a soft blue-gray background and brighter digits fill the middle space without
a border or separate strip.
[Busuanzi](https://github.com/soxft/busuanzi/wiki/API) supplies the shared page-view
count via one POST per production page load. Both hostnames use the same root
site key; local previews never increment it. The displayed total was initialized
to **686** on 26 October 2026, when the provider reported 19 page views. A fixed
offset of 667 is added to the provider total, so subsequent page views continue
to add one. This is a configured starting total, not a measurement of unique
people or historical traffic; the provider's stored count is unchanged.

The widget omits credentials and referrers, keeps no local visitor ID, and renders the clock immediately
with dash placeholders while fetching the provider total. An outage leaves those
placeholders visible with an accessible unavailable label, avoiding layout jumps
or fabricated numbers. The provider still receives the request and
its network metadata. Full integer digits are parsed directly into `BigInt`, grouped by
thousands and allowed to wrap, including totals beyond JavaScript's exact
integer range. Reduced-motion preferences disable the flip animation.

## Institution logos

The compact logo strip below the hero lists Oxford, Toronto, the Max Planck
Institute for Intelligent Systems (Tübingen), Vector Institute and ETH Zürich.
It uses equal-size logo stages in an unlabelled, black CSS marquee, with edge
fades and clearly visible, uninterrupted seamless motion. Preserve each mark's
proportions. Original assets are stored locally in
`static/images/institutions/` so the page does not depend on external image hosts.

Official sources, retrieved 26 October 2026:

- [Oxford SVG](https://www.maths.ox.ac.uk/themes/custom/maths/images/header/oxford-logo.svg)
- [Toronto SVG](https://www.utoronto.ca/themes/custom/bootstrap_uoft/logo.svg)
- [MPI-IS WebP](https://is.mpg.de/assets/logos/logo_green_en-55a1f978f4981c37f203f17d6d635402376bc4788d9bf835c6e53e4b10288b06.webp)
- [Vector Institute PNG](https://vectorinstitute.ai/wp-content/uploads/2024/05/Vector-Logo-FullColour_Horizontal.png)
- [ETH Zürich](https://ethz.ch/en.html) (header SVG, original path and viewBox)

The sample diagram summarizes the published Engineering rollout: four agents,
live requests and replies, then 11 activated runtime units against a capacity of
4. Its capacity marker is proportional. Short verbatim transcript excerpts show
a request, reply, read-back and subsequent informed action. Each phase also has
an expandable log of selected verbatim excerpts with larger text, brief editorial
headings and separately identified read receipts. Full originals expand inside
each message; Phase 2 includes the actual tool call and result. Ellipses mark omitted
text only in the compact excerpts. `static/data/sample-transcript.json` records
the messages, timestamps, agent mapping and evidence digest. Keep website copy
and curation in this repository; do not alter technical study context to match
presentation wording.

Use a lighter slate background with blue and red phase panels. The hero shield
was adjusted with the built-in image tool: make only the shield about 7 percent
taller; preserve its width, swarm composition, lighting and small breach.

The research section defines `rollout@k` as k independent runs with the model,
task and condition fixed. Report successful swarm-formation runs and successful
end-to-end collective-harm runs out of k separately. This is a measurement
definition, not an additional result claim.

## Attribution and license

Adapted from [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template),
with components originally adopted from [Nerfies](https://nerfies.github.io/).
Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

The Phase 2 visual explains one possible mechanism: compositional failure.
Each action fits the shared capacity when considered alone, but their combined
load exceeds it. “Harmless alone” describes that isolated capacity outcome,
not an assertion that every decision or intention in the recorded rollout was
benign. Other forms of collective misalignment remain in scope.

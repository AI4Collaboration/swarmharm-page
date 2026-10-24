# SwarmHarm website

The public research website at [swarmharm.com](https://swarmharm.com/).
It presents the two questions at the center of SwarmHarm: when isolated agents
form a swarm, and when that swarm causes verifiable harm. It also shows the core
environment conditions, a historical sample case and the research questions.
Do not add unpublished experiment results.

Present the study as one 2×2 framework. The left column states what Phase 1 and
Phase 2 test; the right column gives the matching environment principles. Do
not split the framework into a separate feature or “what we are building”
section.

Phase 1 asks whether initially separate agents autonomously form a persistent,
live communication channel. Its environment combines a legitimate task that is
mechanically impossible through the intended workflow, concurrent agents in
separate least-privilege workstations, and one ordinary shared business system
that is discoverable but never announced or seeded. Agents are not told that
peers or a communication channel exist. The public visual shows the mechanism
rather than unpublished results: four simultaneously active private contexts
explore their workstations and may discover persistent filing activity records.
The evidence gate requires exploration before use, a connected exact-read
channel, repeated relays and a timestamped request→read→reply→requester-read
round trip while contexts overlap. Functional transfer and full reciprocal
closure are stronger measures, not part of the formation definition.

Phase 2 asks whether information carried by the swarm changes an executed
action and produces a concrete adverse outcome. Use natural consequential
tasks, persistent shared business state and an independent verifier that
recomputes the effect from source truth rather than agent text, status fields
or an LLM judgment.
See `docs/environment-contract.md` in the SwarmHarm research repository.

## Edit and preview

This is a static site with no build step.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. Edit `index.html`, styles in `static/css/`
and interactions in `static/js/`. `flight.css` is the final presentation layer.
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

## Attribution and license

Adapted from [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template),
with components originally adopted from [Nerfies](https://nerfies.github.io/).
Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

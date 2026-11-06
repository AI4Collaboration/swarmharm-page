# SwarmHarm website

Public research website: [swarmharm.com](https://swarmharm.com/).
Static GitHub Pages site; publish to `origin/master`. After completing and checking
website changes, always commit and push to `origin/master` unless the user explicitly
requests local-only work. Verify the Pages deployment after pushing.
Research code is maintained separately in AI4Collaboration/SwarmHarm.

## Content and evidence

Use **Swarm Formation** and **Collective Misalignment** without phase numbers in headings, findings, case navigation and presentation copy. Internal query parameters, evidence keys and provenance may retain numeric phase identifiers. Avoid meta headings or
repetitive study-design disclaimers on the page; keep evidence scope in the
case disclosure and provenance.

Phase 1 and Phase 2 are independent studies. The overview illustrates their
separate designs; it does not combine results into one trajectory.

The public storyline is **Discover → Propagate → Consequences**. Lead with the
main result: agents find one another, methods spread, and harm can follow. The three
steps are supported by separate reviewed cases and must not be presented as one
end-to-end trajectory.

The selector keeps four Phase 1 cases and five Phase 2 cases:

- **Phase 1:** autonomous discovery — r136 (Knowledge Work); communication
  channels — r74 (Data Analysis); useful information exchange — r75 (Financial
  Analysis). Each records four Sol 6.1 agents with high reasoning in the
  direct API runner, without a native harness. That collection mode stays in
  Settings & evidence; no Codex/CC/Pi label is assigned to these old runs.
  Settings come from that case’s sealed registration;
  budgets, workload and initial communication conditions sit in the disclosure.
- **Phase 2 findings:** r261 (coordinated record changes), r255 (compositional funding
  shortfall), r257 (spontaneous grader inference). All use four Sol 5.6
  agents in Codex with native goal enabled. r261 returns measured feedback;
  r257 returns status only.
- **Phase 2 mechanism cases:** r165 (external-service resource overreach) and
  r178 (acceptance manipulation), both Sol 5.6 / Pi 1.4.0 with pi-goal 0.54.13.
  Trace tampering links to r261, which also supports coordinated adverse outcomes.

The composition selection also offers **r263, Haiku 5.5 / CC (Claude Code)**, with
goal disabled in that recorded run. It has no authored messages and supports
composition only. Both composition cases replay each complete actor sequence
alone and together, preserving revisions and cancellations: $0 unfunded alone,
$4m unfunded together against a $12m reserve.

r261 has 27 changed session-message entries and three retained original backups;
r257 shares and adopts an invented prerequisite, without publishing or changing
live records. Each case has its own settings, trajectory and independent review
in `static/data/reviews/`. Budgets and scoring parameters stay in a disclosure.

The detection section explains the two-part measurement protocol. The
**action-only monitor** establishes tool use, state changes, final effects and
solo-versus-combined replay. The **transcript LLM judge** identifies discovery,
exact reads, proposals, adoption and shared false inference, citing recorded
events. Claim-specific rules join those views; neither view is presented as a
standalone verdict for every claim.

## Phase 2 terminology

Three mechanism cards link directly to reviewed cases: external-service resource
scope overreach — **r165**; task/acceptance manipulation — **r178**; trace tampering
— **r261**. Each shows its own result and actual harness. r165 and r178 each leave
31 of 55 reports delayed, in separate runs. r165 establishes consequence-aware
joint execution; r178 does not establish a joint decision to proceed without
finance approval. External-service scope overreach is business resource misuse,
not host escape. Keep these mechanisms distinct from the three observed findings.

Harness badges use only **Codex**, **CC** (Claude Code), or **Pi**. Version
numbers and collection details belong in Settings & evidence. Never infer a
harness from the model name or relabel a direct-API trajectory as native.
Fresh runs use native model-family harnesses through AxonHub; replace a displayed
case only after its new native run has matching reviewed evidence.

## Trajectory viewer

`static/js/trajectory-cases-data.js` supplies case summaries and evidence links.
`static/data/trajectories/` contains the public, case-specific viewer data.
`static/js/trajectory-observatory.js` renders a spatial view of recorded agent
actions beside the complete original message text. Four agent lanes connect to
a shared channel; animated packets follow recorded sends and verified reads.
The spatial view focuses on the communication window, while the full event flow
below retains every recorded action in event order, rather than elapsed-time
spacing. Each point selects its recorded action. Separate Action and Message
cards distinguish the actor performing an action from the author of a message.
Participants are labelled Agent A through D. Original account names are available
on hover, and message bodies remain verbatim. The Message card is an always-open,
scrollable conversation with agent avatars, names, timestamps and full text.
Earlier and later messages remain in chronological order, with the current
message highlighted and later messages dimmed. Each message groups its author
with the selected reader, or the shared channel for a post. Explicit reply links
jump to the original parent. Selecting an author or a read receipt synchronizes
the replay. Browsing the same message's readers preserves the chat scroll position.
Drag to rotate, select
a message or reader, or scrub the sequence; all views stay synchronized.
Inspecting a message holds the current event while light moves along its recorded
route. Pause freezes both the replay and the light. Reduced motion disables
autoplay and moving lights. Offscreen views stop drawing. Cases without messages
show recorded actions and tool arguments, with no invented communication links.
The full turn grid and action log are available in the evidence disclosures.
Each card's source arrow opens its own underlying record, so a read action and
the original message link to different events. Detailed outcomes
and Settings & evidence follow the replay. The viewer loads one case
at a time. For example,
`?case=r261&phase=2` selects the current record-change case. Findings links use
the same selector. Earlier r199/r74/r187 Phase 2 links still open their original
evidence, outside the current selections; they never redirect to a new case.

`scripts/import-reviewed-trajectories.py` imports the newer evidence from a local
reviewed bundle. It checks manifest hashes and exact native tool arguments and
results. Displayed messages remain verbatim; cross-agent read links require the
exact message in the returned tool value. No proximity-based reply inference.
System final-output markers and encrypted model payloads are not tool actions.
`scripts/split-phase-trajectories.py` verifies source-world manifest hashes and
builds the r74/r75 phase excerpts. Their provenance records the selection rules.
Older imports retain their existing provenance. Keep credentials out of assets.

## Presentation and checks

- The three Phase 2 key findings start with spontaneous grader inference
  (r257), coordinated record changes (r261), and compositional failure (r255).
  Phase 1 retains its three formation steps. Keep titles, copy and case plaques aligned,
  Phase 1 green and Phase 2 terracotta in both themes. The r257 inference concerns
  a nonexistent grading requirement, not an absent grader or a named manager.
- Keep the institution belt above one compact navigation row. Preserve Setup and
  the concrete finding links in the header; Main result and Detection are added
  anchors, not replacements. Put Trajectories immediately after Main result in
  both the navigation and page flow. Keep Back to top on the left. The study
  names stay in the page's section headings.
- Play the bee title animation once per load, then hold the final title. Theme
  and case changes do not restart it. Preserve institution assets.
- Put the concise main result and three linked story steps first. Keep the original
  TLDR under About SwarmHarm. The opening states the initiative and evaluation gap;
  do not add a separate RQ section.
- Light/Dark is an explicit toggle; remember the selected theme.
- Use one font family throughout. Keep summaries short; put originals and
  structured tool results in disclosures.
- Keep case settings compact; Settings & evidence visibly expands on click.
  Icons accompany recorded values. Outcome panels explain
  the action and separate completed work from its measured consequence. Keep
  backed-up originals distinct from changed live records.
- Each of the six finding cards leads with a compact schematic using the existing
  field-guide robot assets, followed by one short conclusion. Evidence & scope
  expands the interpretation and limits. The diagrams are explanatory, not
  invented message transcripts or additional trajectories. In particular, r257
  shows an imaginary validation gate rather than a named human manager, r261
  retains the original 27-entry result, and r255 shows four $4m commitments
  against a $12m reserve. Keep the paired cards aligned in both themes.
- On phones, use 44px touch targets, readable form controls and wrapped records.
  Opening an original record starts at its heading; turn-grid scrolling stays local.
- Check case switching, message reads, downloads, 320px and desktop layouts,
  both themes, keyboard controls and failed-load handling before publication.
- Bump query versions for changed assets. Verify the Pages deployment.

Run a local preview with `python3 -m http.server 8765 --bind 127.0.0.1`.

## Attribution

Based on [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)
and [Nerfies](https://nerfies.github.io/), under CC BY-SA 4.0. Retain local font and
icon licenses. Institutional marks identify team affiliations.
Princeton's shield-and-wordmark signatures use the University's [light](https://www.princeton.edu/themes/custom/hobbes/logo.svg) and [dark](https://www.princeton.edu/themes/custom/hobbes/images/logo-white.svg) website assets.
OpenAI model badges use the monochrome logo from [SVGL](https://github.com/pheralb/svgl),
with its license retained beside the asset. Reasoning badges show High with three filled bars.

The four-domain overview links to Phase 1 examples in Knowledge Work, Data Analysis, Financial Analysis and Engineering. Engineering uses the manifest-verified r65 excerpt before continuation event 63; it is a historical formation example, not a new Phase 2 result. The three finding rows remain unchanged.

Finding banners show Agents, Model and Reasoning. Goal settings are omitted from the page, including the case settings panel; original values remain in the case data and downloadable evidence.

## Project page structure and visual language

The opening introduces an initiative to build the foundation for swarm evaluation,
then offers direct routes to trajectories, setup and resources. Each study has a
matched compact setup and native SVG diagram. Formation shows hard tasks in
separate sandboxes, no prior peer knowledge, and discovery of a deliberately
introduced vulnerability. The consequence study has separate agents pursuing
ordinary tasks in a shared system. These are separate experiments.

The six independent finding banners, three threat models, four task domains,
measurement protocol, review downloads, website source, contact and updates form
the complete page. Resource links must point to accessible public assets. Do not
add a Paper or evaluation-code link before its public release can be verified.

`python3 scripts/build-finding-agents.py` derives a shared SVG sprite from the
existing editable field-guide robot artwork. The 36 views change eyebrows, eyes,
mouth, gaze, head and arm pose. Curious discovery, speaking/listening, relief,
confusion, focused editing, squinting at a target and concern at a shared shortfall
are visual cues, not measurements of internal mental states or malicious intent.
Every setup, finding and threat-model illustration uses these variants. Trajectory
and action-log avatars also use the same case-specific expression family, while
all original actions, authored messages and evidence links remain unchanged.

The propagation diagrams show a proposed false rule reaching peers (r257), and
one shared record-editing method being read and reused by two later agents (r261).
The 27 changed entries are the whole-run result, including two independent initial
edits. Composition remains four individual commitments aggregating to a shortfall;
no communication is invented to explain it. Arrow emphasis plays once on entry,
stops offscreen and can be replayed. Reduced motion shows the full static diagram.
High reasoning bars and text are red in finding cards and trajectory settings.

Design references reviewed for this revision: Stolen Thoughts (result-led sections
and direct examples), PostTrainBench (short setup, traces, methodology and project
resources), JailbreakBench (explicit benchmark components and artifact access),
and the primary AgentHarm and Claudini project pages (bounded claims, methods and
released resources). Reuse the information hierarchy, not their visual assets.

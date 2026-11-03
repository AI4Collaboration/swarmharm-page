# SwarmHarm website

Public research website: [swarmharm.com](https://swarmharm.com/).
Static GitHub Pages site; publish to `origin/master`. Research code is maintained
separately in AI4Collaboration/SwarmHarm.

## Content and evidence

Keep the established labels **Phase 1: Swarm Formation** and
**Phase 2: Collective Misalignment** in headings, findings and case navigation.
Do not rename them while simplifying explanatory copy. Avoid meta headings or
repetitive study-design disclaimers on the page; keep evidence scope in the
case disclosure and provenance.

Phase 1 and Phase 2 are independent studies. The overview illustrates their
separate designs; it does not combine results into one trajectory.

The selector contains exactly three cases per phase:

- **Phase 1:** autonomous discovery — r136 (Knowledge Work); communication
  channels — r74 (Data Analysis); useful information exchange — r75 (Financial
  Analysis). The selector and summaries match these three findings.
- **Phase 2:** r199 (knowing coordination), r74 (compositional failure),
  r187 (shared false process inference).

r74 appears in both phases with distinct excerpts and outcomes. Original event
IDs and turn numbers remain intact. The composition audit replays complete action
sequences, preserving corrections and cancellations; it is available in
`static/data/composition-review.json`. Other original assets remain archived.

Claims describe the measured effect: r199 changes work-session messages; r74
creates excess inventory at a registered synthetic cost; r187 invents an approval
requirement and exchanges signoffs without rewriting earlier session messages.
The pressure section describes research conditions, not demonstrated motives.

## Trajectory viewer

`static/js/trajectory-cases-data.js` supplies case summaries and evidence links.
`static/data/trajectories/` contains the public, case-specific viewer data.
The graph, message log and turn grid load one case at a time. A `?case=r74&phase=1` URL
selects its formation excerpt; `phase=2` selects its composition excerpt. The findings links use the same selector.

`scripts/import-reviewed-trajectories.py` imports the newer evidence from a local
reviewed bundle. It checks manifest hashes and exact native tool arguments and
results. Displayed messages remain verbatim; cross-agent read links require the
exact message in the returned tool value. No proximity-based reply inference.
System final-output markers and encrypted model payloads are not tool actions.
`scripts/split-phase-trajectories.py` verifies source-world manifest hashes and
builds the r74/r75 phase excerpts. Their provenance records the selection rules.
Older imports retain their existing provenance. Keep credentials out of assets.

## Presentation and checks

- Each phase has three findings, with titles, copy and matching case plaques aligned row by row on desktop and tablet. Findings sit under their existing phase headings: green for Phase 1, terracotta
  for Phase 2, with matching dark-theme colors. Do not repeat phase labels per claim.
- Full-width header; “Team from” sits left of the institution conveyor.
- Preserve the bee title animation, institution assets and both color themes.
- Use one font family throughout. Keep summaries short; put originals and
  structured tool results in disclosures.
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

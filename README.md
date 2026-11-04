# SwarmHarm website

Public research website: [swarmharm.com](https://swarmharm.com/).
Static GitHub Pages site; publish to `origin/master`. After completing and checking
website changes, always commit and push to `origin/master` unless the user explicitly
requests local-only work. Verify the Pages deployment after pushing.
Research code is maintained separately in AI4Collaboration/SwarmHarm.

## Content and evidence

Keep the established labels **Phase 1: Swarm Formation** and
**Phase 2: Collective Misalignment** in headings, findings and case navigation.
Use **Swarm Formation** and **Collective Misalignment** without phase numbers in the top navigation. Preserve the full study labels in the research content. Avoid meta headings or
repetitive study-design disclaimers on the page; keep evidence scope in the
case disclosure and provenance.

Phase 1 and Phase 2 are independent studies. The overview illustrates their
separate designs; it does not combine results into one trajectory.

The selector contains exactly three cases per phase:

- **Phase 1:** autonomous discovery — r136 (Knowledge Work); communication
  channels — r74 (Data Analysis); useful information exchange — r75 (Financial
  Analysis). The selector and summaries match these three findings.
- **Phase 2:** r261 (coordinated record changes), r255 (compositional funding
  shortfall), r257 (shared false validation requirement). All use four Sol 5.6
  agents in Codex with native goal enabled. r261 returns measured feedback;
  r257 returns status only.

The composition selection also offers **r263, Haiku 5.5 / Claude Code**, with
goal disabled in that recorded run. It has no authored messages and supports
composition only. Both composition cases replay each complete actor sequence
alone and together, preserving revisions and cancellations: $0 unfunded alone,
$4m unfunded together against a $12m reserve.

r261 has 27 changed session-message entries and three retained original backups;
r257 shares and adopts an invented prerequisite, without publishing or changing
live records. Each case has its own settings, trajectory and independent review
in `static/data/reviews/`. Budgets and scoring parameters stay in a disclosure.
The pressure section describes research conditions, not demonstrated motives.

## Trajectory viewer

`static/js/trajectory-cases-data.js` supplies case summaries and evidence links.
`static/data/trajectories/` contains the public, case-specific viewer data.
The graph, message log and turn grid load one case at a time. For example,
`?case=r261&phase=2` selects the current record-change case. Findings links use
the same selector. Earlier r199/r74/r187 Phase 2 links still open their original
evidence, outside the six primary selections; they never redirect to a new case.

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

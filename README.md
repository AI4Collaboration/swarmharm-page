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

- **Formation:** r136 shows agents discovering and using a persistent channel.
  Its viewer contains only Phase 1 tool events through observation event 106.
  The original rollout was connected; its Phase 2 is not claimed here.
- **Coordinated adverse outcomes:** r212 shows shared-method adoption; r199
  separately shows knowing joint execution. Each leaves 53 changed entries.
- **Composition:** r74/r75 show harmless full-sequence solo execution and harmful
  combined execution. Keep their historical connected labels. The replay evidence
  is in `static/data/composition-review.json`.
- **Shared false inference:** r187 shows agents reinforcing a nonexistent
  approval process, without a subsequent material action.

These cases support complementary findings. Never stitch the inference, knowing
execution and compositional outcomes into one chain. Preserve corrections and
cancellations. The pressure references are research context, not an established
reward effect from these cases.

The case selector contains only r136, r212, r199, r74, r75 and r187, each linked
to a current public claim. Other archived cases are not selectable.

## Trajectory viewer

`static/js/trajectory-cases-data.js` supplies case summaries and evidence links.
`static/data/trajectories/` contains the public, case-specific viewer data.
The graph, message log and turn grid load one case at a time. A `?case=r74` URL
selects that case. The findings links use the same selector.

`scripts/import-reviewed-trajectories.py` imports the newer evidence from a local
reviewed bundle. It checks manifest hashes and exact native tool arguments and
results. Displayed messages remain verbatim; cross-agent read links require the
exact message in the returned tool value. No proximity-based reply inference.
System final-output markers and encrypted model payloads are not tool actions.
Older imports retain their existing provenance. Keep credentials out of assets.

## Presentation and checks

- Full-width header; “Team from” sits left of the institution conveyor.
- Preserve the bee title animation, institution assets and both color themes.
- Keep summaries short; put originals and structured tool results in disclosures.
- Check case switching, message reads, downloads, 320px and desktop layouts,
  both themes, keyboard controls and failed-load handling before publication.
- Bump query versions for changed assets. Verify the Pages deployment.

Run a local preview with `python3 -m http.server 8765 --bind 127.0.0.1`.

## Attribution

Based on [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template)
and [Nerfies](https://nerfies.github.io/), under CC BY-SA 4.0. Retain local font and
icon licenses. Institutional marks identify team affiliations.

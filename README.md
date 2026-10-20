# SwarmHarm website

The public research website at [swarmharm.com](https://swarmharm.com/).
It presents key elements, what we are building, a historical sample case and
research questions. Do not add unpublished experiment results.

## Edit and preview

This is a static site with no build step.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. Edit `index.html`, styles in `static/css/`
and interactions in `static/js/`. `flight.css` is the final presentation layer.
Increment the affected asset query versions in `index.html` when publishing.

The header and hero both link to all four main sections. Layouts reflow down to
320 CSS pixels without hiding links; narrow or short viewports use a normal
scrolling header. Keep keyboard access, readable wrapping and working fragment
links when changing navigation.

New study descriptions omit added pressure. Channel availability is separate
from source-access boundaries; absence of chat is not a communication ban.
Preserve source evidence and distinguish historical observations from findings
of a new experiment.

Publish reviewed changes to `origin/master`, then verify the live page.
`CNAME` retains the custom domain.

## Attribution and license

Adapted from [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template),
with components originally adopted from [Nerfies](https://nerfies.github.io/).
Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

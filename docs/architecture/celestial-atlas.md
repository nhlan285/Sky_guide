# Celestial Atlas

The landing uses six independent navigation clusters: Items, Seasons / Events,
Traveling Spirit, Official News, Maps and Wardrobe. Routes are unchanged.

`src/features/constellation/celestialAtlas.ts` owns their stable IDs, destinations,
local stars, local edges and group layout presets. `CelestialCluster.tsx` resolves
each edge's two star IDs and renders both lines and stars in one `0 0 100 100`
SVG. There is no viewport-wide connection layer or DOM endpoint measurement.

The measured scene excludes the toolbar, disclosure and device safe areas.
Only entire link boxes move or resize. Wide desktop, desktop and tablet have
different asymmetrical arrangements. Portrait uses an orbital trail around the
identity pocket; landscape uses a horizontal ribbon beneath the identity. Very
short portrait scenes use compact groups. All presets retain every destination.
The shell stays exactly `100svh` / `100dvh` with clipped overflow.

Hover, keyboard focus and press illuminate local cores, edges and dust. Selecting
a link starts a 320 ms local bloom/streak, followed by an optional 180 ms browser
view transition. Modified clicks retain native link behavior. A subsequent
selection replaces the pending navigation; unmount clears its timer. Reduced
motion removes the delay and animated effects, including when the preference
changes during a pending dive. The existing native settings dialog preserves
focus return, Escape, modal focus containment and mobile sheet placement.

Daylight uses blue atmospheric depth, sunlight haze and three large cloud
formations. Sunset adds warm undersides while preserving a cool upper sky.
Night uses navy/indigo, the seeded Canvas star population and cached galactic
haze. Clouds animate transforms at three slow speeds and use gradient masks,
without live blur filters. The shared atmosphere remains mounted across routes;
the Hub fades it into its readable surface without changing its content layout.

Ambient safeguards: maximum 1,400 stars (1,000 at reduced quality), DPR capped at
2, 3 million backing pixels, cached far stars/glow/haze, haze dimensions capped
at 1,000 px, 30 fps ceiling, hidden/offscreen pause, no React state per frame.
Reduced motion renders static frames on scene updates and resize only.

## Manual visual check required

Automated browser and screenshot testing is intentionally excluded. Run
`pnpm dev` when ready to inspect manually. Unit tests validate geometry and
navigation policy; they do not establish rendered text bounds or visual quality.

- Inspect at 320×568, 390×844, 768×1024, 1024×768, 1440×900 and 1920×1080.
  Rotate a phone to 844×390 and try a short 640×360 viewport.
- Repeat Daylight, Sunset and Night in both Vietnamese and English. Confirm
  readable labels, distinct silhouettes, clear title space and no page scroll.
- Open the settings sheet, change language/theme, close with Escape and outside
  tap, and confirm focus returns to its trigger without overlay collisions.
- Tab through every cluster, activate with Enter, check all six destinations,
  test Ctrl/Cmd-click and browser Back, and rapidly choose a second destination.
- Check the short local streak and the retained atmosphere at the top of Hub.
  Enable reduced motion before selection and during the pending dive; navigation
  should become immediate and clouds, twinkle, parallax and streaks stay still.

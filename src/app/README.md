# Living sky rendering — V2

Canvas owns the seeded ambient field, cached galactic dust/haze and rare meteors. SVG owns four sparse constellation edges in three clusters and three original cloud silhouettes. HTML links have persistent localized labels, 44px minimum light hitboxes and destination anchors in `/hub`. `/` remains the landing, with `/hub`, `/about` and not-found routes preserved.

`skyTime.ts` blends sunrise/daylight/sunset/night weights from local device hours, minutes and seconds. Auto samples every 15 seconds while visible; Canvas eases changes and atmosphere layers crossfade without remounting. Manual modes use representative moments. This is visual art direction, not an astronomical calculation or a game clock. Text/surface tokens choose a contrast-safe scheme independently of atmospheric interpolation.

`starGeneration.ts` scales density by CSS viewport area and capped DPR, with 250–1400 points (1000 cap in large-area low quality), three depths, clustered regions and two faint bands. Seed prefixes stay stable within a viewport class. Canvas caps effective DPR at 2 and backing pixels near 3 million; caches static far stars/haze, draws at most 30fps and pauses when hidden or offscreen. React never updates per ambient frame. ResizeObserver/resize handle size, orientation and DPR changes.

Three compositions are explicit: compact below 640px, tablet below 1100px and wide. Mobile uses a vertical trail with a title pocket. Hub keeps a practical ordered layout, opaque readable surfaces, a larger hero and a top atmosphere that fades before paragraphs. Every new visible string exists in Vietnamese and English; theme/locale persist when storage is available.

Cloud groups drift by transform with different blur/scale/speed; no looping jump or downloaded texture. Landing navigation uses a 550ms native View Transition when available and immediate routing plus a CSS entrance otherwise. Reduced motion disables cloud movement, twinkle, meteors, parallax and route motion; the rich static sky remains. No new dependencies, game assets, live/fake content or adapters are added.

Automated checks: lint, typecheck, production build and 52 Node behavioral tests, including all requested clock boundaries, continuity, deterministic distribution and caps. No browser or automated screenshots used.

MANUAL VISUAL CHECK REQUIRED: judge Daylight/Sunset/Night at mobile/tablet/wide widths, long labels, keyboard focus, menu/radios, stored selections, reduced motion, constellation-to-Hub transitions and smoothness on a mid-range phone. Confirm honest unavailable modules remain readable.

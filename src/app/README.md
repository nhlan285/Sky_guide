# Visible Hub foundation

P3-U01/U02/U03 use the existing React Router and native CSS setup, with no added dependencies. The home route contains Season/Event, Traveling Spirit, official news, Item Lookup, Wardrobe, compact Maps/Routes and a collapsed community disclosure in that DOM order. Desktop uses a wider main column; below 768px the grid becomes one column. Cards size to content, controls and labels wrap, and all grid columns have zero minimum widths.

`../shared/ui/primitives.tsx` provides Button, StatusBadge, labeled TextInput and SectionCard. CSS custom properties in `styles.css` define surfaces, typography, spacing, borders, radii, focus and status colors. `../shared/ui/ContentState.tsx` provides loading, empty, error, unavailable, stale and offline labels/messages. Actions require an explicit callback; callers must only supply implemented operations and truthful cache/update metadata. `../features/hub/Hub.tsx` uses unavailable, never loading/error/stale/offline as invented app state.

Item Lookup is a visible surface with a focusable read-only search input and disabled search/filter controls. Header search links focus that input. Wardrobe navigation points to its honest unavailable Hub section, not a fake editor. `/about` contains source/credits, current legal status and an explanation of unimplemented device settings. Footer links target those sections. `/` and `/about` plus not-found remain the only routes.

Keyboard access includes a skip link, labeled navigation, visible focus, native community disclosure, and a mobile menu toggle with expanded state and Escape/close focus restoration. Route/hash navigation moves focus to the destination. There are no fake records, dates, countdowns, search results, game assets, Phase 0 SVG fixtures, adapters, notifications or settings persistence.

Automated checks: `pnpm lint`, `pnpm typecheck`, existing `pnpm test`, and `pnpm build`. No browser, dev server or browser automation is used for this task. Static layout does not introduce a component-testing framework.

MANUAL VISUAL CHECK REQUIRED after deployment:

- Check wide desktop, 320px/390px mobile, 200% zoom and long labels for wrapping, readable contrast and absence of horizontal overflow.
- Confirm the mobile sequence matches the DOM, the menu opens/closes and Escape restores toggle focus; Tab reaches the skip link, navigation and disclosure.
- Use search navigation from home and About; confirm focus reaches the read-only input, search/filter remain disabled and no results are implied.
- Check Wardrobe and footer anchor destinations, About and an unknown URL; confirm community content starts collapsed and remains separate from official news.

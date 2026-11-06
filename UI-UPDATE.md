# PeekyFox UI update

Implemented the requested audit fixes and SaaS landing-page redesign. The existing fox artwork, product behavior, account flows, and contact details are retained. No optional product features were added.

## Audit coverage

| Audit issue | Resolution |
| --- | --- |
| 1. Arbitrary app spacing | Normalized legacy margin, padding, and gap primitives to a 4px/8px rhythm; shared spacing tokens live in `src/styles/System.css`. |
| 2. Viewport-driven landing spacing | Replaced the proportional illustration layout with a responsive container and fixed spacing scale. |
| 3. Toolbar height parity | Search, filters, actions, and view-toggle frames share a 52px height; nested toggle targets are 44px. |
| 4. Inconsistent titles | App page titles use 2rem desktop / 1.75rem mobile with shared line height. |
| 5. Icon bounds | Standard authored action/navigation SVGs use 20px square bounds and cannot flex-shrink. Larger illustrations/charts retain their own dimensions. |
| 6. Radius/elevation drift | Shared 24px card, 8px control, 28px modal, and elevation tokens. Explicit landing pill badges retain their requested pill shape. |
| 7. List column misalignment | Native table headers and cells share padding and column boundaries. Mobile gets labelled records and usable sorting controls. |
| 8. Collection grid overflow | Collection and product grids use `minmax(min(100%,300px),1fr)`. |
| 9. Collection banner collision | Content-driven banner height with a 188px minimum; progress labels participate in grid flow. |
| 10. Success-stage overflow | Stage width is capped at `min(100%,340px)`. |
| 11. Modal clipping | All modal overlays scroll vertically; panels no longer depend on an unscrollable fixed-height viewport. |
| 12. Chart overflow | Savings chart separates annotation, flexible percentage-based plot area, and month labels. |
| 13. Dark mobile navigation | Background #0f1729, border #26324a, and a matching active state. |
| 14. CTA contrast | Primary backgrounds #c2410c; danger backgrounds #b91c1c; darker hover colors preserve white-label contrast. |
| 15. Metadata/savings contrast | Secondary, success, and danger text use semantic light/dark tokens. Warm-surface text and green badges were checked separately. |
| 16. Touch targets | Buttons, chips, switches, inputs, close controls, and standalone links have at least 44px hit areas. Native checkbox/radio visuals sit inside larger labels. |
| 17. Modal accessibility | One native `Dialog` primitive supplies the top layer, background inertness, focus entry/containment, Escape handling, accessible titles, and return focus. Includes notification and onboarding dialogs. |
| 18. Keyboard selection | Native checkboxes replace pointer-only watchlist selection; selected state persists across card/list view. |
| 19. Table semantics | Native table, caption, column headers, cells, and aria-sort. |
| 20. Dark focus contrast | Shared #93c5fd dark focus ring, with forced-colors support. |
| 21. Shrinking forms | Stable 16px-equivalent input typography, 48px auth controls, natural page scrolling, visible form-page h1 on mobile. |
| 22. Text rhythm | Shared label/body hierarchy, explicit line heights, and consistent icon-label/control-group gaps. |

## Visual and interaction changes

- Landing page: editorial hero, text pill badge, primary/secondary calls to action, ambient background glow, bento features with SVG icons, and scroll-triggered entrances.
- Application: clearer surfaces, consistent toolbars/forms, unified cards, coherent light/dark colors, and route/modal entrances.
- Feedback: bounded canvas-confetti bursts on successful product fetch, tracking save, item update, and purchase recording. Fetch failures do not celebrate. The canvas mounts inside the active dialog when necessary so it remains visible in the browser top layer.
- Motion: 1.02 hover / 0.98 active scale; skeleton loading; reduced-motion alternatives suppress confetti and nonessential motion. Scroll entrances preserve full text contrast.
- All interface text remains emoji-free. Close controls use authored SVGs.

## Verification

Run `npm run build` and `npm run test:ui`.

Final results on 6 November 2026: production build passed; all 46 browser checks passed; the Impeccable detector returned no findings; targeted lint for new modules and tests passed; `git diff --check` passed.

The browser suite contains 46 checks across desktop Chrome and mobile Chromium emulation. It covers light/dark app surfaces, axe accessibility scans, product dialogs, native checkbox selection, sorting, focus containment/return, Escape, collection bounds, fetch/save feedback, reduced motion, 320px reflow with enlarged text, public navigation, and authentication guards. Product reads and saves are mocked in the dev-only component fixture; it is not a production entry and does not bypass production authentication. Production route protection is tested separately.

`src/main.jsx` loads styles in a stable order so lazy route loading cannot change the theme cascade. Browser outputs are ignored by Git under `test-results/` and `playwright-report/`.

Repository-wide lint has 11 pre-existing errors: CommonJS globals in Firebase functions (5), existing React state/effect patterns (4), and unused Firebase analytics bindings (2). These were confirmed against the original Git versions. New dialog, icons, confetti helper, landing page, browser tests, and test configuration pass lint.

Automated checks do not establish complete WCAG conformance or guarantee zero regressions. Real screen-reader/device testing and authenticated Firebase/Cloudinary persistence were not performed.

## Optional proposals, not implemented

1. Generate optimized responsive WebP/AVIF versions of the existing multi-megabyte mascot assets to reduce mobile transfer and rendering costs.
2. Self-host the existing font and split the Firebase analytics bundle to reduce external font dependencies and the initial JavaScript payload.
3. Resolve the existing repository-wide lint issues in a separate maintenance change.

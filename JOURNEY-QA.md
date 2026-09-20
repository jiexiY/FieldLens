# Environmental journey pilot — verification record

Verified September 19, 2026 (Eastern), with production checks just after 03:10 UTC on September 20.

## Release

- Production: https://fieldlens-pi.vercel.app/
- Deployment: `dpl_8Fi4uk1NE3X4beZcdEuuBFX47pvC`, Ready and aliased to the existing project.
- Root is the environmental journey planner; `/explorer.html` preserves the earlier Lake Alice archive. Both returned HTTP 200.
- Production `/api/environment` returned available weather (156 hourly periods), published campus notices (36), and the current-alert feed (0 alerts at the checked point and time). Those counts are observations from QA, not guarantees of current conditions.

## Automated checks

- `npm test`: 44 passed, 0 failed. Includes the existing explorer tests plus Eastern-time conversion, invalid/DST dates, unknown dates, full forecast coverage, stale forecasts, null versus zero, Celsius null handling, thin closure-polygon intersections and holes, midnight trip dates, unpublished/private-field exclusion, bounded API coordinates, OSM access exclusions, raster masking, and all 30 directed place pairs.
- `npm run build`: passed; both page entries and the API deployment built successfully.
- `npm run verify:build`: passed. No Google demo key pattern, Google SDK loader, or development Google adapter in production JavaScript.
- `tools/check-journey-data.mjs`: all six pilot locations connect through the mapped pedestrian study network. This is not an accessibility audit or route validation.
- Axe-core WCAG 2 A/AA, WCAG 2.1 AA, and WCAG 2.2 AA tagged checks: no detected violations or incomplete items on the tested production desktop briefing and 390px large-text/high-contrast briefing. The local 320px large-text unavailable-data briefing also had no detected violations or horizontal overflow.
- The reading-preferences dialog had no detected violations. Axe left a contrast item requiring manual review in the dialog scan; this is not represented as a complete accessibility certification.

## Browser interactions verified using the Playwright skill

- Origin/destination selection, real live-data briefing generation, and focus on the result heading.
- First keyboard Tab reaches the skip link; native dialog Escape returns focus to its trigger.
- Larger text, high contrast, concise detail, and preference persistence across reload.
- Optional speech start/stop controls change state correctly. Audible output quality and real screen-reader behavior were not evaluated.
- Save and restore places/duration, invalid same-place selection, and clearing the previous briefing when input changes.
- Text-file download opened as a valid UTF-8 briefing, including temperature, wind, dated surroundings, steps/crossing unknowns, source links, and limitations.
- Intentionally intercepted local API HTTP 503 produced unavailable weather and closure states, not invented safe conditions. The expected 503 browser console entry was from this test. The interception was removed before production QA.
- Optional map displayed actual bundled geometry; all essential information remains outside it.
- Production Lake Alice archive rendered its canvas, completed loading without its scene-error state, and did not load the Google SDK. Its brand link returns to the journey planner.
- Desktop screenshot visually inspected at 1440×1000. Mobile high-contrast detail visually inspected at 320px; 390px overflow and accessibility checks passed.
- A dedicated browser QA session closed unexpectedly during a combined scan. It was reopened and the affected interactions/checks were repeated successfully; the interrupted run is not counted as passing evidence.

Artifacts are in `output/playwright/` and excluded from Vercel uploads.

## Important untested boundaries

No blind/low-vision participant study, orientation-and-mobility professional review, field inspection, NVDA/JAWS/VoiceOver session, Safari/iOS test, or travel-safety validation has been performed. The app must not be promoted as verified navigation or obstacle detection. September 2024 satellite vegetation is explicitly historical and does not reveal current shade, pavement, or weather effects. OSM geometry has unverified entrance gaps and may include steps or closures. Published notices and their polygons can be incomplete. A no-overlap result is never an all clear.

The new briefing has no live location tracking, participant observation feed, accounts, or external report submission. No mobility equipment changes are recommended.

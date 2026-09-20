# Campus closure update verification — September 20, 2026

## Public data, not simulated production content

FieldLens reads UF's public structured notices at `https://campusclosures.ufl.edu/api/public/impact` and the official `Closure_Polygon_view` GIS layer. Direct crawler verification returned 36 published/promoted notices, 34 with usable matched polygons, at `2026-09-20T16:54:15.579Z`. These are source totals, not a count of closures affecting every journey. Only published/promoted records and explicit public fields leave the adapter. Creator identities, internal user fields, and unpublished records are not returned or stored.

The source is a publication system, not a live pavement sensor. UF's web page is a JavaScript application; the adapter uses its structured public feeds instead of HTML extraction. No account, paid service, credentials, location tracking, or arbitrary URL crawler was added.

## Automated checks

- `npm test`: 114 passing tests, including 23 closure crawler/model/monitor tests.
- `npm run check:journeys`: mapped study-path and satellite-data checks passed; the unit suite also exercises all 30 directed campus place pairs.
- `npm run build` and `npm run verify:build`: production build passed and excludes simulated closure/voice fixtures, ElevenLabs credentials/direct provider requests, and the development-only Google Maps credential/loader.
- Coverage includes published-field allowlisting; invalid/unknown dates; malformed polygons; bounded ordered pagination; incomplete GIS results; single-flight requests and caching; stale-warning retention; unavailable source handling; content escaping and safe links; notice additions/edits/removals; fresh versus stale narration; 15-second scheduling; pause/manual controls; hidden/offline suspension; failure backoff; and ignoring late callbacks after a journey changes.

## Browser checks with synthetic notices

`tools/closures-browser-qa.js` runs through Playwright CLI against the local Vite server. It intercepts only the test browser's environment, closure, and voice endpoints. Clearly labeled synthetic notices and a test audio file are not deployed or evidence of current construction.

Verified behaviors:

- An edited notice appears on the 15-second cycle (first measured run: 14,726 ms from changing the fixture).
- Preparation checkbox, departure input, and expanded notice details survive the update.
- Last successful source-check time advances; unchanged automatic checks do not request speech.
- Disabling automatic checks suppresses requests across a complete polling interval.
- A simulated HTTP 503 retains the previous warning with a stale label; a manual refresh works while paused and recovers.
- Explicit closure narration sends the updated UF-style accessibility note to the test speech endpoint; no microphone interaction occurs.
- Notice removal says it is not confirmation that a path reopened, and the summary does not become an all clear.
- Changing destination clears the old briefing and stops its monitor.
- No uncaught page errors. The intentional HTTP 503 is an expected browser network-console error.
- Automated WCAG 2 A/AA, 2.1 AA, and 2.2 AA scans returned zero violations, including the 320px larger-text/high-contrast scan with a focused skip link. There was no horizontal overflow. Visual inspection caught and corrected the existing high-contrast skip-link text color; the follow-up browser workflow passed all 16 checks (14,220 ms automatic detection).

Screenshots are local artifacts under `output/playwright/`, excluded from Git and deployment. Browser tests are not human screen-reader, real-microphone, orientation-and-mobility, or blind/low-vision usability validation.

## Cadence and failure boundaries

Prepared briefings check every 15 seconds while visible and online. There is a 10-second warm-function cache and a 5-second shared CDN cache, plus network time. Warm-process single-flight coordination is not global distributed synchronization. The interval is not a zero-delay SLA; UF may publish after an on-the-ground change occurs.

Failed client checks back off to 30/60/120 seconds; the server has a 30-second failure cooldown. Last-good notices remain visible as stale and retain their original timestamp. Snapshots older than 60 seconds are stale, including while automatic checks are paused. If the GIS feed fails, fresh notice text remains available but all location relevance is unknown. No notice, missing geometry, or source removal is evidence of unobstructed access.

No continuous monitoring after closing the app, hidden-tab polling, persistent event history, push notifications, automatic audio, accessible detour calculation, or real-time obstacle sensing. Weather and historical satellite data do not refresh with the closure feed.

## Production release checks

After pushing to the connected `main` branch, verify the Vercel deployment is Ready at the expected commit, the public page serves the new build, and `/api/closures` returns fresh sanitized source data. Use a clean, unmocked production browser to prepare a journey and observe the timestamp advance automatically. A successful HTTP response alone is not browser verification; unchanged source content is expected and is not evidence that change detection failed.

# Dashboard redesign verification — September 20, 2026

## Scope and reference

Visual reference: [Transportation Management Software — SaaS Design by Md Jahidul Islam](https://dribbble.com/shots/27202602-Transportation-Management-Software-SaaS-Design), inspected in a browser. Adapted sidebar, white/neutral cards, thin borders, compact toolbar, floating journey information, and dominant contextual map. No reference media, logos, code, roads, vehicle telemetry, people, or statistics are included in the release.

Original FieldLens campus data, journey calculations, NWS forecasts, UF closure crawler, voice confirmation, and evidence limitations remain. No authentication, billing, API permissions, backend data sources, or stored user information were changed. The Lake Alice explorer remains separate and unchanged.

## Automated verification

- 122 unit tests passed, including eight new overview-map tests: local source rendering, no invented pre-trip route, study-line limitations, view-only zoom, escaped labels, missing data, source-derived distance, and clearing the prepared summary.
- Production build and credential/demo-fixture guard passed. The Google demo SDK and ElevenLabs keys stay out of the public client bundle.
- Dashboard browser checks passed for zoom, fit, hide/show, preparation, map/summary update, sidebar state, trip invalidation, visible voice configuration, and no uncaught errors.
- All 16 closure-update browser regressions passed in the redesigned interface, including automatic change detection (14,240 ms), retained stale warnings, paused/manual refresh, and narration of the changed accessibility note.
- The synthetic-microphone/mocked-ElevenLabs regression passed with live environment data: audio capture boundary, transcript proposal, explicit confirmation, briefing, Stop/Escape cancellation, and zero automatic microphone starts. No personal microphone recording or paid speech request was made. The accessibility scan reported zero violations and a color-contrast item requiring manual review; screenshots were also inspected.
- No horizontal overflow at 1440, 1024, 768, 390, or 320 pixels. Automated WCAG 2 A/AA, 2.1 AA, and 2.2 AA scans reported zero violations at each width and at 320 pixels with larger text and higher contrast, including a focused skip link.
- Visual inspection moved the floating summary away from campus markers. Dark color scheme is applied with higher contrast so native date controls use the appropriate theme. Local screenshots are under `output/playwright/` and excluded from Git/deployment.

`tools/dashboard-browser-qa.js` uses the real bundled campus geometry and synthetic unavailable weather/empty closure responses for reproducible layout tests. Those mocked responses are not deployed or evidence of current campus conditions. `tools/closures-browser-qa.js` and `tools/eleven-browser-qa.js` provide the independent closure and synthetic speech regression workflows; their tests do not establish human speech accuracy.

## Release and remaining limitations

Release through the existing GitHub `main` to Vercel integration. Verify Ready at the new commit, then check the public build and an unmocked journey, automatic closure timestamp advancement, responsive layout, and voice availability. HTTP 200 alone is not browser QA.

The map is a dated, local OSM extract, not live vehicle tracking, present-day obstacle sensing, or an accessibility-certified route. Distance excludes unverified building-to-network gaps, disclosed in the full briefing. A map line is never permission to travel. All essential data also remains in text and optional speech. Automated checks and visual review do not replace testing with blind/low-vision participants and orientation-and-mobility professionals.

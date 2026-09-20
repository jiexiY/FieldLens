# RealLens multi-page verification — September 20, 2026

## Scope

Opening-screen follow-up: /demo now automatically opens /welcome after two visible seconds, with immediate icon activation preserved and no microphone or audio autoplay. The browser timing/history checks are in tools/reallens-splash-qa.js; earlier manual-welcome expectations below describe the initial multi-page release.

Follow-up verification: 165 unit tests, production build/guard, and nine browser assertions pass. Local measured auto-navigation was 2,102 ms. Immediate continuation and both Back paths passed; the entry flow made no API requests.

Rebrand and replace the former section-based workspace with a product introduction, white welcome, four-action home, and distinct Plan, Talk, Conditions, and Bus documents. Keep the original hosting address, repository, credentials, saved preferences, public data, and archive.

## Passed locally

- Production build: eleven HTML entries. Production credential/fixture guard passes.
- 161 Node tests, including consent, source failure/staleness, request cancellation, typed parsing, new trip handoff/expiry/storage-denial checks, and actual vegetation narration.
- Independent campus-data check: all 15 undirected pairs (30 directed pairs in the unit suite) have finite connected study lines. Missing pixels, observation date, endpoint gaps, and non-navigation limits remain.
- Browser layout suite: 66 assertions. All nine product/app pages at 1440 and 390 pixels; eight app pages at 320 pixels with large text/high contrast. Zero tested WCAG-tagged axe violations or horizontal overflow. Four blocks fill normal viewports and do not clip at 200% text.
- Separate workflow suite: 24 assertions in a clean Chromium session. Same-place validation, confirmed page handoff, single-use request, explicit refresh, result focus, actual bundled NDVI, optional map, saved places, typed voice confirmation, no implicit audio/voice POST, on-demand RTS answers, late-answer suppression after Stop, and independent bus filtering. Prepared conditions also pass axe.
- Five Chromium accessibility-tree checks confirm the white welcome and all four home links expose their intended name, link role, and separate description.
- Desktop/mobile screenshots inspected for the introduction, white welcome, four blocks, and plan form. Screenshots and browser outputs stay under ignored output/playwright.

## Test realism

## Production confirmation

The rebrand release (commit 2e3d6a0) reached Vercel READY on the existing fieldlens-pi.vercel.app alias. All ten non-archive routes returned HTTP 200. Each of the nine distinct product/app entry-script lists matched the tested local production build.

An unmocked mobile browser completed intro → icon welcome → home → plan → conditions. NWS returned a real forecast; UF returned published notices; RTS returned six posts. These are point-in-time checks, not a guarantee of future feed availability. No JavaScript errors or mobile conditions overflow occurred. Five welcome/home accessibility-tree checks also passed on production.

The live voice capability response reported configured=true. This only verifies configuration; no new human microphone test or real TTS/transcription request was made for this release.

## Fixture boundaries

Layout/workflow checks use explicit unavailable-weather and synthetic RTS fixtures; satellite/map data is the actual bundled dataset. These fixtures are not bundled into production. The live-check script uses no network mocks, visits the complete public flow, and records real source states without treating unavailability as an all-clear.

No human microphone, actual VoiceOver/NVDA device session, or blind/low-vision participant study was performed. Chromium accessibility-tree labels and automated axe results do not prove assistive-technology usability or safe travel. No submission, affiliation, endorsement, safe-route certification, obstacle detection, or live bus ETA is claimed.

## Re-run

Build and preview, open an isolated browser with Playwright CLI, then use run-code --filename with tools/reallens-pages-qa.js, tools/reallens-flow-qa.js, tools/reallens-accessibility-tree-qa.js, or tools/reallens-live-qa.js. The script uses the open page's origin. Use a fresh browser for unmocked live checks.

Older browser QA scripts document previous page structures; their section-based selectors are historical.

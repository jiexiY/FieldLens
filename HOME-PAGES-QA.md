# Current: minimal app start and separate project page — September 20, 2026

## Scope

- `/welcome`: only four screen-filling pastel links: Plan a trip, Talk to FieldLens, Check conditions, Bus alerts. No header, dock, footer, visible explanatory text, or extra controls.
- Four links are present in static HTML. Styles load without JavaScript. Preferences are read only; their editor remains in the workspace.
- `/project`: separate text-rich project/advertising page with purpose, workflow, sources, limitations, and a clearly illustrative—not current—briefing preview. Primary calls to action open `/welcome`.
- `/`: existing workspace preserved. About links now target `/project`; navigation adds Start screen. Known section hashes explicitly receive keyboard focus on entry and hash changes.
- No backend, environmental calculation, closure/RTS monitor, speech provider, credential, or privacy policy changes. No new analytics.

## Executed local checks

- 151 unit tests passed; campus-data checks, four-entry production build, and production bundle guard passed.
- `tools/pages-browser-qa.js`: 43 checks passed. Both pages scanned at 1440×1000, 1024×768, 768×1024, 390×844, 320×568, and 844×390: no horizontal overflow or automated axe violations. Four blocks fit the viewport at all normal-size test dimensions.
- Keyboard order is Plan, Talk, Conditions, Bus. All links arrive at the intended existing section with focus. Check conditions has a short accessible name and a separate “Choose a journey first” description.
- App preferences carry to the start page. Large text/high contrast at 320 px and independent 200% text enlargement passed. An initial text-overflow failure was corrected by letting the grid reflow to one column when needed.
- Both pages made zero application API requests. Following action links made no audio POST requests. Static links/project content worked with JavaScript disabled. Project page honors reduced motion.
- Desktop and phone screenshots were inspected in ignored `output/playwright/`. New reproducible page QA complements the existing home/workspace suite.
- `tools/home-browser-qa.js`: all 26 existing home/workspace checks passed after updating the expected start-screen structure, including shared preferences, unsupported destination handling, and no automatic voice requests.

## Boundaries

These are browser/automated checks, not validation with blind or low-vision participants or actual assistive technologies. No real microphone or speech-quality evaluation was performed. Extreme text enlargement may scroll vertically instead of keeping four blocks inside one screen.

## Earlier home and landing release

The following describes the preceding design and its historical checks; its introduction/dock layout has been replaced above.

## Delivered layout and scope

- `/`: the user's first reference, adapted as a blue home hub with a rounded destination search and four white cards. No category strip. The existing environmental journey workspace, closure monitor, and voice assistant remain below it.
- `/welcome`: the user's second reference, adapted as a white introduction with pastel action tiles and a black navigation dock. On phones, heading, tiles, and dock precede the longer explanation in both DOM and visual order.
- `/explorer.html`: existing separate Lake Alice archive, unchanged.
- No reference screenshot, medical portrait, smart-home device controls, fabricated current metrics, or copied branding ships.
- Home search resolves only supported exact names/aliases. It sets a destination and focuses starting-point/departure review; it does not prepare a journey or request environmental conditions automatically.
- The Campus notices card opens the prepared closure panel, or explains the preparation requirement. Voice navigation never starts recording or playback.
- Larger text and higher contrast are shared between both pages. Existing briefing-detail and speech-speed choices are preserved. Storage failure remains explicit.

## Executed checks

- `npm test`: **126 passed**. Four new tests cover search normalization, unsupported/ambiguous places, preference defaults, and preservation of voice/detail choices.
- `npm run build`: all three page entries built. `npm run verify:build`: passed; provider credentials, direct ElevenLabs requests, and synthetic fixtures remain excluded from browser bundles.
- `tools/home-browser-qa.js`: **26 checks passed**. Menu/Escape/focus, invalid and valid search, no unconfirmed condition fetch, four card destinations, no automatic speech POST, landing API isolation, shared preferences, and landing-to-voice navigation.
- Home and landing scanned at **1440, 1024, 768, 390, and 320 px**: no horizontal overflow and zero automated axe WCAG 2 A/AA, 2.1 AA, or 2.2 AA violations. Both also passed at 320 px with larger text/high contrast and the skip link focused.
- `tools/dashboard-browser-qa.js`: **16 checks passed**, including real local campus map, zoom/fit/hide, confirmed study line, current navigation state, responsive layouts, privacy controls, and trip-edit clearing.
- `tools/closures-browser-qa.js`: **16 checks passed**. The synthetic automatic change arrived in **14,241 ms** after the prepared notice was observed. Pause, manual recovery, retained stale warnings, preserved checklist/open details, current explicit narration, and removal-not-all-clear behavior passed.
- `tools/eleven-browser-qa.js`: passed using a synthetic microphone and mocked ElevenLabs responses with live environmental requests. Transcription remains a proposal until confirmation; Stop/Escape stop tracks and discard unsubmitted audio. No real microphone or paid speech request was used. Automated axe scan reported zero violations; manual-review/incomplete categories remain.
- Visually reviewed desktop and 390 px screenshots for both pages, including the final phone-first tile/dock layout. Artifacts are in ignored `output/playwright/`.

## Limits

Automated accessibility checks are not assistive-technology user testing, WCAG certification, or proof of safe navigation. No blind/low-vision participant evaluation, real-microphone accuracy test, or new provider audio-quality test was performed in this UI change. Published notices are not real-time obstacle or pavement sensors. Weather remains forecast data; September 2024 satellite context remains historical. No environmental or routing algorithms were changed.

## Release workflow

Publish the tested main-branch commit through the existing GitHub-to-Vercel integration. Verify the exact deployment commit, both public pages, unchanged archive, real journey preparation, and a live closure source-check advance. `tools/home-production-smoke.js` performs this read-only production smoke check without microphone or speech requests; deployment results are reported in the task rather than preclaimed here.

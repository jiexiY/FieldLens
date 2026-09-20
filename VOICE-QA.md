# Voice-assisted journey verification

September 20, 2026. This extends the environmental journey pilot described in JOURNEY-QA.md.

## Production release

Deployed to https://fieldlens-pi.vercel.app/ as `dpl_42nikvhwbC5E9ovgYFskmMqRSfTy` (Ready). HTTP 200 and the published `main-CK3Yvy-k.js` bundle were verified; speech input and confirmation code are present, and the QA fixture marker is absent. Weather, closures, and alerts all returned available during the production check.

A fresh, unmodified production browser session completed typed proposal → confirmation → live briefing → closure explanation. The form stayed unchanged before confirmation. Speech-recognition capability was present; no real microphone was activated. The production desktop briefing/voice panel had no axe violations or incomplete checks and was visually inspected at 1440×1000.

## Implementation

- Browser speech input with a visible, opt-in Talk button. One request per tap, no automatic restart, no microphone use at startup.
- Read-only parsing into a proposed journey. A separate confirmation is required before the form changes or the environment request runs.
- Six campus places; relative days/weekday within six days; 12-hour clock with AM/PM; optional supported outdoor duration. Missing and ambiguous fields cause clarification. New complete routes do not inherit an old proposal's date/time.
- Focused, source-grounded answers for rain, weather, wind, closures, surroundings, and unknowns. No LLM-generated facts or inferred path safety. Condition answers reject stale/expired briefings.
- Optional chunked speech output, repeat, stop, and readable text. Typed questions and the original form work without microphone access.
- Audio/transcripts are not saved by FieldLens or sent to its API. Browser speech providers may process audio remotely, disclosed before Talk. No credentials or new paid service.

## Verified

- Full Node suite: **65 passed, 0 failed**, including 21 voice/parser/speech tests. Build and production credential/test-fixture exclusion guard passed.
- Real browser typed input: ambiguous “eight” requested AM/PM and left the form untouched; “AM” completed the proposal; Confirm trip updated it and generated real NWS/UF context. Explain rain matched the selected briefing's data and retained its limitations.
- Simulated speech-service event integration: no startup microphone session; trip readback; separate spoken confirmation; generated briefing sent to speech output; focused rain answer; uncertain recognition rejected; late result after Stop ignored; permission denial and network error displayed; Escape abort; form changes invalidate pending confirmation.
- Timed microphone test: the 20-second timeout aborted the simulated session and did not restart it.
- Unsupported speech API simulation: Talk disabled with explanation; typed proposal and cancellation worked, leaving the original form intact.
- Axe-core tagged WCAG checks: final 320px large-text/high-contrast confirmation state had no violations or incomplete items and no horizontal overflow. A scrollable reply region was corrected to be keyboard-focusable and named. The unsupported-browser desktop scan had no violations but an incomplete color-contrast check, so it is not represented as complete certification.
- Playwright browser screenshots and other artifacts are under `output/playwright/`, excluded from Vercel. `tools/voice-browser-fixture.js` is an isolated QA fixture; production bundle checks reject its marker.

## Not verified

No real person's microphone recording, recognition accuracy/accent evaluation, speaker/headphone audio-quality check, NVDA/JAWS/VoiceOver session, Safari/iPhone device test, or blind/low-vision participant study was performed. Simulated recognition/synthesis events verify application behavior, not the external speech engine. Speech availability depends on the actual browser and provider. The app remains preparation, not navigation, obstacle detection, or a travel-safety certification.

## Maintenance

Run `npm test`, `npm run build`, and `npm run verify:build`. For browser boundary tests, load `tools/voice-browser-fixture.js` only as a dedicated browser init script, never in application code. Verify an unmodified browser session and the production API separately after publishing.

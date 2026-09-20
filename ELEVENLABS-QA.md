# ElevenLabs integration verification — September 20, 2026

## Design and safeguards

The existing `ELEVENLAB_API_KEY` variable is used only by `api/voice.js`. No key was pasted into chat, read out of Vercel, copied into source, or committed. Production speech uses the server-side key; local tests inject dummy credentials and provider responses. Provider access and quota errors are sanitized.

Audio capture is user-initiated, held in memory, and bounded to 20 seconds. Silence is discarded. The server independently validates WAV format, duration, size, and text bounds, and permits no arbitrary provider URL/model/voice. No recordings/transcripts are persisted by FieldLens. Provider retention is disclosed; zero retention is not promised.

Vercel WAF rule `FieldLens voice request limit` is active and valid: only POST `/api/voice`, fixed window, 30 requests per 60 seconds per IP. Other pages and the environmental endpoint are unaffected. The rule uses the existing Hobby plan. Application throttling is process-local, not a global budget guarantee. Configure an ElevenLabs key cap for total spending protection.

## Automated verification

- 88 tests passed: 65 existing tests plus 23 new voice API/audio tests.
- Covers configured/missing/disabled server credentials; no key in configuration responses; fixed models/voice; method/origin/type/body bounds; exact bounded WAV validation; resampling; provider errors and quota; process-local rate limits; playback speed; cancellation and stale TTS; browser fallback; microphone track cleanup; silence discard; delayed permission and delayed transcript cancellation.
- Production build and secret-isolation guard passed. Browser bundle contains no ElevenLabs authentication header, direct provider endpoint, or server credential variable. QA fixtures remain outside production.

## Browser integration

A fresh Chromium session passed the synthetic-microphone workflow using a real AudioWorklet, mocked ElevenLabs responses, and live environmental data. It verified no microphone activation on startup, one bounded transcription upload after Finish speaking, microphone track cleanup before transcription, no form change before confirmation, successful confirmed briefing creation, and Escape cancellation without upload. Axe found zero violations and zero incomplete checks for the tested WCAG A/AA tags on that state. This is an automated check, not accessibility certification.

The first QA fixture stopped before the app's 150 ms speech gate; the fixture now supplies ample audio before finishing. That failure correctly discarded the too-short recording without sending it.

## Remaining verification

Live API and deployed-browser results will be recorded after verification. Synthetic audio tests are not human microphone/accent or usability tests. No blind/low-vision participant, orientation-and-mobility, VoiceOver/NVDA/JAWS, or Safari/iPhone validation has been performed. This remains journey preparation, not a navigation or safety certification.

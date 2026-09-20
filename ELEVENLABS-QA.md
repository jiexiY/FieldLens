# ElevenLabs integration verification — September 20, 2026

## Design and safeguards

The existing `ELEVENLAB_API_KEY` variable is used only by `api/voice.js`. No key was pasted into chat, read out of Vercel, copied into source, or committed. Production speech uses the server-side key; local tests inject dummy credentials and provider responses. Provider access and quota errors are sanitized. Rejections log only the fixed action, numeric HTTP status, and an allowlisted error code; raw messages, keys, recordings, and transcripts are not logged.

Audio capture is user-initiated, held in memory, and bounded to 20 seconds. Silence is discarded. The server independently validates WAV format, duration, size, and text bounds, and permits no arbitrary provider URL/model/voice. No recordings/transcripts are persisted by FieldLens. Provider retention is disclosed; zero retention is not promised.

Vercel WAF rule `FieldLens voice request limit` is active and valid: only POST `/api/voice`, fixed window, 30 requests per 60 seconds per IP. Other pages and the environmental endpoint are unaffected. The rule uses the existing Hobby plan. Application throttling is process-local, not a global budget guarantee. Configure an ElevenLabs key cap for total spending protection.

## Automated verification

- 90 tests passed: 65 existing tests plus 25 new voice API/audio tests.
- Covers configured/missing/disabled server credentials; no key in configuration responses; fixed models/voice; method/origin/type/body bounds; exact bounded WAV validation; resampling; provider errors and quota; process-local rate limits; playback speed; cancellation and stale TTS; browser fallback; microphone track cleanup; silence discard; delayed permission and delayed transcript cancellation.
- Production build and secret-isolation guard passed. Browser bundle contains no ElevenLabs authentication header, direct provider endpoint, or server credential variable. QA fixtures remain outside production.

## Browser integration

A fresh Chromium session passed the synthetic-microphone workflow using a real AudioWorklet, mocked ElevenLabs responses, and live environmental data. It verified no microphone activation on startup, one bounded transcription upload after Finish speaking, microphone track cleanup before transcription, no form change before confirmation, successful confirmed briefing creation, and Escape cancellation without upload. Axe found zero violations and zero incomplete checks for the tested WCAG A/AA tags on that state. This is an automated check, not accessibility certification.

The first QA fixture stopped before the app's 150 ms speech gate; the fixture now supplies ample audio before finishing. That failure correctly discarded the too-short recording without sending it.

## Production verification and credential blocker

- GitHub push triggered Vercel production automatically. Integration commit `28520ad` and safe-error update `6996ed0` both reached Ready. Public homepage returned HTTP 200 with the new bundle; GET `/api/voice` returned `configured: true` without revealing credentials.
- Real TTS failed. The deployed server received ElevenLabs HTTP **400**, allowlisted code **`invalid_api_key`**. FieldLens now surfaces a safe HTTP 503 `provider_key` message and offers Browser voice. The environment-variable **name is supported**; the saved credential value is rejected. The owner must replace its Production value with a valid complete secret key and redeploy. Do not paste credentials into chat or source control.
- No successful real ElevenLabs audio or transcription has been verified. The synthetic-speech round-trip stops when TTS fails, so live STT is also pending. Only mocked STT and real browser capture are verified. Key permissions, quota, and selected-voice availability remain unverified until authentication succeeds. See the [official error reference](https://elevenlabs.io/docs/eleven-api/resources/errors).
- A deployed 320-pixel Chromium viewport with Larger text and Higher contrast had no horizontal overflow and zero axe violations/incomplete checks for the tested tags. A screenshot was visually inspected; this was viewport emulation, not a physical phone test.
- The live voice-only WAF test received 32 validation failures followed by HTTP 429 in a bounded burst. Every request used an invalid action and never called ElevenLabs. The homepage still returned HTTP 200 during the voice throttle. Rate windows are not an exact global usage or spending cap.

## Remaining verification

After the owner corrects the secret and redeploys, explicitly run the tiny live round-trip check in `tools/eleven-live-qa.js`, then try an actual spoken trip. Synthetic audio tests are not human microphone/accent or usability tests. No blind/low-vision participant, orientation-and-mobility, VoiceOver/NVDA/JAWS, or Safari/iPhone validation has been performed. This remains journey preparation, not a navigation or safety certification.

# ElevenLabs integration verification — September 20, 2026

## Design and safeguards

The replacement `ELEVENLABS_API` variable is used only by `api/voice.js`; legacy `ELEVENLAB_API_KEY` and `ELEVENLABS_API_KEY` names are still supported. No key was pasted into chat, read out of Vercel, copied into source, or committed. Production speech uses the server-side key; local tests inject dummy credentials and provider responses. Provider access and quota errors are sanitized. Rejections log only the fixed action, numeric HTTP status, and an allowlisted error code; raw messages, keys, recordings, and transcripts are not logged.

Audio capture is user-initiated, held in memory, and bounded to 20 seconds. Silence is discarded. The server independently validates WAV format, duration, size, and text bounds, and permits no arbitrary provider URL/model/voice. No recordings/transcripts are persisted by FieldLens. Provider retention is disclosed; zero retention is not promised.

Vercel WAF rule `FieldLens voice request limit` is active and valid: only POST `/api/voice`, fixed window, 30 requests per 60 seconds per IP. Other pages and the environmental endpoint are unaffected. The rule uses the existing Hobby plan. Application throttling is process-local, not a global budget guarantee. Configure an ElevenLabs key cap for total spending protection.

## Automated verification

- 91 tests passed: 65 existing tests plus 26 new voice API/audio tests, including the replacement environment-variable name.
- Covers configured/missing/disabled server credentials; no key in configuration responses; fixed models/voice; method/origin/type/body bounds; exact bounded WAV validation; resampling; provider errors and quota; process-local rate limits; playback speed; cancellation and stale TTS; browser fallback; microphone track cleanup; silence discard; delayed permission and delayed transcript cancellation.
- Production build and secret-isolation guard passed. Browser bundle contains no ElevenLabs authentication header, direct provider endpoint, or server credential variable. QA fixtures remain outside production.

## Browser integration

A fresh Chromium session passed the synthetic-microphone workflow using a real AudioWorklet, mocked ElevenLabs responses, and live environmental data. It verified no microphone activation on startup, one bounded transcription upload after Finish speaking, microphone track cleanup before transcription, no form change before confirmation, successful confirmed briefing creation, and Escape cancellation without upload. Axe found zero violations and zero incomplete checks for the tested WCAG A/AA tags on that state. This is an automated check, not accessibility certification.

The first QA fixture stopped before the app's 150 ms speech gate; the fixture now supplies ample audio before finishing. That failure correctly discarded the too-short recording without sending it.

## Production verification and resolved credential blocker

- GitHub push triggered Vercel production automatically. Integration commit `28520ad` and safe-error update `6996ed0` both reached Ready. Public homepage returned HTTP 200 with the new bundle; GET `/api/voice` returned `configured: true` without revealing credentials.
- The original credential failed with ElevenLabs HTTP **400**, allowlisted code **`invalid_api_key`**. The owner subsequently replaced it under the name `ELEVENLABS_API`. Compatibility commit `b3f8a2d` reached Ready on Vercel and resolved the new variable-name mismatch. No credential value was inspected. See the [official error reference](https://elevenlabs.io/docs/eleven-api/resources/errors).
- **Real production TTS and STT now pass.** One short TTS request returned HTTP 200, `audio/mpeg`, 49,363 bytes. A separate 3.545-second PCM recording, generated locally with Microsoft Zira and never using a personal microphone, returned HTTP 200 from Scribe v2. The spoken input was "From Reitz Union to Marston tomorrow at eight A M."; the transcript was "From Wright's Union to Marston tomorrow at 8 AM." This proves service access, not place-name accuracy or human-microphone usability. The test script is `tools/eleven-live-qa.ps1`; it handles all audio in memory and contacts only the deployed FieldLens voice endpoint.
- Passing that actual misrecognized transcript through the trip parser returned `kind: unknown` and requested a supported starting place; it did not silently substitute Reitz Union.
- A deployed 320-pixel Chromium viewport with Larger text and Higher contrast had no horizontal overflow and zero axe violations/incomplete checks for the tested tags. A screenshot was visually inspected; this was viewport emulation, not a physical phone test.
- The live voice-only WAF test received 32 validation failures followed by HTTP 429 in a bounded burst. Every request used an invalid action and never called ElevenLabs. The homepage still returned HTTP 200 during the voice throttle. Rate windows are not an exact global usage or spending cap.

## Remaining verification

Try an actual spoken trip next, including ambiguous and misrecognized place names. The Windows production test checks TTS and STT separately; `tools/eleven-live-qa.js` can additionally test an ElevenLabs-generated speech round trip. Synthetic audio tests are not human microphone/accent or usability tests. No blind/low-vision participant, orientation-and-mobility, VoiceOver/NVDA/JAWS, or Safari/iPhone validation has been performed. This remains journey preparation, not a navigation or safety certification.

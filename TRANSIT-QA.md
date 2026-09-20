# RTS rider-alert integration — September 20, 2026

## Source inspection

- User-provided source: https://go-rts.com/category/rider-alerts/
- Verified public WordPress Rider Alerts category: ID 41, six published posts at inspection. Read only `_fields=id,status,categories,date_gmt,modified_gmt,link,title,content`, ordered by ID with validated pagination. The endpoint returned `Cache-Control: no-store, must-revalidate, no-cache`.
- Public `robots.txt` did not disallow the rider-alert, feed, or REST paths. No authentication or new key was used. The RSS feed was inspected for discovery; runtime uses the structured WordPress endpoint, not the RSS's limited window or HTML scraping.
- The six posts included an explicit Route 11 detour, meetings/surveys, a predictions-service link, and other information. Do not equate the category with six active bus disruptions. Route 11 publication/modification dates remained June 9/10, 2026; retrieval time was not substituted for them.
- The source does not supply live vehicle GPS, ETAs, or structured alert start/end times. A separate link opens the official RTS predictions page. Media is not transcribed or interpreted; that limitation stays visible.

## Implementation boundaries

- `server/transit.js`: fixed upstream URL/category, published-only field allowlist, HTML-to-text sanitization, fixed-origin source validation, 2 MB page limit, five-page/500-post bound, total-count/duplicate checks, and 22-second timeout. Partial/unstable pagination fails closed.
- `/api/transit`: GET-only. Caller parameters cannot select an upstream URL. Ten-second warm-process caching, in-flight coalescing, five-second CDN cache, and 30-second server failure cooldown. This is not a globally coordinated crawler or a guaranteed upstream request cap.
- Independent monitor every 15 seconds while home is visible/online, pause/manual controls, 30/60/120-second client failure backoff, and stale labeling over 60 seconds. Earlier warnings and last-success time survive failure. No push/SMS/background execution after closing the page.
- Route matches are explicit text mentions. No route-catalog validation, transit routing, map overlay, or walking-journey mutation. General/uncertain posts remain available. Title-worded service posts with unknown routes stay visible; informational meetings and surveys are separate. Image/truncation/range uncertainty cannot silently discard potentially relevant posts.
- Accessible in-page change announcements do not request audio. Read-aloud uses the latest filtered text. Expanded details and keyboard focus survive updates. Removed posts are not declared restored service.
- `bus alerts`, `bus alerts for route eleven`, and `read bus alerts` use the independent RTS snapshot. A route-specific spoken query does not silently change the saved filter. Typed questions stay silent unless read-aloud is explicitly requested. Walking-trip proposals retain their confirmation boundary.

## Executed verification

- `npm test`: **147 passed** (21 new RTS tests).
- `npm run build` and `npm run verify:build`: passed. All three page entries remain present. Synthetic RTS/voice/closure fixtures and provider secrets are excluded from browser bundles.
- Live adapter check returned available with six sanitized posts and the explicit Route 11 mention; author and private metadata were not emitted.
- `tools/transit-browser-qa.js`: **27 checks passed**. The synthetic automatic change arrived in **14,963 ms**. Tested independent initial load, route filter validation, Route 1 versus 11, unknown-route service posts, pause, failed refresh, recovery, preserved timestamps/open details/focus, text commands, explicit narration, no automatic speech, and removal-not-all-clear.
- RTS layouts at 1440, 768, 390, and 320 px: no horizontal overflow; zero automated axe WCAG 2 A/AA, 2.1 AA, or 2.2 AA violations. The 320 px larger-text/high-contrast state and focused skip link passed too. Visually inspected desktop and mobile captures.
- Home/landing regression: **26 checks passed**, including unchanged four-card home, no category tabs, shared preferences, route search, navigation, silent voice entry, and responsive accessibility at 1440/1024/768/390/320 px.
- Campus-closure regression: **16 checks passed**; synthetic UF update arrived in **14,409 ms** with checklist, open notices, and stale-warning semantics preserved.
- Existing ElevenLabs workflow regression passed with synthetic microphone audio and mocked ElevenLabs/RTS, using live environmental requests: confirmation, no early form mutation, Stop/Escape cancellation, zero automated axe violations. Real microphone accuracy and speech quality were not tested or claimed; no speech credits were spent.

## Production verification

Publish through the existing GitHub-to-Vercel connection. After Ready, run `tools/transit-production-smoke.js` in a clean browser: verify live `/api/transit`, a genuine successful source-check advance, route filtering and a typed bus-alert reply without a walking briefing, mobile/desktop layout, and no audio POST. Exact deployment and live-source results are reported in the task after verification, not preclaimed in this file.

These automated checks are not WCAG certification, assistive-technology user testing, or blind/low-vision participant validation. Publication and source-check freshness do not establish current operational conditions.

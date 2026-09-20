# FieldLens — understand your journey

FieldLens is an environmental journey-briefing prototype for blind and low-vision people. Its primary workflow is **places + departure time + expected time outdoors → readable or optional spoken context**. No map interaction is required. The walking pilot covers six central University of Florida campus places, not all of Gainesville. A separate RTS rider-alert panel covers published Gainesville bus information; it does not expand the walking-route pilot or track buses.

**Live demo:** https://fieldlens-pi.vercel.app/

### Home and landing pages

The main app at `/` uses the user's blue-and-white phone reference: a large heading, rounded destination search, and four white action cards. The circled category strip is omitted. `/welcome` is a separate landing page based on the user's second reference: white canvas, bold black heading, pastel tiles, and a black rounded navigation dock. The medical and smart-home content, assets, device frames, and branding are not shipped. This is an independent implementation with real FieldLens destinations and functions.

Home search accepts exact names and explicit aliases for the six supported campus places; it sets a destination and focuses trip review, without requesting conditions or guessing an unsupported place. The cards open the planner, opt-in voice assistant, relevant campus notices after preparation, and separate Lake Alice archive. Reading preferences carry between home and landing; neither landing navigation nor the voice card starts a microphone or speech request. The landing itself contacts no weather, closure, or voice APIs.

The campus workspace below home preserves the previous map-led implementation, originally informed by [Md Jahidul Islam's Transportation Management Software design](https://dribbble.com/shots/27202602-Transportation-Management-Software-SaaS-Design). Its attributed local OSM overview has optional zoom, fit, and hide controls. No route appears before preparation; editing the trip clears the previous line. All essential information remains available without map interaction. The header menu links to workspace sections. Voice service selection and full privacy details remain under **Voice settings and privacy**, with disclosure visible before Talk. See [HOME-PAGES-QA.md](HOME-PAGES-QA.md) for current verification and [DASHBOARD-QA.md](DASHBOARD-QA.md) for the earlier dashboard release.

## Journey pilot

- Six origin/destination choices: Reitz Union, Marston Science Library, Turlington Hall, Smathers Library, The Hub, and Newell Hall.
- Live, time-windowed National Weather Service hourly forecasts and current alerts, retrieved through a same-origin read-only server function. Missing, stale, or incomplete forecast coverage remains unavailable; there is no simulated fallback.
- Published UF Campus Closures notices joined to official closure polygons and checked against the mapped study line and travel dates. Unmapped notices remain explicit unknowns. Only allowlisted published fields are returned; creator identities and unpublished records are excluded.
- September 22, 2024 Sentinel-2 NDVI context derived for the campus area using an adaptation of EMERGE chapter 3, lesson 3. This is **historical vegetation context, not current shade, a pavement observation, or a safety rating**.
- Bundled attributed OpenStreetMap geometry. A shortest connected pedestrian study line supports environmental sampling; it does not establish a suitable route, avoid closures, or verify building entrances. Endpoint gaps, steps, and crossing unknowns are disclosed.
- Keyboard-operable forms, result focus and status announcements, larger text, higher contrast, concise detail, optional speech, browser-local saved journeys, and a downloadable text briefing with sources.
- No account, live geolocation, analytics, or user reports. Saved places and preferences remain in the browser. Speech providers and hosting may use their normal network/logging services, as disclosed in the app.

The optional map is secondary. The earlier Lake Alice LiDAR/satellite explorer is preserved at **/explorer.html** and is geographically separate from the campus briefing.

### Automatic campus closure checks

After a briefing is prepared, FieldLens checks UF's published notices **every 15 seconds while the page is visible and online**. The closure panel shows the last successful source-check time, changed notices, a manual check button, and an automatic-check pause control. A change preserves the journey form, checklist, and open notice details. Meaningful changes receive a screen-reader status announcement; unchanged checks do not repeatedly announce or automatically play audio. “Listen to closure update” and the `closures` voice command use the latest closure snapshot, including UF accessibility and travel notes. These source notes are not independently verified detours.

The server-side crawler reads the site's [public structured notice feed](https://campusclosures.ufl.edu/api/public/impact) and [official UF GIS polygons](https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Polygon_view/FeatureServer/0), rather than scraping layout-dependent HTML. `/api/closures` is GET-only with fixed source URLs, bounded responses and pagination, a 22-second source timeout, published-field allowlisting, and no creator/user metadata or unpublished records returned. Concurrent checks coalesce within each warm server process. A 10-second warm-process cache and 5-second shared CDN cache limit requests; these are not a globally coordinated crawler or a guaranteed upstream request cap.

**Near-real-time, not zero delay:** the normal detection interval includes the 15-second polling cadence, short caches, and network time. UF must publish a notice first; its publication delay is outside FieldLens's control. A closure feed is not a sensor for obstacles, flooding, pavement condition, or current entrance access. This monitor refreshes campus notices only; RTS has its own independent monitor. Weather still refreshes with the full briefing and satellite context remains dated.

Failed checks retain earlier warnings marked **stale**, with their original source-check time. Failed client checks back off to 30, 60, then 120 seconds; the server uses a 30-second failure cooldown. Data over 60 seconds old is marked stale even when checks are paused. Missing or failed geometry makes location relevance unknown instead of implying no closures. A removed/expired notice is not proof that a walkway has reopened. There is no background checking, push notification, or persistent change history after the app is closed; hidden tabs pause polling. See [CLOSURES-QA.md](CLOSURES-QA.md) for verification and limits.

### RTS bus rider alerts

Open `/#transit`, the home workspace's **Taking RTS? Check bus alerts** link, or **RTS bus alerts** in the navigation menu. Published posts from [RTS Rider Alerts](https://go-rts.com/category/rider-alerts/) load independently of a walking briefing. The server reads the public WordPress category (`41`, verified September 20, 2026) using a fixed-origin, GET-only `/api/transit` adapter. No new key, account, or direct browser request to RTS is needed. RTS's public `robots.txt` allowed these paths when checked.

The reader requests only published post IDs, category, title, body, source link, and GMT publication/modification timestamps. It strips HTML, excludes author/private metadata, validates sources, bounds response size/pagination, and fails closed on an incomplete or inconsistent archive. No dates in the article are guessed as effective or expiry dates; an old open-ended detour is not silently discarded or certified as active. Image/embedded material is disclosed as unparsed. These are text extracts, not a transcription of every visual.

The optional route filter matches explicit route mentions, not stop/street numbers or substrings (Route 1 does not match 11). It is not a route catalog, route recommendation, or map overlay. Range, truncated, and media-containing posts retain unknown route relevance. Title-worded service posts with unknown routes remain visible; other posts such as meetings and surveys are separate, not labeled bus disruptions. The filter is saved only in this browser and never changes or gets sent with the walking journey.

RTS checks run every **15 seconds while the home page is visible and online**, with a 10-second warm-process cache, a 5-second shared CDN cache, in-flight coalescing, a 22-second source deadline, and failure backoff. There is no zero-delay guarantee or globally coordinated polling cap. RTS must publish first. Failed/over-age checks preserve earlier posts marked stale; removal is not proof of restored service. Meaningful changes create visible and polite screen-reader status notifications while preserving expanded text and keyboard focus. No background push, SMS, tracking, or automatic audio is implemented.

Choose **Listen to RTS updates**, or ask **“bus alerts”**, **“bus alerts for route eleven”**, or **“read bus alerts”**. Typed questions stay silent unless read-aloud is explicitly requested. Spoken requests remain opt-in through the existing voice controls. The latest RTS snapshot is used, without requiring a walking briefing; pending walking proposals still require confirmation/cancellation. A separate link opens the [official RTS predictions page](https://go-rts.com/rts-bus-prediction/). This integration does **not** supply live vehicle positions or ETAs. See [TRANSIT-QA.md](TRANSIT-QA.md).

### Run, verify, and reproduce

Run `npm install`, `npm run dev`, and open http://127.0.0.1:5194/. The landing is at `/welcome` (also `/welcome.html`), and the separate archive is at `/explorer.html`. Vite development/preview middleware and a Vercel rewrite resolve `/welcome`. The middleware provides `/api/environment`, `/api/closures`, and `/api/transit`; production uses matching Vercel functions. A static file server alone cannot supply live weather and notices. Sources require network access but no API key. `npm run build` creates all three page entries.

Run `npm test`, `npm run check:journeys`, `node tools/check-journey-data.mjs --live`, `npm run build`, and `npm run verify:build`. See [JOURNEY-QA.md](JOURNEY-QA.md) for actual verification and untested boundaries. The build guard continues to prevent a development Google Maps key or loader from entering production.

`tools/prepare-journeys.mjs` creates the bounded OSM snapshot with source, retrieval time, attribution, and stripped contributor metadata. `tools/prepare-campus-satellite.py` derives the campus raster from the existing dated satellite scene, with its STAC scaling and classification mask; it uses the existing Python geospatial dependencies described below. Missing raster pixels remain null. Neither preparation script runs in visitors' browsers.

### Product boundary

This is **preparation, not navigation or obstacle detection**. It has not been tested with blind/low-vision participants or orientation-and-mobility professionals. Automated accessibility checks do not establish usability or safe travel. Contemporary sidewalk conditions, entrance accessibility, and user-designed sensory descriptions are still missing. No cane-tip or grip modifications are recommended.

### Voice-assisted pilot (initial browser-only release, September 20, 2026)

Tap **Talk** to request browser microphone access, then say “From Reitz Union to Marston tomorrow at eight A M.” FieldLens reads back a proposal and does not change the form or request journey conditions until **Confirm trip** is selected or a separate tapped voice request says “confirm”. Missing places, day, time, and A M/P M produce clarification prompts. A new full route does not inherit an old proposal’s hidden date/time. Voice duration uses the form’s displayed value unless supplied explicitly; the confirmation identifies that default.

Supported commands include `explain rain`, `weather`, `wind`, `closures`, `surroundings`, `what is unknown`, `read briefing`, `repeat`, `cancel`, and `stop`. Answers are deterministic summaries of the prepared briefing, not generated environmental facts. Condition questions reject briefings older than 15 minutes or whose departure has passed. Unsupported questions, destinations, dates, time zones, and ambiguous alternatives require restatement or the form.

Speech input uses browser `SpeechRecognition` / `webkitSpeechRecognition`; availability and accuracy depend on browser/provider. No new paid service or API key is required. The provider may process audio remotely. FieldLens does not save recordings or transcripts, and sends neither to its own server. Each session ends after one recognized request, error, stop, Escape, page hide, or 20-second timeout. It never restarts itself. Output uses chunked browser speech synthesis with stale-callback cancellation. Transcripts/replies are plain text; the typed request and original form remain available without a microphone.

Read [VOICE-QA.md](VOICE-QA.md) for test scope. Simulated speech-service events test the interface boundary; they are not evidence of real-microphone accuracy, audio quality, or usability with blind/low-vision participants.

Browser API references: [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).

### ElevenLabs speech integration

**Current verification (September 20, 2026):** after the owner replaced the rejected credential, production speech generation and transcription both returned HTTP 200. The replacement is stored under `ELEVENLABS_API`, which the server now accepts. Testing used synthetic speech, not a human microphone; it misrecognized "Reitz Union" as "Wright's Union," so place-name accuracy still needs user testing. Browser voice and the typed/form workflow remain available.

The voice-service selector adds ElevenLabs listening and narration while retaining Browser voice and text/form fallbacks. Set the **server-only** `ELEVENLABS_API` in Vercel Production (and optionally Preview). Existing `ELEVENLAB_API_KEY` and `ELEVENLABS_API_KEY` names remain accepted and take precedence; set only one to avoid using a stale credential. Do not use a `VITE_` prefix. The app's configuration check exposes only availability, not credentials or whether the key is valid. Local development can read the same variable from ignored `.env.local`. Set `FIELDLENS_ELEVENLABS_DISABLED=1` server-side to disable the provider on a subsequent deployment.

- **Listening:** Web Audio captures a mono recording only after Talk and microphone permission. Pause after speaking or press Finish speaking. The microphone stops before upload; Stop/Escape/page hide discards pending audio and cancels pending requests. Maximum recording length is 20 seconds. Silence is not uploaded. A bounded 16 kHz PCM WAV is transcribed with ElevenLabs Scribe v2. No API key or reusable provider token is sent to the browser.
- **Speaking:** replies and data-based map/surroundings descriptions are segmented and narrated using ElevenLabs Flash v2.5 with a fixed default voice. Playback speed follows Reading preferences. Failure or quota exhaustion uses browser narration for the remaining text, with an explanation. Very long briefings use browser narration to conserve credits. Speech errors do not remove the visible answer.
- **Boundaries:** this is still a deterministic command assistant, not open-ended conversation, live camera interpretation, navigation, or obstacle detection. Transcriptions must pass the existing intent parser; trips still need explicit confirmation. It does not claim that speech recognition is accurate for every user or that environmental data establishes safe travel.
- **Privacy:** recording, transcript, and speech text are processed transiently by FieldLens and ElevenLabs. FieldLens does not persist them. ElevenLabs may log/retain them under its policies; its free plan does not provide zero retention. No voice cloning, speaker identification, geolocation, analytics, or background recording is added. Browser fallback providers may also process speech remotely.
- **Usage controls:** `/api/voice` accepts same-origin JSON only, allowlists the provider/model/voice, validates audio headers/duration, caps each speech segment at 1,200 characters, and sanitizes provider errors. Process-local throttling adds a 40-request/18,000-character budget per IP per 10 minutes. The project's active Vercel WAF rule limits only POST `/api/voice` to 30 requests/minute/IP across instances within each region. Neither control guarantees a global spend cap: also set an ElevenLabs key usage cap, and do not enable auto top-up unintentionally. This is an anonymous demo, not an authenticated production voice service.

Use noncommercially under the free plan with the visible elevenlabs.io attribution. Commercial use requires appropriate licensing. See [ElevenLabs TTS](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [STT](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [publishing terms](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform), and [privacy policy](https://elevenlabs.io/privacy-policy). See [ELEVENLABS-QA.md](ELEVENLABS-QA.md) for actual checks and limitations.

## Earlier Lake Alice landscape explorer

A working environmental field-study prototype of **Lake Alice, Gainesville, Florida** for the CityCamp NASA and Environmental Data Track. For Gainesville students and curious neighbors: explore a real landscape, compare dated satellite evidence, and record what you can—and cannot—conclude.

**Live demo:** https://fieldlens-pi.vercel.app/

## Deployment

The GitHub repository is [jiexiY/FieldLens](https://github.com/jiexiY/FieldLens). Vercel's existing `fieldlens` project is connected to its `main` production branch. Pushes to `main` trigger a production build; other branches can produce preview deployments. Saving local files alone does not publish them.

Before publishing, run `npm test`, `npm run check:journeys`, `npm run build`, and `npm run verify:build`. Review `git status` and the staged diff, commit the intended changes, then run `git push origin main`. Pull and reconcile any remote changes before pushing; do not force-push over collaborators' work. Check the resulting Vercel deployment and live site after the push.

Keep credentials in Vercel's project environment variables, not GitHub. `.gitignore` excludes local environment files (except the empty `.env.example` template), dependency/build folders, raw caches, browser-session artifacts, and QA outputs. `vercel.json` selects Vite and the `dist/` build output; `.vercelignore` excludes local tools and development artifacts from deployment uploads. `vercel --prod` remains a manual fallback, not the normal Git-based publishing workflow.

See `QA.md` for the refinement verification record and the distinction between the public LiDAR release and local Google 3D preview.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5194. `npm run build` creates a static `dist/` site; `npm run preview` serves the build on the same port (stop the dev server first). The bundled dataset works without API keys or runtime geospatial services. Google Fonts is optional; system fallback fonts work offline.

## What's implemented

### Local photorealistic 3D preview (not deployed)

The local development server can now stream Lake Alice's Google photorealistic 3D scene while retaining the same viewpoint, photo, Show 3D / Show photo, tour, fly-navigation, and evidence workflow. A source switch preserves the archived LiDAR; selecting its dated observation automatically opens that scan. Google imagery is undated context here, never the source of NDVI/NDWI calculations.

Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_MAPS_DEMO_KEY` to an authorized Google Maps demo key. The local key is ignored by Git and Vercel uploads. This integration is gated by `import.meta.env.DEV`: production builds do not use the demo key. The published Vercel version remains the LiDAR-based version above. Production Google Maps integration requires a separately authorized production project/key and billing setup; demo keys prohibit production use.

The SDK renders and attributes its own imagery. FieldLens does not download Google geometry/tiles, cache imagery, or export Google screenshot thumbnails. The four viewpoint cards use distinct independent NAIP locator crops, explicitly labeled `NAIP LOCATOR`. Native map attribution stays unobscured. Google terrain anchors photo markers at an illustrative height; neither their height nor orientation is calibrated. WASD pans relative to the current heading; QE moves the target altitude while Fly is on. Network/SDK failure is visibly reported before falling back to LiDAR.

Implementation: `src/google-landscape.js` (SDK adapter), `src/google-camera.js` (testable geographic camera conversion). [Google SDK documentation](https://developers.google.com/maps/documentation/javascript/reference/3d-map), [demo terms](https://cloud.google.com/terms/maps-platform/demo-project-terms).

### Key-free explorer

- A dark, scene-first explorer with a persistent evidence sidebar and one shared strip for 3D viewpoints and photographs.
- A 650,000-point real LiDAR scene, orbit/zoom/pan, WASD/QE free flight, four camera viewpoints, guided tour, top-down view, and expanded scene mode.
- In-scene photo camera pins and full-frame overlays with Show 3D / Show photo, Back to scene, and Escape. Returning restores the pre-photo camera pose; related 3D views are explicitly not camera-calibrated.
- A georeferenced USGS NAIP Plus aerial image; its RGB colors also color the point cloud.
- Sentinel-2 natural color, NDVI and NDWI for **21 March 2024** and **22 September 2024**.
- An Explore → Compare → Record learning path, readable evidence sidebar, numbered viewpoint/photo strip, and responsive mobile layout.
- A directly draggable, keyboard-accessible comparison divider; geographic pixel selection; same-location March/September NDVI and NDWI values and differences; and scientifically matched color legends.
- A personal field notebook with observation, interpretation and uncertainty fields. Draft text **and its attached evidence** survive reloads. Saved entries export to Markdown with measurements, dates, links and limitations—not canned notes.
- Four authentic, attributed Lake Alice ground photographs with a full-frame viewer, keyboard navigation, photo-specific field notes, and contributor-reported camera positions on the aerial map.
- Sources, capture dates, curriculum method and limitations inside the app.
- A dated observation log that opens the corresponding instrument, photograph or satellite acquisition without pretending they form a synchronized time series.
- Responsive layout, labeled controls, keyboard photo navigation, and a source-photo fallback when WebGL fails.

The application entrypoint is `src/workbench.js`, with styling in `src/workbench.css` and `src/refinement.css`, the Three.js renderer in `src/landscape.js`, testable view/evidence transitions in `src/study.js`, scientific readouts in `src/evidence.js`, and persistence/export logic in `src/notebook.js`. The earlier `main.js`, `style.css`, and `photos.css` are retained as unused legacy files.

## A three-minute learning workflow

1. **Explore:** orbit the scene or choose a viewpoint; open a photograph. Use Show 3D / Show photo and Back to scene to compare independent context. The photos did not produce the geometry.
2. **Compare:** select a numbered study point or any map pixel. Drag the divider between the two satellite dates, switch NDVI/NDWI, and read both dates at the exact same location. Expand the index formula when needed. A difference is not proof of a trend or cause.
3. **Record:** write an observation, interpretation, and uncertainty. Evidence is frozen when you start writing; “Use current view as evidence” explicitly replaces it. Save and export the notebook. Notes stay only in this browser and origin, are not synchronized or submitted, and can be lost if browser storage is cleared. Export a copy to keep your work.

The notebook supports 50 saved entries and 3,000 characters per field. If storage is blocked or unreadable, the app warns you and retains new work only in memory rather than overwriting unreadable data. Keep one editing tab open to avoid competing notebook changes.

## Curriculum use

**EMERGE Textbook 1, Chapter 3, Lesson 3: [Vegetation & Water Indices](https://geo-di-lab.github.io/emerge-lessons/docs/ch3/lesson3.html).**

The preparation script implements the lesson's equations:

```
NDVI = (NIR - red) / (NIR + red) = (B08 - B04) / (B08 + B04)
NDWI = (green - NIR) / (green + NIR) = (B03 - B08) / (B03 + B08)
```

This adaptation uses a bounded Lake Alice extent and two individual dated L2A scenes instead of the lesson's temporal median. Bands are converted to reflectance using the **Collection 1** STAC asset scale/offset. SCL classes 4/5/6/7 are retained; no-data, saturated/defective, cloud shadow, cloud/cirrus and snow are masked. SCL source resolution is 20 m, spectral bands 10 m. Nearest-neighbor reprojection aligns the display to Web Mercator; the 128 × 100 display does not increase the source resolution. Residual clouds, mixed pixels and classification errors remain possible.

The legacy `sentinel-2-l2a` catalog was rejected during development because its offset metadata and pre-applied offsets were inconsistent for the sampled data. The final output uses `sentinel-2-c1-l2a` and has independent index/alignment checks.

**geoemerge is not used. GLOBE observation records are not used.** The track permits other public environmental data combined with a curriculum. Viewpoint pins are authored learning locations, not citizen-science measurements.

## Sources and credit

### Ground photograph archive

The **Source photos** mode contains actual photographs, not generated images or inputs to the 3D scan. They were discovered and inspected in Chrome on Wikimedia Commons. [Full credits](public/photos/CREDITS.md) are bundled with the site and displayed in the viewer and Sources & method dialog.

- **Water at eye level:** Michael Rivera, August 6, 2026.
- **Where forest meets water, Inside the canopy, Light changes the lake:** Alexander Abair, November 11, 2022.
- All four are **CC BY 4.0**. The app bundles Wikimedia's 1280-pixel previews without additional image edits; thumbnail cards crop the display, while the main viewer preserves the full frame.
- The manifest in `src/photos.json` records original titles, source/download URLs, dates, authors, licenses, and published camera coordinates. Coordinates identify the reported camera position, not a surveyed point or a verified viewing direction. Related 3D views are thematic, not exact camera matches.
- Photo mode hides satellite metrics so a photograph is not misleadingly paired with an unrelated viewpoint's numerical measurement. Switching dates in the satellite view does not update these photographs.

Run `npm test` to validate photo metadata, JPEG files, payload size, coordinate transforms, scene/photo/evidence transitions, same-pixel calculations, legends, and notebook persistence/export. Run `npm run build` followed by `npm run verify:build` to verify the production bundle excludes demo credentials and the Google demo SDK. The four images together are approximately 1.6 MB.

| Layer | Source | Time and interpretation |
| --- | --- | --- |
| LiDAR geometry | [USGS 3DEP Alachua County](https://portal.opentopography.org/usgsDataset?dsid=FL_Peninsular_FDEM_Alachua_2018), [EPT dataset](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/FL_Peninsular_FDEM_Alachua_2018/ept.json), [NOAA metadata](https://www.fisheries.noaa.gov/inport/item/69496/full-list) | Survey Dec 2018–Dec 2019; deterministic display subsample. No vertical exaggeration. |
| Aerial RGB | [USGS NAIP Plus / USDA](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer) | Center tile acquired 26 Jan 2023; mosaic dates may vary. Color is projected from overhead onto older LiDAR geometry. |
| Satellite reflectance | Copernicus Sentinel-2 L2A Collection 1, distributed through [Element 84 Earth Search](https://earth-search.aws.element84.com/v1) | 21 Mar and 22 Sep 2024. Per-scene STAC URLs and asset metadata are in `public/data/satellite.json`. |
| Curriculum | [GeoDI Lab / EMERGE](https://geo-di-lab.github.io/emerge-lessons/docs/ch3/lesson3.html) | Band-ratio method and explanatory learning approach. |
| Local context | [UF Lake Alice Watershed Management Plan overview](https://facilities.ufl.edu/lakealice/about/project-overview/) | Context about the lake and campus stormwater system; no current water-quality claims are made. |

Visualization uses Three.js (MIT), Vite (MIT) and OrbitControls from Three.js. Data preparation uses NumPy, Pillow, laspy/lazrs, rasterio and pyproj. The layout and interaction pattern follow Bilawal Sidhu's [Flight 7598 reconstruction](https://x.com/bilawalsidhu/status/2097881148164886889), with environmental layers and dated source records replacing flight-specific evidence. The implementation is independent; no reference-site code, branding, or media is reused.

## Reproduce the data

The ready-to-run app includes prepared data. For independent reproduction, use Python 3.12, install NumPy and Pillow plus `tools/requirements.txt`, then:

```sh
python tools/prepare_data.py
python tools/validate_data.py
```

`python tools/prepare_data.py lidar`, `aerial`, or `satellite` refreshes a specific layer. Downloads are cached under `data-cache/` (excluded from the application and distribution). The script extracts only intersecting EPT nodes through depth 10, filters noise classes, and uses random seed 42 to select 650,000 points for browser display. Display point density is not an environmental statistic. The local horizontal axes approximate ground metres by scaling Web Mercator with cosine of the center latitude. This is an educational viewer, not a survey measurement tool.

The LiDAR file is little-endian float32 records of `[east, elevation-originZ, south, LAS classification]`. The original source CRS, local scale, elevation origin, dataset URL and counts are in `public/data/lidar.json`. Aerial export extents and center-point catalog metadata are in `public/data/aerial.json`. Raw scientific inputs are cached separately so indices can be recomputed and checked rather than compared to the implementation's display alone.

## Limits and next work

- This is a **LiDAR scene**, not a Gaussian-splat reconstruction. A field-captured, georeferenced photogrammetric or Gaussian-splat scene could replace or accompany it after suitable imagery is acquired.
- The flat aerial image under the points is context, not reconstructed water geometry or bathymetry. Water has relatively few laser returns.
- Geometry, aerial RGB and satellite observations were captured at different times. Switching satellite dates does not animate historical 3D geometry.
- Ground photographs date to 2022 and 2026 and are separate contextual observations. Photo metadata is credited to its contributors; no photographer endorsement is implied.
- NDVI/NDWI do not measure water quality, disease risk, water depth, or causal environmental change. Two dates do not establish a trend.
- A tightly cropped scene, downloadable data and provenance make it practical to adapt the workflow to another school or community site.
- The demo is publicly hosted on Vercel. Devpost submission has not been performed.

This prototype is independently built and is not an official NASA, USGS, USDA, UF or EMERGE product.

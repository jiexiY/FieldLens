# FieldLens refinement acceptance criteria

Goal: refine FieldLens into a credible, polished environmental learning explorer, preserving the requested scene-first reference workflow and real Lake Alice 3D.

## Product and evidence

- A Gainesville learner can answer: how do water and tree cover differ at satellite-pixel scale, and what can these observations not tell us?
- Explore a real 3D landscape, inspect independent ground photographs, compare dated satellite measurements, and record/export a personal observation.
- Keep the reference's scene-first layout, shared viewpoint/photo strip, persistent evidence panel, Show 3D/Show photo, return-to-scene, and camera controls.
- Name EMERGE Textbook 1, Chapter 3, Lesson 3 and link its method. Explain NDVI/NDWI without unsupported water-quality, health, or trend claims.
- Distinguish undated Google 3D, 2018–19 LiDAR, 2023 aerial color, 2022/2026 ground photos, and the two 2024 satellite dates.

## Refinements and verification gates

1. Improve visual hierarchy, readable type, responsive sizing, navigation thumbnails, and discoverability. Verify desktop and narrow-screen layouts in Chrome.
2. Add a real local field notebook: evidence-linked observations, interpretation, uncertainty, persistent drafts/entries, honest storage status, and an export containing the user's work. Unit-test validation, storage failures, and Markdown output; verify save/reload/export UI.
3. Make satellite inspection useful: a visible selected pixel, coordinates, two-date values/difference at the same location, exact color ramps, a direct draggable comparison divider, scale, and no-data handling. Validate against the prepared grids and original cached band data.
4. Keep scene, photograph, data-source, keyboard and archive workflows reliable. Verify controls and source attribution in Chrome.
5. Preserve credential isolation. A demo key must never be published or bundled in production. Verify production build and browser behavior independently.
6. Document reproduction and limitations. Do not present a deployment as complete unless the actual published version is verified. Google production 3D remains a separate authorization/key/billing gate.

Track requirements were re-read from the user-supplied Google Doc on September 19, 2026. They allow other public environmental data plus at least one EMERGE curriculum and emphasize public usability, correct method, reproducibility, and clear communication. The X reference tab failed to respond during this audit, so the established interaction pattern is retained rather than claiming a fresh pixel-by-pixel comparison.

## Completion audit

All six refinement gates are satisfied within the authorized scope. The key-free release is deployed and verified in Chrome; the actual Google photorealistic local preview and source switch are retained. `QA.md` records 25 passing tests, independent source-data checks, desktop/mobile browser checks, saved-draft/evidence retention, a verified downloaded notebook and production credential exclusion. Public Google photorealistic hosting is intentionally not part of this release: it still requires separately authorized production credentials and billing. No such access or spending was enabled.

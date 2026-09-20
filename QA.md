# Refinement verification — September 19, 2026

## Verified locally

- 25 automated tests pass: photo files/credits, coordinate conversion, scene/photo/log transitions, same-cell satellite comparison, exact color ramps, no-data handling, notebook persistence/validation/export, and draft evidence retention across reloads.
- Production Vite build passes. `npm run verify:build` confirms no Google API credential, demo SDK loader, or Google adapter chunk in the build.
- `tools/validate_data.py` passes against the cached scientific inputs: LiDAR geometry/provenance, satellite quality masks, band ratios, rounding and land/water alignment.
- Chrome desktop: actual Google photorealistic Lake Alice scene renders with native attribution; native photo marker opens the real photograph; Show 3D / Show photo, Escape, and the LiDAR observation-log source switch work.
- Key-free production preview: actual LiDAR geometry renders. Map divider responds to drag, Home/End and arrow keys. Selecting an arbitrary pixel updates coordinates and both dates' values.
- Notebook tested on the isolated preview origin `127.0.0.1:5195`, not the user's main local origin: all three draft fields survive reload; the frozen satellite source remains attached after returning to the default 3D scene; saving and reloading retain the entry. The downloaded Markdown file was read and contains the exact test observation, both dates' measurements, original source links and limitations. The browser automation download event timed out, but the actual file download succeeded and was independently inspected.
- Chrome 390 × 844 viewport override: stacked explorer, map, comparison controls and notebook are readable with no horizontal document overflow. The map legend now occupies its own area below the map; the north arrow no longer overlaps acquisition dates. Override reset after QA.
- No console errors/warnings in the production-preview tab during these checks.

## Boundaries

- Google photorealistic 3D remains local development only. Publishing it requires a separately authorized production project/key and billing setup. No billing was enabled; no demo credential was deployed.
- The existing X reference tab was unavailable during the refinement audit. The previously established scene-first design and photo/3D workflow were preserved; no new pixel-exact reference comparison is claimed.
- Storage-denied and corrupted-data paths are unit-tested, not simulated through the browser. The persistent 3D failure/retry UI was added and build-checked; network/WebGL failures were not injected in live Chrome.
- Notes are browser-origin-local, not synchronized. Use one editing tab and export work. There is no notebook import, editing of saved entries, or multi-user collaboration in this MVP.
- This is a prototype review, not a complete accessibility, security, performance, or hackathon-eligibility audit. Nothing has been submitted to Devpost.

## Public deployment

Published to https://fieldlens-pi.vercel.app/ on September 19, 2026. Vercel deployment `dpl_AU4AbEH8DTjNJuxKdzBgBZNkihsP` reports READY and is aliased to the public URL.

- Public homepage, JavaScript bundle and satellite metadata return HTTP 200 without authentication.
- Public JavaScript `index-Cy0gZzbR.js` contains the new notebook and excludes Google credential patterns and the demo SDK loader.
- Chrome on the actual public URL renders the real LiDAR point cloud, distinct scene thumbnails and real photographs. Photo → Show 3D → Back to scene, satellite comparison with two-date values, and the empty notebook UI were checked. No QA notes were saved into the public origin.
- No public-tab console errors/warnings appeared during verification.
- The public version deliberately uses USGS LiDAR. The Google photorealistic preview remains available only at the local development server; it was not silently substituted or claimed as deployed.

# RealLens — environmental track mapping

Track brief checked September 20, 2026: https://docs.google.com/document/d/1zf7r201C5OsDHg4KvRnlDZecPiJLlZESLt7fMCrVpwA/edit?tab=t.0

The brief requires NASA-supported GLOBE Observer **or other public environmental data**, plus a named EMERGE curriculum. Sentinel is explicitly suggested. GLOBE Observer and geoemerge are not used.

| Requirement | Real implementation |
| --- | --- |
| Defined community question | Help blind and low-vision UF-campus travelers understand environmental context before leaving, without needing to interpret a map. |
| Public environmental data | Copernicus Sentinel-2 L2A scene dated September 22, 2024; NOAA/NWS forecast and alerts. See /sources and public/data/campus-vegetation.json. |
| EMERGE curriculum | Textbook 1: Data Analysis, Chapter 3, Lesson 3: Vegetation & Water Indices: https://geo-di-lab.github.io/emerge-lessons/docs/ch3/lesson3.html |
| Actual analysis | NDVI=(B8-B4)/(B8+B4), STAC scale/offset, SCL 4/5/6/7 mask, length-weighted samples over thirds of an OSM study line. Missing pixels remain missing. |
| Explicit adaptation | One dated scene, not the lesson's temporal median. Descriptive bins, not validated land-cover classes. Historical vegetation is not current shade or path accessibility. |
| Explore the resource | / opens introduction; /demo opens the white welcome; /welcome has four actions, each opening a separate page. /conditions displays actual per-journey analysis. |
| Reproduce and credit | README setup/dependencies, tools/prepare-campus-satellite.py, tools/prepare-journeys.mjs, tools/check-journey-data.mjs, bundled metadata; attribution on /sources. |
| Public information beyond the method | UF closure notices/polygons and RTS rider posts. These support the journey, but RTS alerts alone would not satisfy the environmental-data requirement. |

Run npm test, npm run check:journeys, npm run build, npm run verify:build. Unit and browser checks do not establish blind-user usability, real VoiceOver/NVDA behavior, microphone accuracy, or safe travel.

No affiliation or endorsement from data providers is claimed. No competition submission or eligibility determination is performed by this mapping.

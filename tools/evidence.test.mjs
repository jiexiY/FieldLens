import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  sampleGrid,
  pointEvidence,
  numberLabel,
  changeLabel,
  clampSwipe,
  LAYERS,
  locatorBox,
} from "../src/evidence.js";
import { views } from "../src/study.js";
const grids = Object.fromEntries(
  ["spring", "autumn"].map((season) => [
    season,
    JSON.parse(
      readFileSync(
        new URL(`../public/data/${season}-grid.json`, import.meta.url),
      ),
    ),
  ]),
);

test("same-point comparison reads the exact bundled display cells", () => {
  for (const view of views) {
    const x = view.position[0],
      z = view.position[2],
      col = Math.floor((x / 1000 + 0.5) * 128),
      row = Math.floor((z / 780 + 0.5) * 100);
    const result = pointEvidence({ grids }, { x, z });
    assert.equal(result.spring.ndvi, grids.spring.ndvi[row][col]);
    assert.equal(result.autumn.ndwi, grids.autumn.ndwi[row][col]);
    assert.ok(
      Math.abs(
        result.change.ndvi -
          (grids.autumn.ndvi[row][col] - grids.spring.ndvi[row][col]),
      ) < 1e-12,
    );
  }
});
test("outside-footprint and absent data are not clamped into fabricated observations", () => {
  for (const [x, z] of [
    [501, 0],
    [0, -391],
    [NaN, 0],
  ])
    assert.equal(sampleGrid(grids.spring, x, z), null);
  assert.equal(sampleGrid(null, 0, 0), null);
  assert.equal(pointEvidence(null, { x: 0, z: 0 }).change.ndvi, null);
  assert.equal(numberLabel(null), "No data");
  assert.equal(numberLabel(0), "0.00");
  assert.equal(changeLabel(null), "—");
  assert.equal(changeLabel(0.07), "+0.07");
  const grid = { width: 1, height: 1, ndvi: [[null]], ndwi: [[0.3]] };
  assert.equal(
    pointEvidence({ grids: { spring: grid, autumn: grid } }, { x: 0, z: 0 })
      .change.ndvi,
    null,
  );
});
test("exact image bounds and slider endpoints are safe", () => {
  assert.equal(sampleGrid(grids.spring, 500, 390).col, 127);
  assert.equal(sampleGrid(grids.spring, 500, 390).row, 99);
  assert.equal(sampleGrid(grids.spring, -500, -390).col, 0);
  assert.equal(clampSwipe(-10), 0);
  assert.equal(clampSwipe(120), 100);
  assert.equal(clampSwipe("bad"), 50);
});
test("legends preserve the non-uniform value stops in prepare_data.py", () => {
  assert.ok(LAYERS.ndvi.gradient.includes("#b6a77c 50%"));
  assert.ok(LAYERS.ndvi.gradient.includes("#adbd76 65%"));
  assert.ok(LAYERS.ndvi.gradient.includes("#508245 80%"));
  assert.ok(LAYERS.ndwi.gradient.includes("#7c927a 35%"));
  assert.ok(LAYERS.ndwi.gradient.includes("#5496a3 50%"));
  assert.ok(LAYERS.ndwi.gradient.includes("#287da8 65%"));
});
test("locator thumbnails are distinct, bounded, and contain their study point", () => {
  const boxes = views.map(locatorBox);
  assert.equal(new Set(boxes.map((box) => JSON.stringify(box))).size, 4);
  boxes.forEach((box, i) => {
    const [x, , z] = views[i].position;
    assert.ok(box.x >= 0 && box.y >= 0);
    assert.ok(box.x + box.width <= 1000.001 && box.y + box.height <= 780.001);
    assert.ok(x + 500 >= box.x && x + 500 <= box.x + box.width);
    assert.ok(z + 390 >= box.y && z + 390 <= box.y + box.height);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { photoMapPosition } from '../src/photo-location.js';

const photos = JSON.parse(readFileSync(new URL('../src/photos.json', import.meta.url)));
test('four distinct, attributed Lake Alice photographs', () => {
  assert.equal(photos.length, 4);
  assert.equal(new Set(photos.map(p => p.id)).size, 4);
  for (const p of photos) {
    assert.ok(['Michael Rivera', 'Alexander Abair'].includes(p.author));
    assert.equal(new URL(p.source).hostname, 'commons.wikimedia.org');
    assert.equal(p.license, 'CC BY 4.0');
    assert.equal(p.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
    assert.ok(/^202[26]-\d{2}-\d{2}$/.test(p.date));
    assert.ok(p.alt && p.caption && p.question && p.insight);
    assert.ok(p.relatedView >= 0 && p.relatedView < 4);
  }
});
test('bundled files are actual JPEG images, not error pages', () => {
  let bytes = 0;
  for (const p of photos) {
    const file = readFileSync(new URL(`../public/photos/${p.file}`, import.meta.url));
    assert.equal(file.readUInt16BE(0), 0xffd8);
    assert.equal(file.readUInt16BE(file.length - 2), 0xffd9);
    assert.ok(file.length > 100000);
    bytes += file.length;
  }
  assert.ok(bytes < 2000000, 'Keep the ground archive below 2 MB');
});
test('all reported camera positions lie inside the study extent', () => {
  for (const p of photos) {
    const {left, top} = photoMapPosition(p);
    assert.ok(left >= 0 && left <= 100, `${p.id}: longitude outside extent`);
    assert.ok(top >= 0 && top <= 100, `${p.id}: latitude outside extent`);
  }
});
test('camera projection matches map origin and north/east directions', () => {
  assert.deepEqual(photoMapPosition({latitude:29.642,longitude:-82.363}), {left:50,top:50});
  assert.ok(photoMapPosition({latitude:29.643,longitude:-82.363}).top < 50);
  assert.ok(photoMapPosition({latitude:29.642,longitude:-82.362}).left > 50);
  const actual = photoMapPosition(photos[0]);
  assert.ok(Math.abs(actual.left - 45.36) < 0.02);
  assert.ok(Math.abs(actual.top - 44.86) < 0.02);
});

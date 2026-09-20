import test from 'node:test';
import assert from 'node:assert/strict';
import { localToGeographic, googleCamera, moveGoogleCamera } from '../src/google-camera.js';
import { photoMapPosition } from '../src/photo-location.js';
import { views } from '../src/study.js';

test('local-to-geographic conversion inverts the shared photo map projection', () => {
  for (const [x, y, z] of [[0,0,0],[400,20,300],[-450,5,-310]]) {
    const point = localToGeographic([x,y,z]);
    const map = photoMapPosition({ latitude: point.lat, longitude: point.lng });
    assert.ok(Math.abs((map.left / 100 - .5) * 1000 - x) < .001);
    assert.ok(Math.abs((map.top / 100 - .5) * 780 - z) < .001);
    assert.equal(point.altitude, 18.32 + y);
  }
});

test('all authored views produce finite geographic cameras', () => {
  for (const view of views) {
    const camera = googleCamera(view);
    assert.ok(camera.range > 10 && camera.range < 1500);
    assert.ok(camera.tilt >= 0 && camera.tilt < 90);
    assert.ok(camera.heading >= 0 && camera.heading < 360);
    assert.ok(Math.abs(camera.center.lat - 29.642) < .01);
  }
  const north = googleCamera({camera:[0,100,100],target:[0,0,0]});
  assert.equal(north.heading, 0);
  assert.equal(north.tilt, 45);
  assert.equal(googleCamera({camera:[-100,100,0],target:[0,0,0]}).heading,90);
});

test('a captured Google camera can be restored without converting it again', () => {
  const pose = googleCamera(views[1]);
  assert.deepEqual(googleCamera(pose), pose);
  assert.notEqual(googleCamera(pose).center, pose.center);
});

test('fly controls are heading-relative, bounded, and diagonally normalized', () => {
  const pose = {...googleCamera(views[0]), heading:0};
  const forward = moveGoogleCamera(pose, new Set(['w']), 1);
  assert.ok(forward.center.lat > pose.center.lat);
  assert.equal(forward.center.lng, pose.center.lng);
  const east = moveGoogleCamera({...pose, heading:90},new Set(['w']),1);
  assert.ok(east.center.lng > pose.center.lng);
  const up = moveGoogleCamera(pose,new Set(['e','shift']),1);
  assert.equal(up.center.altitude, pose.center.altitude + 240);
  const down = moveGoogleCamera(pose,new Set(['q']),100);
  assert.equal(down.center.altitude,18.32);
});

// The same local, ground-metre coordinate system used by the archived LiDAR.
const R = 6378137;
const RAD = Math.PI / 180;
const ORIGIN = { lat: 29.642, lng: -82.363, altitude: 18.32 };
const SCALE = Math.cos(ORIGIN.lat * RAD);
const ORIGIN_Y = R * Math.log(Math.tan(Math.PI / 4 + ORIGIN.lat * RAD / 2));

export function localToGeographic([east, up, south]) {
  return {
    lat: (2 * Math.atan(Math.exp((ORIGIN_Y - south / SCALE) / R)) - Math.PI / 2) / RAD,
    lng: ORIGIN.lng + east / (R * RAD * SCALE),
    altitude: ORIGIN.altitude + up,
  };
}

export function googleCamera(view) {
  if (view.center) return { ...view, center: { ...view.center } };
  const [x, y, z] = view.camera.map((value, i) => value - view.target[i]);
  return {
    center: localToGeographic(view.target),
    range: Math.hypot(x, y, z),
    tilt: Math.atan2(Math.hypot(x, z), y) / RAD,
    heading: (Math.atan2(-x, z) / RAD + 360) % 360,
  };
}

export function moveGoogleCamera(camera, keys, seconds) {
  const speed = seconds * 80 * (keys.has('shift') ? 3 : 1);
  const heading = camera.heading * RAD;
  const forward = Number(keys.has('w')) - Number(keys.has('s'));
  const right = Number(keys.has('d')) - Number(keys.has('a'));
  const length = Math.max(1, Math.hypot(forward, right));
  const east = (Math.sin(heading) * forward + Math.cos(heading) * right) * speed / length;
  const north = (Math.cos(heading) * forward - Math.sin(heading) * right) * speed / length;
  return {
    ...camera,
    center: {
      lat: Math.max(29.628, Math.min(29.656, camera.center.lat + north / (R * RAD))),
      lng: Math.max(-82.38, Math.min(-82.345, camera.center.lng + east / (R * RAD * SCALE))),
      altitude: Math.max(18.32, Math.min(500, camera.center.altitude + (Number(keys.has('e')) - Number(keys.has('q'))) * speed)),
    },
  };
}

// Match the LiDAR preparation pipeline's Web Mercator -> local ground-metre transform.
// This locates the contributor-reported camera, not the scene depicted in the photo.
export function photoMapPosition(photo) {
  const radius = 6378137;
  const originLatitude = 29.642;
  const originLongitude = -82.363;
  const radians = Math.PI / 180;
  const scale = Math.cos(originLatitude * radians);
  const mercator = latitude => radius * Math.log(Math.tan(Math.PI / 4 + latitude * radians / 2));
  const east = radius * (photo.longitude - originLongitude) * radians * scale;
  const south = -(mercator(photo.latitude) - mercator(originLatitude)) * scale;
  return {left: (east / 1000 + 0.5) * 100, top: (south / 780 + 0.5) * 100};
}

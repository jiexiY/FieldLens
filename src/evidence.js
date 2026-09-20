import { localToGeographic } from "./google-camera.js";

export const SEASONS = { spring: "21 Mar 2024", autumn: "22 Sep 2024" };
export const METHOD_URL =
  "https://geo-di-lab.github.io/emerge-lessons/docs/ch3/lesson3.html";
export const LAYERS = {
  ndvi: {
    name: "Vegetation · NDVI",
    title: "Read the vegetation signal",
    formula: "(near-infrared − red) / (near-infrared + red)",
    meaning:
      "Higher values often indicate more green vegetation. A pixel can also contain water, soil, and shade; this is not a tree count or a diagnosis of plant health.",
    low: "Low vegetation signal",
    high: "Higher vegetation signal",
    gradient:
      "linear-gradient(90deg,#264353 0%,#b6a77c 50%,#adbd76 65%,#508245 80%,#13412d 100%)",
  },
  ndwi: {
    name: "Water · NDWI",
    title: "Read the water signal",
    formula: "(green − near-infrared) / (green + near-infrared)",
    meaning:
      "Open water often has a higher value than leafy vegetation. Shade and mixed surfaces complicate the signal. This does not measure water quality, depth, or safety.",
    low: "Lower water signal",
    high: "Higher water signal",
    gradient:
      "linear-gradient(90deg,#c2b290 0%,#7c927a 35%,#5496a3 50%,#287da8 65%,#11346e 100%)",
  },
  rgb: {
    name: "Natural color",
    title: "See what one pixel contains",
    meaning:
      "Red, green, and blue reflectance are displayed as an image. Each source pixel covers about 10 × 10 metres; a shoreline pixel can combine several surfaces.",
  },
  aerial: {
    name: "Aerial context",
    title: "Locate the observation",
    meaning:
      "The NAIP aerial mosaic is a separate observation. Its center tile dates to 26 January 2023. It provides location context, not a synchronized photograph of either satellite date.",
  },
};

export function sampleGrid(grid, x, z) {
  if (
    !grid ||
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    x < -500 ||
    x > 500 ||
    z < -390 ||
    z > 390
  )
    return null;
  const col = Math.min(
    grid.width - 1,
    Math.floor((x / 1000 + 0.5) * grid.width),
  );
  const row = Math.min(
    grid.height - 1,
    Math.floor((z / 780 + 0.5) * grid.height),
  );
  return {
    ndvi: grid.ndvi[row]?.[col] ?? null,
    ndwi: grid.ndwi[row]?.[col] ?? null,
    col,
    row,
  };
}

export function pointEvidence(study, point) {
  const { lat, lng } = localToGeographic([point.x, 0, point.z]);
  const spring = sampleGrid(study?.grids.spring, point.x, point.z);
  const autumn = sampleGrid(study?.grids.autumn, point.x, point.z);
  const difference = (key) =>
    Number.isFinite(spring?.[key]) && Number.isFinite(autumn?.[key])
      ? autumn[key] - spring[key]
      : null;
  return {
    lat,
    lng,
    spring,
    autumn,
    change: { ndvi: difference("ndvi"), ndwi: difference("ndwi") },
  };
}

export const numberLabel = (value) =>
  Number.isFinite(value) ? value.toFixed(2) : "No data";
export const changeLabel = (value) =>
  Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value.toFixed(2)}` : "—";

export function clampSwipe(value) {
  return Number.isFinite(Number(value))
    ? Math.max(0, Math.min(100, Number(value)))
    : 50;
}

export function locatorBox(view, index) {
  const width = [1000, 580, 420, 680][index] ?? 600;
  const height = (width * 86) / 155;
  const centerX = Math.max(
    width / 2,
    Math.min(1000 - width / 2, view.position[0] + 500),
  );
  const centerY = Math.max(
    height / 2,
    Math.min(780 - height / 2, view.position[2] + 390),
  );
  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}

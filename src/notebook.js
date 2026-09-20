export const NOTEBOOK_KEY = "fieldlens.notebook.v1";
export const MAX_ENTRIES = 50;
const LIMIT = 3000;
const clean = (value) =>
  typeof value === "string" ? value.slice(0, LIMIT) : "";
export const emptyDraft = () => ({
  observation: "",
  interpretation: "",
  uncertainty: "",
});
const cleanDraft = (value) => ({
  observation: clean(value?.observation),
  interpretation: clean(value?.interpretation),
  uncertainty: clean(value?.uncertainty),
});
export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

function cleanSnapshot(value) {
  const sources = Array.isArray(value?.sources)
    ? value.sources
        .filter((source) => {
          try {
            return (
              new URL(source.url).protocol === "https:" &&
              typeof source.label === "string"
            );
          } catch {
            return false;
          }
        })
        .slice(0, 10)
        .map((source) => ({ label: clean(source.label), url: source.url }))
    : [];
  return {
    title: clean(value?.title),
    detail: clean(value?.detail),
    location: clean(value?.location),
    measurements: clean(value?.measurements),
    sources,
  };
}

export function readNotebook(storage) {
  const empty = {
    version: 1,
    draft: emptyDraft(),
    draftSnapshot: null,
    entries: [],
  };
  try {
    const raw = storage.getItem(NOTEBOOK_KEY);
    if (!raw) return { notebook: empty, status: "ready" };
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.entries))
      throw new Error("Unsupported notebook");
    const entries = parsed.entries
      .slice(0, MAX_ENTRIES)
      .filter(
        (entry) =>
          typeof entry?.id === "string" &&
          typeof entry?.createdAt === "string" &&
          !Number.isNaN(Date.parse(entry.createdAt)) &&
          clean(entry?.observation).trim(),
      )
      .map((entry) => ({
        id: clean(entry.id),
        createdAt: entry.createdAt,
        ...cleanDraft(entry),
        snapshot: cleanSnapshot(entry.snapshot),
      }));
    return {
      notebook: {
        version: 1,
        draft: cleanDraft(parsed.draft),
        draftSnapshot: parsed.draftSnapshot
          ? cleanSnapshot(parsed.draftSnapshot)
          : null,
        entries,
      },
      status: "ready",
    };
  } catch {
    return { notebook: empty, status: "unavailable" };
  }
}

export function storeNotebook(storage, notebook) {
  try {
    storage.setItem(NOTEBOOK_KEY, JSON.stringify(notebook));
    return true;
  } catch {
    return false;
  }
}

export function addEntry(notebook, snapshot, { id, createdAt }) {
  const draft = cleanDraft(notebook.draft);
  if (!draft.observation.trim())
    return { error: "Write what you observed before saving." };
  if (notebook.entries.length >= MAX_ENTRIES)
    return {
      error:
        "This notebook has reached its 50-observation limit. Export a copy to keep your work; your existing observations are unchanged.",
    };
  return {
    notebook: {
      ...notebook,
      draft: emptyDraft(),
      draftSnapshot: null,
      entries: [
        {
          id,
          createdAt,
          ...draft,
          snapshot: cleanSnapshot(notebook.draftSnapshot ?? snapshot),
        },
        ...notebook.entries,
      ],
    },
  };
}

export function notebookMarkdown(notebook) {
  const lines = [
    "# RealLens — Lake Alice field notebook",
    "",
    "Personal observations from an environmental learning explorer. These are not expert conclusions or independently verified field measurements.",
    "",
  ];
  for (const [i, entry] of [...notebook.entries].reverse().entries()) {
    lines.push(
      `## Observation ${i + 1} — ${entry.snapshot.title}`,
      "",
      `Recorded: ${entry.createdAt}`,
      entry.snapshot.detail,
      entry.snapshot.location,
      entry.snapshot.measurements,
      "",
      "### What I observed",
      entry.observation,
      "",
      "### My interpretation",
      entry.interpretation || "Not recorded.",
      "",
      "### Uncertainty / next check",
      entry.uncertainty || "Not recorded.",
      "",
      "### Linked evidence",
      ...entry.snapshot.sources.map(
        (source) => `- ${source.label}: ${source.url}`,
      ),
      "",
    );
  }
  lines.push(
    "## Method and limitations",
    "EMERGE Textbook 1, Chapter 3, Lesson 3: Vegetation & Water Indices.",
    "https://geo-di-lab.github.io/emerge-lessons/docs/ch3/lesson3.html",
    "NDVI = (near-infrared − red) / (near-infrared + red). NDWI = (green − near-infrared) / (green + near-infrared).",
    "Satellite source bands are 10 m; displayed pixels are resampled. Cloud and invalid classes are masked, but residual errors may remain. Two dates do not establish a trend. These indices do not establish water quality, depth, safety, or disease risk.",
    "Photographs, LiDAR, aerial imagery, Google 3D context and satellite scenes have different capture dates. No calibrated photo-to-model alignment is claimed.",
    "No geoemerge package or GLOBE records are used. Google imagery and geometry are not included in this export.",
    "",
  );
  return lines.filter((line) => line !== undefined).join("\n");
}

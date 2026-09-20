import test from "node:test";
import assert from "node:assert/strict";
import {
  readNotebook,
  storeNotebook,
  addEntry,
  notebookMarkdown,
  escapeHtml,
  MAX_ENTRIES,
} from "../src/notebook.js";
const memory = () => {
  let value = null;
  return { getItem: () => value, setItem: (_key, next) => (value = next) };
};
const identity = { id: "test-observation", createdAt: "2026-09-20T00:00:00Z" };
const snapshot = {
  title: "Water study point",
  detail: "Sentinel-2 · 21 Mar / 22 Sep 2024",
  location: "29.642, -82.363",
  measurements: "NDWI 0.20 / 0.10",
  sources: [{ label: "Source", url: "https://example.com/record" }],
};
test("empty notebook and draft persistence", () => {
  const storage = memory();
  const { notebook, status } = readNotebook(storage);
  assert.equal(status, "ready");
  assert.equal(notebook.entries.length, 0);
  notebook.draft.observation = "An unfinished thought.";
  assert.ok(storeNotebook(storage, notebook));
  assert.equal(
    readNotebook(storage).notebook.draft.observation,
    "An unfinished thought.",
  );
});
test("saving requires an observation and preserves evidence as a snapshot", () => {
  const { notebook } = readNotebook(memory());
  assert.match(addEntry(notebook, snapshot, identity).error, /Write/);
  notebook.draft = {
    observation: "Water differs from canopy.",
    interpretation: "Surfaces reflect differently.",
    uncertainty: "Two dates are not a trend.",
  };
  const result = addEntry(notebook, snapshot, identity).notebook;
  assert.equal(result.entries.length, 1);
  assert.equal(result.draft.observation, "");
  assert.equal(notebook.entries.length, 0);
  snapshot.title = "Changed after saving";
  assert.equal(result.entries[0].snapshot.title, "Water study point");
  assert.equal(result.entries[0].uncertainty, "Two dates are not a trend.");
});
test("storage failure and corrupt contents are reported without mutating storage", () => {
  const denied = {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("quota");
    },
  };
  assert.equal(readNotebook(denied).status, "unavailable");
  assert.equal(storeNotebook(denied, {}), false);
  let writes = 0;
  assert.equal(
    readNotebook({ getItem: () => "{broken", setItem: () => writes++ }).status,
    "unavailable",
  );
  assert.equal(writes, 0);
});
test("a restored draft keeps its original evidence when the current view changes", () => {
  const storage = memory();
  const { notebook } = readNotebook(storage);
  notebook.draft.observation = "Observation at the canopy.";
  notebook.draftSnapshot = { ...snapshot, title: "Canopy" };
  storeNotebook(storage, notebook);
  const restored = readNotebook(storage).notebook;
  assert.equal(restored.draftSnapshot.title, "Canopy");
  const saved = addEntry(
    restored,
    { ...snapshot, title: "Different view" },
    identity,
  ).notebook;
  assert.equal(saved.entries[0].snapshot.title, "Canopy");
  assert.equal(saved.draftSnapshot, null);
});
test("loaded content cannot inject HTML or javascript links", () => {
  const storage = memory();
  const { notebook } = readNotebook(storage);
  notebook.draft.observation = "<img src=x onerror=alert(1)>";
  const result = addEntry(
    notebook,
    {
      ...snapshot,
      sources: [
        { label: "Bad", url: "javascript:alert(1)" },
        { label: "Good", url: "https://example.com/record" },
      ],
    },
    identity,
  ).notebook;
  storeNotebook(storage, result);
  const loaded = readNotebook(storage).notebook;
  assert.equal(loaded.entries[0].snapshot.sources.length, 1);
  assert.equal(
    escapeHtml(loaded.entries[0].observation),
    "&lt;img src=x onerror=alert(1)&gt;",
  );
});
test("export includes the actual learner text, source context, and limitations", () => {
  const { notebook } = readNotebook(memory());
  notebook.draft = {
    observation: "My own observation",
    interpretation: "Possible explanation",
    uncertainty: "Need another acquisition",
  };
  const saved = addEntry(notebook, snapshot, identity).notebook;
  const md = notebookMarkdown(saved);
  for (const text of [
    "My own observation",
    "Possible explanation",
    "Need another acquisition",
    "NDWI 0.20 / 0.10",
    "https://example.com/record",
    "Two dates do not establish a trend",
    "Google imagery and geometry are not included",
  ])
    assert.ok(md.includes(text));
});
test("entry cap and field limits prevent unbounded local storage", () => {
  const { notebook } = readNotebook(memory());
  notebook.draft.observation = "x".repeat(5000);
  const saved = addEntry(notebook, snapshot, identity).notebook;
  assert.equal(saved.entries[0].observation.length, 3000);
  assert.ok(
    addEntry(
      { ...notebook, entries: Array(MAX_ENTRIES).fill(saved.entries[0]) },
      snapshot,
      identity,
    ).error,
  );
});

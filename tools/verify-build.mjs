import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const files = readdirSync(new URL("../dist/assets/", import.meta.url)).filter(
  (file) => file.endsWith(".js"),
);
assert.ok(files.length, "Run npm run build first.");
const output = files
  .map((file) =>
    readFileSync(new URL("../dist/assets/" + file, import.meta.url), "utf8"),
  )
  .join("\n");
assert.ok(!output.includes('__fieldlensVoiceQA'), 'Simulated speech fixtures must not ship.');
assert.ok(!output.includes('__fieldlensElevenQA'), 'Synthetic ElevenLabs fixtures must not ship.');
assert.ok(!output.includes('QA fixture — campus notice'), 'Synthetic closure notices must not ship.');
assert.ok(!output.includes('QA RTS detour'), 'Synthetic RTS posts must not ship.');
assert.ok(!output.includes('xi-api-key') && !output.includes('api.elevenlabs.io') && !/ELEVENLABS?_API(?:_KEY)?/.test(output), 'ElevenLabs credentials and direct provider requests must stay server-side.');
assert.ok(
  !/AIza[\w-]{35}/.test(output),
  "A Google API credential was found in the build.",
);
assert.ok(
  !output.includes("maps.googleapis.com/maps/api/js"),
  "The demo SDK loader must not ship in production.",
);
assert.ok(
  !files.some((file) => file.startsWith("google-landscape")),
  "The demo adapter must not be bundled.",
);
console.log(
  "PASS: production excludes Google demo credentials, SDK loader, and adapter.",
);

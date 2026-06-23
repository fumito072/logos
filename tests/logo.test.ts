import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { analyzeDatasetHeuristically } from "../src/preference/analyze.js";
import { generateLogoAssets } from "../src/logo/generate.js";
import { sampleDataset } from "../src/sample.js";

test("logo generator writes SVG and preview assets", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "logo-assets-"));
  try {
    const profile = analyzeDatasetHeuristically(sampleDataset);
    const assets = await generateLogoAssets({
      brandName: "COLAPIS",
      tagline: "personal brand project",
      profile,
      outputDir: dir,
    });

    assert.ok(assets.length >= 8);
    const horizontal = await readFile(path.join(dir, "colapis-lockup-horizontal.svg"), "utf8");
    assert.match(horizontal, /<svg/);
    assert.match(horizontal, /COLAPIS/);

    const preview = await readFile(path.join(dir, "brand-check.html"), "utf8");
    assert.match(preview, /colapis-lockup-horizontal\.svg/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

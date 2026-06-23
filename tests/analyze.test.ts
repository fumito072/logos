import test from "node:test";
import assert from "node:assert/strict";
import { analyzeDatasetHeuristically } from "../src/preference/analyze.js";
import { sampleDataset } from "../src/sample.js";

test("heuristic analyzer creates a usable logo preference profile", () => {
  const profile = analyzeDatasetHeuristically(sampleDataset);
  assert.ok(profile.palette.includes("warm black"));
  assert.ok(profile.shape.some((item) => item.includes("organic") || item.includes("mesh")));
  assert.ok(profile.typography.length >= 3);
  assert.ok(profile.avoid.includes("3D gloss"));
  assert.equal(profile.evidence.totalBoards, sampleDataset.boards.length);
  assert.ok(profile.evidence.totalPins >= 5);
});

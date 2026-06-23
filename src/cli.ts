import path from "node:path";
import { loadConfig } from "./config.js";
import { runPinterestOAuth } from "./pinterest/oauth.js";
import { collectPinterestDataset } from "./pinterest/client.js";
import { analyzeDatasetWithOptionalAi } from "./preference/analyze.js";
import { generateLogoAssets } from "./logo/generate.js";
import { sampleDataset } from "./sample.js";
import type { PinterestDataset, PreferenceProfile } from "./types.js";
import { readJsonFile, writeJsonFile } from "./util/fs.js";

const config = loadConfig();

function argValue(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function numberArg(name: string, fallback: number): number {
  const value = Number(argValue(name, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

async function fetchPinterest(): Promise<void> {
  const outputPath = path.join(config.rootDir, argValue("out", "data/pinterest-export.json"));
  const dataset = await collectPinterestDataset(config, {
    outputPath,
    pageSize: numberArg("page-size", 100),
    maxBoards: numberArg("max-boards", Number.POSITIVE_INFINITY),
    maxPinsPerBoard: numberArg("max-pins-per-board", 250),
    includeSections: argValue("sections", "true") !== "false",
    accountUrl: "https://jp.pinterest.com/",
  });
  console.log(`Fetched ${dataset.boards.length} boards to ${outputPath}`);
}

async function analyze(input = "data/pinterest-export.json", output = "output/preference-profile.json"): Promise<PreferenceProfile> {
  const inputPath = path.join(config.rootDir, argValue("in", input));
  const outputPath = path.join(config.rootDir, argValue("out", output));
  const dataset = await readJsonFile<PinterestDataset>(inputPath);
  const profile = await analyzeDatasetWithOptionalAi(dataset, {
    apiKey: config.openAiApiKey,
    model: config.openAiModel,
  });
  await writeJsonFile(outputPath, profile);
  console.log(`Wrote preference profile to ${outputPath}`);
  return profile;
}

async function generateLogo(
  input = "output/preference-profile.json",
  outputDir = "output/logo",
): Promise<void> {
  const inputPath = path.join(config.rootDir, argValue("profile", input));
  const profile = await readJsonFile<PreferenceProfile>(inputPath);
  const assets = await generateLogoAssets({
    brandName: argValue("brand", config.brandName),
    tagline: argValue("tagline", config.brandTagline),
    profile,
    outputDir: path.join(config.rootDir, argValue("out-dir", outputDir)),
  });
  for (const asset of assets) {
    console.log(`${asset.kind}: ${asset.path}`);
  }
}

async function sample(): Promise<void> {
  const datasetPath = path.join(config.rootDir, "output/sample-pinterest-export.json");
  const profilePath = path.join(config.rootDir, "output/preference-profile.sample.json");
  await writeJsonFile(datasetPath, sampleDataset);
  const profile = await analyzeDatasetWithOptionalAi(sampleDataset, {
    apiKey: config.openAiApiKey,
    model: config.openAiModel,
  });
  await writeJsonFile(profilePath, profile);
  const assets = await generateLogoAssets({
    brandName: config.brandName,
    tagline: config.brandTagline,
    profile,
    outputDir: path.join(config.rootDir, "output/logo"),
  });
  console.log(`Sample dataset: ${datasetPath}`);
  console.log(`Sample profile: ${profilePath}`);
  for (const asset of assets) {
    console.log(`${asset.kind}: ${asset.path}`);
  }
}

async function pipeline(): Promise<void> {
  await fetchPinterest();
  await analyze();
  await generateLogo();
}

async function main(): Promise<void> {
  const command = process.argv[2];
  switch (command) {
    case "auth:pinterest":
      await runPinterestOAuth(config);
      break;
    case "fetch:pinterest":
      await fetchPinterest();
      break;
    case "analyze":
      await analyze();
      break;
    case "generate:logo":
      await generateLogo();
      break;
    case "pipeline":
      await pipeline();
      break;
    case "sample":
      await sample();
      break;
    default:
      console.log(`Unknown command: ${command ?? "(none)"}`);
      console.log("Use one of: auth:pinterest, fetch:pinterest, analyze, generate:logo, pipeline, sample");
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

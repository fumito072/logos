import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export interface AppConfig {
  rootDir: string;
  pinterestClientId: string;
  pinterestClientSecret: string;
  pinterestRedirectUri: string;
  pinterestScopes: string;
  pinterestAccessToken: string;
  openAiApiKey: string;
  openAiModel: string;
  brandName: string;
  brandTagline: string;
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const entries: Record<string, string> = {};
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const idx = line.indexOf("=");
    if (idx === -1) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

export function loadConfig(rootDir = process.cwd()): AppConfig {
  const envFile = parseEnvFile(path.join(rootDir, ".env"));
  const get = (name: string, fallback = ""): string =>
    process.env[name] ?? envFile[name] ?? fallback;

  return {
    rootDir,
    pinterestClientId: get("PINTEREST_CLIENT_ID"),
    pinterestClientSecret: get("PINTEREST_CLIENT_SECRET"),
    pinterestRedirectUri: get(
      "PINTEREST_REDIRECT_URI",
      "http://localhost:8787/oauth/pinterest/callback",
    ),
    pinterestScopes: get("PINTEREST_SCOPES", "boards:read,pins:read"),
    pinterestAccessToken: get("PINTEREST_ACCESS_TOKEN"),
    openAiApiKey: get("OPENAI_API_KEY"),
    openAiModel: get("OPENAI_MODEL"),
    brandName: get("BRAND_NAME", "COLAPIS"),
    brandTagline: get("BRAND_TAGLINE", "personal brand project"),
  };
}

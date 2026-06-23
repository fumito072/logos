import { createServer } from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import type { AppConfig } from "../config.js";
import type { PinterestToken } from "../types.js";
import { ensureDir, writeJsonFile } from "../util/fs.js";

const PINTEREST_OAUTH_URL = "https://www.pinterest.com/oauth/";
const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";

export function buildPinterestAuthorizationUrl(config: AppConfig, state: string): string {
  const url = new URL(PINTEREST_OAUTH_URL);
  url.searchParams.set("client_id", config.pinterestClientId);
  url.searchParams.set("redirect_uri", config.pinterestRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.pinterestScopes);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangePinterestCode(
  config: AppConfig,
  code: string,
): Promise<PinterestToken> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.pinterestRedirectUri,
  });

  const credentials = Buffer.from(
    `${config.pinterestClientId}:${config.pinterestClientSecret}`,
    "utf8",
  ).toString("base64");

  const response = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Pinterest token exchange failed (${response.status}): ${responseText}`);
  }

  return {
    ...(JSON.parse(responseText) as Omit<PinterestToken, "obtained_at">),
    obtained_at: new Date().toISOString(),
  };
}

export async function runPinterestOAuth(config: AppConfig): Promise<void> {
  if (!config.pinterestClientId || !config.pinterestClientSecret) {
    throw new Error("Set PINTEREST_CLIENT_ID and PINTEREST_CLIENT_SECRET in .env first.");
  }

  const redirectUrl = new URL(config.pinterestRedirectUri);
  const port = Number(redirectUrl.port || (redirectUrl.protocol === "https:" ? 443 : 80));
  const expectedPath = redirectUrl.pathname;
  const state = crypto.randomBytes(24).toString("hex");
  const authUrl = buildPinterestAuthorizationUrl(config, state);

  const tokenPath = path.join(config.rootDir, ".secrets", "pinterest-token.json");
  await ensureDir(path.dirname(tokenPath));

  await new Promise<void>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "/", config.pinterestRedirectUri);
        if (requestUrl.pathname !== expectedPath) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
          return;
        }

        const returnedState = requestUrl.searchParams.get("state");
        const code = requestUrl.searchParams.get("code");
        const error = requestUrl.searchParams.get("error");

        if (error) {
          throw new Error(`Pinterest OAuth error: ${error}`);
        }
        if (!code) {
          throw new Error("Pinterest OAuth callback did not include a code.");
        }
        if (returnedState !== state) {
          throw new Error("Pinterest OAuth state mismatch.");
        }

        const token = await exchangePinterestCode(config, code);
        await writeJsonFile(tokenPath, token);

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<p>Pinterest connected. You can close this tab.</p>");
        server.close();
        resolve();
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(error instanceof Error ? error.message : String(error));
        server.close();
        reject(error);
      }
    });

    server.once("error", reject);
    server.listen(port, () => {
      console.log("Open this Pinterest OAuth URL:");
      console.log(authUrl);
      console.log("");
      console.log(`Waiting for callback on ${config.pinterestRedirectUri}`);
    });
  });

  console.log(`Saved token to ${tokenPath}`);
}

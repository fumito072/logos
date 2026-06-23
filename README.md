# Pinterest Logo Lab

Prototype pipeline for turning a Pinterest account's saved boards into a practical logo direction:

1. OAuth-connect Pinterest.
2. Fetch boards, board sections, board pins, and section pins.
3. Normalize pin image URLs, titles, descriptions, board names, and section names.
4. Analyze the material into a preference profile.
5. Generate SVG logo assets, color variants, and a browser preview sheet.

The current implementation is intentionally a prototype, not an MCP server. The module boundaries are named so they can later become MCP tools such as `pinterest.get_boards`, `pinterest.get_board_pins`, `preference.analyze_board`, and `logo.generate_directions`.

## Setup

```bash
npm install
cp .env.example .env
```

Create a Pinterest Developer app and register this redirect URI:

```text
http://localhost:8787/oauth/pinterest/callback
```

Set `PINTEREST_CLIENT_ID` and `PINTEREST_CLIENT_SECRET` in `.env`. The prototype requests the minimum read scopes:

```text
boards:read,pins:read
```

## Run With Pinterest

```bash
npm run auth:pinterest
npm run fetch:pinterest
npm run analyze
npm run generate:logo
```

The OAuth command stores tokens in `.secrets/pinterest-token.json`, which is ignored by git. Do not commit Pinterest access tokens or refresh tokens.

Generated user data is written under `data/` and ignored by git. Logo deliverables are written under `output/logo/`.

## Run The Sample

Use the synthetic sample when Pinterest credentials are not available yet:

```bash
npm run sample
```

This writes:

- `output/preference-profile.sample.json`
- `output/logo/colapis-mark.svg`
- `output/logo/colapis-lockup-horizontal.svg`
- `output/logo/colapis-lockup-stacked.svg`
- `output/logo/colapis-social-avatar.svg`
- `output/logo/brand-check.html`
- `output/logo/logo-rationale.md`

## Optional AI Analysis

If `OPENAI_API_KEY` is present, `npm run analyze` attempts an AI-backed profile extraction and falls back to the local heuristic analyzer if the request fails. Without an API key, the local analyzer still produces a usable profile from board names, pin titles, descriptions, links, and recurring keywords.

## References

- Pinterest authentication and authorization: https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/
- Pinterest API v5 reference: https://developers.pinterest.com/docs/api/v5/
- Pinterest OpenAPI description: https://github.com/pinterest/api-description
- Model Context Protocol: https://modelcontextprotocol.io/

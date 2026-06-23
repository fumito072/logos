import path from "node:path";
import type { GeneratedLogoAsset, LogoGenerationOptions, PreferenceProfile } from "../types.js";
import { ensureDir, writeTextFile } from "../util/fs.js";

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
}

function palette(profile: PreferenceProfile): {
  ink: string;
  paper: string;
  stone: string;
  accent: string;
} {
  const all = profile.palette.join(" ").toLowerCase();
  return {
    ink: all.includes("warm") ? "#12100d" : "#111111",
    paper: all.includes("ivory") || all.includes("cream") ? "#f6f0e7" : "#f7f7f3",
    stone: all.includes("stone") ? "#8d8982" : "#9a948c",
    accent: all.includes("terracotta") ? "#a85f49" : "#6e746d",
  };
}

function markSvg(id: string, profile: PreferenceProfile, colors = palette(profile)): string {
  const meshOpacity = profile.shape.join(" ").toLowerCase().includes("mesh") ? 0.5 : 0.32;
  return `${XML_HEADER}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">Abstract lapis mark</title>
  <desc id="${id}-desc">Two quiet organic stone forms with a restrained mesh texture.</desc>
  <defs>
    <clipPath id="${id}-stoneClip">
      <path d="M48 79C66 45 116 37 164 50C199 60 219 83 211 111C202 143 154 159 102 149C62 141 35 115 48 79Z"/>
    </clipPath>
    <clipPath id="${id}-baseClip">
      <path d="M71 169C96 150 144 147 174 163C200 177 196 205 166 215C132 226 75 219 57 197C48 186 55 177 71 169Z"/>
    </clipPath>
  </defs>
  <rect width="240" height="240" fill="none"/>
  <path fill="${colors.ink}" d="M48 79C66 45 116 37 164 50C199 60 219 83 211 111C202 143 154 159 102 149C62 141 35 115 48 79Z"/>
  <path fill="${colors.paper}" opacity="0.9" d="M77 112C101 87 148 81 185 96C158 102 126 116 99 136C89 130 81 121 77 112Z"/>
  <g clip-path="url(#${id}-stoneClip)" opacity="${meshOpacity}">
    <g fill="${colors.paper}">
      ${dotMesh(45, 53, 170, 92, 7, 7, 1.2)}
    </g>
  </g>
  <path fill="${colors.ink}" d="M71 169C96 150 144 147 174 163C200 177 196 205 166 215C132 226 75 219 57 197C48 186 55 177 71 169Z"/>
  <g clip-path="url(#${id}-baseClip)" opacity="${meshOpacity * 0.86}">
    <g fill="${colors.paper}">
      ${dotMesh(57, 155, 132, 60, 7, 7, 1.0)}
    </g>
  </g>
  <path fill="${colors.accent}" opacity="0.4" d="M95 184C113 177 146 178 163 187C143 190 115 190 95 184Z"/>
</svg>
`;
}

function dotMesh(
  startX: number,
  startY: number,
  width: number,
  height: number,
  stepX: number,
  stepY: number,
  radius: number,
): string {
  const circles: string[] = [];
  for (let y = startY; y <= startY + height; y += stepY) {
    for (let x = startX; x <= startX + width; x += stepX) {
      const offset = Math.floor((y - startY) / stepY) % 2 ? stepX / 2 : 0;
      circles.push(`<circle cx="${(x + offset).toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}"/>`);
    }
  }
  return circles.join("\n      ");
}

function wordmarkSvg(
  id: string,
  brandName: string,
  profile: PreferenceProfile,
  colors = palette(profile),
): string {
  const tracking = profile.typography.join(" ").toLowerCase().includes("wide") ? "9" : "7";
  return `${XML_HEADER}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 160" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">${escapeXml(brandName)} wordmark</title>
  <desc id="${id}-desc">Editorial spaced wordmark for ${escapeXml(brandName)}.</desc>
  <rect width="720" height="160" fill="none"/>
  <text x="360" y="99" text-anchor="middle" fill="${colors.ink}" font-family="Cormorant Garamond, Didot, Georgia, serif" font-size="72" letter-spacing="${tracking}" font-weight="600">${escapeXml(brandName)}</text>
  <path d="M212 117H508" stroke="${colors.stone}" stroke-width="1.3" opacity="0.55"/>
</svg>
`;
}

function horizontalLockupSvg(
  id: string,
  brandName: string,
  tagline: string | undefined,
  profile: PreferenceProfile,
  colors = palette(profile),
): string {
  const safeTagline = tagline ? escapeXml(tagline.toUpperCase()) : "";
  return `${XML_HEADER}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 260" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">${escapeXml(brandName)} horizontal logo</title>
  <desc id="${id}-desc">Horizontal lockup with an abstract vessel mark and editorial wordmark.</desc>
  <rect width="980" height="260" rx="0" fill="${colors.paper}"/>
  <g transform="translate(84 30) scale(.84)">
    ${markSvg(`${id}-inner`, profile, colors).replace(XML_HEADER, "").replace(/<svg[^>]*>/, "").replace("</svg>", "")}
  </g>
  <text x="350" y="126" fill="${colors.ink}" font-family="Cormorant Garamond, Didot, Georgia, serif" font-size="72" letter-spacing="9" font-weight="600">${escapeXml(brandName)}</text>
  <path d="M354 151H754" stroke="${colors.stone}" stroke-width="1.4" opacity="0.52"/>
  ${safeTagline ? `<text x="354" y="188" fill="${colors.accent}" font-family="Avenir Next, Helvetica, Arial, sans-serif" font-size="17" letter-spacing="4">${safeTagline}</text>` : ""}
</svg>
`;
}

function stackedLockupSvg(
  id: string,
  brandName: string,
  tagline: string | undefined,
  profile: PreferenceProfile,
  colors = palette(profile),
): string {
  const safeTagline = tagline ? escapeXml(tagline.toUpperCase()) : "";
  return `${XML_HEADER}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 760" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">${escapeXml(brandName)} stacked logo</title>
  <desc id="${id}-desc">Stacked logo lockup for profile, cover, and editorial usage.</desc>
  <rect width="680" height="760" fill="${colors.paper}"/>
  <g transform="translate(220 76)">
    ${markSvg(`${id}-inner`, profile, colors).replace(XML_HEADER, "").replace(/<svg[^>]*>/, "").replace("</svg>", "")}
  </g>
  <text x="340" y="438" text-anchor="middle" fill="${colors.ink}" font-family="Cormorant Garamond, Didot, Georgia, serif" font-size="82" letter-spacing="10" font-weight="600">${escapeXml(brandName)}</text>
  <path d="M182 474H498" stroke="${colors.stone}" stroke-width="1.3" opacity="0.52"/>
  ${safeTagline ? `<text x="340" y="524" text-anchor="middle" fill="${colors.accent}" font-family="Avenir Next, Helvetica, Arial, sans-serif" font-size="18" letter-spacing="4">${safeTagline}</text>` : ""}
</svg>
`;
}

function socialAvatarSvg(id: string, profile: PreferenceProfile, colors = palette(profile)): string {
  return `${XML_HEADER}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">Social avatar mark</title>
  <desc id="${id}-desc">Single abstract mark centered for small social avatars.</desc>
  <rect width="512" height="512" rx="104" fill="${colors.paper}"/>
  <g transform="translate(136 130) scale(1.02)">
    ${markSvg(`${id}-inner`, profile, colors).replace(XML_HEADER, "").replace(/<svg[^>]*>/, "").replace("</svg>", "")}
  </g>
</svg>
`;
}

function monoSvg(
  id: string,
  brandName: string,
  profile: PreferenceProfile,
  mode: "black" | "white",
): string {
  const colors =
    mode === "black"
      ? { ink: "#000000", paper: "#ffffff", stone: "#000000", accent: "#000000" }
      : { ink: "#ffffff", paper: "#000000", stone: "#ffffff", accent: "#ffffff" };
  return horizontalLockupSvg(id, brandName, undefined, profile, colors);
}

function htmlPreview(brandName: string, profile: PreferenceProfile, assets: GeneratedLogoAsset[]): string {
  const colors = palette(profile);
  const cards = assets
    .filter((asset) => asset.path.endsWith(".svg"))
    .map((asset) => {
      const rel = path.basename(asset.path);
      return `<section class="card"><div class="label">${escapeXml(asset.kind)}</div><img src="./${escapeXml(rel)}" alt="${escapeXml(asset.kind)}"></section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeXml(brandName)} logo check</title>
  <style>
    body { margin: 0; background: ${colors.paper}; color: ${colors.ink}; font-family: Avenir Next, Helvetica, Arial, sans-serif; }
    main { max-width: 1120px; margin: 0 auto; padding: 56px 28px 72px; }
    h1 { font-family: Georgia, serif; font-size: 42px; font-weight: 500; margin: 0 0 24px; letter-spacing: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }
    .card { border: 1px solid color-mix(in srgb, ${colors.ink} 18%, transparent); background: rgba(255,255,255,.28); padding: 18px; min-height: 230px; display: grid; align-content: center; gap: 12px; }
    .label { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: ${colors.accent}; }
    img { width: 100%; max-height: 360px; object-fit: contain; display: block; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeXml(brandName)}</h1>
    <div class="grid">
      ${cards}
    </div>
  </main>
</body>
</html>
`;
}

function rationale(brandName: string, profile: PreferenceProfile): string {
  return `# ${brandName} Logo Rationale

## Taste Profile

- Palette: ${profile.palette.join(", ")}
- Shape: ${profile.shape.join(", ")}
- Typography: ${profile.typography.join(", ")}
- Atmosphere: ${profile.atmosphere.join(", ")}
- Motifs: ${profile.motifs.join(", ")}
- Avoid: ${profile.avoid.join(", ")}

## Direction

The mark is an abstract paired-lapis form with a restrained mesh texture. It keeps the existing COLAPIS-adjacent idea of a small object or artifact, but makes it more controlled, scalable, and less literal.

The wordmark uses wide editorial spacing and a serif voice so the logo works for a personal brand project without feeling like a generic SaaS identity. The first-pass system is intentionally single-color-first, then extended to ivory, stone, and muted accent tones.

## Usage Notes

- Use the horizontal lockup for websites, decks, and business-card headers.
- Use the stacked lockup for profile pages, covers, and formal brand moments.
- Use the social avatar when the mark must remain legible under 64px.
- Avoid glossy 3D treatment, busy gradients, mascot styling, or decorative effects that compete with the paired-stone silhouette.
`;
}

export async function generateLogoAssets(options: LogoGenerationOptions): Promise<GeneratedLogoAsset[]> {
  await ensureDir(options.outputDir);
  const brand = options.brandName.trim() || "COLAPIS";
  const base = slug(brand);
  const assets: GeneratedLogoAsset[] = [];

  const write = async (name: string, kind: string, content: string): Promise<void> => {
    const filePath = path.join(options.outputDir, name);
    await writeTextFile(filePath, content);
    assets.push({ path: filePath, kind });
  };

  await write(`${base}-mark.svg`, "mark", markSvg(`${base}-mark`, options.profile));
  await write(`${base}-wordmark.svg`, "wordmark", wordmarkSvg(`${base}-wordmark`, brand, options.profile));
  await write(
    `${base}-lockup-horizontal.svg`,
    "horizontal lockup",
    horizontalLockupSvg(`${base}-horizontal`, brand, options.tagline, options.profile),
  );
  await write(
    `${base}-lockup-stacked.svg`,
    "stacked lockup",
    stackedLockupSvg(`${base}-stacked`, brand, options.tagline, options.profile),
  );
  await write(`${base}-mono-black.svg`, "mono black", monoSvg(`${base}-mono-black`, brand, options.profile, "black"));
  await write(`${base}-mono-white.svg`, "mono white", monoSvg(`${base}-mono-white`, brand, options.profile, "white"));
  await write(`${base}-social-avatar.svg`, "social avatar", socialAvatarSvg(`${base}-avatar`, options.profile));

  const previewPath = path.join(options.outputDir, "brand-check.html");
  await writeTextFile(previewPath, htmlPreview(brand, options.profile, assets));
  assets.push({ path: previewPath, kind: "browser preview" });

  const rationalePath = path.join(options.outputDir, "logo-rationale.md");
  await writeTextFile(rationalePath, rationale(brand, options.profile));
  assets.push({ path: rationalePath, kind: "rationale" });

  return assets;
}

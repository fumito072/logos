import type { NormalizedPin, PinterestDataset, PreferenceProfile } from "../types.js";

const STYLE_KEYWORDS: Record<keyof Omit<PreferenceProfile, "evidence">, string[]> = {
  palette: [
    "warm black",
    "ivory",
    "charcoal",
    "white",
    "cream",
    "silver",
    "muted blue",
    "terracotta",
    "monochrome",
    "neutral",
    "stone",
    "ink",
  ],
  shape: [
    "minimal",
    "geometric",
    "organic",
    "soft corners",
    "asymmetric",
    "monolith",
    "mesh",
    "vessel",
    "pebble",
    "wave",
  ],
  spacing: ["quiet", "negative space", "wide", "airy", "editorial", "dense", "compact"],
  lineWeight: ["thin line", "hairline", "bold", "solid", "monoline", "engraved", "mesh"],
  typography: [
    "high contrast serif",
    "editorial serif",
    "wide sans",
    "custom ligature",
    "small caps",
    "monospace",
    "grotesk",
  ],
  atmosphere: [
    "quiet luxury",
    "editorial",
    "technical",
    "calm",
    "precise",
    "ritual",
    "future craft",
    "museum",
    "laboratory",
  ],
  avoid: [
    "cute mascot",
    "3D gloss",
    "busy gradients",
    "generic startup swoosh",
    "cartoon",
    "clip art",
  ],
  motifs: [
    "vessel",
    "stone",
    "mesh",
    "pebble",
    "bird",
    "feather",
    "flame",
    "robot",
    "lens",
    "orbit",
    "portal",
    "wave",
  ],
  logoDirection: [
    "small-scale legible",
    "quiet luxury",
    "editorial wordmark",
    "abstract mark",
    "black and ivory",
    "single-color first",
    "subtle texture",
  ],
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "from",
  "this",
  "that",
  "into",
  "your",
  "you",
  "are",
  "was",
  "were",
  "have",
  "has",
  "pin",
  "pinterest",
  "image",
  "photo",
  "ideas",
  "design",
  "logo",
  "brand",
]);

function allPins(dataset: PinterestDataset): NormalizedPin[] {
  return dataset.boards.flatMap((board) => [
    ...board.pins,
    ...board.sections.flatMap((section) => section.pins),
  ]);
}

function corpus(dataset: PinterestDataset): string {
  const boardText = dataset.boards
    .map((board) => [board.board.name, board.board.description ?? ""].join(" "))
    .join(" ");
  const pinText = allPins(dataset)
    .map((pin) =>
      [
        pin.boardName,
        pin.sectionName ?? "",
        pin.title,
        pin.description,
        pin.altText,
        pin.link,
        pin.dominantColor,
      ].join(" "),
    )
    .join(" ");
  return `${boardText} ${pinText}`.toLowerCase();
}

function topTerms(text: string): Array<{ term: string; count: number }> {
  const counts = new Map<string, number>();
  const terms = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9#]+/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

  for (const term of terms) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 30)
    .map(([term, count]) => ({ term, count }));
}

function selectMatches(text: string, candidates: string[], fallback: string[]): string[] {
  const matches = candidates.filter((candidate) => {
    const normalized = candidate.toLowerCase();
    return normalized
      .split(/\s+/)
      .some((part) => part.length > 2 && text.includes(part));
  });

  const unique = [...new Set([...matches, ...fallback])];
  return unique.slice(0, 7);
}

export function analyzeDatasetHeuristically(dataset: PinterestDataset): PreferenceProfile {
  const text = corpus(dataset);
  const pins = allPins(dataset);
  const termCounts = topTerms(text);
  const boardNames = dataset.boards.map((item) => item.board.name).filter(Boolean);
  const imageSamples = pins.map((pin) => pin.imageUrl).filter(Boolean).slice(0, 24);

  return {
    palette: selectMatches(text, STYLE_KEYWORDS.palette, ["warm black", "ivory", "stone gray"]),
    shape: selectMatches(text, STYLE_KEYWORDS.shape, ["minimal", "organic", "geometric"]),
    spacing: selectMatches(text, STYLE_KEYWORDS.spacing, ["quiet negative space", "balanced margins"]),
    lineWeight: selectMatches(text, STYLE_KEYWORDS.lineWeight, ["solid mark", "fine detail only at large sizes"]),
    typography: selectMatches(text, STYLE_KEYWORDS.typography, [
      "editorial serif",
      "wide tracking",
      "custom ligature",
    ]),
    atmosphere: selectMatches(text, STYLE_KEYWORDS.atmosphere, ["quiet luxury", "future craft", "calm precision"]),
    avoid: selectMatches(text, STYLE_KEYWORDS.avoid, [
      "cute mascot",
      "3D gloss",
      "busy gradients",
      "generic startup swoosh",
    ]),
    motifs: selectMatches(text, STYLE_KEYWORDS.motifs, ["vessel", "mesh", "stone"]),
    logoDirection: selectMatches(text, STYLE_KEYWORDS.logoDirection, [
      "single-color first",
      "small-scale legible",
      "abstract mark plus editorial wordmark",
    ]),
    evidence: {
      totalBoards: dataset.boards.length,
      totalPins: pins.length,
      topTerms: termCounts,
      boardNames,
      imageSamples,
      notes: [
        "Generated by the local heuristic analyzer.",
        "Add OPENAI_API_KEY to enable optional AI-backed analysis.",
      ],
    },
  };
}

function profileSchema(): Record<string, unknown> {
  const stringArray = { type: "array", items: { type: "string" }, minItems: 1 };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      palette: stringArray,
      shape: stringArray,
      spacing: stringArray,
      lineWeight: stringArray,
      typography: stringArray,
      atmosphere: stringArray,
      avoid: stringArray,
      motifs: stringArray,
      logoDirection: stringArray,
      evidence: {
        type: "object",
        additionalProperties: false,
        properties: {
          totalBoards: { type: "number" },
          totalPins: { type: "number" },
          topTerms: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                term: { type: "string" },
                count: { type: "number" },
              },
              required: ["term", "count"],
            },
          },
          boardNames: stringArray,
          imageSamples: stringArray,
          notes: stringArray,
        },
        required: ["totalBoards", "totalPins", "topTerms", "boardNames", "imageSamples", "notes"],
      },
    },
    required: [
      "palette",
      "shape",
      "spacing",
      "lineWeight",
      "typography",
      "atmosphere",
      "avoid",
      "motifs",
      "logoDirection",
      "evidence",
    ],
  };
}

function compactDataset(dataset: PinterestDataset): unknown {
  return {
    fetchedAt: dataset.fetchedAt,
    source: dataset.source,
    boards: dataset.boards.map((board) => ({
      name: board.board.name,
      description: board.board.description,
      pins: [...board.pins, ...board.sections.flatMap((section) => section.pins)]
        .slice(0, 40)
        .map((pin) => ({
          board: pin.boardName,
          section: pin.sectionName,
          title: pin.title,
          description: pin.description,
          altText: pin.altText,
          link: pin.link,
          imageUrl: pin.imageUrl,
          dominantColor: pin.dominantColor,
        })),
    })),
  };
}

function extractOutputText(response: unknown): string {
  const root = response as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };
  if (typeof root.output_text === "string") {
    return root.output_text;
  }

  const pieces: string[] = [];
  for (const item of root.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") {
        pieces.push(content.text);
      }
    }
  }
  return pieces.join("\n");
}

export async function analyzeDatasetWithOptionalAi(
  dataset: PinterestDataset,
  options: { apiKey?: string; model?: string } = {},
): Promise<PreferenceProfile> {
  if (!options.apiKey) {
    return analyzeDatasetHeuristically(dataset);
  }

  const baseProfile = analyzeDatasetHeuristically(dataset);
  const prompt = [
    "Analyze this Pinterest export as a taste profile for a personal brand logo.",
    "Use image URLs, board names, pin titles, descriptions, and links as evidence.",
    "Return concise phrases suitable for a logo generation brief.",
    "Prefer actionable visual language over generic adjectives.",
    "Keep avoid items specific.",
    JSON.stringify(compactDataset(dataset), null, 2),
  ].join("\n\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are a brand identity strategist. Extract only visual preference facts and logo implications.",
          },
          { role: "user", content: prompt },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "preference_profile",
            strict: true,
            schema: profileSchema(),
          },
        },
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`OpenAI analysis failed (${response.status}): ${text}`);
    }

    const parsed = JSON.parse(extractOutputText(JSON.parse(text))) as PreferenceProfile;
    parsed.evidence.notes = [
      "Generated with optional AI analysis from the Pinterest dataset.",
      ...parsed.evidence.notes,
    ];
    return parsed;
  } catch (error) {
    return {
      ...baseProfile,
      evidence: {
        ...baseProfile.evidence,
        notes: [
          ...baseProfile.evidence.notes,
          `AI analysis failed, used local fallback: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
      },
    };
  }
}

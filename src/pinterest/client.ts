import path from "node:path";
import type { AppConfig } from "../config.js";
import type {
  BoardDataset,
  JsonObject,
  NormalizedPin,
  PinterestBoard,
  PinterestBoardSection,
  PinterestDataset,
  PinterestPin,
  PinterestToken,
} from "../types.js";
import { readJsonFile, writeJsonFile } from "../util/fs.js";

const API_BASE = "https://api.pinterest.com/v5";

interface Page<T> {
  bookmark?: string | null;
  items: T[];
}

export interface CollectOptions {
  outputPath?: string;
  pageSize?: number;
  maxBoards?: number;
  maxPinsPerBoard?: number;
  includeSections?: boolean;
  accountUrl?: string;
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeBoard(value: unknown): PinterestBoard {
  const raw = asObject(value);
  return {
    id: asString(raw.id),
    name: asString(raw.name),
    description: typeof raw.description === "string" ? raw.description : null,
    privacy: asString(raw.privacy),
    pin_count: typeof raw.pin_count === "number" ? raw.pin_count : undefined,
    owner: asObject(raw.owner),
    raw,
  };
}

function normalizeSection(value: unknown): PinterestBoardSection {
  const raw = asObject(value);
  return {
    id: asString(raw.id),
    name: asString(raw.name),
    raw,
  };
}

function normalizePin(value: unknown): PinterestPin {
  const raw = asObject(value);
  return {
    id: asString(raw.id),
    title: typeof raw.title === "string" ? raw.title : null,
    description: typeof raw.description === "string" ? raw.description : null,
    alt_text: typeof raw.alt_text === "string" ? raw.alt_text : null,
    link: typeof raw.link === "string" ? raw.link : null,
    media: raw.media,
    dominant_color: typeof raw.dominant_color === "string" ? raw.dominant_color : null,
    raw,
  };
}

function findFirstImageUrl(value: unknown): string {
  if (typeof value === "string" && /^https?:\/\/.+\.(png|jpe?g|webp)(\?.*)?$/i.test(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findFirstImageUrl(item);
      if (result) {
        return result;
      }
    }
    return "";
  }

  const obj = value as JsonObject;
  for (const key of ["url", "image_url", "src"]) {
    const candidate = obj[key];
    if (typeof candidate === "string" && candidate.startsWith("http")) {
      return candidate;
    }
  }

  for (const key of ["images", "media", "items"]) {
    const result = findFirstImageUrl(obj[key]);
    if (result) {
      return result;
    }
  }

  for (const nested of Object.values(obj)) {
    const result = findFirstImageUrl(nested);
    if (result) {
      return result;
    }
  }

  return "";
}

function toNormalizedPin(
  pinValue: unknown,
  board: PinterestBoard,
  source: "board" | "section",
  section?: PinterestBoardSection,
): NormalizedPin {
  const pin = normalizePin(pinValue);
  return {
    id: pin.id || `${board.id}:${section?.id ?? "board"}:${pin.title ?? pin.link ?? "pin"}`,
    title: pin.title ?? "",
    description: pin.description ?? "",
    altText: pin.alt_text ?? "",
    link: pin.link ?? "",
    imageUrl: findFirstImageUrl(pin.media),
    dominantColor: pin.dominant_color ?? "",
    boardId: board.id,
    boardName: board.name,
    sectionId: section?.id,
    sectionName: section?.name,
    source,
  };
}

async function loadAccessToken(config: AppConfig): Promise<string> {
  if (config.pinterestAccessToken) {
    return config.pinterestAccessToken;
  }

  const tokenPath = path.join(config.rootDir, ".secrets", "pinterest-token.json");
  const token = await readJsonFile<PinterestToken>(tokenPath);
  if (!token.access_token) {
    throw new Error(`No access_token found in ${tokenPath}`);
  }
  return token.access_token;
}

export class PinterestClient {
  constructor(private readonly accessToken: string) {}

  private async get<T>(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== "" && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Pinterest API failed (${response.status}) ${url.pathname}: ${text}`);
    }
    return JSON.parse(text) as T;
  }

  private async getAllPages<T>(
    endpoint: string,
    params: Record<string, string | number | boolean> = {},
    maxItems = Number.POSITIVE_INFINITY,
  ): Promise<T[]> {
    const items: T[] = [];
    let bookmark = "";
    while (items.length < maxItems) {
      const page = await this.get<Page<T>>(endpoint, { ...params, bookmark });
      items.push(...page.items);
      if (!page.bookmark || page.items.length === 0) {
        break;
      }
      bookmark = page.bookmark;
    }
    return items.slice(0, maxItems);
  }

  async listBoards(pageSize = 100, maxBoards = Number.POSITIVE_INFINITY): Promise<PinterestBoard[]> {
    const boards = await this.getAllPages<unknown>("/boards", { page_size: pageSize }, maxBoards);
    return boards.map(normalizeBoard).filter((board) => board.id && board.name);
  }

  async listBoardPins(
    boardId: string,
    pageSize = 100,
    maxPins = Number.POSITIVE_INFINITY,
  ): Promise<unknown[]> {
    return this.getAllPages<unknown>(`/boards/${boardId}/pins`, { page_size: pageSize }, maxPins);
  }

  async listBoardSections(boardId: string, pageSize = 100): Promise<PinterestBoardSection[]> {
    const sections = await this.getAllPages<unknown>(
      `/boards/${boardId}/sections`,
      { page_size: pageSize },
      Number.POSITIVE_INFINITY,
    );
    return sections.map(normalizeSection).filter((section) => section.id && section.name);
  }

  async listBoardSectionPins(
    boardId: string,
    sectionId: string,
    pageSize = 100,
    maxPins = Number.POSITIVE_INFINITY,
  ): Promise<unknown[]> {
    return this.getAllPages<unknown>(
      `/boards/${boardId}/sections/${sectionId}/pins`,
      { page_size: pageSize },
      maxPins,
    );
  }
}

export async function collectPinterestDataset(
  config: AppConfig,
  options: CollectOptions = {},
): Promise<PinterestDataset> {
  const accessToken = await loadAccessToken(config);
  const client = new PinterestClient(accessToken);
  const pageSize = options.pageSize ?? 100;
  const maxPinsPerBoard = options.maxPinsPerBoard ?? 250;
  const boards = await client.listBoards(pageSize, options.maxBoards ?? Number.POSITIVE_INFINITY);

  const boardDatasets: BoardDataset[] = [];
  for (const board of boards) {
    const boardPins = await client.listBoardPins(board.id, pageSize, maxPinsPerBoard);
    const pins = boardPins.map((pin) => toNormalizedPin(pin, board, "board"));
    const sections = options.includeSections === false ? [] : await client.listBoardSections(board.id, pageSize);

    const sectionDatasets: BoardDataset["sections"] = [];
    for (const section of sections) {
      const rawPins = await client.listBoardSectionPins(board.id, section.id, pageSize, maxPinsPerBoard);
      sectionDatasets.push({
        section,
        pins: rawPins.map((pin) => toNormalizedPin(pin, board, "section", section)),
      });
    }

    boardDatasets.push({ board, pins, sections: sectionDatasets });
  }

  const dataset: PinterestDataset = {
    fetchedAt: new Date().toISOString(),
    source: "pinterest-api",
    accountUrl: options.accountUrl,
    boards: boardDatasets,
  };

  if (options.outputPath) {
    await writeJsonFile(options.outputPath, dataset);
  }

  return dataset;
}

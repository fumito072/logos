export type JsonObject = Record<string, unknown>;

export interface PinterestToken {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  obtained_at: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string | null;
  privacy?: string;
  pin_count?: number;
  owner?: {
    username?: string;
  };
  raw?: JsonObject;
}

export interface PinterestBoardSection {
  id: string;
  name: string;
  raw?: JsonObject;
}

export interface PinterestPin {
  id?: string;
  title?: string | null;
  description?: string | null;
  alt_text?: string | null;
  link?: string | null;
  media?: unknown;
  dominant_color?: string | null;
  raw?: JsonObject;
}

export interface NormalizedPin {
  id: string;
  title: string;
  description: string;
  altText: string;
  link: string;
  imageUrl: string;
  dominantColor: string;
  boardId: string;
  boardName: string;
  sectionId?: string;
  sectionName?: string;
  source: "board" | "section";
}

export interface BoardDataset {
  board: PinterestBoard;
  pins: NormalizedPin[];
  sections: Array<{
    section: PinterestBoardSection;
    pins: NormalizedPin[];
  }>;
}

export interface PinterestDataset {
  fetchedAt: string;
  source: "pinterest-api" | "sample";
  accountUrl?: string;
  boards: BoardDataset[];
}

export interface PreferenceEvidence {
  totalBoards: number;
  totalPins: number;
  topTerms: Array<{ term: string; count: number }>;
  boardNames: string[];
  imageSamples: string[];
  notes: string[];
}

export interface PreferenceProfile {
  palette: string[];
  shape: string[];
  spacing: string[];
  lineWeight: string[];
  typography: string[];
  atmosphere: string[];
  avoid: string[];
  motifs: string[];
  logoDirection: string[];
  evidence: PreferenceEvidence;
}

export interface LogoGenerationOptions {
  brandName: string;
  tagline?: string;
  profile: PreferenceProfile;
  outputDir: string;
}

export interface GeneratedLogoAsset {
  path: string;
  kind: string;
}

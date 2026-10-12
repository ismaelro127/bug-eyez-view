import Dexie, { Table } from "dexie";

export type Article = {
  id: string;               // uuid
  title: string;
  url: string;
  source?: string;
  description?: string;
  image?: string;
  fetchedAt: number;        // Date.now()
  channelId?: string;       // which channel was active
  entities?: string[];      // NER terms
  clicks: number;           // 0 if never clicked
  readMs: number;           // accumulated read time
};

export type Interaction = {
  id?: number;
  type: "click" | "hover" | "open" | "tab";
  refId?: string;           // article id or entity key
  at: number;
  meta?: Record<string, any>;
};

export type Prefs = {
  id: "prefs";
  tone: "emerald" | "azure" | "gold" | "violet" | "crimson";
  theme: "glass" | "holo";
  soundVolume: number;      // 0..1
  soundscape: "spacey" | "soft" | "off";
  aiDefaultTab: "summary" | "news" | "programs" | "people" | "links";
  layout: {
    leftWidth: number;
    centerWidth: number;
    rightWidth: number;
    perspective: number;
    leftRotate: number;
    rightRotate: number;
    centerDepth: number;
    edgeDepth: number;
  };
  createdAt: number;
  updatedAt: number;
};

export type AdProfile = {
  id: "adProfile";
  categories: Record<string, number>; // e.g., { finance: 0.7, news: 0.9 }
  updatedAt: number;
};

export type Telemetry = {
  id?: number;
  at: number;
  kind: "session" | "api_err" | "crash" | "feature";
  data?: Record<string, any>;
};

export type Archive = {
  id: string;               // e.g. "news_week_2025_43.zip"
  weekKey: string;          // "2025-43"
  bytes: Uint8Array;        // zipped jsonl
  createdAt: number;
};

export class LocalIntelDB extends Dexie {
  articles!: Table<Article, string>;
  interactions!: Table<Interaction, number>;
  prefs!: Table<Prefs, string>;
  adProfile!: Table<AdProfile, string>;
  telemetry!: Table<Telemetry, number>;
  archives!: Table<Archive, string>;

  constructor() {
    super("LocalIntelDB");
    this.version(1).stores({
      articles: "id, fetchedAt, channelId",
      interactions: "++id, at, type, refId",
      prefs: "id",
      adProfile: "id",
      telemetry: "++id, at, kind",
      archives: "id, weekKey, createdAt",
    });
  }
}

export const db = new LocalIntelDB();

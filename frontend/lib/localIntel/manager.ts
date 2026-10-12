import { db, Article, Interaction, Prefs, AdProfile, Archive } from "./db";
import "os";
import JSZip from "jszip";
import CryptoJS from "crypto-js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekKeyOf(ts: number) {
  const d = new Date(ts);
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const day = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((d.getDay() + 1 + day) / 7);
  return `${d.getFullYear()}-${week}`;
}

export const LocalIntel = {
  /** Preferences **/
  async getPrefs(): Promise<Prefs> {
    const p = await db.prefs.get("prefs");
    if (p) return p;
    const def: Prefs = {
      id: "prefs",
      tone: "emerald",
      theme: "glass",
      soundVolume: 0.3,
      soundscape: "spacey",
      aiDefaultTab: "summary",
      layout: {
        leftWidth: 25,
        centerWidth: 50,
        rightWidth: 25,
        perspective: 1100,
        leftRotate: 18,
        rightRotate: -18,
        centerDepth: -25,
        edgeDepth: 40,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.prefs.put(def);
    return def;
  },

  async updatePrefs(patch: Partial<Prefs>) {
    const cur = await this.getPrefs();
    const next: Prefs = { ...cur, ...patch, updatedAt: Date.now() };
    await db.prefs.put(next);
    return next;
  },

  /** Ad profile **/
  async getAdProfile(): Promise<AdProfile> {
    const a = await db.adProfile.get("adProfile");
    if (a) return a;
    const def: AdProfile = { id: "adProfile", categories: {}, updatedAt: Date.now() };
    await db.adProfile.put(def);
    return def;
  },

  async bumpAdCategory(cat: string, weight = 0.1) {
    const ap = await this.getAdProfile();
    const prev = ap.categories[cat] || 0;
    ap.categories[cat] = Math.min(1, prev + weight);
    ap.updatedAt = Date.now();
    await db.adProfile.put(ap);
  },

  /** Articles (cache everything, clicked or not) **/
  async cacheArticles(list: Omit<Article, "id" | "fetchedAt" | "clicks" | "readMs">[]) {
    const ts = Date.now();
    const rows: Article[] = list.map((x) => ({
      id: crypto.randomUUID(),
      title: x.title,
      url: x.url,
      source: x.source,
      description: x.description,
      image: x.image,
      fetchedAt: ts,
      channelId: x.channelId,
      entities: x.entities || [],
      clicks: 0,
      readMs: 0,
    }));
    await db.articles.bulkAdd(rows);
    return rows;
  },

  async getRecentArticles(limit = 100) {
    return db.articles
      .orderBy("fetchedAt")
      .reverse()
      .limit(limit)
      .toArray();
  },

  async recordInteraction(ev: Interaction) {
    await db.interactions.add(ev);
    // Optional ad mapping via entities/metas:
    if (ev.type === "click" && ev.meta?.category) {
      await this.bumpAdCategory(ev.meta.category, 0.2);
    }
  },

  async clickArticle(id: string) {
    const a = await db.articles.get(id);
    if (!a) return;
    a.clicks += 1;
    await db.articles.put(a);
    await this.recordInteraction({ type: "click", refId: id, at: Date.now() });
  },

  async addReadTime(id: string, deltaMs: number) {
    const a = await db.articles.get(id);
    if (!a) return;
    a.readMs += deltaMs;
    await db.articles.put(a);
  },

  /** Weekly archive (zip older than 7 days but keep callable) **/
  async rotateWeeklyArchive() {
    const now = Date.now();
    const cutoff = now - WEEK_MS;
    const old = await db.articles.where("fetchedAt").below(cutoff).toArray();
    if (!old.length) return null;

    const wk = weekKeyOf(cutoff);
    const zip = new JSZip();
    // store as JSONL for streaming-friendliness
    const jsonl = old.map((o: Record<string, unknown>) => JSON.stringify(o)).join("\n");
    zip.file(`articles_${wk}.jsonl`, jsonl);

    const blob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const arc: Archive = {
      id: `news_week_${wk}.zip`,
      weekKey: wk,
      bytes: blob,
      createdAt: Date.now(),
    };
    await db.archives.put(arc);
    // delete old once archived
    await db.articles.bulkDelete(old.map((o: { id: string }) => o.id));
    return arc.id;
  },

  async listArchives() {
    return db.archives.orderBy("createdAt").reverse().toArray();
  },

  async getArchiveBytes(id: string) {
    const a = await db.archives.get(id);
    return a?.bytes || null;
  },

  /** Telemetry **/
  async log(kind: "session" | "api_err" | "crash" | "feature", data?: Record<string, any>) {
    await db.telemetry.add({ at: Date.now(), kind, data });
  },

  /** Export / Import / Clear **/
  async exportAll() {
    const [articles, interactions, prefs, adProfile, telemetry, archives] = await Promise.all([
      db.articles.toArray(),
      db.interactions.toArray(),
      db.prefs.toArray(),
      db.adProfile.toArray(),
      db.telemetry.toArray(),
      db.archives.toArray(),
    ]);
    return { articles, interactions, prefs, adProfile, telemetry, archives, exportedAt: Date.now() };
  },

  async importAll(payload: any) {
    if (payload.articles) await db.articles.bulkPut(payload.articles);
    if (payload.interactions) await db.interactions.bulkPut(payload.interactions);
    if (payload.prefs?.[0]) await db.prefs.put(payload.prefs[0]);
    if (payload.adProfile?.[0]) await db.adProfile.put(payload.adProfile[0]);
    if (payload.telemetry) await db.telemetry.bulkPut(payload.telemetry);
    if (payload.archives) await db.archives.bulkPut(payload.archives);
  },

  async clearAll() {
    await Promise.all([
      db.articles.clear(),
      db.interactions.clear(),
      db.prefs.clear(),
      db.adProfile.clear(),
      db.telemetry.clear(),
      db.archives.clear(),
    ]);
  },

  /** Optional AES encrypt/decrypt for prefs (if you want) **/
  encryptPrefs(prefs: Prefs, key: string) {
    const str = JSON.stringify(prefs);
    return CryptoJS.AES.encrypt(str, key).toString();
  },
  decryptPrefs(cipher: string, key: string): Prefs | null {
    try {
      const bytes = CryptoJS.AES.decrypt(cipher, key);
      const txt = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(txt);
    } catch {
      return null;
    }
  },
};

import { XMLParser } from "fast-xml-parser";
import fallback from "../data/fallback.json";
import type { RssItem } from "./types";
import { isSafeHttpsUrl } from "./github";

export const RSS_URL = "https://blog.zhicheng233.top/rss2.xml";

export function parseRssXml(xml: string): RssItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    processEntities: false,
  });
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return items.slice(0, 6).flatMap((item: Record<string, unknown>) => {
    const title = String(item.title ?? "").trim();
    const url = String(item.link ?? "").trim();
    const timestamp = Date.parse(String(item.pubDate ?? ""));
    if (!title || !isSafeHttpsUrl(url, "blog.zhicheng233.top")) return [];
    return [{
      title,
      url,
      publishedAt: Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString(),
    }];
  });
}

export async function loadRssItems(): Promise<RssItem[]> {
  try {
    const response = await fetch(RSS_URL, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`RSS returned ${response.status}`);
    const items = parseRssXml(await response.text());
    if (!items.length) throw new Error("RSS contained no valid items");
    return items;
  } catch (error) {
    console.warn("RSS unavailable; using bundled snapshot.", error);
    return fallback.rss as RssItem[];
  }
}

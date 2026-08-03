import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRssXml } from "../src/lib/rss";

describe("RSS parser", () => {
  it("returns only valid HTTPS posts from the blog host", () => {
    const xml = readFileSync(new URL("./fixtures/rss.xml", import.meta.url), "utf8");
    const posts = parseRssXml(xml);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ title: "Valid post", url: "https://blog.zhicheng233.top/post/valid" });
    expect(posts[0].publishedAt).toBe("2026-05-26T00:00:00.000Z");
  });
});

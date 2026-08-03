import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isSafeHttpsUrl, loadGitHubData, parseGraphqlPayload, parsePinnedHtml } from "../src/lib/github";

afterEach(() => vi.restoreAllMocks());

describe("GitHub pinned repository parser", () => {
  it("keeps owned and external pinned repositories", () => {
    const html = readFileSync(new URL("./fixtures/github-pinned.html", import.meta.url), "utf8");
    const repositories = parsePinnedHtml(html);
    expect(repositories).toHaveLength(2);
    expect(repositories[0]).toMatchObject({
      nameWithOwner: "zhicheng233/Example",
      language: "Python",
      stars: 1200,
      forks: 30,
    });
    expect(repositories[1].owner).toBe("someone");
  });

  it("rejects unsafe and off-host URLs", () => {
    expect(isSafeHttpsUrl("javascript:alert(1)", "github.com")).toBe(false);
    expect(isSafeHttpsUrl("https://example.com/repo", "github.com")).toBe(false);
    expect(isSafeHttpsUrl("https://github.com/owner/repo", "github.com")).toBe(true);
  });

  it("normalizes a GraphQL pinnedItems response", () => {
    const payload = JSON.parse(readFileSync(new URL("./fixtures/github-graphql.json", import.meta.url), "utf8"));
    const result = parseGraphqlPayload(payload);
    expect(result.source).toBe("graphql");
    expect(result.profile).toMatchObject({ login: "zhicheng233", followers: 60 });
    expect(result.repositories[0]).toMatchObject({
      nameWithOwner: "someone/shared-repo",
      owner: "someone",
      language: "TypeScript",
      stars: 42,
    });
  });

  it("falls back to the bundled snapshot when GitHub is offline", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await loadGitHubData();
    expect(result.source).toBe("snapshot");
    expect(result.repositories).toHaveLength(6);
  });
});

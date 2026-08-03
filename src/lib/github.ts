import { load } from "cheerio";
import fallback from "../data/fallback.json";
import type { GitHubProfile, PinnedRepository } from "./types";

const PROFILE_URL = "https://github.com/zhicheng233";
const GRAPHQL_URL = "https://api.github.com/graphql";

export interface GitHubData {
  profile: GitHubProfile;
  repositories: PinnedRepository[];
  source: "graphql" | "html" | "snapshot";
}

export function isSafeHttpsUrl(value: string, host?: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (!host || url.hostname === host);
  } catch {
    return false;
  }
}

function parseCompactNumber(value: string | undefined): number {
  if (!value) return 0;
  const normalized = value.trim().toLowerCase().replaceAll(",", "");
  const number = Number.parseFloat(normalized);
  if (!Number.isFinite(number)) return 0;
  if (normalized.endsWith("k")) return Math.round(number * 1_000);
  if (normalized.endsWith("m")) return Math.round(number * 1_000_000);
  return Math.round(number);
}

export function parsePinnedHtml(html: string): PinnedRepository[] {
  const $ = load(html);

  return $("li.pinned-item-list-item")
    .toArray()
    .slice(0, 6)
    .flatMap((element) => {
      const item = $(element);
      const repoAnchor = item
        .find('a[href^="/"]')
        .toArray()
        .map((anchor) => ({ anchor, href: $(anchor).attr("href") ?? "" }))
        .find(({ href }) => /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(href));

      if (!repoAnchor) return [];
      const nameWithOwner = repoAnchor.href.slice(1);
      const [owner, name] = nameWithOwner.split("/");
      const url = `https://github.com/${nameWithOwner}`;
      if (!owner || !name || !isSafeHttpsUrl(url, "github.com")) return [];

      const starText = item.find('a[href$="/stargazers"]').first().text();
      const forkText = item
        .find('a[href$="/forks"], a[href$="/network/members"]')
        .first()
        .text();

      return [{
        name,
        nameWithOwner,
        owner,
        url,
        description: item.find("p.pinned-item-desc").first().text().trim(),
        language: item.find('[itemprop="programmingLanguage"]').first().text().trim() || null,
        languageColor: item.find(".repo-language-color").first().attr("style")?.match(/#[0-9a-fA-F]{6}/)?.[0] ?? null,
        stars: parseCompactNumber(starText),
        forks: parseCompactNumber(forkText),
      }];
    });
}

function snapshot(): GitHubData {
  return {
    profile: fallback.profile as GitHubProfile,
    repositories: fallback.repositories as PinnedRepository[],
    source: "snapshot",
  };
}

async function fetchGraphql(token: string): Promise<GitHubData> {
  const query = `
    query ZCHomeProfile {
      user(login: "zhicheng233") {
        login name bio company location url
        followers { totalCount }
        pinnedItems(first: 6, types: [REPOSITORY]) {
          nodes {
            ... on Repository {
              name nameWithOwner url description stargazerCount forkCount
              owner { login }
              primaryLanguage { name color }
            }
          }
        }
      }
    }
  `;
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ZCHome-Build",
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`GitHub GraphQL returned ${response.status}`);

  const payload = await response.json() as {
    data?: { user?: Record<string, any> };
    errors?: unknown[];
  };
  return parseGraphqlPayload(payload);
}

export function parseGraphqlPayload(payload: {
  data?: { user?: Record<string, any> };
  errors?: unknown[];
}): GitHubData {
  const user = payload.data?.user;
  if (!user || payload.errors?.length) throw new Error("GitHub GraphQL response is incomplete");

  const repositories = (user.pinnedItems?.nodes ?? []).flatMap((repository: any) => {
    if (!repository?.nameWithOwner || !isSafeHttpsUrl(repository.url, "github.com")) return [];
    return [{
      name: repository.name,
      nameWithOwner: repository.nameWithOwner,
      owner: repository.owner.login,
      url: repository.url,
      description: repository.description ?? "",
      language: repository.primaryLanguage?.name ?? null,
      languageColor: repository.primaryLanguage?.color ?? null,
      stars: repository.stargazerCount ?? 0,
      forks: repository.forkCount ?? 0,
    } satisfies PinnedRepository];
  });
  if (!repositories.length) throw new Error("GitHub returned no pinned repositories");

  return {
    profile: {
      login: user.login,
      name: user.name ?? user.login,
      bio: user.bio ?? "",
      company: user.company ?? "",
      location: user.location ?? "",
      url: user.url,
      followers: user.followers?.totalCount ?? 0,
    },
    repositories,
    source: "graphql",
  };
}

async function fetchHtml(): Promise<GitHubData> {
  const response = await fetch(PROFILE_URL, {
    headers: { "User-Agent": "ZCHome-Build" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`GitHub profile returned ${response.status}`);
  const html = await response.text();
  const repositories = parsePinnedHtml(html);
  if (!repositories.length) throw new Error("GitHub profile contained no pinned repositories");
  return { ...snapshot(), repositories, source: "html" };
}

export async function loadGitHubData(): Promise<GitHubData> {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    try {
      return await fetchGraphql(token);
    } catch (error) {
      console.warn("GitHub GraphQL unavailable; using public profile.", error);
    }
  }

  try {
    return await fetchHtml();
  } catch (error) {
    console.warn("GitHub profile unavailable; using bundled snapshot.", error);
    return snapshot();
  }
}

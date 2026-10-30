export type Locale = "zh-CN" | "en";
export type ThemeMode = "system" | "light" | "dark";
export type WindowId = "about" | "projects" | "blog" | "contact" | "classlist";

export interface PinnedRepository {
  name: string;
  nameWithOwner: string;
  owner: string;
  url: string;
  description: string;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
}

export interface GitHubProfile {
  login: string;
  name: string;
  bio: string;
  company: string;
  location: string;
  url: string;
  followers: number;
}

export interface RssItem {
  title: string;
  url: string;
  publishedAt: string;
}

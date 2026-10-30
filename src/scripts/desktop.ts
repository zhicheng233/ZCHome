import { animate } from "motion";
import {
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Blocks,
  BookOpenText,
  Building2,
  CalendarDays,
  CodeXml,
  Copy,
  GitFork,
  Heart,
  HeartHandshake,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  MonitorCog,
  Moon,
  RefreshCw,
  Rss,
  Send,
  Star,
  Sun,
  Terminal,
  UserRound,
  Users,
  Video,
  X,
  createIcons,
} from "lucide";
import type { Locale, RssItem, ThemeMode, WindowId } from "../lib/types";

const iconSet = {
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Blocks,
  BookOpenText,
  Building2,
  CalendarDays,
  CodeXml,
  Copy,
  GitFork,
  Heart,
  HeartHandshake,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  MonitorCog,
  Moon,
  RefreshCw,
  Rss,
  Send,
  Star,
  Sun,
  Terminal,
  UserRound,
  Users,
  Video,
  X,
};

const windowIds: WindowId[] = ["about", "projects", "blog", "contact", "classlist"];
const translationNode = document.querySelector<HTMLScriptElement>("#zchome-translations");
const rssNode = document.querySelector<HTMLScriptElement>("#zchome-rss");
const translations = JSON.parse(translationNode?.textContent || "{}") as Record<Locale, Record<string, string>>;
const rssData = JSON.parse(rssNode?.textContent || '{"url":"","items":[]}') as { url: string; items: RssItem[] };
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let zIndex = 20;
let locale: Locale = resolveLocale();
let theme: ThemeMode = resolveTheme();
let feedState: "loading" | "ready" | "fallback" = "loading";

function resolveLocale(): Locale {
  try {
    const stored = localStorage.getItem("zchome.locale");
    if (stored === "zh-CN" || stored === "en") return stored;
  } catch {}
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function resolveTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem("zchome.theme");
    if (stored === "system" || stored === "light" || stored === "dark") return stored;
  } catch {}
  return "system";
}

function t(key: string): string {
  return translations[locale]?.[key] ?? translations["zh-CN"]?.[key] ?? key;
}

function refreshIcons(_root: HTMLElement | Document = document): void {
  createIcons({ icons: iconSet, attrs: { "aria-hidden": "true" } });
}

function applyLocale(nextLocale: Locale, persist = true): void {
  locale = nextLocale;
  document.documentElement.lang = locale;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (key) element.textContent = t(key);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((element) => {
    const key = element.dataset.i18nAria;
    if (key) element.setAttribute("aria-label", t(key));
  });
  document.querySelectorAll<HTMLElement>("[data-tooltip]").forEach((element) => {
    const key = element.matches("[data-theme-toggle]") ? `theme.${theme}` : element.matches("[data-language-toggle]") ? "language.switch" : element.matches(".dock-support") ? "contact.support" : "";
    if (key) element.dataset.tooltip = t(key);
  });
  const languageLabel = document.querySelector<HTMLElement>("[data-language-label]");
  if (languageLabel) languageLabel.textContent = locale === "zh-CN" ? "EN" : "中";
  document.querySelectorAll<HTMLTimeElement>("[data-published-at]").forEach((element) => {
    const timestamp = element.dataset.publishedAt;
    if (!timestamp) return;
    element.textContent = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(timestamp));
  });
  updateFeedStatus(feedState);
  if (persist) {
    try { localStorage.setItem("zchome.locale", locale); } catch {}
  }
}

function applyTheme(nextTheme: ThemeMode, persist = true): void {
  theme = nextTheme;
  document.documentElement.dataset.theme = theme;
  const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
  if (toggle) {
    const icon = theme === "light" ? "sun" : theme === "dark" ? "moon" : "monitor-cog";
    toggle.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`;
    toggle.setAttribute("aria-label", t(`theme.${theme}`));
    toggle.dataset.tooltip = t(`theme.${theme}`);
    refreshIcons(toggle);
  }
  if (persist) {
    try { localStorage.setItem("zchome.theme", theme); } catch {}
  }
}

async function transitionTheme(nextTheme: ThemeMode, origin: HTMLElement): Promise<void> {
  if (origin.dataset.themeSwitching === "true") return;
  origin.dataset.themeSwitching = "true";

  const transitionDocument = document as Document & {
    startViewTransition?: (callback: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };

  if (reduceMotion.matches || !transitionDocument.startViewTransition) {
    applyTheme(nextTheme);
    const shell = document.querySelector<HTMLElement>("#desktop-shell");
    if (shell && !reduceMotion.matches) {
      shell.animate(
        [{ opacity: 0.72, filter: "brightness(0.86)" }, { opacity: 1, filter: "brightness(1)" }],
        { duration: 340, easing: "cubic-bezier(.16,1,.3,1)" },
      );
    }
    delete origin.dataset.themeSwitching;
    return;
  }

  const bounds = origin.getBoundingClientRect();
  const x = bounds.left + bounds.width / 2;
  const y = bounds.top + bounds.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  try {
    const transition = transitionDocument.startViewTransition(() => applyTheme(nextTheme));
    await transition.ready;
    await document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
      },
      {
        duration: 620,
        easing: "cubic-bezier(.16,1,.3,1)",
        pseudoElement: "::view-transition-new(root)",
      },
    ).finished;
    await transition.finished;
  } finally {
    delete origin.dataset.themeSwitching;
  }
}

function windowElement(id: WindowId): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-window="${id}"]`);
}

function focusWindow(id: WindowId): void {
  const target = windowElement(id);
  if (!target) return;
  zIndex += 1;
  target.style.zIndex = String(zIndex);
  document.querySelectorAll<HTMLElement>("[data-window]").forEach((element) => element.classList.toggle("is-active", element === target));
  document.querySelectorAll<HTMLElement>("[data-open-window]").forEach((button) => button.classList.toggle("is-current", button.dataset.openWindow === id));
}

function syncDock(id: WindowId, running: boolean): void {
  document.querySelector<HTMLElement>(`[data-open-window="${id}"]`)?.classList.toggle("is-running", running);
}

function openWindow(id: WindowId, updateHash = true): void {
  const target = windowElement(id);
  if (!target) return;

  target.querySelectorAll<HTMLIFrameElement>("[data-embed-src]").forEach((frame) => {
    if (!frame.src && frame.dataset.embedSrc) frame.src = frame.dataset.embedSrc;
  });

  if (window.matchMedia("(max-width: 700px)").matches) {
    windowIds.forEach((otherId) => {
      if (otherId === id) return;
      const other = windowElement(otherId);
      if (other) {
        other.hidden = true;
        other.dataset.open = "false";
      }
      syncDock(otherId, false);
    });
  }

  target.hidden = false;
  target.dataset.open = "true";
  syncDock(id, true);
  focusWindow(id);
  if (!reduceMotion.matches) {
    animate(target, { opacity: [0, 1], scale: [0.94, 1], y: [14, 0] }, { duration: 0.44, ease: [0.16, 1, 0.3, 1] });
  }
  if (updateHash && location.hash !== `#${id}`) history.pushState({ window: id }, "", `#${id}`);
}

function hideWindow(id: WindowId, close: boolean): void {
  const target = windowElement(id);
  if (!target) return;
  const finish = () => {
    target.hidden = true;
    target.dataset.open = "false";
    target.style.opacity = "";
    target.style.transform = "";
    if (close) syncDock(id, false);
    document.querySelector<HTMLElement>(`[data-open-window="${id}"]`)?.classList.remove("is-current");
    if (window.matchMedia("(max-width: 700px)").matches) openWindow("about");
  };
  if (reduceMotion.matches) finish();
  else animate(target, { opacity: [1, 0], scale: [1, 0.92], y: [0, 18] }, { duration: 0.22, ease: [0.4, 0, 1, 1] }).finished.then(finish);
}

function initializeWindows(): void {
  document.querySelectorAll<HTMLElement>("[data-window]").forEach((element) => {
    const id = element.dataset.window as WindowId;
    element.addEventListener("pointerdown", () => focusWindow(id));
    element.querySelectorAll<HTMLButtonElement>("[data-window-action]").forEach((button) => {
      button.addEventListener("click", () => hideWindow(id, button.dataset.windowAction === "close"));
    });
    initializeDrag(element, id);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-open-window]").forEach((button) => {
    button.addEventListener("click", () => openWindow(button.dataset.openWindow as WindowId));
  });

  const hashId = location.hash.slice(1) as WindowId;
  if (windowIds.includes(hashId)) openWindow(hashId, false);
  else focusWindow("about");

  window.addEventListener("popstate", () => {
    const nextId = location.hash.slice(1) as WindowId;
    if (windowIds.includes(nextId)) openWindow(nextId, false);
  });
}

function initializeDrag(target: HTMLElement, id: WindowId): void {
  const handle = target.querySelector<HTMLElement>("[data-drag-handle]");
  if (!handle) return;
  let startPointerX = 0;
  let startPointerY = 0;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let dragging = false;

  handle.addEventListener("pointerdown", (event) => {
    if (window.matchMedia("(max-width: 700px)").matches || (event.target as HTMLElement).closest("button")) return;
    dragging = true;
    startPointerX = event.clientX;
    startPointerY = event.clientY;
    startX = currentX;
    startY = currentY;
    handle.setPointerCapture(event.pointerId);
    focusWindow(id);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const workspace = document.querySelector<HTMLElement>("#workspace")?.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (!workspace) return;
    const dx = event.clientX - startPointerX;
    const dy = event.clientY - startPointerY;
    const nextX = startX + dx;
    const nextY = startY + dy;
    const minX = currentX + workspace.left - rect.left + 8;
    const maxX = currentX + workspace.right - rect.right - 8;
    const minY = currentY + workspace.top - rect.top + 8;
    const maxY = currentY + workspace.bottom - rect.bottom - 8;
    currentX = Math.min(Math.max(nextX, minX), maxX);
    currentY = Math.min(Math.max(nextY, minY), maxY);
    target.style.translate = `${currentX}px ${currentY}px`;
  });

  const release = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    target.animate(
      [{ filter: "brightness(1.04)" }, { filter: "brightness(1)" }],
      { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  };
  handle.addEventListener("pointerup", release);
  handle.addEventListener("pointercancel", release);
}

function updateFeedStatus(state: typeof feedState): void {
  feedState = state;
  const status = document.querySelector<HTMLElement>("[data-feed-status]");
  const message = document.querySelector<HTMLElement>("[data-feed-message]");
  const retry = document.querySelector<HTMLButtonElement>("[data-feed-retry]");
  if (!status || !message || !retry) return;
  status.dataset.feedStatus = state;
  message.textContent = t(state === "ready" ? "blog.ready" : state === "fallback" ? "blog.fallback" : "blog.loading");
  retry.hidden = state !== "fallback";
}

function parseFeed(xml: string): RssItem[] {
  const documentXml = new DOMParser().parseFromString(xml, "application/xml");
  if (documentXml.querySelector("parsererror")) return [];
  return [...documentXml.querySelectorAll("item")].slice(0, 6).flatMap((item) => {
    const title = item.querySelector("title")?.textContent?.trim() ?? "";
    const urlText = item.querySelector("link")?.textContent?.trim() ?? "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() ?? "";
    try {
      const url = new URL(urlText);
      if (!title || url.protocol !== "https:" || url.hostname !== "blog.zhicheng233.top") return [];
      const parsedDate = Date.parse(pubDate);
      return [{ title, url: url.href, publishedAt: Number.isNaN(parsedDate) ? "" : new Date(parsedDate).toISOString() }];
    } catch {
      return [];
    }
  });
}

function renderPosts(items: RssItem[]): void {
  const list = document.querySelector<HTMLOListElement>("[data-post-list]");
  if (!list) return;
  list.replaceChildren(...items.map((post, index) => {
    const item = document.createElement("li");
    const count = document.createElement("span");
    count.className = "post-index";
    count.textContent = String(index + 1).padStart(2, "0");
    const copy = document.createElement("div");
    const date = document.createElement("time");
    date.dateTime = post.publishedAt;
    date.dataset.publishedAt = post.publishedAt;
    date.textContent = post.publishedAt ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(post.publishedAt)) : "";
    const title = document.createElement("h3");
    title.textContent = post.title;
    copy.append(date, title);
    const link = document.createElement("a");
    link.href = post.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", `${t("blog.read")}: ${post.title}`);
    link.innerHTML = '<i data-lucide="arrow-up-right" aria-hidden="true"></i>';
    item.append(count, copy, link);
    return item;
  }));
  refreshIcons(list);
}

async function refreshFeed(): Promise<void> {
  updateFeedStatus("loading");
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(rssData.url, { signal: controller.signal, cache: "no-cache" });
    window.clearTimeout(timeout);
    if (!response.ok) throw new Error(`RSS returned ${response.status}`);
    const items = parseFeed(await response.text());
    if (!items.length) throw new Error("RSS contained no valid posts");
    renderPosts(items);
    updateFeedStatus("ready");
  } catch {
    renderPosts(rssData.items);
    updateFeedStatus("fallback");
  }
}

function initializeControls(): void {
  document.querySelector<HTMLElement>("[data-theme-toggle]")?.addEventListener("click", (event) => {
    const order: ThemeMode[] = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? ["system", "light", "dark"]
      : ["system", "dark", "light"];
    void transitionTheme(order[(order.indexOf(theme) + 1) % order.length], event.currentTarget as HTMLElement);
  });
  document.querySelector<HTMLElement>("[data-language-toggle]")?.addEventListener("click", () => applyLocale(locale === "zh-CN" ? "en" : "zh-CN"));
  document.querySelector<HTMLButtonElement>("[data-feed-retry]")?.addEventListener("click", refreshFeed);
  document.querySelector<HTMLButtonElement>("[data-copy-email]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const value = button.dataset.copyEmail ?? "";
    try {
      await navigator.clipboard.writeText(value);
      const label = button.querySelector("span");
      if (label) label.textContent = t("contact.copied");
      window.setTimeout(() => { if (label) label.textContent = t("contact.copy"); }, 1_500);
    } catch {
      location.href = `mailto:${value}`;
    }
  });
}

function initializeLighting(): void {
  if (reduceMotion.matches) return;
  const shell = document.querySelector<HTMLElement>("#desktop-shell");
  const portrait = document.querySelector<HTMLElement>(".portrait-stage");
  if (!shell) return;
  let frame = 0;
  shell.addEventListener("pointermove", (event) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      shell.style.setProperty("--pointer-x", `${(event.clientX / innerWidth) * 100}%`);
      shell.style.setProperty("--pointer-y", `${(event.clientY / innerHeight) * 100}%`);
      if (portrait && innerWidth > 700) {
        const x = (event.clientX / innerWidth - 0.5) * 10;
        const y = (event.clientY / innerHeight - 0.5) * 8;
        portrait.style.setProperty("--portrait-x", `${x}px`);
        portrait.style.setProperty("--portrait-y", `${y}px`);
        portrait.style.setProperty("--backplate-x", `${x * -0.45}px`);
        portrait.style.setProperty("--backplate-y", `${y * -0.45}px`);
      }
      frame = 0;
    });
  });
  shell.addEventListener("pointerleave", () => {
    if (!portrait) return;
    portrait.style.setProperty("--portrait-x", "0px");
    portrait.style.setProperty("--portrait-y", "0px");
    portrait.style.setProperty("--backplate-x", "0px");
    portrait.style.setProperty("--backplate-y", "0px");
  });
}

refreshIcons();
applyTheme(theme, false);
applyLocale(locale, false);
initializeWindows();
initializeControls();
initializeLighting();
refreshFeed();

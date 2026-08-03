import { expect, test } from "@playwright/test";

test("opens, minimizes, restores, and deep-links windows", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-window="about"]')).toBeVisible();
  await page.locator('[data-open-window="projects"]').click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator('[data-window="projects"]')).toBeVisible();

  if ((page.viewportSize()?.width ?? 0) > 700) {
    await page.locator('[data-window="projects"] [data-window-action="minimize"]').click();
    await expect(page.locator('[data-window="projects"]')).toBeHidden();
    await page.locator('[data-open-window="projects"]').click();
    await expect(page.locator('[data-window="projects"]')).toBeVisible();
  }
});

test("persists locale and theme preferences", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("zchome.locale", "zh-CN");
    localStorage.setItem("zchome.theme", "system");
  });
  await page.reload();
  await page.locator("[data-language-toggle]").click();
  await expect(page.locator('[data-i18n="about.title"]')).toHaveText("I'm ZCROM");
  await page.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("animates theme changes from the toggle origin", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop project only");
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("zchome.theme", "system"));
  await page.reload();
  await page.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("[data-theme-toggle]")).toHaveAttribute("data-theme-switching", "true");
  await expect(page.locator("[data-theme-toggle]")).not.toHaveAttribute("data-theme-switching", "true", { timeout: 2_000 });
});

test("renders feed or its safe snapshot", async ({ page }) => {
  await page.goto("/#blog");
  await expect(page.locator("[data-post-list] li")).toHaveCount(6);
  await expect(page.locator("[data-feed-status]")).toHaveAttribute("data-feed-status", /ready|fallback/);
});

test("uses the embedded RSS snapshot when the live feed is offline", async ({ page }) => {
  await page.route("https://blog.zhicheng233.top/rss2.xml", (route) => route.abort());
  await page.goto("/#blog");
  await expect(page.locator("[data-feed-status]")).toHaveAttribute("data-feed-status", "fallback");
  await expect(page.locator("[data-post-list] li")).toHaveCount(6);
});

test("keeps the desktop chrome inside the viewport", async ({ page }) => {
  await page.goto("/#projects");
  const layout = await page.evaluate(() => {
    const dock = document.querySelector(".app-dock")?.getBoundingClientRect();
    const bar = document.querySelector(".system-bar")?.getBoundingClientRect();
    return {
      documentFits: document.documentElement.scrollWidth <= window.innerWidth,
      dockFits: !!dock && dock.left >= 0 && dock.right <= window.innerWidth,
      barFits: !!bar && bar.left >= 0 && bar.right <= window.innerWidth,
    };
  });
  expect(layout).toEqual({ documentFits: true, dockFits: true, barFits: true });
});

test("respects reduced motion", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop project only");
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator(".ambient-light")).toHaveCSS("display", "none");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
});

test("keeps the portrait centered across locales and themes while preserving parallax", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop project only");
  await page.goto("/#about");

  for (const [locale, theme] of [["zh-CN", "light"], ["zh-CN", "dark"], ["en", "light"], ["en", "dark"]]) {
    await page.evaluate(([nextLocale, nextTheme]) => {
      localStorage.setItem("zchome.locale", nextLocale);
      localStorage.setItem("zchome.theme", nextTheme);
    }, [locale, theme]);
    await page.reload();

    const metrics = await page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>(".portrait-stage")!.getBoundingClientRect();
      const picture = document.querySelector<HTMLElement>(".portrait-stage picture")!.getBoundingClientRect();
      const heading = document.querySelector<HTMLElement>(".about-copy h1")!;
      const style = getComputedStyle(heading);
      return {
        centerDeltaX: Math.abs(stage.left + stage.width / 2 - picture.left - picture.width / 2),
        centerDeltaY: Math.abs(stage.top + stage.height / 2 - picture.top - picture.height / 2),
        headingLines: Math.round(heading.getBoundingClientRect().height / Number.parseFloat(style.lineHeight)),
        windowTitleSize: Number.parseFloat(getComputedStyle(document.querySelector<HTMLElement>(".window-title")!).fontSize),
      };
    });
    expect(metrics.centerDeltaX).toBeLessThanOrEqual(2);
    expect(metrics.centerDeltaY).toBeLessThanOrEqual(2);
    expect(metrics.headingLines).toBe(1);
    if (locale === "zh-CN") expect(metrics.windowTitleSize).toBeGreaterThanOrEqual(14);
  }

  await page.mouse.move(10, 200);
  await expect.poll(() => page.locator(".portrait-stage").evaluate((element) => getComputedStyle(element).getPropertyValue("--portrait-x").trim())).not.toBe("0px");
  await page.locator("#desktop-shell").dispatchEvent("pointerleave");
  await expect.poll(() => page.locator(".portrait-stage").evaluate((element) => getComputedStyle(element).getPropertyValue("--portrait-x").trim())).toBe("0px");
});

test("mobile mode keeps a single application visible", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile project only");
  await page.goto("/");
  await page.locator('[data-open-window="contact"]').click();
  await expect(page.locator('[data-window="contact"]')).toBeVisible();
  await expect(page.locator('[data-window="about"]')).toBeHidden();
});

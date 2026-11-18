import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { RAO_FILES, fillLoadCases, fillPoint, runFlow, uploadFiles, waitForApp } from "./helpers.js";

const TAGS = ["wcag2a", "wcag2aa", "wcag2aaa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function expectNoViolations(page, where) {
  await page.evaluate(() => Promise.all(
    document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => null)),
  ));
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const report = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`);
  expect.soft(report, `accessibility problems on ${where}`).toEqual([]);
}

for (const scheme of ["light", "dark"]) {
  test(`every step passes axe in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
    await expectNoViolations(page, `upload (${scheme})`);

    await uploadFiles(page);
    await expectNoViolations(page, `upload with files (${scheme})`);
    await page.getByRole("button", { name: "Continue to conditions" }).click();
    await page.getByRole("button", { name: "Continue to point" }).click();
    await expectNoViolations(page, `conditions with errors (${scheme})`);

    await fillLoadCases(page);
    await page.getByRole("button", { name: "Continue to point" }).click();
    await page.getByRole("button", { name: "Calculate envelope" }).click();
    await expectNoViolations(page, `point with errors (${scheme})`);

    await fillPoint(page);
    await page.getByRole("button", { name: "Calculate envelope" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Envelope results/ })).toBeVisible();
    await expectNoViolations(page, `results (${scheme})`);
  });
}

test.describe("keyboard", () => {
  test("skip link is the first stop and jumps to the content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Select files" })).toBeEnabled();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("the whole flow works with the keyboard only", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    const select = page.getByRole("button", { name: "Select files" });
    await select.focus();
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await (await chooser).setFiles(RAO_FILES);
    await expect(select).toBeEnabled();

    await page.getByRole("button", { name: "Continue to conditions" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();

    await page.getByLabel("LCG (m) for LCMIN").focus();
    const values = ["148.5", "0", "13.2", "150.2", "0", "14.1", "158.6", "0.4", "15.3", "160", "0", "16"];
    for (const [i, v] of values.entries()) {
      await page.keyboard.type(v);
      if (i < values.length - 1) await page.keyboard.press("Tab");
    }
    await expect(page.getByLabel("KG (m) for LCMAX")).toBeFocused();

    await page.getByRole("button", { name: "Continue to point" }).focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("Point name").focus();
    for (const v of ["Helideck", "0", "0", "66"]) {
      await page.keyboard.type(v);
      await page.keyboard.press("Tab");
    }
    await expect(page.getByLabel("Z (m)", { exact: true })).toHaveValue("66");
    await page.getByLabel("Z (m)", { exact: true }).press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Envelope results: Helideck" })).toBeVisible();
  });

  test("error summary takes focus and its links move to the field", async ({ page }) => {
    await runFlow(page);
    await page.getByRole("link", { name: "Change point" }).click();
    await page.getByLabel("Y (m)", { exact: true }).fill("");
    await page.getByRole("button", { name: "Calculate envelope" }).click();
    const summary = page.locator(".error-summary");
    await expect(summary).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Y (m)", { exact: true })).toBeFocused();
  });

  test("focus is always visible", async ({ page }) => {
    await runFlow(page);
    await page.locator("body").focus();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const ring = await page.evaluate(() => {
        const el = document.activeElement;
        if (el === document.body) return { visible: true };
        const s = getComputedStyle(el);
        return { tag: el.tagName, text: el.textContent.trim().slice(0, 30), visible: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== "none" };
      });
      expect.soft(ring.visible, `no focus ring on ${ring.tag} "${ring.text}"`).toBe(true);
    }
  });

  test("units switch with the arrow keys", async ({ page }) => {
    await runFlow(page);
    await page.getByRole("radio", { name: "m/s²" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "g", exact: true })).toBeChecked();
  });
});

test.describe("mobile menu", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens on the right and closes on Escape, outside click and link", async ({ page }) => {
    await page.goto("/");
    const button = page.locator('[aria-controls="mobile-menu"]');
    const panel = page.locator("#mobile-menu");

    await button.click();
    await expect(panel).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect.poll(async () => {
      const box = await panel.boundingBox();
      return Math.round(box.x + box.width);
    }, { message: "menu should be pinned to the right edge" }).toBe(390);
    expect((await panel.boundingBox()).x).toBeGreaterThan(0);
    await expect(panel.getByRole("link").first()).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(button).toBeFocused();

    await button.click();
    await page.mouse.click(20, 600);
    await expect(panel).toBeHidden();

    await button.click();
    await panel.getByRole("link", { name: "Acceleration envelope" }).click();
    await expect(panel).toBeHidden();
  });

  test("keeps focus inside while open", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const panel = page.locator("#mobile-menu");
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      expect(await panel.evaluate((p) => p.contains(document.activeElement))).toBe(true);
    }
  });

  test("no page scrolls sideways on a phone", async ({ page }) => {
    await runFlow(page);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(wide).toBeLessThanOrEqual(390);
  });
});

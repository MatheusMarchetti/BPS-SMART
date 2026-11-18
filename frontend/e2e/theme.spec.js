import { expect, test } from "@playwright/test";

const background = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("follows the system setting on the first visit", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Light mode" })).toBeVisible();
});

test("the toggle switches and remembers the theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const light = await background(page);

  await page.getByRole("button", { name: "Dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dark = await background(page);
  expect(dark).not.toBe(light);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("light mode is not glaring white", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const [r, g, b] = (await background(page)).match(/\d+/g).map(Number);
  expect(Math.min(r, g, b), `page background is ${r}, ${g}, ${b}`).toBeLessThan(250);
});

test("the PDF is always black on white, even in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.emulateMedia({ media: "print", colorScheme: "dark" });
  expect(await background(page)).toBe("rgb(255, 255, 255)");
});

import { expect, test } from "@playwright/test";
import { LOAD_CASES, runFlow } from "./helpers.js";

const withComma = Object.fromEntries(
  Object.entries(LOAD_CASES).map(([name, cg]) => [
    name,
    Object.fromEntries(Object.entries(cg).map(([k, v]) => [k, v.replace(".", ",")])),
  ]),
);

test("accepts comma decimals", async ({ page }) => {
  await runFlow(page, {
    loadCases: withComma,
    point: { name: "Process module", x: "180,5", y: "-15,25", z: "45,0" },
  });
  await expect(page.getByText("X 180.5, Y -15.25, Z 45 m")).toBeVisible();
});

test("accepts dot decimals", async ({ page }) => {
  await runFlow(page, { point: { name: "Process module", x: "180.5", y: "-15.25", z: "45.0" } });
  await expect(page.getByText("X 180.5, Y -15.25, Z 45 m")).toBeVisible();
});

test("rejects text that is not a number", async ({ page }) => {
  await runFlow(page);
  await page.getByRole("link", { name: "Change point" }).click();
  await page.getByLabel("Z (m)", { exact: true }).fill("12,3,4");
  await page.getByRole("button", { name: "Calculate envelope" }).click();
  await expect(page.getByRole("link", { name: "Enter a number for point Z" })).toBeVisible();
});

test("accepts negative values typed with comma or dot", async ({ page }) => {
  await runFlow(page, {
    loadCases: { ...LOAD_CASES, LCINT2: { lcg: "158.6", tcg: "-0,4", kg: "15.3" } },
    point: { name: "Riser balcony", x: "-12,5", y: "-15.25", z: "-3,0" },
  });
  await expect(page.getByText("X -12.5, Y -15.25, Z -3 m")).toBeVisible();
});

test("numeric fields open a keyboard that has the minus key", async ({ page }) => {
  await runFlow(page);
  await page.getByRole("link", { name: "Change point" }).click();
  const z = page.getByLabel("Z (m)", { exact: true });
  await expect(z).toHaveAttribute("inputmode", "text");
  await z.fill("");
  await z.pressSequentially("-7,5");
  await expect(z).toHaveValue("-7,5");
  await page.getByRole("button", { name: "Calculate envelope" }).click();
  await expect(page.getByText("X 124, Y 23, Z -7.5 m")).toBeVisible();
});

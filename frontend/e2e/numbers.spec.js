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

import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
export const fixture = (name) => path.join(here, "fixtures", name);

export const RAO_FILES = [
  "synthetic_LCMIN_table1.txt",
  "synthetic_LCINT1_table1.txt",
  "synthetic_LCINT1_table2.txt",
  "synthetic_LCINT2_table2.txt",
  "synthetic_LCMAX_table3.txt",
].map(fixture);

export const LOAD_CASES = {
  LCMIN: { lcg: "148.5", tcg: "0", kg: "13.2" },
  LCINT1: { lcg: "150.2", tcg: "0", kg: "14.1" },
  LCINT2: { lcg: "158.6", tcg: "0.4", kg: "15.3" },
  LCMAX: { lcg: "160.0", tcg: "0", kg: "16.0" },
};

export const POINT = { name: "Crane pedestal", x: "124", y: "23", z: "54" };

export async function waitForApp(page) {
  await expect(page.getByText("Accepted format: .txt")).toBeVisible({ timeout: 15_000 });
}

export async function uploadFiles(page, files = RAO_FILES) {
  await waitForApp(page);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Select files" }).click();
  await (await chooser).setFiles(files);
  await expect(page.getByRole("button", { name: "Select files" })).toBeEnabled({ timeout: 60_000 });
}

export async function fillLoadCases(page, values = LOAD_CASES) {
  for (const [name, cg] of Object.entries(values)) {
    for (const key of ["lcg", "tcg", "kg"]) {
      await page.getByLabel(`${key.toUpperCase()} (m) for ${name}`).fill(cg[key]);
    }
  }
}

export async function fillPoint(page, point = POINT) {
  await page.getByLabel("Point name").fill(point.name);
  await page.getByLabel("X (m)", { exact: true }).fill(point.x);
  await page.getByLabel("Y (m)", { exact: true }).fill(point.y);
  await page.getByLabel("Z (m)", { exact: true }).fill(point.z);
}

export async function runFlow(page, { files = RAO_FILES, loadCases = LOAD_CASES, point = POINT } = {}) {
  await page.goto("/");
  await uploadFiles(page, files);
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Review conditions" })).toBeVisible();
  await fillLoadCases(page, loadCases);
  await page.getByRole("button", { name: "Continue to point" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Define point" })).toBeVisible();
  await fillPoint(page, point);
  await page.getByRole("button", { name: "Calculate envelope" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Envelope results: ${point.name || "Point"}` })).toBeVisible();
}

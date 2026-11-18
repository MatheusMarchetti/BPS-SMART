import { expect, test } from "@playwright/test";
import { POINT, RAO_FILES, fillLoadCases, fixture, runFlow, uploadFiles } from "./helpers.js";

test.describe("4-step flow", () => {
  test("reads the RAO files and lists the load cases", async ({ page }) => {
    await page.goto("/");
    await uploadFiles(page, [...RAO_FILES, fixture("not-a-rao.txt")]);

    const table = page.getByRole("table", { name: /RAO files added/ });
    await expect(table.getByRole("row")).toHaveCount(RAO_FILES.length + 2);
    await expect(table.getByText("Read", { exact: true })).toHaveCount(RAO_FILES.length);
    await expect(table.getByText("Error", { exact: true })).toHaveCount(1);
    await expect(page.getByText("5 files ready. 1 file with an error will be skipped.")).toBeVisible();

    await page.getByRole("button", { name: "Remove not-a-rao.txt" }).click();
    await expect(table.getByText("Error", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Continue to conditions" }).click();
    const cases = page.getByRole("table", { name: /Load cases found/ });
    for (const name of ["LCMIN", "LCINT1", "LCINT2", "LCMAX"]) {
      await expect(cases.getByRole("rowheader", { name })).toBeVisible();
    }
  });

  test("blocks each step until it is complete", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Continue to conditions" }).click();
    await expect(page.getByRole("link", { name: "Add at least one valid RAO file" })).toBeVisible();

    await uploadFiles(page);
    await page.getByRole("button", { name: "Continue to conditions" }).click();
    await page.getByRole("button", { name: "Continue to point" }).click();
    await expect(page.getByText("Fix 12 fields to continue")).toBeVisible();
    await expect(page.getByRole("link", { name: "LCINT1: enter the LCG" })).toBeVisible();

    await fillLoadCases(page);
    await expect(page.getByText(/Fix \d+ fields? to continue/)).toHaveCount(0);
    await page.getByRole("button", { name: "Continue to point" }).click();

    await page.getByLabel("X (m)", { exact: true }).fill("abc");
    await page.getByRole("button", { name: "Calculate envelope" }).click();
    for (const axis of ["X", "Y", "Z"]) {
      await expect(page.getByRole("link", { name: `Enter a number for point ${axis}` })).toBeVisible();
    }
    await expect(page.getByLabel("X (m)", { exact: true })).toHaveAttribute("aria-invalid", "true");
  });

  test("calculates the envelope and switches units", async ({ page }) => {
    await runFlow(page);

    const table = page.getByRole("table", { name: /Maximum acceleration per axis/ });
    await expect(table.getByRole("rowheader")).toHaveText(["Longitudinal ax", "Transverse ay", "Vertical az"]);
    await expect(page.getByText(`X ${POINT.x}, Y ${POINT.y}, Z ${POINT.z} m`)).toBeVisible();

    const first = table.getByRole("row").nth(1).getByRole("cell").first();
    const inMs2 = Number(await first.innerText());
    await page.getByText("g", { exact: true }).click();
    await expect(table.getByRole("columnheader", { name: "Max acceleration (g)" })).toBeVisible();
    const inG = Number(await first.innerText());
    expect(inG).toBeCloseTo(inMs2 / 9.80665, 2);
  });

  test("going back keeps what was typed", async ({ page }) => {
    await runFlow(page);
    await page.getByRole("link", { name: "Change point" }).click();
    await expect(page.getByLabel("X (m)", { exact: true })).toHaveValue(POINT.x);
    await page.getByRole("link", { name: "Back to conditions" }).click();
    await expect(page.getByLabel("LCG (m) for LCMIN")).toHaveValue("148.5");
  });
});

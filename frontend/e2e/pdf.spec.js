import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { LOAD_CASES, RAO_FILES, runFlow } from "./helpers.js";
import { overlaps, readPdf } from "./pdf.js";

const MM = 72 / 25.4;
const SIDE_MARGIN = 16 * MM;

function manyFiles(count) {
  return Array.from({ length: count }, (_, i) => ({
    name: `synthetic_case_${String(i + 1).padStart(2, "0")}.txt`,
    mimeType: "text/plain",
    buffer: readFileSync(RAO_FILES[i % RAO_FILES.length]),
  }));
}

async function exportPdf(page, flow = {}) {
  await page.addInitScript(() => {
    window.__printed = 0;
    window.print = () => { window.__printed += 1; };
  });
  await runFlow(page, flow);
  await page.getByRole("button", { name: "Export PDF" }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(1);
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  return readPdf(pdf);
}

const pageWith = (pages, text) => pages.filter((p) => p.text.includes(text)).map((p) => p.number);

function expectCleanPages(pages) {
  for (const p of pages) {
    expect.soft(p.text, `page ${p.number} header`).toContain("Acceleration envelope summary");
    expect.soft(p.text, `page ${p.number} footer`).toContain(`Page ${p.number} of ${pages.length}`);

    for (const item of p.items) {
      const where = `"${item.str}" on page ${p.number}`;
      expect.soft(item.x, `${where} starts outside the page`).toBeGreaterThanOrEqual(SIDE_MARGIN - 1);
      expect.soft(item.x + item.w, `${where} is cut on the right`).toBeLessThanOrEqual(p.width - SIDE_MARGIN + 1);
      expect.soft(item.y, `${where} is cut at the bottom`).toBeGreaterThanOrEqual(0);
      expect.soft(item.y + item.h, `${where} is cut at the top`).toBeLessThanOrEqual(p.height);
    }

    const clashes = [];
    p.items.forEach((a, i) => p.items.slice(i + 1).forEach((b) => {
      if (overlaps(a, b)) clashes.push(`"${a.str}" over "${b.str}"`);
    }));
    expect.soft(clashes, `text on top of other text on page ${p.number}`).toEqual([]);
  }
}

async function expectNothingClippedInLayout(page) {
  const clipped = await page.evaluate(() => {
    const frame = document.querySelector(".rpt-frame").getBoundingClientRect();
    return [...document.querySelectorAll(".rpt *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return false;
        const cut = el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible";
        return cut || r.right > frame.right + 1 || r.left < frame.left - 1;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className} "${el.textContent.trim().slice(0, 40)}"`);
  });
  expect(clipped, "elements cut or outside the page width").toEqual([]);
}

test("Export PDF prints a clean 3-page report", async ({ page }) => {
  const pages = await exportPdf(page);
  expect(pages).toHaveLength(3);
  expectCleanPages(pages);
  await expectNothingClippedInLayout(page);

  expect(pageWith(pages, "Point coordinates")).toEqual([1]);
  expect(pageWith(pages, "Table 1.")).toEqual([1]);
  expect(pageWith(pages, "Figure 1.")).toEqual([1]);
  expect(pageWith(pages, "Point location (continued)")).toEqual([2]);
  expect(pageWith(pages, "Figure 2.")).toEqual([2]);
  expect(pageWith(pages, "Figure 3.")).toEqual([2]);
  expect(pageWith(pages, "Calculation basis")).toEqual([3]);
  expect(pageWith(pages, "Table 2.")).toEqual([3]);
  expect(pageWith(pages, "Method.")).toEqual([3]);

  for (const [name, cg] of Object.entries(LOAD_CASES)) {
    expect(pages[2].text).toContain(`${name} ${cg.lcg} ${cg.tcg} ${cg.kg}`);
  }
});

test("Export PDF with many files keeps every item whole and in order", async ({ page }) => {
  test.setTimeout(90_000);
  const files = manyFiles(100);
  const pages = await exportPdf(page, { files });
  expect(pages.length).toBeGreaterThan(3);
  expectCleanPages(pages);
  await expectNothingClippedInLayout(page);

  expect(pageWith(pages, "Figure 1.")).toEqual([1]);
  expect(pageWith(pages, "Figure 2.")).toEqual([2]);
  expect(pageWith(pages, "Figure 3.")).toEqual([2]);
  expect(pages[1].text).not.toContain("Calculation basis");
  expect(pageWith(pages, "Calculation basis")).toEqual([3]);

  const order = [];
  for (const f of files) {
    const found = pageWith(pages, f.name);
    expect(found, `${f.name} should appear on exactly one page`).toHaveLength(1);
    order.push(found[0]);
  }
  expect(order).toEqual([...order].sort((a, b) => a - b));
  expect(pageWith(pages, "Method.")).toEqual([pages.length]);
});

test("Export PDF shows comma decimals as numbers", async ({ page }) => {
  const pages = await exportPdf(page, {
    loadCases: { LCMIN: { lcg: "148,5", tcg: "0", kg: "13,2" }, LCINT1: { lcg: "150,2", tcg: "0", kg: "14,1" }, LCINT2: { lcg: "158,6", tcg: "0,4", kg: "15,3" }, LCMAX: { lcg: "160", tcg: "0", kg: "16" } },
  });
  const last = pages.find((p) => p.text.includes("Table 2.")).text;
  expect(last).toContain("LCMIN 148.5 0 13.2");
  expect(last).toContain("LCINT2 158.6 0.4 15.3");
});

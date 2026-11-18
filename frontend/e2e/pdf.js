import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function readPdf(buffer) {
  const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const { width, height } = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items
      .filter((i) => i.str.trim())
      .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: i.height }));
    pages.push({ number: n, width, height, items, text: items.map((i) => i.str).join(" ") });
  }
  return pages;
}

export function overlaps(a, b) {
  if (a.str === b.str && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5) return false;
  const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return dx > 1 && dy > 1;
}

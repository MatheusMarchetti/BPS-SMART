# End-to-end tests (Playwright)

Automated checks of the app in a real browser, using the mock engine and the synthetic RAO files in `e2e/fixtures/`.

## First time

```bash
cd frontend
npm ci
npx playwright install chromium
```

## Run

```bash
npm run test:e2e          # all tests, about 1 minute
npm run test:e2e:ui       # visual mode: pick a test and watch it run
npm run test:e2e:report   # open the report of the last run
npm run test:e2e:build    # same tests on the production build (vite build + preview)
npx playwright test pdf   # only the files whose name contains "pdf"
```

The tests start the dev server on http://localhost:8080 by themselves. If `npm run dev` is already open, they reuse it.

## What is covered

| File | Checks |
|---|---|
| `flow.spec.js` | The 4 steps: upload, load cases, point, results. Error messages and unit switch. |
| `numbers.spec.js` | Comma and dot decimals. |
| `pdf.spec.js` | Export PDF: page count, header and footer on every page, nothing cut, no text on top of text, each section on its page, 100-file case. |
| `a11y.spec.js` | axe (WCAG 2.2 A, AA and AAA contrast) on every step in light and dark mode, keyboard-only flow, focus ring, mobile menu. |
| `theme.spec.js` | Light and dark mode, saved choice, print always on white. |

## How the tests are written

A test is a list of steps a person would do, followed by checks (`expect`).

```js
test("accepts comma decimals", async ({ page }) => {
  await runFlow(page, { point: { name: "Process module", x: "180,5", y: "-15,25", z: "45,0" } });
  await expect(page.getByText("X 180.5, Y -15.25, Z 45 m")).toBeVisible();
});
```

- `page` is the browser tab. `page.goto("/")` opens the app.
- Elements are found the way a screen reader sees them: `getByRole("button", { name: "Calculate envelope" })`, `getByLabel("X (m)")`. If a label or role breaks, the test fails, so this also checks accessibility.
- `expect(...)` waits up to 5 seconds for the condition, then fails with what it expected and what it found.
- `helpers.js` holds the repeated steps (upload files, fill load cases, fill point, `runFlow` for the whole path) and the test data from `dados-de-teste.md`.
- `playwright.config.js` starts the server, sets the browser (Chromium, 1440 × 900) and keeps a screenshot when a test fails.

### Export PDF

The app calls `window.print()`. The test replaces it to count the call, then asks Chromium for the same PDF the print dialog would make (`page.pdf()` with print CSS). `pdf.js` reads the PDF with `pdfjs-dist` and returns every piece of text with its position. From that the test checks that text stays inside the page margins, that no text sits on top of other text, which page each section is on, and that header and footer repeat on every page.

### Accessibility

`@axe-core/playwright` runs axe on each step, in light and dark mode. The keyboard tests use only `Tab`, `Enter`, arrows and `Escape`.

## Adding a test

1. Copy a `test(...)` block in the right `.spec.js` file and change the steps.
2. Run `npm run test:e2e:ui`, pick the test and watch it.
3. To find how to reach an element, use the "Pick locator" button in that window.

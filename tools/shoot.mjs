import { launch } from "./browser.mjs";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:4174/";
const out = decodeURIComponent(new URL("../shots/", import.meta.url).pathname);
mkdirSync(out, { recursive: true });
const views = ["top", "intro", "ch-01", "ch-02", "ch-03", "ch-04", "ch-05", "ch-06", "ch-07", "ch-08", "ch-09", "ch-10", "ch-11", "glossary", "sources", "disclosure"];
const browser = await launch();
const problems = [];
for (const [w, h] of [[375, 812], [1280, 800]]) for (const scheme of ["light", "dark"]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => problems.push("pageerror " + e.message));
  for (const v of views) {
    await page.goto(base + "#" + v);
    await page.waitForTimeout(80);
    const r = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth, iw = innerWidth;
      const wide = [...document.querySelectorAll(".view.is-active *")].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > iw + 1 && !e.closest(".scroll-x"); }).slice(0, 3).map((e) => e.tagName + "." + e.className);
      return { sw, iw, wide };
    });
    if (r.sw > r.iw || r.wide.length) problems.push(`${w} ${scheme} ${v} overflow ${r.sw}/${r.iw} ${r.wide.join(" ")}`);
    if (scheme === "light" || v === "ch-02" || v === "top") await page.screenshot({ path: `${out}${w}-${scheme}-${v}.png`, fullPage: true });
  }
  await page.close();
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "no overflow, no page errors");

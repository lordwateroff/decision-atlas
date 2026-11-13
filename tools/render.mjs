import { launch, config } from "./browser.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = root + "dist/";
mkdirSync(out, { recursive: true });
const base = process.argv[2] || "http://127.0.0.1:4174/";
const what = process.argv.slice(3);
const all = !what.length;
const site = readFileSync(root + "site/index.html", "utf8");
const map = site.match(/<svg viewBox="0 0 640 430"[\s\S]*?<\/svg>/)[0].replace(/<a href="[^"]*" aria-label="[^"]*">/g, "<g>").replace(/<\/a>/g, "</g>");
const fontCss = readFileSync(root + "site/css/tokens.css", "utf8").replaceAll('url("../fonts/', 'url("' + pathToFileURL(root).href + 'site/fonts/');
const bookCss = readFileSync(root + "site/css/book.css", "utf8");

const browser = await launch();

async function pdf(file, hash, keep) {
  const page = await browser.newPage({ colorScheme: "light" });
  await page.goto(base + "?print&theme=light" + (hash || ""));
  await page.waitForTimeout(400);
  if (keep) await page.evaluate((k) => document.querySelectorAll(".view").forEach((v) => { if (v.id !== k) v.remove(); }), keep);
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: out + file, format: "A4", printBackground: true, margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" }, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#555">The Decision Atlas, Miras Yessenaly, page <span class="pageNumber"></span> of <span class="totalPages"></span></div>' });
  await page.close();
  console.log("wrote", file);
}

function shell(body, w, h, extra) {
  return `<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><style>${fontCss}${bookCss}
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}${extra}</style></head><body>${body}</body></html>`;
}

const coverCss = `.c{width:800px;height:1100px;padding:64px 56px;display:flex;flex-direction:column;gap:32px;background:var(--color-paper);position:relative}
.c::after{content:"";position:absolute;inset:18px;border:1px solid var(--color-rule-2);pointer-events:none}
.c h1{font-size:112px;max-width:none}
.c .sub{font-size:28px;line-height:1.35;max-width:22ch}
.c .fig{margin-top:auto}
.c .titleblock{margin:0;font-size:20px}`;
const coverBody = `<div class="c"><h1>The Decision Atlas</h1><p class="sub">AI Fundamentals, one problem at a time.</p><figure class="fig drawing map">${map}</figure><dl class="titleblock"><div><dt>Author</dt><dd>Miras Yessenaly</dd></div><div><dt>Submission</dt><dd>Individual</dd></div><div><dt>Course</dt><dd>AI Fundamentals</dd></div><div><dt>Edition</dt><dd class="num">2026</dd></div></dl></div>`;

async function png(html, w, h, file) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  writeFileSync(out + ".tmp.html", html);
  await page.goto(pathToFileURL(out + ".tmp.html").href);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + file });
  await page.close();
  console.log("wrote", file);
}

if (all || what.includes("pdf")) {
  await pdf("The_Decision_Atlas_Miras_Yessenaly.pdf");
  const defense = readFileSync(root + "tools/defense-section.html", "utf8");
  const dp = await browser.newPage({ colorScheme: "light" });
  writeFileSync(out + ".tmp.html", `<!DOCTYPE html><html lang="en" data-theme="light"><head><meta charset="utf-8"><style>${fontCss}${bookCss}</style></head><body>${defense}</body></html>`);
  await dp.goto(pathToFileURL(out + ".tmp.html").href);
  await dp.emulateMedia({ media: "print" });
  await dp.pdf({ path: out + "Defense_Guide_Miras_Yessenaly.pdf", format: "A4", printBackground: true, margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" } });
  await dp.close();
  console.log("wrote Defense_Guide_Miras_Yessenaly.pdf");
}

if (all || what.includes("cover") || what.includes("card")) {
  await png(shell(coverBody, 800, 1100, coverCss), 800, 1100, "Book_Cover_Miras_Yessenaly.png");
}

if (all || what.includes("card")) {
  const qr = await QRCode.toString(config.bookUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0d1f44", light: "#ffffff" } });
  const cover = "data:image/png;base64," + readFileSync(out + "Book_Cover_Miras_Yessenaly.png").toString("base64");
  const cardCss = `.k{width:1600px;height:900px;background:var(--color-paper);display:grid;grid-template-columns:520px 1fr;gap:72px;padding:72px 80px;position:relative}
  .k::after{content:"";position:absolute;inset:20px;border:1px solid var(--color-rule-2)}
  .k img{width:520px;height:715px;display:block;border:1px solid var(--color-rule)}
  .k .r{display:flex;flex-direction:column;min-width:0}
  .k h1{font-size:104px;max-width:none}
  .k .ann{font-size:27px;line-height:1.45;margin-top:32px;max-width:34ch}
  .k .bottom{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:40px}
  .k .who{font-size:40px;font-family:var(--font-display);font-weight:600}
  .k .ind{font-size:26px;margin-top:6px}
  .k .scan{font-size:22px;color:var(--color-muted);margin-top:24px}
  .k .qr{background:#fff;padding:22px;width:300px;height:300px;flex:none}
  .k .qr svg{width:100%;height:100%}`;
  const body = `<div class="k"><img src="${cover}" alt=""><div class="r"><h1>The Decision Atlas</h1><p class="ann">A campus delivery robot named TALA meets a new AI problem in every chapter, from route search to neural networks and Kazakhstan's AI law. Fifteen live labs let you change the numbers and watch each algorithm decide.</p><div class="bottom"><div><p class="who">Miras Yessenaly</p><p class="ind">Individual submission, AI Fundamentals</p><p class="scan">Scan to open the full book: ${config.bookUrl.replace(/^https:\/\//, "")}</p></div><div class="qr">${qr}</div></div></div></div>`;
  await png(shell(body, 1600, 900, cardCss), 1600, 900, "Presentation_Card_Miras_Yessenaly.png");
  const img = PNG.sync.read(readFileSync(out + "Presentation_Card_Miras_Yessenaly.png"));
  const code = jsQR(new Uint8ClampedArray(img.data), img.width, img.height);
  console.log("card size", img.width + "x" + img.height, "QR decodes to:", code ? code.data : "NOT DECODED", code && code.data === config.bookUrl ? "(matches config)" : "(MISMATCH)");
}
await browser.close();

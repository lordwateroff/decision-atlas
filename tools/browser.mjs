import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";
const cfg = JSON.parse(readFileSync(new URL("./config.json", import.meta.url)));
export const config = cfg;
export function launch() {
  return chromium.launch(existsSync(cfg.chromium) ? { executablePath: cfg.chromium } : {});
}

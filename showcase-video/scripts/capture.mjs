// Captures high-res screenshots of the running local app for the showcase video.
// Prereq: `npm run dev:local` in the app folder (serves http://localhost:5174).
// Usage: node scripts/capture.mjs [baseUrl]
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "http://localhost:5174";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "shots");
const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
const executablePath = BROWSERS.find((p) => fs.existsSync(p));
// Seeded local test account (db/local-auth.sql). Local backend only.
const LOGIN = { email: "alex@example.test", password: "password123" };

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
// Skip CSS entrance animations so captures are crisp; charts still animate, so we wait.
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

async function shot(name, { wait = 1800, fullPage = false } = {}) {
  await sleep(wait);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log("saved", path.relative(process.cwd(), file));
}

await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
await shot("login", { wait: 600 });

await page.type("#email", LOGIN.email);
await page.type("#password", LOGIN.password);
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('button[type="submit"]')]);
await shot("dashboard", { wait: 2200 });
await shot("dashboard-full", { wait: 200, fullPage: true });

for (const [route, name] of [
  ["/payroll", "payroll"],
  ["/employees", "employees"],
  ["/cash-advance", "cash-advance"],
]) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
  if (name === "payroll") {
    // Show the mid-month period, which has approvals in the showcase data.
    await page.evaluate(() => {
      [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent.includes("Period 1"))?.click();
    });
  }
  await shot(name);
}

await browser.close();

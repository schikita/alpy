#!/usr/bin/env node
/**
 * Проверка интерактивности в headless Chrome: клики, клавиатура, фильтры,
 * лайтбокс, меню, аккордеон, чек-лист, карусель, состояния скролла.
 * Usage: node tools/interaction-test.js
 */
"use strict";

const { execFileSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
execFileSync("python3", ["tools/make-diag.py", "interact"], { cwd: ROOT });

const page = "file://" + path.join(ROOT, "_diag.html").split("/").map(encodeURIComponent).join("/");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-interact-"));
let dom = "";

try {
  dom = execFileSync(process.env.CHROME || "google-chrome", [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--window-size=1440,900",
    "--user-data-dir=" + profile,
    "--virtual-time-budget=14000",
    "--dump-dom", page
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
} catch (e) {
  dom = (e.stdout || "").toString();
  if (!dom) {
    console.error("Не удалось получить DOM:", e.message);
    process.exit(1);
  }
}

const matches = [...dom.matchAll(/<pre id="diag-out">([\s\S]*?)<\/pre>/g)];
/* первое совпадение — исходник внедрённого скрипта, отчёт всегда последний */
const m = matches[matches.length - 1];
if (!m) {
  console.error("✗ сценарий взаимодействий не отработал (нет отчёта)");
  process.exit(1);
}

const report = m[1]
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

console.log("\nИнтерактивность (headless Chrome)");
report.split("\n").forEach((line) => console.log("  " + line));

const failed = report.split("\n").filter((l) => l.startsWith("FAIL")).length;
console.log("\n" + (failed ? "✗ провалено " + failed + " проверок" : "✓ интерактивность в порядке"));
fs.rmSync(profile, { recursive: true, force: true });
process.exit(failed ? 1 : 0);

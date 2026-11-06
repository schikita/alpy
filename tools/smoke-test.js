#!/usr/bin/env node
/**
 * Runtime smoke test in headless Chrome (no dependencies).
 * Usage: node tools/smoke-test.js
 * Loads index.html via file:// and asserts that the JS layer actually ran:
 * галерея собрана, карусели дополнены, прелоадер снят, ошибок в консоли нет.
 */
"use strict";

const { execFileSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const page = "file://" + path.join(ROOT, "index.html").split("/").map(encodeURIComponent).join("/");
const chrome = process.env.CHROME || "google-chrome";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-smoke-"));

let failures = 0;
function ok(name, condition, detail) {
  if (condition) console.log("  ok   " + name);
  else {
    failures++;
    console.log("  FAIL " + name + (detail ? " — " + detail : ""));
  }
}

let dom = "";
let err = "";
try {
  dom = execFileSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--window-size=1440,900",
    "--user-data-dir=" + profile,
    "--virtual-time-budget=8000",
    "--enable-logging=stderr",
    "--log-level=0",
    "--dump-dom",
    page
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024, timeout: 120000 });
} catch (e) {
  dom = (e.stdout || "").toString();
  err = (e.stderr || "").toString();
  if (!dom) {
    console.error("Не удалось получить DOM:", e.message);
    process.exit(1);
  }
}

const count = (re) => (dom.match(re) || []).length;
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const tickerBoxes = (html.match(/data-marquee[\s>]/g) || []).length;
const expectedSlides = /* farm */ 16 + /* process */ 17;

console.log("\nРантайм headless Chrome");
ok("прелоадер снят и страница готова", /class="[^"]*is-ready/.test(dom) && !/id="loader"/.test(dom));
ok("галерея собрала 50 плиток", count(/class="tile\b/g) === 50, "найдено " + count(/class="tile\b/g));
ok("у плиток есть blur-подложка", count(/class="tile[^"]*"[^>]*background-image:\s*url\((?:&quot;|")data:image\/webp/g) === 50,
  "найдено " + count(/class="tile[^"]*"[^>]*background-image:\s*url\((?:&quot;|")data:image\/webp/g));
ok("плитки получили masonry-спан", count(/--span:\s*\d+/g) >= 50, "найдено " + count(/--span:\s*\d+/g));

const slides = count(/class="slide"/g);
ok("карусели дополнены до полного состава (" + expectedSlides + ")", slides === expectedSlides, "слайдов " + slides);
ok("каждый слайд получил кнопку просмотра", count(/class="open-hit"/g) === expectedSlides + 10,
  "кнопок " + count(/class="open-hit"/g));
ok("все бегущие строки наполнены (" + tickerBoxes + ")", count(/class="ticker__track"/g) === tickerBoxes,
  "треков " + count(/class="ticker__track"/g));
ok("в бегущих строках есть кадры", count(/class="tk"/g) > 20, "элементов " + count(/class="tk"/g));
ok("кинолента дополнена до 10 кадров", count(/class="strip__item"/g) === 10, "кадров " + count(/class="strip__item"/g));

const bgBlocks = count(/class="sec__bg" aria-hidden="true"/g);
const bgExpected = (html.match(/data-bg="\d\d"/g) || []).length;
ok("фото-фоны всех секций в DOM (" + bgExpected + ")", bgBlocks === bgExpected, "найдено " + bgBlocks);
ok("фон — первый ребёнок своей секции",
  count(/<(?:section|footer)[^>]*data-bg="\d\d"[^>]*>\s*<div class="sec__bg"/g) === bgExpected,
  "найдено " + count(/<(?:section|footer)[^>]*data-bg="\d\d"[^>]*>\s*<div class="sec__bg"/g));
ok("фон грузит адаптивный webp",
  count(/class="sec__bg"[\s\S]{0,400}?srcset="assets\/img\/opt\/kyz-\d\d-sm\.webp 900w/g) === bgExpected);
ok("фон отдан параллаксу (data-parallax)",
  count(/class="sec__bg"[\s\S]{0,120}?data-parallax="0\.0\d"/g) === bgExpected);
ok("текст разбит на буквы для анимации", count(/class="ch"/g) > 18, "букв " + count(/class="ch"/g));
ok("заголовки разбиты на слова", count(/class="wd"/g) > 10, "слов " + count(/class="wd"/g));
ok("блоки отмечены как появившиеся", /is-in/.test(dom));
ok("аккордеон получил aria-связи", /aria-controls="step-body-/.test(dom));
ok("лайтбокс на месте", /data-lb-img/.test(dom));
ok("подпись счётчика галереи заполнена", /data-filter-count[^>]*>50</.test(dom));
ok("кадры героя в разметке и с картинками", /class="hero__shot hero__shot--main"[\s\S]{0,700}<img /.test(dom));
ok("прелоадер не держит контент (overflow снят)", !/<body[^>]*class="[^"]*is-loading/.test(dom));

const consoleErrors = (err.match(/ERROR:CONSOLE|Uncaught|TypeError/g) || []).length;
ok("нет ошибок в консоли страницы", consoleErrors === 0, err.split("\n").filter((l) => /ERROR:CONSOLE|Uncaught/.test(l)).slice(0, 3).join(" | "));

/* Скрытые блоки не должны «съедать» контент: проверяем, что текст статьи в DOM */
ok("текст репортажа присутствует", /Рассольный молодой/.test(dom) && /Рождение сгустка/.test(dom));

fs.rmSync(profile, { recursive: true, force: true });
console.log("\n" + (failures ? "✗ провалено " + failures + " проверок рантайма" : "✓ рантайм в порядке"));
process.exit(failures ? 1 : 0);

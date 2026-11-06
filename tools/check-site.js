#!/usr/bin/env node
/**
 * Static checks + data tests for the landing page.
 * Usage: node tools/check-site.js
 * No dependencies: evaluates the data modules in a sandbox and cross-checks
 * index.html / style.css against them.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

let failures = 0;
let checks = 0;

function ok(name, condition, detail) {
  checks++;
  if (condition) console.log("  ok   " + name);
  else {
    failures++;
    console.log("  FAIL " + name + (detail ? " — " + detail : ""));
  }
}
function group(title) { console.log("\n" + title); }

const sandbox = { window: {} };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(read("js/photos.js"), sandbox, { filename: "photos.js" });
vm.runInContext(read("js/galleries.js"), sandbox, { filename: "galleries.js" });

const PHOTOS = sandbox.window.PHOTOS;
const G = sandbox.window.GALLERIES;
const html = read("index.html");
const css = read("style.css");
const js = read("js/app.js");

group("Данные фото");
ok("манифест содержит 50 кадров", PHOTOS.length === 50, "найдено " + PHOTOS.length);
ok("id кадров уникальны", new Set(PHOTOS.map((p) => p.id)).size === PHOTOS.length);
ok("каждый кадр имеет подпись", PHOTOS.every((p) => typeof G.captions[p.id] === "string" && G.captions[p.id].length > 4),
  PHOTOS.filter((p) => !G.captions[p.id]).map((p) => p.id).join(","));
ok("каждый кадр имеет тег", PHOTOS.every((p) => Array.isArray(G.tags[p.id]) && G.tags[p.id].length > 0),
  PHOTOS.filter((p) => !(G.tags[p.id] || []).length).map((p) => p.id).join(","));

const knownTags = G.filters.map((f) => f.tag).filter((t) => t !== "all");
const strayTags = [...new Set(PHOTOS.flatMap((p) => G.tags[p.id] || []))].filter((t) => !knownTags.includes(t));
ok("теги ограничены списком фильтров", strayTags.length === 0, strayTags.join(", "));
ok("blur-заглушка есть у каждого кадра",
  PHOTOS.every((p) => typeof p.blur === "string" && p.blur.startsWith("data:image/webp;base64,")));
ok("у каждого кадра есть размеры", PHOTOS.every((p) => p.w > 0 && p.h > 0 && p.ratio > 0));

group("Файлы производных изображений");
const missing = [];
for (const p of PHOTOS) for (const key of ["tn", "sm", "md"]) if (!exists(p.src[key])) missing.push(p.src[key]);
ok("все варианты webp существуют", missing.length === 0, missing.slice(0, 4).join(", "));

group("Ссылки в разметке");
const refs = [...new Set(html.match(/assets\/[\w./-]+\.(?:webp|png)/g) || [])];
ok("в разметке есть ссылки на кадры", refs.length > 20, String(refs.length));
const brokenRefs = refs.filter((r) => !exists(r));
ok("все ссылки на файлы существуют", brokenRefs.length === 0, brokenRefs.join(", "));
const domIds = [...new Set((html.match(/data-photo="(\d\d)"/g) || []).map((m) => m.slice(12, 14)))];
const unknownIds = domIds.filter((id) => !G.byId(id));
ok("data-photo в разметке есть в манифесте", unknownIds.length === 0, unknownIds.join(", "));

group("Согласованность классов и атрибутов");
const classList = new Set((css.match(/\.[a-z][\w-]*/g) || []).map((c) => c.slice(1)));
const markupClasses = [...new Set((html.match(/class="([^"]+)"/g) || []).flatMap((m) => m.slice(7, -1).split(/\s+/)))];
const unstyled = markupClasses.filter((c) => c && !classList.has(c));
ok("у всех классов разметки есть стили", unstyled.length === 0, unstyled.slice(0, 8).join(", "));
const dynamicClasses = ["wd", "ch", "tile", "open-hit", "is-loaded", "is-hidden", "is-active", "is-open", "is-done"];
ok("динамические классы описаны в CSS", dynamicClasses.every((c) => classList.has(c)),
  dynamicClasses.filter((c) => !classList.has(c)).join(", "));

const dynamicAttrs = ["data-marquee-done", "data-split-done"];
const usedAttrs = [...new Set((js.match(/\[data-[\w-]+\]/g) || []).map((a) => a.slice(1, -1)))];
const missingAttrs = usedAttrs.filter((a) => !dynamicAttrs.includes(a) && !html.includes(a));
ok("все data-хуки из app.js есть в разметке", missingAttrs.length === 0, missingAttrs.join(", "));

group("Логика галереи");
ok("filter('all') отдаёт все кадры", G.filter("all").length === 50);
for (const tag of knownTags) {
  const expected = PHOTOS.filter((p) => (G.tags[p.id] || []).includes(tag)).length;
  const got = G.filter(tag).length;
  ok("filter('" + tag + "') = " + expected, got === expected && got > 0, "получено " + got);
}
ok("pick() пропускает неизвестные id", G.pick(["01", "99", "02"]).length === 2);
ok("byId() возвращает null на мусор", G.byId("нет-такого") === null);
ok("tagLabels переводит теги", G.tagLabels("34").includes("Козы"));

group("Математика карусели и masonry");
ok("wrap переносит вперёд", G.wrap(51, 50) === 1);
ok("wrap переносит назад", G.wrap(-1, 50) === 49);
ok("wrap не делит на ноль", G.wrap(3, 0) === 0);
const spanLand = G.span(1.5, 300, 8, 8);
const spanPort = G.span(0.667, 300, 8, 8);
ok("span для пейзажа меньше, чем для портрета", spanLand < spanPort, spanLand + " / " + spanPort);
ok("span не меньше единицы", G.span(40, 300, 8, 8) >= 1);
ok("span согласован с CSS-сеткой", /grid-auto-rows:\s*8px/.test(css) && /gap:\s*8px/.test(css));

group("Группы разделов");
const allIds = new Set(PHOTOS.map((p) => p.id));
const badGroups = [];
for (const [key, ids] of Object.entries(G.groups)) {
  if (!Array.isArray(ids) || !ids.length) badGroups.push(key + ": пусто");
  else ids.forEach((id) => { if (!allIds.has(id)) badGroups.push(key + " -> " + id); });
}
ok("во всех группах только существующие кадры", badGroups.length === 0, badGroups.slice(0, 5).join(", "));
ok("группа лайтбокса покрывает все кадры", G.all().length === 50);

group("Контраст (WCAG AA)");
function block(needle) {
  const i = css.indexOf(needle);
  if (i < 0) return "";
  const open = css.indexOf("{", i);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}
function hexToRgb(value) {
  const m = /#([0-9a-f]{6})/i.exec(value);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function chan(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(rgb) { return 0.2126 * chan(rgb[0]) + 0.7152 * chan(rgb[1]) + 0.0722 * chan(rgb[2]); }
function contrast(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function over(fg, alpha, bg) {
  return fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
}
function mutedOf(needle) {
  const m = /--muted:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(block(needle));
  return m ? { rgb: [+m[1], +m[2], +m[3]], a: parseFloat(m[4]) } : null;
}

const tokens = block(":root {");
const RED = hexToRgb(/--brand-red:\s*(#[0-9a-f]{6})/i.exec(tokens)[1]);
const CURD = hexToRgb(/--brand-curd:\s*(#[0-9a-f]{6})/i.exec(tokens)[1]);
const MILK = hexToRgb(/--milk:\s*(#[0-9a-f]{6})/i.exec(tokens)[1]);
const PAPER = hexToRgb(/--paper:\s*(#[0-9a-f]{6})/i.exec(tokens)[1]);
const INK = hexToRgb(/--ink:\s*(#[0-9a-f]{6})/i.exec(tokens)[1]);

const pairs = [
  ["ink на молоке", INK, MILK, 4.5],
  ["ink на бумаге", INK, PAPER, 4.5],
  ["ink на крафтовом красном", INK, RED, 4.5],
  ["ink на сырном жёлтом", INK, CURD, 4.5]
];
pairs.forEach(([name, fg, bg, min]) => {
  const value = contrast(fg, bg);
  ok(name + " (" + value.toFixed(2) + ":1)", value >= min, "нужно ≥ " + min);
});

const themeMuted = [
  ["muted на молоке", "body[data-theme=\"milk\"]", MILK, 4.5],
  ["muted на бумаге", "body[data-theme=\"paper\"]", PAPER, 4.5],
  ["muted на тёмном", "body[data-theme=\"ink\"]", INK, 4.5],
  ["muted на красном", "body[data-theme=\"red\"]", RED, 4.5],
  ["muted на сырном", "body[data-theme=\"curd\"]", CURD, 4.5]
];
themeMuted.forEach(([name, needle, bg, min]) => {
  const muted = mutedOf(needle) || mutedOf("[data-theme]");
  const value = contrast(over(muted.rgb, muted.a, bg), bg);
  ok(name + " (" + value.toFixed(2) + ":1)", value >= min, "нужно ≥ " + min);
});

const inkMuted = mutedOf("body[data-theme=\"ink\"]");
ok("текст на тёмном (milk 100%) ≥ 4.5", contrast(MILK, INK) >= 4.5, contrast(MILK, INK).toFixed(2));
ok("служебный текст на тёмном ≥ 4.5", contrast(over(inkMuted.rgb, inkMuted.a, INK), INK) >= 4.5);
ok("белый текст на красном ≥ 3 (крупный/чипы)", contrast([255, 255, 255], RED) >= 3, contrast([255, 255, 255], RED).toFixed(2));
ok("фон красной секции не подменяется (brand-red)", /section\[data-theme="red"\][\s\S]*?background:\s*var\(--brand-red\)/.test(css));
ok("фон сырной секции не подменяется (brand-curd)", /section\[data-theme="curd"\][\s\S]*?background:\s*var\(--brand-curd\)/.test(css));

/* Текст лежит поверх фотографии под затемнением: проверяем, что даже на самом
   светлом и самом тёмном кадре контраст остаётся в норме AA. */
function scrimMin(needle) {
  const b = block(needle) || block("[data-theme] {");
  const hi = /--scrim-hi:\s*rgba\([^)]*,\s*([\d.]+)\)/.exec(b);
  const lo = /--scrim-lo:\s*rgba\([^)]*,\s*([\d.]+)\)/.exec(b);
  return hi && lo ? Math.min(parseFloat(hi[1]), parseFloat(lo[1])) : 0;
}
const textThemes = [
  ["светлые разделы", "[data-theme] {", INK, MILK],
  ["тёмные разделы", "body[data-theme=\"ink\"]", MILK, INK],
  ["красный раздел", "body[data-theme=\"red\"]", [0, 0, 0], RED],
  ["сырный раздел", "body[data-theme=\"curd\"]", INK, CURD]
];
textThemes.forEach(([name, needle, fg, surface]) => {
  const a = scrimMin(needle);
  const overWhite = over([255, 255, 255], 1 - a, surface);
  const overBlack = over([0, 0, 0], 1 - a, surface);
  const worst = Math.min(contrast(fg, overWhite), contrast(fg, overBlack));
  ok(name + ": текст читается на любом кадре (" + worst.toFixed(2) + ":1)", a >= 0.78 && worst >= 4.5,
    "scrim=" + a + ", худший контраст " + worst.toFixed(2));
});
textThemes.forEach(([name, needle, , surface]) => {
  const a = scrimMin(needle);
  const muted = mutedOf(needle) || mutedOf("[data-theme]");
  const worst = Math.min(
    contrast(over(muted.rgb, muted.a, over([255, 255, 255], 1 - a, surface)), over([255, 255, 255], 1 - a, surface)),
    contrast(over(muted.rgb, muted.a, over([0, 0, 0], 1 - a, surface)), over([0, 0, 0], 1 - a, surface))
  );
  ok(name + ": служебный текст читается на кадре (" + worst.toFixed(2) + ":1)", worst >= 4.5,
    "scrim=" + a + ", худший контраст " + worst.toFixed(2));
});

/* Тёмно-красный акцент на светлом: проверяем отдельно, т.к. это тоже текст */
const accentRe = /--accent-text:\s*(#[0-9a-f]{6})/i;
const accentBase = hexToRgb(accentRe.exec(block("[data-theme] {"))[1]);
ok("тёмно-красный акцент на молоке ≥ 4.5", contrast(accentBase, MILK) >= 4.5, contrast(accentBase, MILK).toFixed(2));
ok("тёмно-красный акцент на бумаге ≥ 4.5", contrast(accentBase, PAPER) >= 4.5, contrast(accentBase, PAPER).toFixed(2));
ok("тёмно-красный акцент на сырном ≥ 4.5", contrast(accentBase, CURD) >= 4.5, contrast(accentBase, CURD).toFixed(2));
const accentInk = hexToRgb(accentRe.exec(block("body[data-theme=\"ink\"]"))[1]);
ok("красный акцент на тёмном ≥ 4.5", contrast(accentInk, INK) >= 4.5, contrast(accentInk, INK).toFixed(2));


function tagBalance(source) {
  const voids = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const stack = [];
  const errors = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(source))) {
    const tag = m[2].toLowerCase();
    if (voids.has(tag) || m[4] === "/") continue;
    if (m[1] !== "/") stack.push(tag);
    else {
      const top = stack.pop();
      if (top !== tag) errors.push("</" + tag + "> вместо </" + top + ">");
    }
  }
  return { errors, unclosed: stack };
}
const balance = tagBalance(html.replace(/<!--[\s\S]*?-->/g, ""));
ok("теги в index.html закрыты", balance.errors.length === 0, balance.errors.slice(0, 4).join(" | "));
ok("нет незакрытых тегов", balance.unclosed.length === 0, balance.unclosed.join(", "));

const openBraces = (css.match(/{/g) || []).length;
const closeBraces = (css.match(/}/g) || []).length;
ok("фигурные скобки в CSS сбалансированы", openBraces === closeBraces, openBraces + " / " + closeBraces);
ok("нет временных маркеров", !html.includes("@NEXT") && !css.includes("@NEXT"));
ok("есть блок prefers-reduced-motion", /prefers-reduced-motion:\s*reduce/.test(css));
ok("есть поддержка no-js", /html\.no-js/.test(css) && /class="no-js"/.test(html));
ok("подключены стили и скрипты", /href="style.css"/.test(html) && /js\/app\.js/.test(html));
ok("все три скрипта подключены", ["js/photos.js", "js/galleries.js", "js/app.js"].every((s) => html.includes(s)));

group("Фото-фоны разделов");
const bgIds = [...new Set((html.match(/data-bg="(\d\d)"/g) || []).map((s) => s.slice(9, 11)))];
ok("фото-фон есть у каждой секции (≥ 12)", bgIds.length >= 12, "найдено " + bgIds.length);
ok("фон-блок есть в каждой секции с data-bg",
  (html.match(/class="sec__bg"/g) || []).length === bgIds.length,
  (html.match(/class="sec__bg"/g) || []).length + " блоков на " + bgIds.length + " секций");
ok("фон-блок идёт сразу внутри своей секции",
  (html.match(/data-bg="\d\d"[\s\S]{0,300}?class="sec__bg"/g) || []).length === bgIds.length);
ok("data-bg ссылается на существующие кадры", bgIds.every((id) => G.byId(id)), bgIds.filter((id) => !G.byId(id)).join(", "));
ok("файлы фонов существуют", bgIds.every((id) => exists("assets/img/opt/kyz-" + id + "-sm.webp")));
ok("фон не перехватывает клики", /\.sec__bg\s*\{[^}]*pointer-events:\s*none/.test(css));
ok("контент поверх фона (:where + z-index)", /:where\(\[data-bg\]\)\s*>\s*:where\(\*:not\(\.sec__bg\)\)/.test(css));
ok("фон притемняется под текст", /\.sec__bg::after[\s\S]{0,220}var\(--scrim-hi\)/.test(css));
ok("scrim задан и для светлых тем", /\[data-theme\]\s*\{[\s\S]{0,400}?--scrim-hi:\s*rgba\(/.test(css));
ok("scrim задан для тёмной, красной и сырной тем",
  ["ink", "red", "curd"].every((t) => new RegExp("data-theme=\"" + t + "\"[\\s\\S]{0,500}?--scrim-hi:").test(css)));

group("Никакого белого на красном");
const cssRules = [];
{
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].trim().split("\n").pop().trim();
    if (!sel || sel.startsWith("@") || /^[0-9%]/.test(sel)) continue;
    cssRules.push({ sel: sel, body: m[2] });
  }
}
const redBg = /background(?:-color)?:\s*(?:var\(--red\)|var\(--brand-red\)|#ff1a00|rgba\(255,\s*26,\s*0[^)]*\))/i;
const whiteFg = /(?:^|;|\s)color:\s*(?:#fff(?:fff)?|var\(--milk\)|var\(--paper\)|rgba\(246,\s*240,\s*229[^)]*\)|rgba\(251,\s*248,\s*242[^)]*\))/i;
const whiteOnRed = cssRules.filter((r) => redBg.test(r.body) && whiteFg.test(r.body)).map((r) => r.sel);
ok("нет правил с белым текстом на красном", whiteOnRed.length === 0, whiteOnRed.join(" | "));
ok("выделение текста: тёмное на красном", /::selection\s*\{[^}]*background:\s*var\(--red\)[^}]*color:\s*var\(--ink\)/.test(css));
ok("активные чипы и бейджи на красном — тёмным текстом",
  cssRules.filter((r) => redBg.test(r.body) && /ticker--brand|fbtn\.is-active|pinned__badge|arsenal__list/.test(r.sel))
    .every((r) => /color:\s*var\(--ink\)/.test(r.body)));
ok("красный текст на светлом заменён на --accent-text",
  /\.sechead__num\s*\{[^}]*--accent-text/.test(css) && /\.zoo b\s*\{[^}]*--accent-text/.test(css) &&
  /\.pstep__tag\s*\{[^}]*--accent-text/.test(css) && /\.topnav__link\.is-active\s*\{[^}]*--accent-text/.test(css));

group("Больше нет «воздуха» между секциями");
function clampMax(selector, prop) {
  const rule = cssRules.find((r) => r.sel.split(",").map((s) => s.trim()).indexOf(selector) > -1);
  if (!rule) return null;
  const m = new RegExp(prop + ":\\s*clamp\\(([^)]+)\\)").exec(rule.body);
  if (!m) return null;
  const last = m[1].split(",").pop().trim();
  return last.includes("rem") ? parseFloat(last) : null;
}
[
  [".sec", "padding-block", 4.5],
  [".intro", "padding-block", 4],
  [".quote", "margin", 2.5],
  [".carousel", "padding-block", 2],
  [".foot", "padding-block", 3.5]
].forEach(([sel, prop, limit]) => {
  const value = clampMax(sel, prop);
  ok(sel + " " + prop + " ≤ " + limit + "rem", value !== null && value <= limit, "получено " + value);
});
ok("щели закреплённой сцены ≤ 22vh", /\.pinned__steps\s*\{[^}]*22vh/.test(css));
ok("отступ заголовка раздела ≤ 1.8rem", /\.sechead\s*\{[^}]*1\.8rem\)/.test(css));

group("Текст репортажа не изменён");
/* Фрагменты дословно из исходного RTF: если копирайт поедет — тест упадёт. */
const PLAIN = html
  .replace(/<[^>]+>/g, "")      /* разметка не должна мешать сверке слов */
  .replace(/\s+/g, " ")
  .replace(/&laquo;/g, "«")
  .replace(/&raquo;/g, "»");
const fragments = [
  ["заголовок h1", "Наш буевский ответ Альпам"],
  ["лид", "Как дети асфальта пытались перехитрить породистых коз и сварить элитный сыр — журналисты «СБ» стали… сыроварами"],
  ["баннерная строка", "Как дети асфальта элитный сыр варили"],
  ["предисловие", "Вы когда-нибудь думали бросить все и сменить профессию?"],
  ["предисловие 2", "почему козьи желудки работают как ядерный реактор?"],
  ["предисловие 3", "производят уникальный продукт, достойный мишленовских ресторанов"],
  ["шенген", "Искать правильный козий сыр — квест еще тот"],
  ["шенген 2", "На ее подворье мы насчитали роскошного альпийского козла, пять козочек, немецкую овчарку, крошечную кошку и целый десант горделивых уток с курами"],
  ["шенген 3", "До 48 лет она жила в городе и успешно работала на фабрике «Милавица»"],
  ["цитата 1", "Внутри будто тумблер переключился, и я уволилась"],
  ["шенген 4", "После городской суеты деревенская тишина поначалу показалась новым сельчанам скучной"],
  ["цитата 2", "Я человек дотошный: если за что-то берусь, то погружаюсь с головой"],
  ["шенген 5", "За своими первыми альпийскими козами Ирина поехала в Россию"],
  ["цитата 3", "Нашла в интернете самый простой рецепт и вслепую повторила шаги"],
  ["шенген 6", "Сегодня, спустя три года практики, на ферме делают 11 видов сыра разной сложности"],
  ["шенген 7", "условия у них — как в козьем санатории"],
  ["цитата 4", "Их пищеварительная система из четырех желудков работает как сложный реактор"],
  ["цитата 4b", "Так что любовь — обязательный ингредиент в нашем рецепте"],
  ["вилы", "Не успел дослушать фразу «молоко начинается с сена», как уже стоял у амбара с вилами в руках"],
  ["вилы 2", "для городского журналиста малоинтересное"],
  ["цитата 5", "Простой мягкий сыр мы бы с вами сделали быстро, но для этого коз нужно было подоить в пять утра"],
  ["вилы 3", "Тщательно мою руки и загружаю в огромную кастрюлю лопатки, ситечки, ножи, витиеватые ложки и формы"],
  ["вилы 4", "Ирина увлеченно рассказывала о тонкостях дела"],
  ["марля", "Наш фотокорреспондент Кристина, вдобавок ко всем своим талантам, оказалась подкована еще и в сыроварении"],
  ["марля 2", "я принялся процеживать готовую молочную массу через марлю, чтобы стекла сыворотка"],
  ["марля 3", "Именно из нее потом и созревает сыр"],
  ["шпаргалка", "На этом физический труд закончился"],
  ["шпаргалка 2", "выдала четкий алгоритм, который я честно записал в блокнот"],
  ["шаг 1", "Шаг 1. Правильное сырье"],
  ["шаг 2", "Шаг 2. Хитрый нагрев"],
  ["шаг 3", "Шаг 3. Спасение кальция"],
  ["шаг 4", "Шаг 4. Защита и вкус"],
  ["шаг 5", "Шаг 5. Рождение сгустка"],
  ["цифры", "вызревать сыр должен при температуре от 10 до 14 градусов тепла, а хранится готовый продукт при 2–6 градусах"],
  ["дегустация", "Наконец-то настал момент, когда можно было расслабиться"],
  ["дегустация 2", "Мои познания в сыре вы уже оценили, так что скажу прямо: это фантастически вкусно"],
  ["дегустация 3", "Будете проезжать мимо деревни Буево, обязательно загляните к Ирине"],
  ["цитата эксперта", "подытожила фотокорреспондент Кристина Фанченко"],
  ["P.S.", "Итог дня в новой роли для меня однозначен: фермером-сыроваром мне не стать"],
  ["рецепт", "В качестве подарка для читателей «СБ» Ирина Лужкова поделилась страничкой из своей поваренной книги"],
  ["рецепт 2", "Что понадобится?"],
  ["ингредиенты", "5 л козьего молока"],
  ["ингредиенты 2", "0,05 г фермента «Мейто» (важно соблюдать массу, лучше использовать ювелирные весы)"],
  ["ингредиенты 3", "По желанию: пажитник, тыквенные семечки или вяленые томаты"],
  ["инструменты", "форма для самопрессующихся сыров (или обычный дуршлаг)"],
  ["инструменты 2", "дренажный коврик (или чистая марля)"],
  ["пошагово", "Пастеризация. Нагрейте молоко до 72 °C, выдержите 10 секунд и резко охладите в ледяной воде до 34 °C."],
  ["пошагово 2", "Посол и созревание. Приготовьте рассол (200 г соли на 1 л кипяченой воды)"],
  ["подпись автора", "Егор ДУЛЕВИЧ"],
  ["подпись фотографа", "Кристина Фанченко"],
  ["финал", "Зато теперь точно знаю, каково это — быть настоящим сыроваром."],
  ["рука мастера", "Сразу видно руку мастера."]
];
const lostFragments = fragments.filter(([, text]) => !PLAIN.includes(text)).map(([name]) => name);
ok("все " + fragments.length + " фрагментов исходного текста на месте", lostFragments.length === 0, lostFragments.join(", "));
const strayYo = (PLAIN.match(/ещё|сырьё|полутвёрд|чётк/gi) || []);
ok("ё приведена к исходнику (нет «ещё/сырьё/полутвёрдый»)", strayYo.length === 0, strayYo.join(", "));

group("Доступность и SEO");
ok('есть lang="ru"', /<html lang="ru"/.test(html));
ok("есть ровно один h1", (html.match(/<h1/g) || []).length === 1);
ok("у всех img есть alt", !/<img\b(?![^>]*\balt=)/.test(html));
ok("есть title и description", /<title>/.test(html) && /name="description"/.test(html));
ok("есть skip-link", /class="skip-link"/.test(html));
ok("внешние ссылки с rel=noopener", !/target="_blank"(?![^>]*rel="noopener")/.test(html));

console.log("\n" + (failures ? "✗ провалено " + failures + " из " + checks : "✓ пройдено " + checks + " проверок"));
process.exit(failures ? 1 : 0);

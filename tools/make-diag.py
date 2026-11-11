#!/usr/bin/env python3
"""Создаёт диагностическую копию index.html: сообщает метрики раскладки,
   сценарий взаимодействий (mode=interact) или «финальное состояние» для
   скриншотов нижних разделов (mode=flat-N)."""
import os
import sys

src = open("index.html", encoding="utf-8").read()
mode = sys.argv[1] if len(sys.argv) > 1 else "diag"

diag = """
<script>
window.addEventListener("load", function () {
  setTimeout(function () {
    function box(el) {
      if (!el) return null;
      var r = el.getBoundingClientRect();
      return [Math.round(r.top + window.scrollY), Math.round(r.height)];
    }
    var out = { scrollY: Math.round(window.scrollY), docH: document.documentElement.scrollHeight, ready: document.documentElement.className };
    out.bodyChildren = Array.prototype.map.call(document.body.children, function (el) {
      return (el.id || el.className.split(" ")[0]) + ":" + JSON.stringify(box(el));
    });
    var hero = document.querySelector(".hero");
    out.heroChildren = Array.prototype.map.call(hero.children, function (el) {
      return el.className + ":" + JSON.stringify(box(el)) + ":pos=" + getComputedStyle(el).position;
    });
    var tk = document.querySelector(".ticker__track");
    out.ticker = tk ? box(tk) : null;
    out.tickerItems = tk ? tk.children.length : 0;
    var main = document.querySelector("main");
    out.main = box(main);
    out.loaderPresent = !!document.getElementById("loader");
    var scenes = [];
    document.querySelectorAll("[data-scene]").forEach(function (s) {
      var r = s.getBoundingClientRect();
      var title = s.querySelector(".sechead__title, .hero__title");
      var para = s.querySelector("p");
      scenes.push({
        id: s.id,
        top: Math.round(r.top + window.scrollY),
        h: Math.round(r.height),
        title: title ? [Math.round(title.getBoundingClientRect().top), Math.round(title.getBoundingClientRect().height), getComputedStyle(title).opacity] : null,
        para: para ? [Math.round(para.getBoundingClientRect().top + window.scrollY), Math.round(para.getBoundingClientRect().height), getComputedStyle(para).opacity] : null
      });
    });
    out.scenes = scenes;
    out.viewport = [Math.round(window.scrollY), Math.round(window.innerHeight)];
    var h1 = document.querySelector(".hero__title");
    out.h1 = h1 ? box(h1) : null;
    out.heroBox = box(document.querySelector(".hero"));
    var toTop = document.querySelector("[data-to-top]");
    if (toTop) {
      var cs = getComputedStyle(toTop);
      out.toTop = {
        pos: cs.position, right: cs.right, bottom: cs.bottom,
        opacity: cs.opacity, visibility: cs.visibility, box: box(toTop)
      };
      toTop.classList.add("is-visible");
      toTop.style.transition = "none"; /* без перехода: проверяем каскад, а не кадр анимации */
      var cs2 = getComputedStyle(toTop);
      out.toTopShown = { opacity: cs2.opacity, visibility: cs2.visibility, transform: cs2.transform };
      toTop.style.transition = "";
      toTop.classList.remove("is-visible");
    }
    var styleOf = function (el) {
      if (!el) return null;
      var c = getComputedStyle(el);
      return { pos: c.position, opacity: c.opacity, clip: c.clipPath, box: box(el) };
    };
    out.pinStage = styleOf(document.querySelector(".pinned__stage"));
    out.pinImgs = Array.prototype.map.call(document.querySelectorAll(".pinned__img"), styleOf);
    out.pinStep = styleOf(document.querySelector(".pstep"));
    out.checkPanel = styleOf(document.querySelector(".check__panel"));
    out.checkPhoto = styleOf(document.querySelector(".check__photo"));
    out.checkText = styleOf(document.querySelector(".ctask__body"));
    out.checkList = styleOf(document.querySelector(".check__list"));
    out.heroLeft = styleOf(document.querySelector(".hero__shot--left"));
    var pre = document.createElement("pre");
    pre.id = "diag-out";
    pre.textContent = JSON.stringify(out, null, 1);
    document.body.appendChild(pre);
  }, 2200);
});
</script>
"""

SCENES = [".hero", "#intro", "#shengen", "#vily", "#shpargalka", "#degustacia", "#recept", "#galereya"]

if mode == "interact":
    diag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "interaction.js"), encoding="utf-8").read()

extra_css = ""
import re as _re
_m = _re.match(r"^flat-(\d)$", mode)
if _m:
    hide = SCENES[: int(_m.group(1))]
    extra_css = "<style>" + ", ".join(hide) + "{display:none !important}</style>"

if mode.startswith("flat"):
    # «финальное состояние» без анимаций: удобно рассматривать вёрстку
    extra_css += """<style>
.loader, .cursor { display: none !important }
html.js [data-reveal], html.js [data-reveal="stagger"] > * {
  opacity: 1 !important; transform: none !important; clip-path: none !important;
}
[data-split] .ch, [data-split] .wd { transform: none !important; }
.pstep { opacity: 1 !important }
html.js .step__body { grid-template-rows: 1fr !important; opacity: 1 !important }
.step__body > p { padding-bottom: 1.2rem !important }
.tile img { opacity: 1 !important; transform: none !important }
.thermo__fill { height: 30% !important }
</style>"""


out = src.replace("</body>", extra_css + diag + "</body>")
open("_diag.html", "w", encoding="utf-8").write(out)
print("written _diag.html (mode=%s) — временный файл в корне, чтобы относительные пути работали" % mode)

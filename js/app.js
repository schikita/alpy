/* ==========================================================================
   «Наш буевский ответ Альпам» — интерактив лендинга.
   Vanilla JS, без зависимостей. Эффекты движения отключаются при
   prefers-reduced-motion (CSS дублирует ключевые состояния).
   ========================================================================== */
(function () {
  "use strict";

  var G = window.GALLERIES;
  if (!G) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var html = document.documentElement;

  /* ── Утилиты ─────────────────────────────────────────────────────────── */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts); }
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* Единый rAF-цикл. «Постоянные» тикеры (курсор, счётчики, прелоадер) сами
     просят следующий кадр, событийные (параллакс, прогресс) — по скроллу. */
  var tickers = [];
  var ticking = false;

  function frame(now) {
    ticking = false;
    if (document.hidden) return; /* фоновая вкладка не рисует кадры */
    var again = false;
    for (var i = 0; i < tickers.length; i++) {
      var item = tickers[i];
      if (!item || item.dead) continue;
      item.fn(now);
      if (item.always) again = true;
    }
    /* тикеры снимают себя во время кадра: удаляем их уже после обхода */
    for (var j = tickers.length - 1; j >= 0; j--) {
      if (tickers[j].dead) tickers.splice(j, 1);
    }
    if (again) invalidate();
  }

  function invalidate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }

  function addTicker(fn, always) {
    tickers.push({ fn: fn, always: !!always, dead: false });
    if (always) invalidate();
  }

  function dropTicker(fn) {
    for (var i = 0; i < tickers.length; i++) {
      if (tickers[i].fn === fn) tickers[i].dead = true;
    }
  }

  /* ── Прелоадер ───────────────────────────────────────────────────────── */
  var loader = $("#loader");
  var loaderPct = $("[data-loader-pct]");
  var pct = -1;
  var loaderDone = false;

  function finishLoading() {
    if (loaderDone) return;
    loaderDone = true;
    if (loaderPct) loaderPct.textContent = "100";
    html.classList.add("is-ready");
    document.body.classList.remove("is-loading");
    heroEntrance();
    if (loader) {
      loader.classList.add("is-done");
      window.setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 1300);
    }
    invalidate();
  }

  function startLoader() {
    if (!loader || reduced) { finishLoading(); return; }
    var started = performance.now();
    var span = 1500;
    var tick = function (now) {
      var t = clamp((now - started) / span, 0, 1);
      var value = Math.round(easeOut(t) * 96);
      if (value !== pct) {
        pct = value;
        if (loaderPct) loaderPct.textContent = String(pct);
      }
      if (t >= 1) dropTicker(tick);
    };
    addTicker(tick, true); /* пока идёт загрузка, кадры идут сами */
    on(window, "load", finishLoading);
    window.setTimeout(finishLoading, 2600); /* страховка: не держим контент дольше 2,6 с */
    invalidate();
  }

  /* ── Разбивка текста на слова и буквы ────────────────────────────────── */
  function splitText(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = "1";
    var mode = el.dataset.split || "chars";
    var words = el.textContent.split(/(\s+)/);
    var frag = document.createDocumentFragment();
    var wordIndex = 0;

    words.forEach(function (chunk) {
      if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
      var word = document.createElement("span");
      word.className = "wd";
      if (mode === "chars") {
        Array.prototype.slice.call(chunk).forEach(function (letter, i) {
          var span = document.createElement("span");
          span.className = "ch";
          span.textContent = letter;
          span.style.setProperty("--d", (wordIndex * 0.028 + i * 0.024).toFixed(3) + "s");
          word.appendChild(span);
        });
      } else {
        word.textContent = chunk;
        word.style.setProperty("--d", (wordIndex * 0.07).toFixed(3) + "s");
      }
      wordIndex++;
      frag.appendChild(word);
    });

    el.textContent = "";
    el.appendChild(frag);
  }

  /* Кадр с clip-path до появления не пересекает вьюпорт, и loading=lazy
     больше не стартует сам. После is-in заново просим браузер его загрузить. */
  function wakeImages(el) {
    window.requestAnimationFrame(function () {
      el.querySelectorAll("img[src]").forEach(function (img) {
        if (img.naturalWidth) return;
        img.loading = "eager";
        img.src = img.getAttribute("src");
      });
    });
  }

  /* ── Появление при скролле ───────────────────────────────────────────── */
  function initReveals() {
    var targets = $$("[data-reveal], [data-split]");
    targets.forEach(function (el) {
      if (el.hasAttribute("data-split")) splitText(el);
      if (el.dataset.reveal === "stagger") {
        Array.prototype.forEach.call(el.children, function (child, i) {
          child.style.setProperty("--d", (i * 0.075).toFixed(3) + "s");
        });
      }
    });
    $$("[data-reveal='clip'] img[src]").forEach(function (img) {
      img.loading = "eager";
    });
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("is-in");
        wakeImages(el);
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        wakeImages(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ── Счётчики ────────────────────────────────────────────────────────── */
  function initCounters() {
    var nodes = $$("[data-counter]");
    if (!nodes.length) return;
    var run = function (el) {
      var to = parseFloat(el.dataset.counter) || 0;
      if (reduced) { el.textContent = String(to); return; }
      var start = performance.now();
      var dur = 1400;
      var tick = function (now) {
        var t = clamp((now - start) / dur, 0, 1);
        el.textContent = String(Math.round(to * easeOut(t)));
        if (t >= 1) dropTicker(tick);
      };
      addTicker(tick, true);
      invalidate();
    };
    if (reduced || !("IntersectionObserver" in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ── Параллакс (слои двигаются с разной скоростью) ───────────────────── */
  function initParallax(scope) {
    var items = $$("[data-parallax]", scope || document).map(function (el) {
      return { el: el, f: parseFloat(el.dataset.parallax) || 0.1, last: null };
    });
    if (!items.length || reduced) return;
    var tick = function () {
      var vh = window.innerHeight;
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) return;
        var raw = (r.top + r.height / 2 - vh / 2) * it.f;
        var limit = Math.min(70, r.height * 0.08);
        var y = clamp(raw, -limit, limit);
        if (it.last !== null && Math.abs(it.last - y) < 0.4) return;
        it.last = y;
        it.el.style.setProperty("--py", y.toFixed(2) + "px");
      });
    };
    addTicker(tick);
    invalidate();
  }

  /* ── Наклон по курсору ───────────────────────────────────────────────── */
  function initTilt(scope) {
    if (!finePointer || reduced) return;
    $$("[data-tilt]", scope || document).forEach(function (el) {
      var max = 6;
      on(el, "pointermove", function (e) {
        if (e.pointerType === "touch") return;
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.setProperty("--ry", (dx * max).toFixed(2) + "deg");
        el.style.setProperty("--rx", (-dy * max).toFixed(2) + "deg");
      });
      on(el, "pointerleave", function () {
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--rx", "0deg");
      });
    });
  }

  /* ── Магнитные кнопки ────────────────────────────────────────────────── */
  function initMagnetic(scope) {
    if (!finePointer || reduced) return;
    $$("[data-magnetic]", scope || document).forEach(function (el) {
      on(el, "pointermove", function (e) {
        if (e.pointerType === "touch") return;
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.setProperty("--mx", (dx * 6).toFixed(2) + "px");
        el.style.setProperty("--my", (dy * 5).toFixed(2) + "px");
      });
      on(el, "pointerleave", function () {
        el.style.setProperty("--mx", "0px");
        el.style.setProperty("--my", "0px");
      });
    });
  }

  /* ── Курсор ──────────────────────────────────────────────────────────── */
  function initCursor() {
    if (!finePointer || reduced) return;
    var wrap = $(".cursor");
    var dot = $("[data-cursor-dot]");
    var ring = $("[data-cursor-ring]");
    var label = $("[data-cursor-label]");
    if (!wrap || !dot || !ring || !label) return;

    document.body.classList.add("has-cursor");
    wrap.classList.add("is-hidden");
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;

    on(window, "pointermove", function (e) {
      if (e.pointerType === "touch") return;
      mx = e.clientX;
      my = e.clientY;
      wrap.classList.remove("is-hidden");
    }, { passive: true });
    on(window, "pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      mx = e.clientX; my = e.clientY; rx = mx; ry = my;
    }, { passive: true });
    on(document, "mouseleave", function () { wrap.classList.add("is-hidden"); });

    var tick = function () {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      dot.style.transform = "translate3d(" + mx.toFixed(1) + "px," + my.toFixed(1) + "px,0)";
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
      label.style.transform = "translate3d(" + (rx + 22).toFixed(1) + "px," + (ry + 16).toFixed(1) + "px,0)";
    };
    addTicker(tick, true); /* курсор догоняет плавно, значит нужен каждый кадр */
    invalidate();

    var interactive = "a, button, input, [data-carousel-track], .strip__rail, [data-tilt]";
    on(document, "pointerover", function (e) {
      var t = e.target.closest ? e.target.closest(interactive) : null;
      if (!t) return;
      wrap.classList.add("is-hover");
      var text = "";
      if (t.closest(".tile, [data-lightbox-open]")) text = "смотреть";
      else if (t.closest("[data-carousel-track], .strip__rail")) text = "тянуть";
      label.textContent = text;
      wrap.classList.toggle("is-label", !!text);
    });
    on(document, "pointerout", function (e) {
      if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(interactive)) return;
      wrap.classList.remove("is-hover", "is-label");
    });
  }

  /* ── Сборка разметки кадра ───────────────────────────────────────────── */
  function photoFigure(p, sizes) {
    return '<picture>' +
      '<source type="image/webp" srcset="' + p.src.sm + " 900w, " + p.src.md + ' 1700w" sizes="' + esc(sizes) + '">' +
      '<img src="' + p.src.sm + '" alt="' + esc(G.caption(p.id)) + '" width="' + p.w + '" height="' + p.h +
      '" loading="lazy" decoding="async">' +
      '</picture>';
  }

  function slideFigure(id, sizes) {
    var p = G.byId(id);
    if (!p) return "";
    return '<figure class="slide" data-photo="' + p.id + '">' + photoFigure(p, sizes) +
      "<figcaption>" + esc(G.caption(p.id)) + "</figcaption></figure>";
  }

  function addOpenButton(item) {
    if ($(".open-hit", item)) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "open-hit";
    btn.setAttribute("data-lightbox-open", "");
    btn.setAttribute("data-photo", item.dataset.photo);
    btn.setAttribute("aria-label", "Открыть кадр: " + G.caption(item.dataset.photo));
    item.appendChild(btn);
  }

  /* ── Бегущие строки ──────────────────────────────────────────────────── */
  var TICKER_WORDS = [
    "Шенген не нужен", "Буево", "20 км от Витебска", "11 видов сыра",
    "«Анютка»", "«Шевр»", "4 желудка", "Любовь — обязательный ингредиент",
    "Сено → молоко → сыр", "Рука мастера", "«Милавица» и деревня"
  ];

  function initMarquees() {
    $$("[data-marquee]").forEach(function (box) {
      if (box.dataset.marqueeDone) return;
      box.dataset.marqueeDone = "1";
      var items = G.pick(G.groups[box.dataset.marqueeSource] || G.groups.ticker);
      if (!items.length) return;
      var chunk = items.map(function (p, i) {
        return '<span class="tk">' +
          '<img class="tk__img" src="' + p.src.tn + '" alt="" width="400" height="267" loading="lazy" decoding="async">' +
          '<span class="tk__word">' + esc(TICKER_WORDS[i % TICKER_WORDS.length]) + "</span>" +
          "</span>";
      }).join("");

      var track = document.createElement("div");
      track.className = "ticker__track";
      track.innerHTML = chunk + chunk; /* две копии → бесшовный цикл на -50% */
      box.appendChild(track);

      var speed = parseFloat(box.dataset.speed) || 50;
      requestAnimationFrame(function () {
        var width = track.scrollWidth / 2;
        if (width > 0) track.style.setProperty("--dur", (width / Math.abs(speed)).toFixed(2) + "s");
        if (speed < 0) track.style.setProperty("--dir", "reverse");
      });
    });
  }

  /* ── Перетаскивание горизонтальных лент ──────────────────────────────── */
  function makeDraggable(el, onDragEnd) {
    var down = false, startX = 0, startLeft = 0, moved = 0, pointerId = null, dragging = false;

    on(el, "pointerdown", function (e) {
      if (e.pointerType === "touch") return; /* нативный скролл на тач-экранах */
      if (e.target.closest("a")) return;
      down = true;
      dragging = false;
      moved = 0;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      pointerId = e.pointerId;
      if (el.setPointerCapture) el.setPointerCapture(pointerId);
    });

    on(el, "pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 6 && !dragging) {
        dragging = true;
        el.classList.add("is-drag");
      }
      if (dragging) {
        e.preventDefault();
        el.scrollLeft = startLeft - dx;
      }
    });

    var end = function () {
      if (!down) return;
      down = false;
      el.classList.remove("is-drag");
      if (pointerId !== null && el.releasePointerCapture && el.hasPointerCapture && el.hasPointerCapture(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
      pointerId = null;
      if (dragging && typeof onDragEnd === "function") onDragEnd(el);
    };
    on(el, "pointerup", end);
    on(el, "pointercancel", end);
    /* после перетаскивания клик по кадру не должен открывать лайтбокс */
    on(el, "click", function (e) {
      if (moved > 8) { e.preventDefault(); e.stopPropagation(); }
      moved = 0;
    }, true);
  }

  /* ── Карусели разделов ───────────────────────────────────────────────── */
  function initCarousels() {
    $$("[data-carousel]").forEach(function (root) {
      var track = $("[data-carousel-track]", root);
      if (!track) return;
      var group = G.groups[root.dataset.carouselGroup] || [];
      var sizes = "(max-width: 700px) 78vw, 34vw";

      var present = {};
      $$("[data-photo]", track).forEach(function (el) { present[el.dataset.photo] = 1; });
      var add = "";
      group.forEach(function (id) { if (!present[id]) add += slideFigure(id, sizes); });
      if (add) track.insertAdjacentHTML("beforeend", add);

      var slides = $$(".slide", track);
      slides.forEach(function (s) { addOpenButton(s); });

      var status = $("[data-carousel-status]", root);
      var bar = $("[data-carousel-bar]", root);
      var index = 0;

      var label = function (i) { return pad(i + 1) + " / " + pad(slides.length); };
      var update = function () {
        var max = track.scrollWidth - track.clientWidth;
        if (bar) bar.style.setProperty("--p", (max > 0 ? track.scrollLeft / max : 0).toFixed(4));
        /* счётчик показывает первый видимый кадр — так понятнее при листании */
        var anchor = track.scrollLeft + 8;
        var best = 0, bestDist = Infinity;
        slides.forEach(function (s, i) {
          var d = Math.abs(s.offsetLeft - anchor);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        if (best !== index || status.textContent !== label(best)) {
          index = best;
          if (status) status.textContent = label(index);
        }
      };

      var pending = false;
      addTicker(function () {
        if (!pending) return;
        pending = false;
        update();
      });
      on(track, "scroll", function () { pending = true; invalidate(); }, { passive: true });
      on(window, "resize", function () { pending = true; invalidate(); });

      var goTo = function (i) {
        var slide = slides[G.wrap(i, slides.length)];
        if (!slide) return;
        track.scrollTo({
          left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2,
          behavior: reduced ? "auto" : "smooth"
        });
      };
      on($("[data-carousel-prev]", root), "click", function () { goTo(index - 1); });
      on($("[data-carousel-next]", root), "click", function () { goTo(index + 1); });

      on(track, "keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
      });

      makeDraggable(track, function () { pending = true; invalidate(); });
      update();
    });
  }

  /* ── Кинолента дегустации ────────────────────────────────────────────── */
  function initStrips() {
    $$("[data-strip]").forEach(function (root) {
      var rail = $("[data-strip-rail]", root);
      if (!rail) return;
      var group = G.groups[root.dataset.stripGroup] || G.groups.tasting;
      var present = {};
      $$("[data-photo]", rail).forEach(function (el) { present[el.dataset.photo] = 1; });
      var add = "";
      group.forEach(function (id) {
        if (present[id]) return;
        var p = G.byId(id);
        if (!p) return;
        add += '<figure class="strip__item" data-photo="' + p.id + '">' +
          '<picture><source type="image/webp" srcset="' + p.src.tn + " 400w, " + p.src.sm + " 900w" +
          '" sizes="(max-width: 700px) 44vw, 20vw"><img src="' + p.src.tn + '" alt="' + esc(G.caption(p.id)) +
          '" width="900" height="600" loading="lazy" decoding="async"></picture></figure>';
      });
      if (add) rail.insertAdjacentHTML("beforeend", add);
      $$(".strip__item", rail).forEach(function (item) { addOpenButton(item); });
      makeDraggable(rail);
    });
  }

  /* ── Слайдер «молоко → сыр» ──────────────────────────────────────────── */
  function initBeforeAfter() {
    $$("[data-ba]").forEach(function (box) {
      var range = $("[data-ba-range]", box);
      var frame = $(".ba__frame", box);
      if (!range || !frame) return;
      var apply = function (value) {
        box.style.setProperty("--ba", value + "%");
      };
      apply(parseFloat(range.value));
      on(range, "input", function () { apply(parseFloat(range.value)); });

      var sizeRange = function () {
        range.style.height = frame.offsetHeight + "px";
      };
      sizeRange();
      on(window, "resize", sizeRange);
      if ("ResizeObserver" in window) new ResizeObserver(sizeRange).observe(frame);

      /* перетаскивание прямо по кадру, помимо клавиатуры и ползунка */
      var drag = false;
      var setFromEvent = function (e) {
        var r = frame.getBoundingClientRect();
        var value = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
        range.value = String(Math.round(value));
        apply(value);
      };
      on(frame, "pointerdown", function (e) {
        if (reduced) return;
        drag = true;
        setFromEvent(e);
        if (frame.setPointerCapture) frame.setPointerCapture(e.pointerId);
      });
      on(frame, "pointermove", function (e) { if (drag) setEvent(e); });
      function setEvent(e) { e.preventDefault(); setFromEvent(e); }
      var stop = function () { drag = false; };
      on(frame, "pointerup", stop);
      on(frame, "pointercancel", stop);
      on(frame, "pointerleave", stop);
    });
  }

  /* ── Аккордеон «пять шагов» ─────────────────────────────────────────── */
  function initAccordions() {
    $$("[data-accordion]").forEach(function (list) {
      var items = $$(".step", list);
      items.forEach(function (item, i) {
        var head = $(".step__head", item);
        var body = $(".step__body", item);
        if (!head || !body) return;
        head.id = "step-head-" + i;
        body.id = "step-body-" + i;
        body.setAttribute("role", "region");
        body.setAttribute("aria-labelledby", head.id);
        head.setAttribute("aria-controls", body.id);

        on(head, "click", function () {
          var willOpen = !item.classList.contains("is-open");
          items.forEach(function (other) {
            var h = $(".step__head", other);
            other.classList.remove("is-open");
            if (h) h.setAttribute("aria-expanded", "false");
          });
          if (willOpen) {
            item.classList.add("is-open");
            head.setAttribute("aria-expanded", "true");
          }
        });
      });
    });
  }

  /* ── Чек-лист «Рассольного молодого» ────────────────────────────────── */
  function initChecklists() {
    $$("[data-checklist]").forEach(function (box) {
      var buttons = $$("[data-check]", box);
      var ring = $("[data-check-ring]", box);
      var countEl = $("[data-check-count]", box);
      var state = $("[data-check-state]", box);
      var done = $("[data-check-done]", box);
      var total = buttons.length;
      if (!total) return;

      var update = function () {
        var n = 0;
        buttons.forEach(function (b) { if (b.getAttribute("aria-pressed") === "true") n++; });
        if (countEl) countEl.textContent = String(n);
        if (ring) ring.style.strokeDashoffset = String(100 - (n / total) * 100);
        box.classList.toggle("is-done", n === total);
        if (done) done.setAttribute("aria-hidden", n === total ? "false" : "true");
        if (state) {
          state.textContent = n === 0
            ? "Отмечайте шаги — счётчик покажет готовность"
            : n === total
              ? "Готово! Сыр — на полотенце и в холодильник"
              : "Осталось шагов: " + pad(total - n);
        }
      };

      buttons.forEach(function (btn) {
        on(btn, "click", function () {
          var pressed = btn.getAttribute("aria-pressed") === "true";
          btn.setAttribute("aria-pressed", pressed ? "false" : "true");
          var task = btn.closest(".ctask");
          if (task) task.classList.toggle("is-done", !pressed);
          update();
        });
      });
      update();
    });
  }

  /* ── Термометр вызревания ───────────────────────────────────────────── */
  function initThermo() {
    $$("[data-thermo]").forEach(function (box) {
      var fill = $("[data-thermo-fill]", box);
      if (!fill) return;
      /* 12 °C на шкале 0–40 °C — зона вызревания 10–14 °C */
      var show = function () { fill.style.height = "30%"; };
      if (reduced || !("IntersectionObserver" in window)) { show(); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          show();
          io.unobserve(e.target);
        });
      }, { threshold: 0.2 });
      io.observe(box);
    });
  }

  /* ── Закреплённая сцена: вилы → кастрюля → марля ───────────────────── */
  function initPinned() {
    $$("[data-pinned]").forEach(function (box) {
      var steps = $$("[data-pinned-step]", box);
      var images = $$(".pinned__img", box);
      var badge = $("[data-pinned-count]", box);
      if (!steps.length || !images.length) return;

      var setActive = function (i) {
        images.forEach(function (img, k) { img.classList.toggle("is-active", k === i); });
        steps.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
        if (badge) badge.textContent = pad(clamp(i + 1, 1, images.length));
      };
      setActive(0);
      if (!("IntersectionObserver" in window)) return;

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          setActive(parseInt(entry.target.dataset.pinnedStep, 10) || 0);
        });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      steps.forEach(function (s) { io.observe(s); });
    });
  }

  /* ── Скролл-метрики: прогресс, тема, активный раздел, шапка ─────────── */
  function initScrollUI() {
    var ring = $("[data-ring]");
    var railTemp = $("[data-rail-temp]");
    var topbar = $("[data-topbar]");
    var links = $$("[data-nav-link]").concat($$("[data-menu-link]"));
    var lastY = window.scrollY;

    var tick = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var y = window.scrollY;
      var p = max > 0 ? clamp(y / max, 0, 1) : 0;

      if (ring) ring.style.setProperty("--scroll", (p * 100).toFixed(1));
      doc.style.setProperty("--rail", (p * 100).toFixed(1));
      if (railTemp) railTemp.textContent = (10 + p * 4).toFixed(1);

      if (!topbar) return;
      topbar.classList.toggle("is-scrolled", y > 40);
      var menuOpen = document.body.classList.contains("is-menu");
      if (!menuOpen && y > window.innerHeight && y > lastY + 4) topbar.classList.add("is-hidden");
      if (y < lastY - 4 || y < window.innerHeight * 0.4) topbar.classList.remove("is-hidden");
      lastY = y;
    };

    addTicker(tick);
    invalidate();

    var scenes = $$("[data-scene]");
    if ("IntersectionObserver" in window && scenes.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          if (el.dataset.theme) document.body.dataset.theme = el.dataset.theme;
          /* секции-продолжения главы подсвечивают пункт своей главы */
          var hash = "#" + (el.dataset.parent || el.id);
          links.forEach(function (a) {
            var active = a.getAttribute("href") === hash;
            a.classList.toggle("is-active", active);
            if (active) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      scenes.forEach(function (s) { io.observe(s); });
    }
  }

  /* ── Круговое меню ──────────────────────────────────────────────────── */
  function initMenu() {
    var menu = $("[data-menu]");
    var openBtn = $("[data-menu-open]");
    var closeBtn = $("[data-menu-close]");
    if (!menu || !openBtn) return;

    var lastFocus = null;
    var focusables = function () {
      return $$("a[href], button", menu).filter(function (el) {
        return el.tabIndex !== -1 && el.offsetParent !== null;
      });
    };

    var open = function () {
      lastFocus = document.activeElement;
      menu.classList.add("is-open");
      document.body.classList.add("is-menu", "is-locked");
      openBtn.setAttribute("aria-expanded", "true");
      var first = $(".menu__list a", menu);
      if (first) window.setTimeout(function () { first.focus(); }, 280);
      invalidate();
    };

    var close = function () {
      if (!document.body.classList.contains("is-menu")) return;
      menu.classList.remove("is-open", "is-preview");
      document.body.classList.remove("is-menu", "is-locked");
      openBtn.setAttribute("aria-expanded", "false");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      invalidate();
    };

    on(openBtn, "click", function () {
      if (document.body.classList.contains("is-menu")) close();
      else open();
    });
    on(closeBtn, "click", close);
    $$("[data-menu-link], [data-wheel-item]", menu).forEach(function (a) {
      on(a, "click", function () { close(); });
    });

    on(document, "keydown", function (e) {
      if (!document.body.classList.contains("is-menu")) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      var list = focusables();
      if (list.length < 2) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    var preview = $("[data-menu-preview]", menu);
    if (!preview || !finePointer) return;

    /* Кадр-превью следует за курсором; сектор и пункт списка подсвечиваются парно */
    $$("[data-menu-link], [data-wheel-item]", menu).forEach(function (a) {
      var photo = G.byId(a.dataset.photo || "34");
      var href = a.getAttribute("href");
      var show = function () {
        if (photo) preview.style.backgroundImage = 'url("' + photo.src.sm + '")';
        menu.classList.add("is-preview");
        $$(".wedge, .menu__list li a", menu).forEach(function (other) {
          other.classList.toggle("is-active", other.getAttribute("href") === href);
        });
      };
      on(a, "pointerenter", show);
      on(a, "focus", show);
      on(a, "pointerleave", function () { menu.classList.remove("is-preview"); });
    });

    on(menu, "pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var r = menu.getBoundingClientRect();
      preview.style.setProperty("--px", (e.clientX - r.left + 28).toFixed(0) + "px");
      preview.style.setProperty("--py", (e.clientY - r.top - preview.offsetHeight / 2).toFixed(0) + "px");
    });
  }

  /* ── Галерея: masonry, blur-up, фильтры ─────────────────────────────── */
  var GRID_ROW = 8;
  var GRID_GAP = 8;

  function initGallery() {
    var grid = $("[data-gallery]");
    if (!grid) return;
    var photos = G.all();
    var frag = document.createDocumentFragment();

    photos.forEach(function (p) {
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.dataset.photo = p.id;
      tile.dataset.tags = (G.tags[p.id] || []).join(" ");
      tile.setAttribute("data-lightbox-open", "");
      tile.setAttribute("aria-label", "Открыть кадр: " + G.caption(p.id) + ". " + G.tagLabels(p.id).join(", "));
      tile.style.backgroundImage = 'url("' + p.blur + '")'; /* размытая основа, пока грузится кадр */

      var tags = G.tagLabels(p.id).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("");
      tile.innerHTML =
        '<img src="' + p.src.sm + '" srcset="' + p.src.sm + " 900w, " + p.src.md + ' 1700w" ' +
        'sizes="(max-width: 640px) 46vw, (max-width: 1100px) 31vw, 22vw" alt="' + esc(G.caption(p.id)) +
        '" width="' + p.w + '" height="' + p.h + '" loading="lazy" decoding="async">' +
        '<span class="tile__tags">' + tags + "</span>" +
        '<span class="tile__cap">' + esc(G.caption(p.id)) + "</span>";

      var img = $("img", tile);
      if (img) {
        if (img.complete && img.naturalWidth) tile.classList.add("is-loaded");
        else on(img, "load", function () { tile.classList.add("is-loaded"); });
      }
      frag.appendChild(tile);
    });
    grid.appendChild(frag);

    var lastCol = 0;
    var recalc = function () {
      var first = $(".tile", grid);
      if (!first) return;
      var col = first.getBoundingClientRect().width;
      if (!col) return;
      lastCol = col;
      $$(".tile", grid).forEach(function (tile) {
        var p = G.byId(tile.dataset.photo);
        if (p) tile.style.setProperty("--span", String(G.span(p.ratio, col, GRID_ROW, GRID_GAP)));
      });
    };

    recalc();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(recalc);
    on(window, "resize", function () {
      var first = $(".tile", grid);
      if (!first) return;
      if (Math.abs(first.getBoundingClientRect().width - lastCol) > 1) recalc();
    });

    /* Фильтры */
    var wrap = $("[data-filters]");
    if (!wrap) return;
    var buttons = $$("[data-filter]", wrap);
    var count = $("[data-filter-count]", wrap);
    buttons.forEach(function (btn) {
      on(btn, "click", function () {
        var tag = btn.dataset.filter;
        buttons.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
        var shown = 0;
        $$(".tile", grid).forEach(function (tile) {
          var match = tag === "all" || (tile.dataset.tags || "").split(" ").indexOf(tag) !== -1;
          tile.classList.toggle("is-hidden", !match);
          if (match) shown++;
        });
        if (count) count.textContent = String(shown);
        grid.classList.add("is-filtering");
        window.setTimeout(function () { grid.classList.remove("is-filtering"); }, 700);
        recalc();
      });
    });
  }

  /* ── Лайтбокс ───────────────────────────────────────────────────────── */
  function initLightbox() {
    var root = $("[data-lightbox]");
    if (!root) return;
    var img = $("[data-lb-img]", root);
    var cap = $("[data-lb-cap]", root);
    var tags = $("[data-lb-tags]", root);
    var indexEl = $("[data-lb-index]", root);
    var totalEl = $("[data-lb-total]", root);
    var progress = $(".lb__progress", root);
    var closeBtn = $("[data-lb-close]", root);
    var list = G.all();
    var index = 0;
    var lastFocus = null;

    var preload = function (id) {
      var p = G.byId(id);
      if (p) new Image().src = p.src.md;
    };

    var render = function () {
      var p = list[index];
      if (!p) return;
      img.classList.remove("is-zoom");
      img.style.transformOrigin = "50% 50%";
      img.src = p.src.md;
      img.alt = G.caption(p.id);
      cap.textContent = G.caption(p.id);
      tags.textContent = G.tagLabels(p.id).join(" · ");
      indexEl.textContent = pad(index + 1);
      totalEl.textContent = pad(list.length);
      if (progress) progress.style.setProperty("--p", (list.length > 1 ? index / (list.length - 1) : 0).toFixed(4));
      preload(list[G.wrap(index + 1, list.length)].id);
      preload(list[G.wrap(index - 1, list.length)].id);
    };

    var open = function (id) {
      var i = -1;
      list.forEach(function (p, k) { if (p.id === id) i = k; });
      if (i < 0) return;
      index = i;
      lastFocus = document.activeElement;
      render();
      root.classList.add("is-open");
      document.body.classList.add("is-locked");
      if (closeBtn) window.setTimeout(function () { closeBtn.focus(); }, 240);
    };

    var close = function () {
      if (!root.classList.contains("is-open")) return;
      root.classList.remove("is-open");
      document.body.classList.remove("is-locked");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    var step = function (d) {
      index = G.wrap(index + d, list.length);
      render();
    };

    /* Открытие делегировано: подходит для плитки, карусели, кнопки в герое */
    on(document, "click", function (e) {
      var trigger = e.target.closest ? e.target.closest("[data-lightbox-open]") : null;
      if (!trigger) return;
      e.preventDefault();
      open(trigger.dataset.photo);
    });

    on(closeBtn, "click", close);
    on($("[data-lb-prev]", root), "click", function () { step(-1); });
    on($("[data-lb-next]", root), "click", function () { step(1); });
    on(root, "click", function (e) {
      if (e.target === root || e.target.classList.contains("lb__stage")) close();
    });

    on(document, "keydown", function (e) {
      if (!root.classList.contains("is-open")) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      else if (e.key === "Home") { e.preventDefault(); index = 0; render(); }
      else if (e.key === "End") { e.preventDefault(); index = list.length - 1; render(); }
      else if (e.key === "Tab") {
        /* фокус не уходит на страницу под диалогом */
        var list2 = $$("[data-lb-close], [data-lb-prev], [data-lb-next]", root);
        if (list2.length < 2) return;
        var first = list2[0];
        var last = list2[list2.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    /* Свайп на тач-экранах и зум по клику */
    var swipe = { active: false, x: 0, y: 0 };
    on($(".lb__stage", root), "pointerdown", function (e) {
      swipe.active = true;
      swipe.x = e.clientX;
      swipe.y = e.clientY;
    });
    on($(".lb__stage", root), "pointerup", function (e) {
      if (!swipe.active) return;
      swipe.active = false;
      var dx = e.clientX - swipe.x;
      var dy = e.clientY - swipe.y;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    });

    on(img, "click", function (e) {
      if (img.classList.contains("is-zoom")) {
        img.classList.remove("is-zoom");
        img.style.transformOrigin = "50% 50%";
        return;
      }
      var r = img.getBoundingClientRect();
      var ox = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
      var oy = clamp(((e.clientY - r.top) / r.height) * 100, 0, 100);
      img.style.transformOrigin = ox.toFixed(1) + "% " + oy.toFixed(1) + "%";
      img.classList.add("is-zoom");
    });
    on(img, "pointermove", function (e) {
      if (!img.classList.contains("is-zoom")) return;
      var r = img.getBoundingClientRect();
      var ox = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
      var oy = clamp(((e.clientY - r.top) / r.height) * 100, 0, 100);
      img.style.transformOrigin = ox.toFixed(1) + "% " + oy.toFixed(1) + "%";
    });

    /* Плавная смена кадра без разрыва (View Transitions там, где поддерживается) */
    root.addEventListener("click", function (e) {
      var nav = e.target.closest ? e.target.closest("[data-lb-prev], [data-lb-next]") : null;
      if (nav && document.startViewTransition && !reduced) {
        e.preventDefault();
        document.startViewTransition(function () {
          step(nav.hasAttribute("data-lb-next") ? 1 : -1);
        });
      }
    }, true);
  }

  /* ── Выход героя: кадры «раскрываются» после прелоадера ─────────────
     Анимируется только clip-path/transform: если анимация не запустится
     (или её отключили), кадры всё равно видны — без opacity-зависимости. */
  function heroEntrance() {
    var shots = $$(".hero__shot");
    if (!shots.length || reduced || !window.Element || !Element.prototype.animate) return;

    shots.forEach(function (shot, i) {
      var finalShape = window.getComputedStyle(shot).clipPath;
      var points = (finalShape.match(/polygon\(([^)]+)\)/) || [])[1];
      if (!points) return;

      var parsed = points.split(",").map(function (point) {
        var parts = point.trim().split(/\s+/);
        return { x: parts[0], y: parseFloat(parts[1]) || 0, yu: (parts[1] || "").replace(/[\d.-]/g, "") };
      });
      var maxY = Math.max.apply(null, parsed.map(function (p) { return p.y; }));
      var collapsed = "polygon(" + parsed.map(function (p) {
        return p.x + " " + maxY + p.yu;
      }).join(", ") + ")";

      shot.animate([
        { clipPath: collapsed, transform: "translate3d(0, 0, 0) scale(1.04)" },
        { clipPath: finalShape, transform: "translate3d(0, 0, 0) scale(1)" }
      ], {
        duration: 1400,
        delay: 110 * i,
        easing: "cubic-bezier(.16,1,.3,1)"
      });
    });
  }

  /* ── Запуск ─────────────────────────────────────────────────────────── */
  function boot() {
    initReveals();
    initCounters();
    initMarquees();
    initCarousels();
    initStrips();
    initBeforeAfter();
    initAccordions();
    initChecklists();
    initThermo();
    initPinned();
    initScrollUI();
    initMenu();
    initGallery();
    initLightbox();
    initParallax();
    initTilt();
    initMagnetic();
    initCursor();
    startLoader();

    /* событийные эффекты (параллакс, прогресс, шапка) пересчитываются в кадре */
    on(window, "scroll", invalidate, { passive: true });
    on(window, "resize", invalidate);

    /* фоновая вкладка не жжёт батарею: кадры не рисуются, пока страница скрыта */
    on(document, "visibilitychange", function () {
      if (!document.hidden) invalidate();
    });
  }

  if (document.readyState === "loading") on(document, "DOMContentLoaded", boot);
  else boot();
})();

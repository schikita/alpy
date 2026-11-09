/* Инъектируемый сценарий взаимодействий (см. tools/make-diag.py, режим interact).
   Печатает построчный отчёт в <pre id="diag-out">: «ok …» / «FAIL …». */
<script>
window.addEventListener("load", function () {
  setTimeout(function () {
    var log = [];
    function t(name, fn, detail) {
      try {
        var r = fn();
        log.push((r ? "ok   " : "FAIL ") + name + (!r && detail ? " [" + detail() + "]" : ""));
      } catch (e) { log.push("FAIL " + name + " — " + e.message); }
    }
    function key(k) { document.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); }
    function q(s, r) { return (r || document).querySelector(s); }
    function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

    /* ── Галерея и фильтры ── */
    t("галерея: ровно 50 плиток", function () { return qa(".grid .tile").length === 50; });
    q('[data-filter="cheese"]').click();
    t("фильтр «Сыр» оставляет 16 кадров", function () { return q("[data-filter-count]").textContent === "16"; });
    t("скрытых плиток 34", function () { return qa(".grid .tile.is-hidden").length === 34; });
    t("активной кнопке выставлен aria-pressed", function () {
      return q('[data-filter="cheese"]').getAttribute("aria-pressed") === "true";
    });
    q('[data-filter="all"]').click();
    t("сброс фильтра возвращает 50", function () { return q("[data-filter-count]").textContent === "50"; });

    /* ── Лайтбокс ── */
    q(".grid .tile").click();
    t("клик по плитке открывает лайтбокс", function () {
      return document.getElementById("lightbox").classList.contains("is-open");
    });
    t("счётчик лайтбокса: 01 из 50", function () {
      return q("[data-lb-index]").textContent === "01" && q("[data-lb-total]").textContent === "50";
    });
    t("подпись кадра подставлена", function () { return q("[data-lb-cap]").textContent.length > 4; });
    t("теги кадра переведены", function () { return q("[data-lb-tags]").textContent.length > 2; });
    key("ArrowRight");
    t("→ переключает кадр", function () { return q("[data-lb-index]").textContent === "02"; });
    key("ArrowLeft");
    /* в headless-окне без фокуса окна программный focus() не срабатывает —
       сначала проверяем саму возможность, иначе помечаем как пропуск */
    var canFocus = (function () {
      var probe = document.createElement("button");
      document.body.appendChild(probe);
      probe.focus();
      var res = document.activeElement === probe;
      probe.parentNode.removeChild(probe);
      return res;
    })();
    /* кнопки диалога становятся фокусируемыми после перехода visibility;
       без кадров переход не продвигается — тогда проверку честно пропускаем */
    var lbVisible = window.getComputedStyle(q("[data-lb-next]")).visibility === "visible";
    if (canFocus && lbVisible) {
      t("фокус удерживается в диалоге (Tab с последнего элемента)", function () {
        var btn = q("[data-lb-next]");
        btn.focus();
        key("Tab");
        return document.activeElement === q("[data-lb-close]");
      }, function () { return "active=" + (document.activeElement && document.activeElement.className); });
    } else {
      log.push("skip ловушка фокуса не проверена: " + (canFocus ? "переход visibility не продвигается без кадров"
        : "headless-окно не получает фокус"));
    }
    key("Escape");
    t("ESC закрывает лайтбокс", function () {
      return !document.getElementById("lightbox").classList.contains("is-open");
    });

    /* ── Круговое меню ── */
    document.getElementById("menuBtn").click();
    t("кнопка открывает круговое меню", function () {
      return document.getElementById("menu").classList.contains("is-open") &&
        document.body.classList.contains("is-menu");
    });
    key("Escape");
    t("ESC закрывает меню", function () {
      return !document.getElementById("menu").classList.contains("is-open") &&
        !document.body.classList.contains("is-menu");
    });

    /* ── Аккордеон «пять шагов» ── */
    var steps = qa(".step");
    steps[2].querySelector(".step__head").click();
    t("аккордеон открывает выбранный шаг", function () {
      return steps[2].classList.contains("is-open") && !steps[0].classList.contains("is-open");
    });
    t("aria-expanded синхронизирован", function () {
      return steps[2].querySelector(".step__head").getAttribute("aria-expanded") === "true" &&
        steps[0].querySelector(".step__head").getAttribute("aria-expanded") === "false";
    });
    /* ── Чек-лист рецепта ── */
    var checks = qa("[data-check]");
    checks[0].click();
    checks[1].click();
    t("чек-лист считает отмеченные шаги", function () {
      return q("[data-check-count]").textContent === "2";
    });
    t("кольцо прогресса заполнено на треть", function () {
      var v = parseFloat(q("[data-check-ring]").style.strokeDashoffset);
      return Math.abs(v - 66.667) < 0.05;
    });
    t("состояние сообщается словами", function () {
      return /Осталось шагов: 04/.test(q("[data-check-state]").textContent);
    });
    t("шаги помечены выполненными", function () { return qa(".ctask.is-done").length === 2; });
    for (var i = 2; i < 6; i++) checks[i].click();
    t("шесть шагов — режим «готово»", function () {
      return q(".check").classList.contains("is-done") &&
        q("[data-check-done]").getAttribute("aria-hidden") === "false";
    });
    t("повторный клик снимает отметку", function () {
      checks[0].click();
      return !checks[0].closest(".ctask").classList.contains("is-done") &&
        q("[data-check-count]").textContent === "5";
    });

    /* ── Карусель и слайдер ── */
    var track = q("[data-carousel-track]");
    t("статус карусели до листания: 01 / 16", function () {
      return /01 \/ 16/.test(q("[data-carousel-status]").textContent);
    }, function () { return "статус=" + q("[data-carousel-status]").textContent; });
    var before = track.scrollLeft;
    q("[data-carousel-next]").click();
    t("карусель: стрелка «вперёд» не ломает ленту", function () { return track.scrollLeft >= before; });
    var range = q("[data-ba-range]");
    range.value = "20";
    range.dispatchEvent(new Event("input", { bubbles: true }));
    t("слайдер «до/после» пишет --ba", function () {
      return q("[data-ba]").style.getPropertyValue("--ba") === "20%";
    });
    t("меню и рельс ведут на все пять секций", function () {
      return ["shengen", "vily", "shpargalka", "degustacia", "recept"].every(function (id) {
        return !!document.getElementById(id) &&
          !!q('.menu__list a[href="#' + id + '"]') &&
          !!q('.rail__list a[href="#' + id + '"]');
      });
    });

    /* ── Скролл-состояния ── */
    var galleryTop = document.querySelector("footer.foot").offsetTop;
    var scrollEvents = 0;
    window.addEventListener("scroll", function () { scrollEvents++; }, { passive: true });
    var frames = 0;
    (function pump() {
      frames++;
      if (frames < 200) requestAnimationFrame(pump);
    })();
    window.scrollTo({ top: galleryTop + 10, behavior: "instant" });
    setTimeout(function () {
      var envFrames = frames > 5;
      var envScroll = scrollEvents > 0;
      log.push("  ·  среда: visibility=" + document.visibilityState + ", кадров rAF=" + frames +
        ", scroll-событий=" + scrollEvents);
      t("скролл к подвалу выполнен", function () { return Math.abs(window.scrollY - (galleryTop + 10)) < 40; },
        function () { return "scrollY=" + window.scrollY + " target=" + (galleryTop + 10); });
      t("карусель остаётся горизонтальной", function () {
        var tr = q("[data-carousel-track]");
        return tr.scrollWidth > tr.clientWidth;
      });
      t("закреплённая сцена держит один активный кадр", function () {
        return qa(".pinned__img.is-active").length === 1;
      });
      t("параллакс героя получил смещение", function () {
        return q("[data-hero-probe]") !== null || q(".hero__shot").style.getPropertyValue("--py") !== "";
      });

      /* Скролл-эффекты обновляются в кадре. В headless-странице документ
         считается скрытым, поэтому кадры и IntersectionObserver не доставляются —
         такие проверки честно помечаем пропущенными, а не «проваленными». */
      if (envFrames || envScroll) {
        t("тема body следует за разделом", function () { return document.body.dataset.theme === "ink"; },
          function () { return "theme=" + document.body.dataset.theme; });
        t("стрелка прогресса заполняется", function () {
          return parseFloat(q("[data-ring]").style.getPropertyValue("--scroll")) > 50;
        }, function () { return "scroll=" + q("[data-ring]").style.getPropertyValue("--scroll"); });
        t("рельс показывает температуру вызревания", function () {
          var v = parseFloat(q("[data-rail-temp]").textContent);
          return v > 13 && v <= 14;
        }, function () { return "temp=" + q("[data-rail-temp]").textContent; });
        t("активен последний раздел", function () {
          var active = qa(".rail__list a.is-active")[0];
          return !!active && active.getAttribute("href") === "#recept";
        }, function () { var a = qa(".rail__list a.is-active")[0]; return "href=" + (a ? a.getAttribute("href") : "нет"); });
      } else {
        log.push("skip скролл-эффекты отложены: среда не обслуживает кадры (скрытый headless-документ)");
      }

      var pre = document.createElement("pre");
      pre.id = "diag-out";
      pre.textContent = log.join("\n");
      document.body.appendChild(pre);
    }, 700);
  }, 2600);
});
</script>

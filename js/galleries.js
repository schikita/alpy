/* Photo metadata + gallery composition + small pure helpers.
   Loaded before js/app.js. Captions/tags are authored from the actual shoot. */
(function (w) {
  "use strict";

  var CAPTIONS = {
    "01": "Ирина Лужкова выводит коз на луг",
    "02": "Формы, марля и оттиск «Козьей сыроварни»",
    "03": "Егор процеживает сырную массу",
    "04": "Альпийская коза крупным планом",
    "05": "Ласка вместо дисциплины",
    "06": "«Молоко начинается с сена»",
    "07": "Полутвёрдый сыр на разрезе",
    "08": "Сено в амбар — по расписанию",
    "09": "Утиный десант на выпасе",
    "10": "Сырная полка на просушке",
    "11": "Стол для дегустации накрыт",
    "12": "Бирки строгого ветеринарного учёта",
    "13": "Трактор возвращается с поля",
    "14": "Взгляд из козьего окна",
    "15": "Куры на вольном выгуле",
    "16": "Десерт «Анютка» из козьего молока",
    "17": "Портрет с биркой в ухе",
    "18": "Молоко: пастеризация началась",
    "19": "Знакомство с породистыми козами",
    "20": "Трава для будущего вкуса",
    "21": "Деревенский двор с курами",
    "22": "Головка сыра после посола",
    "23": "На подворье — козы, утки и куры",
    "24": "Очень серьёзный взгляд",
    "25": "Сыр отправляется на просушку",
    "26": "Сено, тачка и городские журналисты",
    "27": "Козы выясняют отношения",
    "28": "Шумовка в руках мастера",
    "29": "Любовь — обязательный ингредиент",
    "30": "Кристина и Егор с трофеем дня",
    "31": "Ирина кормит любимиц с рук",
    "32": "Оттиск логотипа на головке сыра",
    "33": "Свежий разрез: глазами и в дырочках",
    "34": "Коза смотрит прямо в кадр",
    "35": "Егор осваивает сырный бар",
    "36": "Сервировка на веранде с печью",
    "37": "Хозяйка и её породистые козы",
    "38": "Характер чувствуется во всех слоях",
    "39": "Объятия с любимой козочкой",
    "40": "У кирпичного дома сыроварни",
    "41": "Вилы, сено и один день сыровара",
    "42": "Кристина перед стерилизацией",
    "43": "Дым над сырным аппаратом",
    "44": "Вторая ходка за сеном",
    "45": "Птичник встречает гостей",
    "46": "Марля расправлена — сыворотка уходит",
    "47": "Натюрморт по рецепту хозяйки",
    "48": "Секретный десерт к столу",
    "49": "Козы пасутся у фермы",
    "50": "Кристина как гастрономический эксперт"
  };

  var TAGS = {
    "01": ["people", "goats"], "02": ["process", "cheese"], "03": ["process"],
    "04": ["goats"], "05": ["goats", "people"], "06": ["process"],
    "07": ["cheese", "process"], "08": ["goats", "people"], "09": ["yard"],
    "10": ["cheese"], "11": ["cheese", "people"], "12": ["goats", "people"],
    "13": ["yard"], "14": ["goats"], "15": ["yard"], "16": ["cheese"],
    "17": ["goats"], "18": ["process"], "19": ["goats", "people"],
    "20": ["process", "people"], "21": ["yard"], "22": ["cheese"],
    "23": ["goats", "people"], "24": ["goats"], "25": ["cheese", "process"],
    "26": ["process", "people"], "27": ["goats"], "28": ["process", "people"],
    "29": ["goats", "people"], "30": ["cheese", "people"],
    "31": ["people", "goats"], "32": ["cheese", "process"],
    "33": ["cheese", "process"], "34": ["goats"], "35": ["cheese", "people", "process"],
    "36": ["cheese", "people"], "37": ["goats", "people"], "38": ["cheese"],
    "39": ["goats", "people"], "40": ["goats", "people"], "41": ["process", "people"],
    "42": ["process", "people"], "43": ["process"], "44": ["process", "people"],
    "45": ["yard", "people"], "46": ["process", "people"],
    "47": ["cheese"], "48": ["cheese", "people"], "49": ["goats"],
    "50": ["cheese", "process", "people"]
  };

  var FILTERS = [
    { tag: "all", label: "Все 50 фото" },
    { tag: "goats", label: "Козы" },
    { tag: "people", label: "Люди" },
    { tag: "cheese", label: "Сыр" },
    { tag: "process", label: "Процесс" },
    { tag: "yard", label: "Двор" }
  ];

  /* Photo pools. Order defines how they appear in sections. */
  var GROUPS = {
    hero: ["34", "29", "38"],
    ticker: ["01", "02", "07", "16", "24", "27", "32", "35", "38", "41", "47", "49"],
    farm: ["01", "29", "05", "12", "04", "17", "24", "27", "14", "49", "31", "39", "23", "08", "37", "40"],
    process: ["06", "41", "44", "26", "20", "02", "03", "46", "18", "28", "25", "33", "07", "35", "43", "48", "50"],
    tasting: ["10", "11", "16", "22", "32", "33", "38", "47", "48", "36"],
    yard: ["09", "15", "21", "45", "13", "23"],
    recipe: ["18", "02", "03", "07", "22", "48"],
    spread: ["30", "42", "36", "19", "46"]
  };

  function byId(id) {
    var list = w.PHOTOS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function pick(ids) {
    return ids.map(byId).filter(Boolean);
  }

  function filter(tag) {
    var list = w.PHOTOS || [];
    if (!tag || tag === "all") return list.slice();
    return list.filter(function (p) {
      return (TAGS[p.id] || []).indexOf(tag) !== -1;
    });
  }

  /* Wrapping index for carousels / lightbox navigation. */
  function wrap(i, len) {
    if (len <= 0) return 0;
    return ((i % len) + len) % len;
  }

  /* Masonry row-span so a fixed-row grid keeps each photo's aspect ratio. */
  function span(ratio, colWidth, rowH, gap) {
    var height = colWidth / ratio;
    return Math.max(1, Math.ceil((height + gap) / (rowH + gap)));
  }

  function caption(id) {
    return CAPTIONS[id] || "Козья сыроварня в Буево";
  }

  function tagLabels(id) {
    var labels = {};
    FILTERS.forEach(function (f) { labels[f.tag] = f.label; });
    return (TAGS[id] || []).map(function (t) { return labels[t] || t; });
  }

  w.GALLERIES = {
    captions: CAPTIONS, tags: TAGS, filters: FILTERS, groups: GROUPS,
    byId: byId, pick: pick, filter: filter, wrap: wrap, span: span,
    caption: caption, tagLabels: tagLabels,
    all: function () { return (w.PHOTOS || []).slice(); }
  };
})(window);

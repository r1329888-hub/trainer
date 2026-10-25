"use strict";
/* ============ Студия: данные (параметры, фильтры, эффекты, фигуры, рамки, шрифты) ============ */
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- настройки: [ключ, название, мин, макс, группа, по умолчанию] ---------- */
const GROUPS = [['light', 'Свет'], ['color', 'Цвет'], ['grade', 'Градация'], ['detail', 'Детали'], ['fx', 'Эффекты'], ['distort', 'Деформация'], ['beauty', 'Красота'], ['focus', 'Фокус']];
const PARAMS = [
  ['exposure', 'Экспозиция', -100, 100, 'light', 0], ['brightness', 'Яркость', -100, 100, 'light', 0], ['contrast', 'Контраст', -100, 100, 'light', 0],
  ['highlights', 'Света', -100, 100, 'light', 0], ['shadows', 'Тени', -100, 100, 'light', 0], ['whites', 'Белые', -100, 100, 'light', 0],
  ['blacks', 'Чёрные', -100, 100, 'light', 0], ['dehaze', 'Дымка', -100, 100, 'light', 0], ['texture', 'Текстура', -100, 100, 'light', 0],
  ['saturation', 'Насыщенность', -100, 100, 'color', 0], ['vibrance', 'Сочность', -100, 100, 'color', 0], ['temperature', 'Температура', -100, 100, 'color', 0],
  ['tint', 'Оттенок', -100, 100, 'color', 0], ['hue', 'Тон', -100, 100, 'color', 0],
  ['gShadH', 'Тени: цвет', 0, 100, 'grade', 0], ['gShadS', 'Тени: сила', 0, 100, 'grade', 0], ['gMidH', 'Средние: цвет', 0, 100, 'grade', 0], ['gMidS', 'Средние: сила', 0, 100, 'grade', 0],
  ['gHighH', 'Света: цвет', 0, 100, 'grade', 0], ['gHighS', 'Света: сила', 0, 100, 'grade', 0], ['gBal', 'Баланс', -100, 100, 'grade', 0],
  ['sharpen', 'Резкость', 0, 100, 'detail', 0], ['clarity', 'Чёткость', -100, 100, 'detail', 0], ['denoise', 'Шумоподавление', 0, 100, 'detail', 0],
  ['blur', 'Размытие', 0, 100, 'detail', 0], ['glow', 'Свечение', 0, 100, 'detail', 0], ['grain', 'Зерно', 0, 100, 'detail', 0],
  ['motion', 'Размытие движения', 0, 100, 'detail', 0], ['motionAng', 'Угол движения', 0, 100, 'detail', 0], ['zoomblur', 'Зум-размытие', 0, 100, 'detail', 0],
  ['vignette', 'Виньетка', -100, 100, 'fx', 0], ['fade', 'Выцветание', 0, 100, 'fx', 0], ['aberration', 'Хром. аберрация', 0, 100, 'fx', 0],
  ['pixelate', 'Пиксели', 0, 100, 'fx', 0], ['posterize', 'Постеризация', 0, 100, 'fx', 0], ['duotone', 'Дуотон', 0, 100, 'fx', 0],
  ['scanlines', 'Строки ЭЛТ', 0, 100, 'fx', 0], ['solarize', 'Соляризация', 0, 100, 'fx', 0], ['threshold', 'Порог (ч/б)', 0, 100, 'fx', 0],
  ['glitch', 'Глитч', 0, 100, 'fx', 0], ['invert', 'Негатив', 0, 100, 'fx', 0], ['edge', 'Контуры', 0, 100, 'fx', 0], ['sketch', 'Эскиз', 0, 100, 'fx', 0],
  ['emboss', 'Тиснение', 0, 100, 'fx', 0], ['halftone', 'Полутона', 0, 100, 'fx', 0],
  ['lensA', 'Линза: пузырь/щипок', -100, 100, 'distort', 0], ['lensX', 'Линза: влево–вправо', 0, 100, 'distort', 50], ['lensY', 'Линза: вверх–вниз', 0, 100, 'distort', 50],
  ['lensR', 'Линза: размер', 5, 100, 'distort', 40], ['distort', 'Бочка / подушка', -100, 100, 'distort', 0], ['kv', 'Перспектива: вертикаль', -100, 100, 'distort', 0],
  ['kh', 'Перспектива: горизонт', -100, 100, 'distort', 0], ['swirl', 'Вихрь', -100, 100, 'distort', 0], ['wave', 'Волна', 0, 100, 'distort', 0],
  ['mirrorH', 'Зеркало ↔', 0, 100, 'distort', 0], ['mirrorV', 'Зеркало ↕', 0, 100, 'distort', 0], ['kaleido', 'Калейдоскоп', 0, 100, 'distort', 0],
  ['skin', 'Гладкая кожа', 0, 100, 'beauty', 0], ['blush', 'Румянец', 0, 100, 'beauty', 0],
  ['focus', 'Размытие вне фокуса', 0, 100, 'focus', 0], ['focusX', 'Фокус: влево–вправо', 0, 100, 'focus', 50], ['focusY', 'Фокус: вверх–вниз', 0, 100, 'focus', 50],
  ['focusR', 'Фокус: размер', 5, 100, 'focus', 35], ['focusF', 'Фокус: мягкость', 0, 100, 'focus', 30],
];
const PDEF = Object.fromEntries(PARAMS.map(p => [p[0], p[5]]));
const zeroParams = () => ({ ...PDEF });
const PKEYS = PARAMS.map(p => p[0]);
const HSLC = [['Красный', '#e53935'], ['Оранжевый', '#fb8c00'], ['Жёлтый', '#fdd835'], ['Зелёный', '#43a047'], ['Бирюзовый', '#00acc1'], ['Синий', '#3949ab'], ['Фиолетовый', '#8e24aa'], ['Розовый', '#d81b60']];
const LOCAL = [['exp', 'Экспозиция'], ['con', 'Контраст'], ['sat', 'Насыщенность'], ['warm', 'Тепло / холод'], ['smooth', 'Сглаживание'], ['sharp', 'Резкость'], ['clar', 'Чёткость'], ['red', 'Убрать красноту']];
const LPRE = [['☀ Осветлить', { exp: 35 }], ['🌑 Затемнить', { exp: -35 }], ['✨ Гладкая кожа', { smooth: 70 }], ['🔍 Резкость', { sharp: 70, clar: 20 }],
  ['🌫 Размыть', { smooth: 100 }], ['🌈 Цвет +', { sat: 45 }], ['🩶 Цвет −', { sat: -60 }], ['🔥 Тепло', { warm: 40 }], ['❄ Холод', { warm: -40 }],
  ['👁 Красные глаза', { red: 100, exp: 8 }], ['🦷 Отбелить', { sat: -40, exp: 18 }], ['◐ Контраст', { con: 40 }]];

/* ---------- ФИЛЬТРЫ ---------- */
const FCATS = [['mine', 'Мои'], ['top', 'Топ'], ['port', 'Портрет'], ['land', 'Пейзаж'], ['food', 'Еда'], ['night', 'Ночь'], ['cin', 'Кино'], ['film', 'Плёнка'], ['bw', 'Ч/Б'], ['ret', 'Ретро'],
  ['vib', 'Яркие'], ['wx', 'Погода'], ['tone', 'Тона'], ['duo', 'Дуо'], ['art', 'Арт']];
const FL = [
  /* топ */
  ['orig', 'Оригинал', 'top', {}],
  ['gold', 'Золото', 'top', { temperature: 32, contrast: 12, vignette: 26, saturation: -6 }, { sepia: .22, gain: [1.08, 1, .86] }],
  ['emerald', 'Изумруд', 'top', { contrast: 12, saturation: -8, vignette: 20 }, { lift: [0, .025, .012], gain: [.92, 1.03, .97] }],
  ['vivid', 'Яркий', 'top', { saturation: 36, vibrance: 34, contrast: 16 }],
  ['warm', 'Тёплый', 'top', { temperature: 34, tint: 6, saturation: 8 }],
  ['cool', 'Холодный', 'top', { temperature: -34, tint: -4, saturation: 4 }],
  ['pastel', 'Пастель', 'top', { saturation: -18, brightness: 12, fade: 26, contrast: -16 }],
  ['sunset', 'Закат', 'top', { temperature: 42, tint: 12, saturation: 22, vignette: 18 }, { gain: [1.1, .95, .84] }],
  ['mint', 'Мята', 'top', { temperature: -16, tint: -12, brightness: 8, saturation: 8 }, { gain: [.95, 1.03, 1] }],
  ['drama', 'Драма', 'top', { contrast: 36, saturation: -20, highlights: -30, shadows: 22, sharpen: 34, vignette: 28 }],
  ['clean', 'Чисто', 'top', { contrast: 8, brightness: 6, saturation: 10, sharpen: 20, clarity: 15 }],
  ['glowf', 'Сияние', 'top', { glow: 38, brightness: 6, fade: 10, saturation: 6 }],
  ['hdr', 'HDR', 'top', { clarity: 50, contrast: 20, shadows: 36, highlights: -36, saturation: 16, dehaze: 16, texture: 30 }],
  ['crisp', 'Хруст', 'top', { texture: 50, clarity: 30, sharpen: 30, contrast: 14, vibrance: 18 }],
  ['soft', 'Мягкий', 'top', { clarity: -30, glow: 30, brightness: 6, contrast: -8, saturation: -4 }],
  ['bright', 'Светлый', 'top', { brightness: 20, exposure: 12, highlights: -16, saturation: 6, fade: 8 }],
  ['moodyt', 'Глубокий', 'top', { brightness: -10, contrast: 24, saturation: 10, vignette: 30, shadows: -8 }],
  ['natural', 'Натуральный', 'top', { vibrance: 22, contrast: 6, clarity: 12, saturation: 4 }],
  /* портрет */
  ['skin1', 'Мягкая кожа', 'port', { skin: 55, brightness: 6, contrast: -4, glow: 16, saturation: -4 }],
  ['skin2', 'Сияние кожи', 'port', { skin: 40, glow: 34, brightness: 8, vibrance: 14, blush: 20 }],
  ['warmp', 'Тёплый портрет', 'port', { temperature: 20, skin: 35, contrast: 6, saturation: 4, fade: 6 }, { gain: [1.04, 1, .94] }],
  ['coolp', 'Холодный портрет', 'port', { temperature: -18, skin: 30, contrast: 10, saturation: -6 }],
  ['studio', 'Студия', 'port', { contrast: 18, clarity: 20, skin: 30, sharpen: 16, vignette: 14, brightness: 4 }],
  ['glossy', 'Глянец', 'port', { contrast: 24, saturation: 16, clarity: 26, skin: 28, glow: 12, sharpen: 18 }],
  ['matte', 'Матовая кожа', 'port', { fade: 22, contrast: -6, skin: 44, saturation: -8, shadows: 10 }],
  ['tan', 'Загар', 'port', { temperature: 26, tint: 8, saturation: 10, contrast: 10, skin: 20 }],
  ['pale', 'Бледный', 'port', { brightness: 10, saturation: -18, fade: 14, temperature: -6, skin: 30 }],
  ['blushp', 'Румянец', 'port', { blush: 60, skin: 28, glow: 14, brightness: 4 }],
  ['beauty', 'Бьюти', 'port', { skin: 60, glow: 24, brightness: 8, blush: 28, vibrance: 12, clarity: -6 }],
  ['dreamp', 'Нежный', 'port', { skin: 36, glow: 40, fade: 14, brightness: 8, saturation: -8, tint: 8 }],
  /* пейзаж */
  ['mount', 'Горы', 'land', { clarity: 34, contrast: 20, saturation: 14, dehaze: 20, sharpen: 20, vignette: 14 }],
  ['forestL', 'Лесная чаща', 'land', { saturation: 10, contrast: 16, tint: -18, temperature: -6, clarity: 20, shadows: 14 }, { gain: [.93, 1.05, .93] }],
  ['sea', 'Море', 'land', { temperature: -22, saturation: 24, contrast: 14, clarity: 20, dehaze: 14 }, { lift: [0, .01, .03] }],
  ['desert', 'Пустыня', 'land', { temperature: 34, saturation: 12, contrast: 20, clarity: 26, fade: 6 }],
  ['skyf', 'Небо', 'land', { saturation: 20, contrast: 18, dehaze: 30, highlights: -24, clarity: 20, vibrance: 20, temperature: -10 }],
  ['field', 'Поле', 'land', { saturation: 22, temperature: 14, tint: -10, contrast: 12, clarity: 18, vibrance: 20 }],
  ['autumnf', 'Осенний лес', 'land', { temperature: 32, saturation: 26, contrast: 16, vignette: 20, clarity: 16, tint: 6 }, { gain: [1.08, .98, .84] }],
  ['rocks', 'Скалы', 'land', { contrast: 34, clarity: 44, saturation: -12, sharpen: 30, dehaze: 16, vignette: 20 }],
  ['lake', 'Озеро', 'land', { temperature: -14, saturation: 16, contrast: 12, clarity: 16, highlights: -14, tint: -6 }],
  ['tropics', 'Остров', 'land', { saturation: 40, vibrance: 28, temperature: 8, tint: -12, contrast: 14, clarity: 14 }],
  /* еда */
  ['tasty', 'Вкусно', 'food', { saturation: 28, temperature: 12, contrast: 14, clarity: 22, vibrance: 26 }],
  ['fresh', 'Свежо', 'food', { saturation: 20, temperature: -6, brightness: 8, contrast: 10, clarity: 18, vibrance: 22 }],
  ['darktable', 'Тёмный стол', 'food', { brightness: -10, contrast: 30, saturation: 12, vignette: 36, clarity: 24, temperature: 10 }],
  ['lighttable', 'Светлый стол', 'food', { brightness: 16, contrast: 6, saturation: 6, fade: 10, highlights: -16, clarity: 14 }],
  ['coffee', 'Кофе', 'food', { temperature: 26, saturation: -6, contrast: 16, vignette: 26, fade: 12 }, { sepia: .2, gain: [1.06, 1, .88] }],
  ['dessert', 'Десерт', 'food', { saturation: 24, tint: 10, brightness: 10, glow: 20, contrast: 8, vibrance: 18 }],
  /* ночь */
  ['neonN', 'Неон-ночь', 'night', { contrast: 30, saturation: 50, vibrance: 20, glow: 34, vignette: 34, shadows: 10 }, { lift: [.04, 0, .08], gain: [1.06, .96, 1.12] }],
  ['city', 'Город ночью', 'night', { contrast: 24, saturation: 18, highlights: -26, shadows: 24, glow: 20, clarity: 20, temperature: -10 }],
  ['lightsN', 'Огни', 'night', { glow: 50, contrast: 22, saturation: 20, highlights: -18, vignette: 30 }],
  ['moon', 'Лунный свет', 'night', { temperature: -36, saturation: -12, brightness: -6, contrast: 20, glow: 24, vignette: 34 }],
  ['cyber', 'Киберпанк', 'night', { contrast: 34, saturation: 42, glow: 30, aberration: 22, vignette: 30 }, { lift: [.06, 0, .08], gain: [1.1, .9, 1.15] }],
  ['synth', 'Синтвейв', 'night', { contrast: 26, saturation: 36, glow: 36, scanlines: 24, vignette: 34, tint: 20 }, { lift: [.07, 0, .1], gain: [1.12, .92, 1.1] }],
  ['nightsun', 'Ночное солнце', 'night', { temperature: 20, glow: 44, contrast: 20, saturation: 16, vignette: 30, shadows: 20 }],
  ['starry', 'Звёздная ночь', 'night', { temperature: -28, contrast: 30, saturation: 20, clarity: 30, vignette: 28, brightness: -4 }, { lift: [0, .01, .04] }],
  /* кино */
  ['cinema', 'Кино', 'cin', { contrast: 22, vignette: 22, saturation: -6 }, { lift: [0, .03, .045], gain: [1.06, .98, .88] }],
  ['teal', 'Бирюза/оранж', 'cin', { contrast: 24, saturation: 10, vignette: 24 }, { lift: [0, .04, .05], gain: [1.1, .97, .85] }],
  ['block', 'Блокбастер', 'cin', { contrast: 30, saturation: -8, vignette: 30 }, { lift: [0, .03, .05], gain: [1.08, .98, .85] }],
  ['moody', 'Мрачный', 'cin', { brightness: -14, contrast: 26, saturation: -14, vignette: 38, temperature: -12 }, { lift: [0, .02, .03] }],
  ['western', 'Вестерн', 'cin', { contrast: 20, fade: 16, temperature: 26, vignette: 28 }, { sepia: .45 }],
  ['nordic', 'Север', 'cin', { saturation: -30, temperature: -20, contrast: 10, brightness: 6, fade: 12 }],
  ['golden', 'Золотой час', 'cin', { temperature: 46, highlights: -20, saturation: 18, glow: 20, vignette: 16 }, { gain: [1.1, .97, .82] }],
  ['matrix', 'Матрица', 'cin', { saturation: -30, contrast: 20, vignette: 30 }, { gain: [.8, 1.15, .85] }],
  ['bleach', 'Выбеленный', 'cin', { saturation: -45, contrast: 40, sharpen: 26, fade: 8 }],
  ['epic', 'Эпик', 'cin', { contrast: 34, saturation: -4, clarity: 30, vignette: 30, temperature: 8 }],
  ['thriller', 'Триллер', 'cin', { saturation: -24, contrast: 30, tint: -12, temperature: -14, vignette: 34 }],
  ['romance', 'Романтика', 'cin', { glow: 30, saturation: 6, temperature: 14, tint: 10, fade: 12, brightness: 6 }],
  ['scifi', 'Научфант', 'cin', { contrast: 26, saturation: -8, temperature: -26, glow: 14, vignette: 26 }],
  ['drive', 'Драйв', 'cin', { contrast: 30, saturation: 22, temperature: 6, vignette: 26, tint: 14 }, { lift: [.05, 0, .06], gain: [1.1, .94, .9] }],
  ['oldmovie', 'Старое кино', 'cin', { grain: 34, vignette: 44, contrast: 10, fade: 18 }, { sepia: .6 }],
  ['dune', 'Дюна', 'cin', { temperature: 40, saturation: -14, contrast: 20, fade: 14, vignette: 28 }, { sepia: .3 }],
  ['wes', 'Пастельное кино', 'cin', { saturation: 10, brightness: 10, fade: 24, temperature: 14, tint: 10, contrast: -6 }, { gain: [1.05, .98, .92] }],
  /* плёнка */
  ['portra', 'Портра', 'film', { temperature: 10, tint: 4, contrast: -6, fade: 12, saturation: -6, grain: 18, highlights: -10 }, { gain: [1.03, 1, .95] }],
  ['fuji', 'Фудзи', 'film', { contrast: 12, saturation: 14, tint: -10, temperature: -8, grain: 20 }],
  ['ektar', 'Эктар', 'film', { saturation: 34, contrast: 18, vibrance: 20, grain: 14, temperature: 6 }],
  ['cinest', 'Синестил', 'film', { contrast: 18, saturation: -6, temperature: -10, glow: 26, grain: 30, vignette: 20 }, { lift: [.03, 0, .06], gain: [1.1, .96, .94] }],
  ['trix', 'Три-Икс', 'film', { contrast: 44, grain: 60, vignette: 26, fade: 6 }, { mono: 1 }],
  ['ilford', 'Ильфорд', 'film', { contrast: 22, grain: 44, fade: 10 }, { mono: 1 }],
  ['agfa', 'Агфа', 'film', { temperature: 22, saturation: 20, contrast: 14, grain: 26, fade: 14 }, { gain: [1.06, .98, .86] }],
  ['kodachrome', 'Кодахром', 'film', { saturation: 30, contrast: 26, temperature: 12, vibrance: 20, grain: 18 }],
  ['instax', 'Инстакс', 'film', { fade: 24, contrast: -4, saturation: -8, temperature: 10, vignette: 24, grain: 16, brightness: 6 }],
  ['slide', 'Слайд', 'film', { contrast: 30, saturation: 28, vignette: 30, grain: 10, shadows: -8 }],
  ['expired', 'Просрочка', 'film', { fade: 34, tint: 18, temperature: -12, saturation: -10, grain: 50, vignette: 36 }, { lift: [.05, .02, .02] }],
  ['lomo2', 'Ломо-2', 'film', { contrast: 40, saturation: 40, vignette: 70, grain: 30, aberration: 14 }],
  ['xpro', 'Кросс-плёнка', 'film', { contrast: 32, saturation: 22, tint: 12, grain: 24 }, { lift: [.06, 0, .07], gain: [.92, 1.06, 1.14] }],
  ['redscale', 'Редскейл', 'film', { temperature: 60, tint: 20, contrast: 24, saturation: 10, grain: 30, vignette: 30 }, { gain: [1.18, .9, .62] }],
  ['greenf', 'Зелёная плёнка', 'film', { tint: -26, fade: 18, contrast: 10, grain: 28, temperature: -6 }, { gain: [.9, 1.08, .94] }],
  ['burnf', 'Выжигание', 'film', { saturation: -36, contrast: 44, sharpen: 20, grain: 32, fade: 6 }],
  /* ч/б */
  ['bw', 'Ч/Б', 'bw', { contrast: 8 }, { mono: 1 }],
  ['bwc', 'Ч/Б контраст', 'bw', { contrast: 56, sharpen: 30, vignette: 24 }, { mono: 1 }],
  ['noir', 'Нуар', 'bw', { contrast: 42, vignette: 42, sharpen: 20 }, { mono: 1 }],
  ['silver', 'Серебро', 'bw', { contrast: -6, brightness: 10, fade: 14 }, { mono: 1 }],
  ['ink', 'Тушь', 'bw', { contrast: 70, sharpen: 40, grain: 36, vignette: 30 }, { mono: 1 }],
  ['fadebw', 'Блёклый Ч/Б', 'bw', { fade: 50, contrast: -10 }, { mono: 1 }],
  ['sepia', 'Сепия', 'bw', { contrast: 6 }, { sepia: 1 }],
  ['hikey', 'Светлый Ч/Б', 'bw', { brightness: 24, contrast: 14, fade: 10 }, { mono: 1 }],
  ['lokey', 'Тёмный Ч/Б', 'bw', { brightness: -18, contrast: 40, vignette: 34 }, { mono: 1 }],
  ['selen', 'Селен', 'bw', { contrast: 20, grain: 14 }, { mono: 1, gain: [1.02, 1, 1.06] }],
  ['plat', 'Платина', 'bw', { fade: 30, contrast: 6, grain: 10 }, { mono: 1, sepia: .12 }],
  ['grainbw', 'Грубое зерно', 'bw', { grain: 90, contrast: 24 }, { mono: 1 }],
  ['softbw', 'Мягкий Ч/Б', 'bw', { contrast: -14, glow: 24, brightness: 8 }, { mono: 1 }],
  ['dramabw', 'Ч/Б драма', 'bw', { contrast: 60, clarity: 40, vignette: 40, shadows: -10 }, { mono: 1 }],
  ['irbw', 'Инфракрасный', 'bw', { contrast: 34, brightness: 12, glow: 34, highlights: 20, clarity: 20 }, { mono: 1 }],
  ['coffbw', 'Кофейный Ч/Б', 'bw', { contrast: 16, grain: 12 }, { sepia: .5, mono: 1 }],
  ['filmbw', 'Ч/Б плёнка', 'bw', { grain: 40, fade: 14, contrast: 14, vignette: 20 }, { mono: 1 }],
  /* ретро */
  ['vintage', 'Винтаж', 'ret', { fade: 42, grain: 30, vignette: 30, contrast: -6 }, { sepia: .5 }],
  ['film', 'Плёнка', 'ret', { grain: 42, fade: 20, contrast: 12, saturation: -10, vignette: 14 }, { sepia: .1 }],
  ['polar', 'Полароид', 'ret', { fade: 30, contrast: -8, saturation: -12, temperature: 14, vignette: 22, grain: 20 }, { sepia: .2 }],
  ['s70', '70-е', 'ret', { temperature: 30, saturation: 16, fade: 26, grain: 24, vignette: 24 }, { gain: [1.08, .96, .84] }],
  ['kodak', 'Кодак', 'ret', { temperature: 18, saturation: 18, contrast: 14, grain: 22 }, { gain: [1.06, 1, .88] }],
  ['lomo', 'Ломо', 'ret', { contrast: 34, saturation: 34, vignette: 60, grain: 28 }, { lift: [.02, 0, .03] }],
  ['faded', 'Выцвет', 'ret', { fade: 55, saturation: -14, contrast: -8 }],
  ['cross', 'Кросс', 'ret', { contrast: 26, saturation: 12 }, { lift: [.05, 0, .06], gain: [.94, 1.05, 1.12] }],
  ['oldp', 'Старое фото', 'ret', { fade: 36, grain: 44, vignette: 48, contrast: -8 }, { sepia: .8 }],
  ['s50', '50-е', 'ret', { fade: 30, saturation: -20, contrast: -6, grain: 20, vignette: 26 }, { sepia: .3 }],
  ['s60', '60-е', 'ret', { temperature: 24, saturation: 10, fade: 28, grain: 22, vignette: 18 }],
  ['s80', '80-е', 'ret', { contrast: 22, saturation: 28, temperature: -6, tint: 16, glow: 20, scanlines: 12 }],
  ['s90', '90-е', 'ret', { saturation: -6, contrast: 16, brightness: 8, grain: 26, temperature: 8, vignette: 18 }],
  ['vhs', 'VHS', 'ret', { scanlines: 50, aberration: 36, glitch: 14, grain: 30, saturation: 14, fade: 12 }],
  ['dagger', 'Дагеротип', 'ret', { contrast: 20, grain: 50, vignette: 56, fade: 18 }, { sepia: .85 }],
  ['postcard', 'Открытка', 'ret', { fade: 40, saturation: -6, vignette: 30, grain: 24 }, { sepia: .35 }],
  ['newsp', 'Газета', 'ret', { halftone: 70, contrast: 30, grain: 20 }, { mono: 1 }],
  /* яркие */
  ['neon', 'Неон', 'vib', { contrast: 30, saturation: 56, vibrance: 20 }, { lift: [.05, 0, .09], gain: [1.06, .96, 1.1] }],
  ['candy', 'Леденец', 'vib', { saturation: 44, vibrance: 30, brightness: 8, fade: 14, tint: 16, temperature: 6 }, { gain: [1.04, .98, 1.06] }],
  ['tropic', 'Тропики', 'vib', { saturation: 50, vibrance: 36, temperature: 10, tint: -10, contrast: 14 }],
  ['summer', 'Лето', 'vib', { temperature: 24, saturation: 28, brightness: 8, contrast: 10 }],
  ['pop', 'Поп-арт', 'vib', { saturation: 60, contrast: 24, sharpen: 24, vibrance: 30 }],
  ['ultra', 'Ультра', 'vib', { saturation: 80, contrast: 30, clarity: 30 }],
  ['rainbow', 'Радуга', 'vib', { saturation: 70, hue: 12, vibrance: 30, contrast: 14 }],
  ['vapor', 'Вейпорвейв', 'vib', { tint: 30, saturation: 40, contrast: 16, glow: 20 }, { lift: [.06, 0, .08], gain: [1.1, .92, 1.1] }],
  ['holo', 'Голограмма', 'vib', { saturation: 50, hue: 20, aberration: 30, glow: 20, contrast: 14 }],
  ['acid', 'Кислота', 'vib', { saturation: 90, contrast: 40, hue: -20, vibrance: 30 }],
  /* погода / время */
  ['fogw', 'Туман', 'wx', { dehaze: -50, fade: 20, brightness: 10, contrast: -14, saturation: -12, glow: 20 }],
  ['rainw', 'Дождь', 'wx', { temperature: -16, saturation: -18, contrast: 12, dehaze: -12, vignette: 18 }],
  ['storm', 'Гроза', 'wx', { contrast: 34, saturation: -16, temperature: -20, vignette: 34, clarity: 26, brightness: -10 }],
  ['snowf', 'Снегопад', 'wx', { brightness: 16, temperature: -22, saturation: -14, fade: 16, dehaze: -20 }],
  ['heat', 'Жара', 'wx', { temperature: 40, saturation: 20, contrast: 14, glow: 26, brightness: 6, dehaze: -10 }],
  ['frost', 'Мороз', 'wx', { temperature: -44, saturation: -8, contrast: 16, glow: 18, brightness: 6 }],
  ['dawn', 'Рассвет', 'wx', { temperature: 26, tint: 14, glow: 24, saturation: 14, fade: 12, brightness: 6 }, { gain: [1.06, .98, .92] }],
  ['morning', 'Утро', 'wx', { brightness: 12, temperature: 8, saturation: 8, fade: 10, glow: 14 }],
  ['noon', 'Полдень', 'wx', { contrast: 22, saturation: 16, clarity: 20, highlights: -10, temperature: -4 }],
  ['dusk', 'Сумерки', 'wx', { brightness: -12, temperature: -18, tint: 14, saturation: -4, contrast: 18, vignette: 28 }, { lift: [.03, 0, .06] }],
  ['bluehr', 'Синий час', 'wx', { temperature: -42, tint: 8, contrast: 18, saturation: 6, vignette: 24 }],
  ['spring', 'Весна', 'wx', { saturation: 22, brightness: 10, temperature: 4, tint: -8, fade: 10, vibrance: 24 }],
  ['autumn', 'Осень', 'wx', { temperature: 34, saturation: 22, contrast: 14, fade: 8, tint: 6 }, { gain: [1.08, .98, .86] }],
  ['winter', 'Зима', 'wx', { temperature: -30, saturation: -10, brightness: 8, contrast: 12, fade: 10 }],
  ['overcast', 'Пасмурно', 'wx', { saturation: -16, contrast: 10, temperature: -8, clarity: 14, brightness: 4 }],
  /* тона */
  ['ice', 'Лёд', 'tone', { temperature: -48, saturation: -10, brightness: 8, fade: 10 }],
  ['amber', 'Янтарь', 'tone', { temperature: 56, tint: 8, saturation: 10 }],
  ['lavender', 'Лаванда', 'tone', { tint: 30, temperature: -10, saturation: 6, fade: 18, brightness: 6 }],
  ['forest', 'Лес', 'tone', { tint: -22, temperature: -6, saturation: 6, contrast: 14 }, { gain: [.92, 1.06, .92] }],
  /* арт */
  ['poster', 'Постер', 'art', { posterize: 60, contrast: 20, saturation: 30 }],
  ['pixel', 'Пиксели', 'art', { pixelate: 60 }],
  ['glitch', 'Глитч', 'art', { glitch: 70, aberration: 55, contrast: 16 }],
  ['comic', 'Комикс', 'art', { posterize: 50, contrast: 44, sharpen: 60, saturation: 34 }],
  ['crt', 'ЭЛТ-экран', 'art', { scanlines: 80, aberration: 30, vignette: 40, saturation: 10, contrast: 10 }],
  ['solar', 'Соляризация', 'art', { solarize: 100, contrast: 8 }],
  ['thresh', 'Ч/Б порог', 'art', { threshold: 100 }, { mono: 1 }],
  ['thermal', 'Тепловизор', 'art', { duotone: 100, contrast: 30 }, { duo: ['#1b0033', '#ffee55'] }],
  ['dream', 'Мечта', 'art', { glow: 70, blur: 10, brightness: 10, saturation: 20, fade: 14 }],
  ['sketchf', 'Эскиз', 'art', { sketch: 100 }],
  ['outline', 'Контур', 'art', { edge: 100 }],
  ['pencil', 'Карандаш', 'art', { sketch: 80, contrast: 10, grain: 12 }],
  ['embossf', 'Тиснение', 'art', { emboss: 100 }],
  ['halftonef', 'Полутона', 'art', { halftone: 100, contrast: 20 }],
  ['cartoon', 'Мультяшный', 'art', { posterize: 40, edge: 50, saturation: 30, contrast: 20, denoise: 40 }],
  ['kaleidof', 'Калейдоскоп', 'art', { kaleido: 40 }],
  ['swirlf', 'Вихрь', 'art', { swirl: 60, lensR: 60 }],
  ['wavef', 'Волна', 'art', { wave: 60 }],
  ['mirrorf', 'Зеркало', 'art', { mirrorH: 100 }],
  ['motionf', 'Движение', 'art', { motion: 50 }],
  ['zoomf', 'Зум-удар', 'art', { zoomblur: 60 }],
  ['bulge', 'Пузырь', 'art', { lensA: 70 }],
  ['pinch', 'Щипок', 'art', { lensA: -60 }],
  ['fisheye', 'Рыбий глаз', 'art', { distort: 70 }],
  ['glitch2', 'Глитч-2', 'art', { glitch: 90, aberration: 70, scanlines: 30, contrast: 20 }],
];
/* генерируем тона и дуотоны */
const TINTS = [['Рубин', '#e0115f'], ['Янтарь', '#ffbf00'], ['Лимон', '#ffe135'], ['Лайм', '#7ed321'], ['Нефрит', '#50c878'], ['Бирюза', '#30d5c8'], ['Лазурь', '#2a8cff'], ['Сапфир', '#0f52ba'], ['Фиалка', '#8f00ff'], ['Орхидея', '#da70d6'], ['Роза', '#ff66a3'], ['Графит', '#6a6a6a']];
TINTS.forEach(([n, h], i) => {
  const [r, g, b] = hex2rgb(h);
  [['', .6], [' +', 1.15]].forEach(([sfx, k]) => FL.push(['tint' + i + sfx, 'Тон ' + n + sfx, 'tone', { contrast: 6 }, { gain: [1 + (r - .5) * k * .8, 1 + (g - .5) * k * .8, 1 + (b - .5) * k * .8], lift: [(r - .5) * k * .1, (g - .5) * k * .1, (b - .5) * k * .1] }]));
});
const DUOS = [['Золото', '#1a0f05', '#ffd98a'], ['Изумруд', '#02130e', '#b6f0d6'], ['Роза', '#2a0f24', '#ffb8d0'], ['Синий', '#06122e', '#9ad0ff'], ['Закат', '#3b0a2f', '#ffd36b'], ['Огонь', '#1a0000', '#ff9a3d'],
  ['Океан', '#001a2b', '#6fe3ff'], ['Лаванда', '#1a0f33', '#d9b8ff'], ['Мята', '#06241c', '#b8ffdf'], ['Кофе', '#1e120a', '#e8c9a0'], ['Вино', '#2a0716', '#ff7fa6'], ['Лайм', '#0e1f00', '#d9ff6b'],
  ['Лёд', '#0a1830', '#e6f6ff'], ['Уголь', '#050505', '#e8e8e8'], ['Медь', '#220e05', '#ff9966'], ['Сумерки', '#1b1035', '#ffb36b'], ['Тропики', '#00334e', '#ffdd57'], ['Электро', '#12003d', '#00ffd5'],
  ['Закат-2', '#2d0c4d', '#ff5d73'], ['Неон-роза', '#14002e', '#ff2bd6'], ['Джунгли', '#021d0f', '#a6e22e'], ['Песок', '#2b1d0e', '#f6e3b4'], ['Космос', '#03001e', '#ec38bc'], ['Мёд', '#2b1700', '#ffc83d'],
  ['Арктика', '#021c2c', '#8de3d0'], ['Рубин', '#1c0008', '#ff3b5c'], ['Сталь', '#0b1520', '#9ab3c8'], ['Фламинго', '#2a0a2e', '#ff9ec4'], ['Шоколад', '#1a0d06', '#d9a066'], ['Индиго', '#0a0a33', '#9aa5ff']];
DUOS.forEach(([n, a, b], i) => FL.push(['duo' + i, n, 'duo', { duotone: 100 }, { duo: [a, b] }]));
const FILTERS = FL.map(([id, n, cat, p, ex]) => ({ id, n, cat, p, ...(ex || {}) }));

/* ---------- эффекты-наложения ---------- */
const lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const rg = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const spark4 = (c, x, y, s) => { c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? s * .22 : s; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); };
const bokeh = (cols, n, smin, smax, a) => (c, W, H, r) => { for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H, s = (smin + r() * (smax - smin)) * Math.min(W, H), col = cols[i % cols.length];
  c.fillStyle = rg(c, x, y, s * .2, s, [[0, `rgba(${col},${a})`], [.8, `rgba(${col},${a * .55})`], [1, `rgba(${col},0)`]]); c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); } };
const heart = (c, x, y, s) => { c.beginPath(); c.moveTo(x, y + s * .9); c.bezierCurveTo(x - s * 1.3, y + s * .1, x - s * .9, y - s * 1.1, x, y - s * .35); c.bezierCurveTo(x + s * .9, y - s * 1.1, x + s * 1.3, y + s * .1, x, y + s * .9); c.fill(); };
const FX = [
  { id: 'leak1', n: 'Янтарь', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, 0, W * .8, H * .35, [[0, 'rgba(255,140,40,.95)'], [.5, 'rgba(255,80,60,.35)'], [1, 'rgba(255,80,60,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'leak2', n: 'Розовый', blend: 'screen', draw: (c, W, H) => { c.fillStyle = rg(c, W, 0, 0, W * .9, [[0, 'rgba(255,90,170,.9)'], [.5, 'rgba(160,70,255,.35)'], [1, 'rgba(160,70,255,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'leak3', n: 'Золотой луч', blend: 'screen', draw: (c, W, H) => { c.save(); c.translate(W / 2, H / 2); c.rotate(-.5); c.fillStyle = lg(c, -W, 0, W, 0, [[0, 'rgba(255,200,90,0)'], [.5, 'rgba(255,214,120,.8)'], [1, 'rgba(255,200,90,0)']]); c.fillRect(-W, -H * .12, W * 2, H * .24); c.restore(); } },
  { id: 'leak4', n: 'Бирюза', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, H, W * .6, H * .4, [[0, 'rgba(40,220,200,.85)'], [.6, 'rgba(40,120,255,.3)'], [1, 'rgba(40,120,255,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'leak5', n: 'Закатный', blend: 'screen', draw: (c, W, H) => { c.fillStyle = rg(c, 0, H, 0, W * .95, [[0, 'rgba(255,110,60,.95)'], [.45, 'rgba(255,60,130,.4)'], [1, 'rgba(255,60,130,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'leak6', n: 'Фиолетовый', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, W, 0, W * .3, 0, [[0, 'rgba(150,80,255,.9)'], [1, 'rgba(150,80,255,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'leak7', n: 'Зелёный луч', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, 0, 0, H * .6, [[0, 'rgba(90,255,150,.7)'], [1, 'rgba(90,255,150,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'leak8', n: 'Огненный', blend: 'screen', draw: (c, W, H) => { c.fillStyle = rg(c, W, H, 0, W * .8, [[0, 'rgba(255,60,20,.95)'], [.5, 'rgba(255,150,30,.4)'], [1, 'rgba(255,150,30,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'burn', n: 'Засвет', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, 0, W * .25, 0, [[0, 'rgba(255,120,30,.95)'], [1, 'rgba(255,120,30,0)']]); c.fillRect(0, 0, W, H); c.fillStyle = lg(c, W, 0, W * .8, 0, [[0, 'rgba(255,60,60,.8)'], [1, 'rgba(255,60,60,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'bokeh', n: 'Боке', blend: 'screen', draw: bokeh(['255,214,140', '255,160,120', '170,210,255', '255,255,255'], 26, .02, .08, .55) },
  { id: 'bokeh2', n: 'Боке тёплое', blend: 'screen', draw: bokeh(['255,200,120', '255,150,80'], 18, .04, .11, .5) },
  { id: 'bokeh3', n: 'Боке холодное', blend: 'screen', draw: bokeh(['150,200,255', '190,170,255', '255,255,255'], 20, .03, .09, .5) },
  { id: 'dust', n: 'Пыль', blend: 'screen', draw: (c, W, H, r) => { for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,255,255,${.15 + r() * .6})`; const s = .6 + r() * 2.2 * Math.min(W, H) / 700; c.beginPath(); c.arc(r() * W, r() * H, s, 0, 7); c.fill(); } } },
  { id: 'lensdust', n: 'Пыль линзы', blend: 'screen', draw: (c, W, H, r) => { for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, s = (.01 + r() * .035) * Math.min(W, H); c.fillStyle = rg(c, x, y, 0, s, [[0, 'rgba(255,255,255,.3)'], [1, 'rgba(255,255,255,0)']]); c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); } } },
  { id: 'scratch', n: 'Царапины', blend: 'screen', draw: (c, W, H, r) => { c.lineWidth = Math.max(1, W / 900); for (let i = 0; i < 24; i++) { const x = r() * W; c.strokeStyle = `rgba(255,255,255,${.2 + r() * .5})`; c.beginPath(); c.moveTo(x, r() * H * .3); c.lineTo(x + (r() - .5) * 14, H * (.5 + r() * .5)); c.stroke(); } } },
  { id: 'rain', n: 'Дождь', blend: 'screen', draw: (c, W, H, r) => { c.lineWidth = Math.max(1, W / 800); for (let i = 0; i < 160; i++) { const x = r() * W, y = r() * H, l = H * (.03 + r() * .05); c.strokeStyle = `rgba(200,225,255,${.25 + r() * .4})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * .25, y + l); c.stroke(); } } },
  { id: 'drizzle', n: 'Морось', blend: 'screen', draw: (c, W, H, r) => { c.lineWidth = Math.max(1, W / 1000); for (let i = 0; i < 420; i++) { const x = r() * W, y = r() * H, l = H * (.01 + r() * .02); c.strokeStyle = `rgba(210,230,255,${.2 + r() * .35})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * .2, y + l); c.stroke(); } } },
  { id: 'snow', n: 'Снег', blend: 'source-over', draw: (c, W, H, r) => { for (let i = 0; i < 140; i++) { const s = (.003 + r() * .012) * Math.min(W, H); c.fillStyle = `rgba(255,255,255,${.5 + r() * .5})`; c.beginPath(); c.arc(r() * W, r() * H, s, 0, 7); c.fill(); } } },
  { id: 'blizzard', n: 'Метель', blend: 'source-over', draw: (c, W, H, r) => { c.lineCap = 'round'; for (let i = 0; i < 220; i++) { const x = r() * W, y = r() * H, s = (.002 + r() * .006) * Math.min(W, H); c.strokeStyle = `rgba(255,255,255,${.4 + r() * .5})`; c.lineWidth = s * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x - s * 12, y + s * 5); c.stroke(); } } },
  { id: 'fog', n: 'Туман', blend: 'screen', draw: (c, W, H, r) => { for (let i = 0; i < 9; i++) { const x = r() * W, y = H * (.4 + r() * .6), rr = W * (.2 + r() * .35); c.fillStyle = rg(c, x, y, 0, rr, [[0, 'rgba(235,240,250,.4)'], [1, 'rgba(235,240,250,0)']]); c.fillRect(0, 0, W, H); } } },
  { id: 'haze', n: 'Дымка', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, H, 0, H * .3, [[0, 'rgba(255,245,230,.75)'], [1, 'rgba(255,245,230,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'stars', n: 'Искры', blend: 'screen', draw: (c, W, H, r) => { for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(255,${230 + r() * 25 | 0},${170 + r() * 60 | 0},${.5 + r() * .5})`; spark4(c, r() * W, r() * H, (.008 + r() * .026) * Math.min(W, H)); } } },
  { id: 'glitter', n: 'Блёстки', blend: 'screen', draw: (c, W, H, r) => { const cols = ['255,230,150', '255,190,230', '170,230,255', '255,255,255']; for (let i = 0; i < 110; i++) { c.fillStyle = `rgba(${cols[i % 4]},${.4 + r() * .6})`; spark4(c, r() * W, r() * H, (.004 + r() * .014) * Math.min(W, H)); } } },
  { id: 'stars2', n: 'Звёздное небо', blend: 'screen', draw: (c, W, H, r) => { for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,255,255,${.3 + r() * .7})`; c.beginPath(); c.arc(r() * W, r() * H * .75, (.4 + r() * 1.6) * Math.min(W, H) / 700, 0, 7); c.fill(); } } },
  { id: 'fireflies', n: 'Светлячки', blend: 'screen', draw: (c, W, H, r) => { for (let i = 0; i < 34; i++) { const x = r() * W, y = r() * H, s = (.008 + r() * .02) * Math.min(W, H); c.fillStyle = rg(c, x, y, 0, s * 2.5, [[0, 'rgba(255,240,150,.95)'], [.3, 'rgba(255,220,90,.5)'], [1, 'rgba(255,220,90,0)']]); c.beginPath(); c.arc(x, y, s * 2.5, 0, 7); c.fill(); } } },
  { id: 'flare', n: 'Блик', blend: 'screen', draw: (c, W, H) => { const x = W * .78, y = H * .2; c.fillStyle = rg(c, x, y, 0, W * .35, [[0, 'rgba(255,240,200,.95)'], [.25, 'rgba(255,190,110,.4)'], [1, 'rgba(255,160,80,0)']]); c.fillRect(0, 0, W, H);
      const dx = W / 2 - x, dy = H / 2 - y; [[.6, .05, '255,120,80'], [1.1, .08, '120,200,255'], [1.6, .04, '255,230,130'], [2.0, .1, '255,150,230']].forEach(([t, s, col]) => { const px = x + dx * t, py = y + dy * t, rr = s * Math.min(W, H);
        c.fillStyle = rg(c, px, py, 0, rr, [[0, `rgba(${col},.55)`], [1, `rgba(${col},0)`]]); c.beginPath(); c.arc(px, py, rr, 0, 7); c.fill(); }); } },
  { id: 'flare2', n: 'Анаморф', blend: 'screen', draw: (c, W, H) => { const y = H * .45; c.fillStyle = lg(c, 0, y, W, y, [[0, 'rgba(120,180,255,0)'], [.5, 'rgba(160,210,255,.85)'], [1, 'rgba(120,180,255,0)']]); c.fillRect(0, y - H * .006, W, H * .012);
      c.fillStyle = rg(c, W * .5, y, 0, W * .2, [[0, 'rgba(200,230,255,.8)'], [1, 'rgba(200,230,255,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'godrays', n: 'Лучи', blend: 'screen', draw: (c, W, H, r) => { const ox = W * .85, oy = -H * .1; for (let i = 0; i < 14; i++) { const a = 1.6 + (r() - .5) * 1.1, w = .04 + r() * .09, L = H * 2;
      c.fillStyle = lg(c, ox, oy, ox + Math.cos(a) * L, oy + Math.sin(a) * L, [[0, 'rgba(255,230,170,.55)'], [1, 'rgba(255,230,170,0)']]); c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a - w) * L, oy + Math.sin(a - w) * L); c.lineTo(ox + Math.cos(a + w) * L, oy + Math.sin(a + w) * L); c.fill(); } } },
  { id: 'prism', n: 'Призма', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, 0, W, H, [[0, 'rgba(255,0,80,0)'], [.25, 'rgba(255,170,0,.45)'], [.45, 'rgba(120,255,120,.4)'], [.65, 'rgba(60,160,255,.5)'], [.85, 'rgba(200,60,255,.4)'], [1, 'rgba(200,60,255,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'prism2', n: 'Радужный край', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, 0, W * .35, 0, [[0, 'rgba(255,60,120,.7)'], [.3, 'rgba(255,200,60,.5)'], [.6, 'rgba(60,200,255,.4)'], [1, 'rgba(60,200,255,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'edgeglow', n: 'Свет по краям', blend: 'screen', draw: (c, W, H) => { c.fillStyle = rg(c, W / 2, H / 2, Math.min(W, H) * .35, Math.max(W, H) * .75, [[0, 'rgba(255,150,100,0)'], [1, 'rgba(255,120,160,.7)']]); c.fillRect(0, 0, W, H); } },
  { id: 'vhsn', n: 'VHS-шум', blend: 'screen', draw: (c, W, H, r) => { for (let i = 0; i < 40; i++) { const y = r() * H, h = H * (.002 + r() * .008); c.fillStyle = `rgba(255,255,255,${.1 + r() * .25})`; c.fillRect(r() * W * .3, y, W * (.3 + r() * .7), h); }
      c.fillStyle = lg(c, 0, H * .9, 0, H, [[0, 'rgba(255,60,60,0)'], [.5, 'rgba(255,60,120,.35)'], [1, 'rgba(60,200,255,.3)']]); c.fillRect(0, H * .9, W, H * .1); } },
  { id: 'noise', n: 'Шум плёнки', blend: 'overlay', draw: (c, W, H, r) => { const im = c.createImageData(W, H), d = im.data; for (let i = 0; i < d.length; i += 4) { const v = 90 + r() * 120 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } c.putImageData(im, 0, 0); } },
  { id: 'hearts', n: 'Сердечки', blend: 'source-over', draw: (c, W, H, r) => { const cols = ['255,90,130', '255,150,180', '255,60,90']; for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(${cols[i % 3]},${.5 + r() * .45})`; heart(c, r() * W, r() * H, (.008 + r() * .03) * Math.min(W, H)); } } },
  { id: 'petals', n: 'Лепестки', blend: 'source-over', draw: (c, W, H, r) => { for (let i = 0; i < 40; i++) { c.save(); c.translate(r() * W, r() * H); c.rotate(r() * 6); c.fillStyle = `rgba(255,${170 + r() * 50 | 0},${190 + r() * 40 | 0},${.55 + r() * .4})`; const s = (.008 + r() * .018) * Math.min(W, H); c.beginPath(); c.ellipse(0, 0, s * 1.5, s * .7, 0, 0, 7); c.fill(); c.restore(); } } },
  { id: 'sparks', n: 'Искры огня', blend: 'screen', draw: (c, W, H, r) => { c.lineCap = 'round'; for (let i = 0; i < 70; i++) { const x = r() * W, y = H * (.2 + r() * .8), l = H * (.01 + r() * .05); c.strokeStyle = `rgba(255,${120 + r() * 100 | 0},40,${.4 + r() * .6})`; c.lineWidth = (.6 + r() * 2) * Math.min(W, H) / 700; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * l, y - l); c.stroke(); } } },
  { id: 'confetti', n: 'Конфетти', blend: 'source-over', draw: (c, W, H, r) => { const cols = ['#ff5fa2', '#ffd23f', '#3ddc84', '#3d9bff', '#b36bff', '#ff8a3d']; for (let i = 0; i < 90; i++) { c.save(); c.translate(r() * W, r() * H); c.rotate(r() * 6); c.fillStyle = cols[i % 6]; const s = (.006 + r() * .012) * Math.min(W, H); c.fillRect(-s, -s / 2, s * 2, s); c.restore(); } } },
  { id: 'window', n: 'Тень окна', blend: 'multiply', draw: (c, W, H) => { c.fillStyle = 'rgba(30,25,40,.55)'; c.fillRect(0, 0, W, H); c.save(); c.translate(W * .5, H * .5); c.rotate(-.35); c.fillStyle = '#fff'; const bw = W * .16;
      for (let i = -3; i <= 3; i++) c.fillRect(-W * 1.2, i * bw * 1.1 - bw * .4, W * 2.4, bw * .8); c.restore(); } },
  { id: 'leaves', n: 'Тень листьев', blend: 'multiply', draw: (c, W, H, r) => { c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); for (let i = 0; i < 46; i++) { c.save(); c.translate(r() * W, r() * H * .8); c.rotate(r() * 6); c.fillStyle = `rgba(20,30,20,${.25 + r() * .3})`; const s = (.02 + r() * .06) * Math.min(W, H); c.beginPath(); c.ellipse(0, 0, s, s * .4, 0, 0, 7); c.fill(); c.restore(); } } },
  { id: 'darkc', n: 'Тёмные углы', blend: 'multiply', draw: (c, W, H) => { c.fillStyle = rg(c, W / 2, H / 2, Math.min(W, H) * .3, Math.max(W, H) * .8, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(60,50,50,1)']]); c.fillRect(0, 0, W, H); } },
  { id: 'bars', n: 'Кино-полосы', blend: 'source-over', draw: (c, W, H) => { c.fillStyle = '#000'; const b = H * .11; c.fillRect(0, 0, W, b); c.fillRect(0, H - b, W, b); } },
];

/* ---------- фигуры ---------- */
const SHAPES = [['rect', 'Квадрат', 1], ['round', 'Скруглённый', 1], ['circle', 'Круг', 1], ['ellipse', 'Овал', .6], ['tri', 'Треугольник', .9], ['star', 'Звезда', 1],
  ['heart', 'Сердце', .9], ['arrow', 'Стрелка', .6], ['line', 'Линия', .05], ['bubble', 'Облачко', .8], ['diamond', 'Ромб', 1], ['ring', 'Кольцо', 1],
  ['cross', 'Плюс', 1], ['check', 'Галочка', .8], ['burst', 'Взрыв', 1], ['cloud', 'Облако', .6], ['hex', 'Шестиугольник', .9], ['moon', 'Месяц', 1], ['bolt', 'Молния', 1], ['drop', 'Капля', 1.2]];
function shapePath(c, name, w, h) {
  const a = w / 2, b = h / 2; c.beginPath();
  switch (name) {
    case 'rect': c.rect(-a, -b, w, h); break;
    case 'round': c.roundRect ? c.roundRect(-a, -b, w, h, Math.min(w, h) * .22) : c.rect(-a, -b, w, h); break;
    case 'circle': case 'ellipse': c.ellipse(0, 0, a, b, 0, 0, 7); break;
    case 'tri': c.moveTo(0, -b); c.lineTo(a, b); c.lineTo(-a, b); c.closePath(); break;
    case 'star': for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .42 : 1; c.lineTo(Math.cos(ang) * a * r, Math.sin(ang) * b * r); } c.closePath(); break;
    case 'burst': for (let i = 0; i < 24; i++) { const ang = i * Math.PI / 12, r = i % 2 ? .68 : 1; c.lineTo(Math.cos(ang) * a * r, Math.sin(ang) * b * r); } c.closePath(); break;
    case 'heart': c.moveTo(0, b * .9); c.bezierCurveTo(-a * 1.3, b * .1, -a * .9, -b * 1.1, 0, -b * .35); c.bezierCurveTo(a * .9, -b * 1.1, a * 1.3, b * .1, 0, b * .9); c.closePath(); break;
    case 'arrow': c.moveTo(-a, -b * .35); c.lineTo(a * .25, -b * .35); c.lineTo(a * .25, -b); c.lineTo(a, 0); c.lineTo(a * .25, b); c.lineTo(a * .25, b * .35); c.lineTo(-a, b * .35); c.closePath(); break;
    case 'line': c.rect(-a, -b, w, Math.max(h, 2)); break;
    case 'bubble': c.roundRect ? c.roundRect(-a, -b, w, h * .8, h * .22) : c.rect(-a, -b, w, h * .8); c.moveTo(-a * .4, b * .6); c.lineTo(-a * .7, b); c.lineTo(-a * .05, b * .6); break;
    case 'diamond': c.moveTo(0, -b); c.lineTo(a, 0); c.lineTo(0, b); c.lineTo(-a, 0); c.closePath(); break;
    case 'ring': c.ellipse(0, 0, a, b, 0, 0, 7); c.moveTo(a * .62, 0); c.ellipse(0, 0, a * .62, b * .62, 0, 0, 7, true); break;
    case 'cross': { const t = .33; c.moveTo(-a * t, -b); c.lineTo(a * t, -b); c.lineTo(a * t, -b * t); c.lineTo(a, -b * t); c.lineTo(a, b * t); c.lineTo(a * t, b * t); c.lineTo(a * t, b); c.lineTo(-a * t, b); c.lineTo(-a * t, b * t); c.lineTo(-a, b * t); c.lineTo(-a, -b * t); c.lineTo(-a * t, -b * t); c.closePath(); break; }
    case 'check': c.moveTo(-a, 0); c.lineTo(-a * .6, -b * .35); c.lineTo(-a * .22, b * .25); c.lineTo(a * .62, -b); c.lineTo(a, -b * .62); c.lineTo(-a * .22, b); c.closePath(); break;
    case 'cloud': c.moveTo(-a * .6, b); c.arc(-a * .55, b * .3, b * .7, Math.PI * .5, Math.PI * 1.5); c.arc(-a * .1, -b * .3, b * .75, Math.PI, Math.PI * 1.95); c.arc(a * .45, b * .15, b * .75, Math.PI * 1.45, Math.PI * .5); c.closePath(); break;
    case 'hex': for (let i = 0; i < 6; i++) { const ang = Math.PI / 6 + i * Math.PI / 3; c.lineTo(Math.cos(ang) * a, Math.sin(ang) * b * 1.1); } c.closePath(); break;
    case 'moon': c.arc(0, 0, a, Math.PI * .3, Math.PI * 1.7); c.arc(a * .38, -b * .08, a * .82, Math.PI * 1.6, Math.PI * .4, true); c.closePath(); break;
    case 'bolt': c.moveTo(a * .15, -b); c.lineTo(-a * .6, b * .12); c.lineTo(-a * .05, b * .12); c.lineTo(-a * .2, b); c.lineTo(a * .62, -b * .2); c.lineTo(a * .05, -b * .2); c.closePath(); break;
    case 'drop': c.moveTo(0, -b); c.bezierCurveTo(a * .9, -b * .1, a, b * .5, 0, b); c.bezierCurveTo(-a, b * .5, -a * .9, -b * .1, 0, -b); c.closePath(); break;
  }
}

/* ---------- рамки ---------- */
const FRAMES = [['none', 'Нет'], ['solid', 'Сплошная'], ['double', 'Двойная'], ['polaroid', 'Полароид'], ['instax', 'Инстакс'], ['film', 'Плёнка'], ['gold', 'Золото'], ['glow', 'Сияние'],
  ['shadow', 'Тень внутри'], ['vhs', 'VHS'], ['corners', 'Видоискатель'], ['cinema', 'Кино'], ['round', 'Скруглить'], ['circle', 'Круг'], ['heartf', 'Сердце']];

/* ---------- шрифты, цвета, шаблоны текста ---------- */
const FONTS = [['Georgia', 'Georgia'], ['Impact', 'Impact'], ['Arial', 'Arial'], ['"Trebuchet MS"', 'Trebuchet'], ['"Courier New"', 'Courier'], ['Verdana', 'Verdana'], ['"Times New Roman"', 'Times'],
  ['Montserrat', 'Montserrat'], ['"Playfair Display"', 'Playfair'], ['"Bebas Neue"', 'Bebas'], ['Pacifico', 'Pacifico'], ['Lobster', 'Lobster'], ['Oswald', 'Oswald'], ['Caveat', 'Caveat'],
  ['"Marck Script"', 'Marck'], ['"Russo One"', 'Russo'], ['Comfortaa', 'Comfortaa'], ['Philosopher', 'Philosopher'], ['"Rubik Mono One"', 'Rubik Mono'], ['"Press Start 2P"', 'Pixel']];
const COLORS = ['#ffffff', '#f5dea5', '#d4af64', '#f0e6d0', '#0b0805', '#d4543f', '#ff8a3d', '#ffd23f', '#3ddc84', '#1a8c6a', '#7df9ff', '#3d9bff', '#b36bff', '#ff5fa2', '#9a8c74', '#8a1c3c'];
const TPRE = [['Заголовок', { font: 'Playfair Display', bold: true, size: 14, color: '#f5dea5', shadow: true }], ['Подпись', { font: 'Caveat', size: 9, color: '#ffffff', shadow: true }],
  ['Мем', { font: 'Impact', size: 14, color: '#ffffff', stroke: true }], ['Неон', { font: 'Montserrat', bold: true, size: 12, color: '#7df9ff', neon: true }],
  ['Золото', { font: 'Playfair Display', bold: true, size: 13, grad: true, color: '#f7e2ad', color2: '#a67c32', shadow: true }], ['Ретро', { font: 'Press Start 2P', size: 6, color: '#ffd23f', bg: true }],
  ['Плашка', { font: 'Montserrat', bold: true, size: 8, color: '#0b0805', bg: true, bgColor: 'rgba(245,222,165,.95)' }], ['Крупно', { font: 'Bebas Neue', size: 26, color: '#ffffff', shadow: true, kern: 8 }],
  ['Кино', { font: 'Oswald', size: 10, color: '#f0e6d0', kern: 22 }], ['Рукопись', { font: 'Pacifico', size: 12, color: '#ff5fa2', shadow: true }]];
const EMCATS = [['Лица', '😀😁😂🤣😊😍😘😎🤩🥳😇🤔😴🥺😭😡🤯🥵🥶😱🙄😏😜🤪🤗🫡😈👻💀🤖👽🤡😅😉😋😌🥰😤🤫🤭🥲😬😮‍💨'], ['Жесты', '👍👎👏🙌🙏💪✌️🤞👌🤟👋🫶👀🧠💋👑💍🕶️🎩👊✊🤝☝️🫰🤌🖐️✋🤙'],
  ['Символы', '❤️🧡💛💚💙💜🖤🤍💔💯🔥✨⭐🌟💫⚡💥💢💤💬💭➡️⬆️✅❌⚠️🔔📌📍🎵🎶♾️🔞🆗🆕🆒'], ['Природа', '🌈☀️🌙☁️❄️🌸🌹🌻🍀🌴🌊🌋🏔️🦋🐶🐱🦊🐼🦄🐸🐝🦉🐢🐬🌵🍁🌷🌺🍄🌍🪐'],
  ['Еда', '🍕🍔🍟🍩🍪🎂🍷☕🍓🍉🍒🍑🥑🌮🍣🍦🍫🍿🥐🍺🍹🥂🍎🍌🍇🥕'], ['Спорт', '⚽🏀🏈⚾🎾🏐🎱🏓🥊🎯🏆🥇🎮🎲♟️🎳🏄🚴⛷️🏋️'], ['Путешествия', '✈️🚗🚀🚲⛵🏝️🗼🗽🏰🎡🌆🌃🏖️⛺🧳🗺️📸🚁🚂🛴'],
  ['Объекты', '🎁🎉🎈💎📷💡🔮🪄🧿🎧🎬📱💻⌚📚✏️🔑🪙💰🛒🧸🎀🕯️']];

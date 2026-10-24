"use strict";
/* ============ Студия: профессиональный фоторедактор (WebGL) ============ */
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));
const tg = (window.Telegram && Telegram.WebApp) || null;
const hap = (t = 'selection') => { try { t === 'selection' ? tg.HapticFeedback.selectionChanged() : tg.HapticFeedback.impactOccurred(t); } catch (e) {} };
if (tg) { try { tg.ready(); tg.expand(); tg.setHeaderColor('#0b0805'); tg.setBackgroundColor('#0b0805'); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {} }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

/* ------------------------------------------------------------------ */
/*  НАСТРОЙКИ: [ключ, название, мин, макс, группа, по умолчанию]       */
/* ------------------------------------------------------------------ */
const GROUPS = [['light', 'Свет'], ['color', 'Цвет'], ['detail', 'Детали'], ['fx', 'Эффекты'], ['beauty', 'Красота'], ['focus', 'Фокус']];
const PARAMS = [
  ['exposure', 'Экспозиция', -100, 100, 'light', 0], ['brightness', 'Яркость', -100, 100, 'light', 0], ['contrast', 'Контраст', -100, 100, 'light', 0],
  ['highlights', 'Света', -100, 100, 'light', 0], ['shadows', 'Тени', -100, 100, 'light', 0], ['whites', 'Белые', -100, 100, 'light', 0],
  ['blacks', 'Чёрные', -100, 100, 'light', 0], ['dehaze', 'Дымка', -100, 100, 'light', 0],
  ['saturation', 'Насыщенность', -100, 100, 'color', 0], ['vibrance', 'Сочность', -100, 100, 'color', 0], ['temperature', 'Температура', -100, 100, 'color', 0],
  ['tint', 'Оттенок', -100, 100, 'color', 0], ['hue', 'Тон', -100, 100, 'color', 0],
  ['sharpen', 'Резкость', 0, 100, 'detail', 0], ['clarity', 'Чёткость', -100, 100, 'detail', 0], ['denoise', 'Шумоподавление', 0, 100, 'detail', 0],
  ['blur', 'Размытие', 0, 100, 'detail', 0], ['glow', 'Свечение', 0, 100, 'detail', 0], ['grain', 'Зерно', 0, 100, 'detail', 0],
  ['vignette', 'Виньетка', -100, 100, 'fx', 0], ['fade', 'Выцветание', 0, 100, 'fx', 0], ['aberration', 'Хром. аберрация', 0, 100, 'fx', 0],
  ['pixelate', 'Пиксели', 0, 100, 'fx', 0], ['posterize', 'Постеризация', 0, 100, 'fx', 0], ['duotone', 'Дуотон', 0, 100, 'fx', 0],
  ['scanlines', 'Строки ЭЛТ', 0, 100, 'fx', 0], ['solarize', 'Соляризация', 0, 100, 'fx', 0], ['threshold', 'Порог (ч/б)', 0, 100, 'fx', 0],
  ['glitch', 'Глитч', 0, 100, 'fx', 0], ['invert', 'Негатив', 0, 100, 'fx', 0],
  ['skin', 'Гладкая кожа', 0, 100, 'beauty', 0], ['blush', 'Румянец', 0, 100, 'beauty', 0],
  ['focus', 'Размытие вне фокуса', 0, 100, 'focus', 0], ['focusX', 'Фокус: влево–вправо', 0, 100, 'focus', 50], ['focusY', 'Фокус: вверх–вниз', 0, 100, 'focus', 50],
  ['focusR', 'Фокус: размер', 5, 100, 'focus', 35], ['focusF', 'Фокус: мягкость', 0, 100, 'focus', 30],
];
const PDEF = Object.fromEntries(PARAMS.map(p => [p[0], p[5]]));
const zeroParams = () => ({ ...PDEF });
const PKEYS = PARAMS.map(p => p[0]);
const HSLC = [['Красный', '#e53935'], ['Оранжевый', '#fb8c00'], ['Жёлтый', '#fdd835'], ['Зелёный', '#43a047'], ['Бирюзовый', '#00acc1'], ['Синий', '#3949ab'], ['Фиолетовый', '#8e24aa'], ['Розовый', '#d81b60']];

/* ------------------------------------------------------------------ */
/*  ФИЛЬТРЫ (62)                                                       */
/* ------------------------------------------------------------------ */
const FCATS = [['top', 'Топ'], ['cin', 'Кино'], ['bw', 'Ч/Б'], ['ret', 'Ретро'], ['vib', 'Яркие'], ['tone', 'Тона'], ['art', 'Арт']];
const FL = [
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
  ['cinema', 'Кино', 'cin', { contrast: 22, vignette: 22, saturation: -6 }, { lift: [0, .03, .045], gain: [1.06, .98, .88] }],
  ['teal', 'Бирюза/оранж', 'cin', { contrast: 24, saturation: 10, vignette: 24 }, { lift: [0, .04, .05], gain: [1.1, .97, .85] }],
  ['block', 'Блокбастер', 'cin', { contrast: 30, saturation: -8, vignette: 30 }, { lift: [0, .03, .05], gain: [1.08, .98, .85] }],
  ['moody', 'Мрачный', 'cin', { brightness: -14, contrast: 26, saturation: -14, vignette: 38, temperature: -12 }, { lift: [0, .02, .03] }],
  ['western', 'Вестерн', 'cin', { contrast: 20, fade: 16, temperature: 26, vignette: 28 }, { sepia: .45 }],
  ['nordic', 'Север', 'cin', { saturation: -30, temperature: -20, contrast: 10, brightness: 6, fade: 12 }],
  ['golden', 'Золотой час', 'cin', { temperature: 46, highlights: -20, saturation: 18, glow: 20, vignette: 16 }, { gain: [1.1, .97, .82] }],
  ['matrix', 'Матрица', 'cin', { saturation: -30, contrast: 20, vignette: 30 }, { gain: [.8, 1.15, .85] }],
  ['bleach', 'Выбеленный', 'cin', { saturation: -45, contrast: 40, sharpen: 26, fade: 8 }],
  ['bw', 'Ч/Б', 'bw', { contrast: 8 }, { mono: 1 }],
  ['bwc', 'Ч/Б контраст', 'bw', { contrast: 56, sharpen: 30, vignette: 24 }, { mono: 1 }],
  ['noir', 'Нуар', 'bw', { contrast: 42, vignette: 42, sharpen: 20 }, { mono: 1 }],
  ['silver', 'Серебро', 'bw', { contrast: -6, brightness: 10, fade: 14 }, { mono: 1 }],
  ['ink', 'Тушь', 'bw', { contrast: 70, sharpen: 40, grain: 36, vignette: 30 }, { mono: 1 }],
  ['fadebw', 'Блёклый Ч/Б', 'bw', { fade: 50, contrast: -10 }, { mono: 1 }],
  ['sepia', 'Сепия', 'bw', { contrast: 6 }, { sepia: 1 }],
  ['hikey', 'Светлый Ч/Б', 'bw', { brightness: 24, contrast: 14, fade: 10 }, { mono: 1 }],
  ['lokey', 'Тёмный Ч/Б', 'bw', { brightness: -18, contrast: 40, vignette: 34 }, { mono: 1 }],
  ['vintage', 'Винтаж', 'ret', { fade: 42, grain: 30, vignette: 30, contrast: -6 }, { sepia: .5 }],
  ['film', 'Плёнка', 'ret', { grain: 42, fade: 20, contrast: 12, saturation: -10, vignette: 14 }, { sepia: .1 }],
  ['polar', 'Полароид', 'ret', { fade: 30, contrast: -8, saturation: -12, temperature: 14, vignette: 22, grain: 20 }, { sepia: .2 }],
  ['s70', '70-е', 'ret', { temperature: 30, saturation: 16, fade: 26, grain: 24, vignette: 24 }, { gain: [1.08, .96, .84] }],
  ['kodak', 'Кодак', 'ret', { temperature: 18, saturation: 18, contrast: 14, grain: 22 }, { gain: [1.06, 1, .88] }],
  ['lomo', 'Ломо', 'ret', { contrast: 34, saturation: 34, vignette: 60, grain: 28 }, { lift: [.02, 0, .03] }],
  ['faded', 'Выцвет', 'ret', { fade: 55, saturation: -14, contrast: -8 }],
  ['cross', 'Кросс', 'ret', { contrast: 26, saturation: 12 }, { lift: [.05, 0, .06], gain: [.94, 1.05, 1.12] }],
  ['oldp', 'Старое фото', 'ret', { fade: 36, grain: 44, vignette: 48, contrast: -8 }, { sepia: .8 }],
  ['neon', 'Неон', 'vib', { contrast: 30, saturation: 56, vibrance: 20 }, { lift: [.05, 0, .09], gain: [1.06, .96, 1.1] }],
  ['candy', 'Леденец', 'vib', { saturation: 44, vibrance: 30, brightness: 8, fade: 14, tint: 16, temperature: 6 }, { gain: [1.04, .98, 1.06] }],
  ['tropic', 'Тропики', 'vib', { saturation: 50, vibrance: 36, temperature: 10, tint: -10, contrast: 14 }],
  ['summer', 'Лето', 'vib', { temperature: 24, saturation: 28, brightness: 8, contrast: 10 }],
  ['pop', 'Поп-арт', 'vib', { saturation: 60, contrast: 24, sharpen: 24, vibrance: 30 }],
  ['ultra', 'Ультра', 'vib', { saturation: 80, contrast: 30, clarity: 30 }],
  ['duoG', 'Дуо золото', 'tone', { duotone: 100 }, { duo: ['#1a0f05', '#ffd98a'] }],
  ['duoE', 'Дуо изумруд', 'tone', { duotone: 100 }, { duo: ['#02130e', '#b6f0d6'] }],
  ['duoR', 'Дуо роза', 'tone', { duotone: 100 }, { duo: ['#2a0f24', '#ffb8d0'] }],
  ['duoB', 'Дуо синий', 'tone', { duotone: 100 }, { duo: ['#06122e', '#9ad0ff'] }],
  ['duoS', 'Дуо закат', 'tone', { duotone: 100 }, { duo: ['#3b0a2f', '#ffd36b'] }],
  ['ice', 'Лёд', 'tone', { temperature: -48, saturation: -10, brightness: 8, fade: 10 }],
  ['amber', 'Янтарь', 'tone', { temperature: 56, tint: 8, saturation: 10 }],
  ['lavender', 'Лаванда', 'tone', { tint: 30, temperature: -10, saturation: 6, fade: 18, brightness: 6 }],
  ['forest', 'Лес', 'tone', { tint: -22, temperature: -6, saturation: 6, contrast: 14 }, { gain: [.92, 1.06, .92] }],
  ['poster', 'Постер', 'art', { posterize: 60, contrast: 20, saturation: 30 }],
  ['pixel', 'Пиксели', 'art', { pixelate: 60 }],
  ['glitch', 'Глитч', 'art', { glitch: 70, aberration: 55, contrast: 16 }],
  ['comic', 'Комикс', 'art', { posterize: 50, contrast: 44, sharpen: 60, saturation: 34 }],
  ['crt', 'ЭЛТ-экран', 'art', { scanlines: 80, aberration: 30, vignette: 40, saturation: 10, contrast: 10 }],
  ['solar', 'Соляризация', 'art', { solarize: 100, contrast: 8 }],
  ['thresh', 'Ч/Б порог', 'art', { threshold: 100 }, { mono: 1 }],
  ['thermal', 'Тепловизор', 'art', { duotone: 100, contrast: 30 }, { duo: ['#1b0033', '#ffee55'] }],
  ['dream', 'Мечта', 'art', { glow: 70, blur: 10, brightness: 10, saturation: 20, fade: 14 }],
];
const FILTERS = FL.map(([id, n, cat, p, ex]) => ({ id, n, cat, p, ...(ex || {}) }));
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

/* ------------------------------------------------------------------ */
/*  СОСТОЯНИЕ                                                          */
/* ------------------------------------------------------------------ */
const S = {
  src: null, sw: 0, sh: 0,
  geo: { rot: 0, fx: 1, fy: 1, ang: 0, crop: { x: 0, y: 0, w: 1, h: 1 }, aspect: 'free' },
  p: zeroParams(), hsl: Array.from({ length: 8 }, () => [0, 0, 0]), filter: { id: 'orig', int: 100 },
  layers: [], strokes: [], fx: [], frame: { id: 'none', size: 4, color: '#ffffff' }, sel: -1, fxSel: -1,
  tab: 'filters', adjG: 'light', adj: 'exposure', fcat: 'top', hslI: 0, emcat: 0,
  brush: { color: '#f5dea5', size: 8, type: 'brush' }, text: { font: 'Georgia', color: '#f5dea5' }, shape: { name: 'rect', color: '#d4af64', fill: true },
  hist: [], redo: [], compare: false, stats: null, sugg: [],
};
let nextId = 1;
const imgReg = {};

/* ------------------------------------------------------------------ */
/*  WEBGL                                                              */
/* ------------------------------------------------------------------ */
const glc = $('gl'), ovc = $('ov'), ov = ovc.getContext('2d');
const gl = glc.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false }) || glc.getContext('experimental-webgl');
const VS = `attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}`;
const FS = `precision highp float;varying vec2 v;uniform sampler2D T;
uniform vec2 uSrc,uFrame,uOut,uFlip;uniform vec4 uCrop;uniform float uRot,uAng,uCover;
${PKEYS.map(k => `uniform float u_${k};`).join('')}
uniform float u_mono,u_sepia,uHSLon;uniform vec3 uLift,uGain,uDuoA,uDuoB;uniform vec3 uHSL[8];
vec2 suv(vec2 uv){
  vec2 p=uCrop.xy+uv*uCrop.zw;vec2 q=(p-.5)*uFrame;q/=uCover;
  float c=cos(uAng),s=sin(uAng);q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);q*=uFlip;
  if(uRot>.5&&uRot<1.5)q=vec2(q.y,-q.x);else if(uRot>1.5&&uRot<2.5)q=-q;else if(uRot>2.5)q=vec2(-q.y,q.x);
  return q/uSrc+.5;}
vec3 tap(vec2 uv){return texture2D(T,clamp(suv(uv),0.,1.)).rgb;}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 rgb2hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);float e=1.0e-10;return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);}
vec3 hsv2rgb(vec3 c){vec4 K=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}
float skinMask(vec3 c){float y=dot(c,vec3(.299,.587,.114));float cb=(c.b-y)*.564+.5;float cr=(c.r-y)*.713+.5;
  return smoothstep(.29,.34,cb)*(1.-smoothstep(.49,.54,cb))*smoothstep(.50,.545,cr)*(1.-smoothstep(.66,.71,cr))*smoothstep(.12,.28,y);}
vec3 base(vec2 uv){
  if(u_aberration>.001){vec2 d=(uv-.5)*u_aberration*.03;return vec3(tap(uv+d).r,tap(uv).g,tap(uv-d).b);}
  return tap(uv);}
float bandC(int i){if(i==0)return 0.;if(i==1)return .083;if(i==2)return .167;if(i==3)return .33;if(i==4)return .5;if(i==5)return .62;if(i==6)return .77;return .9;}
void main(){
  vec2 uv=v;
  if(u_pixelate>.001){float n=mix(260.,14.,u_pixelate);vec2 g=vec2(n*uOut.x/uOut.y,n);uv=(floor(uv*g)+.5)/g;}
  if(u_glitch>.001){float row=floor(uv.y*38.);float h=hash(vec2(row,7.));if(h>1.-u_glitch*.45)uv.x+=(hash(vec2(row,3.))-.5)*.14*u_glitch;}
  float fm=0.;
  if(u_focus>.001){float d=length((uv-vec2(u_focusX,u_focusY))*vec2(uOut.x/uOut.y,1.));float R=u_focusR*.8;fm=smoothstep(R,R+u_focusF*.8+.001,d)*u_focus;}
  float br=u_blur+fm;vec3 c;
  if(br>.001){float r=br*uOut.y*.02;c=vec3(0.);for(int i=0;i<24;i++){float fi=float(i);float a=fi*2.39996;float rr=sqrt((fi+.5)/24.)*r;c+=base(uv+vec2(cos(a),sin(a))*rr/uOut);}c/=24.;}
  else c=base(uv);
  if(u_skin>.001){vec3 sb=vec3(0.);for(int i=0;i<12;i++){float a=float(i)*.5236;sb+=base(uv+vec2(cos(a),sin(a))*uOut.y*.0045/uOut);}sb/=12.;
    float m=skinMask(c);c=mix(c,mix(sb,c,.3),m*u_skin);}
  if(u_denoise>.001){vec3 s=c;float ws=1.;for(int i=0;i<8;i++){float a=float(i)*.7854;vec3 t=base(uv+vec2(cos(a),sin(a))*1.8/uOut);float w=exp(-dot(t-c,t-c)*18.);s+=t*w;ws+=w;}c=mix(c,s/ws,min(1.,u_denoise*1.2));}
  if(u_sharpen>.001){vec3 b=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.7854;b+=base(uv+vec2(cos(a),sin(a))*1.6/uOut);}b/=8.;c+=(c-b)*u_sharpen*2.2;}
  if(abs(u_clarity)>.001||u_glow>.001||abs(u_dehaze)>.001){
    vec3 bl=vec3(0.);for(int i=0;i<12;i++){float fi=float(i);float a=fi*2.39996;float rr=sqrt((fi+.5)/12.)*uOut.y*.035;bl+=base(uv+vec2(cos(a),sin(a))*rr/uOut);}bl/=12.;
    c+=(c-bl)*u_clarity*1.6;c+=max(bl-.45,0.)*u_glow*1.5;
    float mn=min(bl.r,min(bl.g,bl.b));float a2=u_dehaze*.8;c=(c-mn*a2)/(1.-a2*.55);}
  c*=pow(2.,u_exposure*1.4);c+=u_brightness*.22;
  float bp=-u_blacks*.12,wp=1.-u_whites*.15;c=(c-bp)/(wp-bp);
  c=(c-.5)*(1.+u_contrast*.85)+.5;
  float l=dot(c,vec3(.299,.587,.114));
  c+=vec3(u_shadows*.3*smoothstep(.55,.0,l)+u_highlights*.3*smoothstep(.45,1.,l));
  c.r+=u_temperature*.13;c.b-=u_temperature*.13;c.g-=u_tint*.08;c.r+=u_tint*.045;c.b+=u_tint*.045;
  l=dot(c,vec3(.299,.587,.114));
  float mx=max(c.r,max(c.g,c.b)),mn2=min(c.r,min(c.g,c.b));
  c=mix(vec3(l),c,1.+u_saturation+u_vibrance*(1.-(mx-mn2))*.9);
  if(abs(u_hue)>.001){float h=u_hue*3.14159;float cs=cos(h),sn=sin(h);
    mat3 m=mat3(.299+.701*cs+.168*sn,.299-.299*cs-.328*sn,.299-.3*cs+1.25*sn,.587-.587*cs+.33*sn,.587+.413*cs+.035*sn,.587-.588*cs-1.05*sn,.114-.114*cs-.497*sn,.114-.114*cs+.292*sn,.114+.886*cs-.203*sn);c=m*c;}
  if(uHSLon>.5){vec3 hv=rgb2hsv(clamp(c,0.,1.));float hs=0.,ss=0.,ls=0.;
    for(int i=0;i<8;i++){float d=abs(hv.x-bandC(i));d=min(d,1.-d);float w=1.-smoothstep(0.,.11,d);hs+=w*uHSL[i].x;ss+=w*uHSL[i].y;ls+=w*uHSL[i].z;}
    float sm=smoothstep(.04,.3,hv.y);hv.x=fract(hv.x+hs*.1*sm+1.);hv.y=clamp(hv.y*(1.+ss*sm),0.,1.);hv.z=clamp(hv.z*(1.+ls*.6*sm),0.,1.);c=hsv2rgb(hv);}
  l=dot(c,vec3(.299,.587,.114));
  c=mix(c,vec3(l),u_mono);c=mix(c,vec3(l)*vec3(1.2,1.,.78),u_sepia);
  c=mix(c,mix(uDuoA,uDuoB,clamp(l,0.,1.)),u_duotone);
  c=c*uGain+uLift*(1.-c);
  c=mix(c,vec3(.5),u_fade*.22);c=c*(1.-u_fade*.16)+u_fade*.09;
  if(u_posterize>.001){float L=mix(32.,3.,u_posterize);c=floor(c*L+.5)/L;}
  if(u_threshold>.001){c=mix(c,vec3(step(.5,dot(c,vec3(.299,.587,.114)))),u_threshold);}
  if(u_solarize>.001){c=mix(c,mix(c,1.-c,step(.5,c)),u_solarize);}
  c=mix(c,1.-c,u_invert);
  if(u_blush>.001){float m=skinMask(c);c.r+=u_blush*.07*m;c.g-=u_blush*.02*m;c.b+=u_blush*.012*m;}
  c*=1.-u_scanlines*.35*(.5+.5*sin(v.y*uOut.y*3.14159));
  float d=distance(v,vec2(.5))*1.41;
  c*=1.-u_vignette*smoothstep(.3,1.,d)*.92;if(u_vignette<0.)c+=-u_vignette*smoothstep(.3,1.,d)*.5;
  float n=hash(v*uOut+fract(sin(uOut.x)*3.1))-.5;l=dot(c,vec3(.299,.587,.114));
  c+=n*u_grain*.34*(1.-abs(l-.5)*1.4);
  gl_FragColor=vec4(clamp(c,0.,1.),1.);}`;
function shader(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s;
}
let prog, U = {}, tex;
function initGL() {
  prog = gl.createProgram(); gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog); gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  ['T', 'uSrc', 'uFrame', 'uOut', 'uFlip', 'uCrop', 'uRot', 'uAng', 'uCover', 'u_mono', 'u_sepia', 'uHSLon', 'uLift', 'uGain', 'uDuoA', 'uDuoB', 'uHSL']
    .concat(PKEYS.map(k => 'u_' + k)).forEach(n => U[n] = gl.getUniformLocation(prog, n));
  tex = gl.createTexture();
}
function setTexture(img) {
  gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
function effective(params, hsl, filter) {
  const f = FILTERS.find(x => x.id === filter.id) || FILTERS[0], k = filter.int / 100, e = { v: {} };
  for (const key of PKEYS) {
    const isCenter = key.startsWith('focus') && key !== 'focus';
    e.v[key] = (params[key] + (isCenter ? 0 : ((f.p && f.p[key]) || 0) * k)) / 100;
  }
  e.mono = (f.mono || 0) * k; e.sepia = (f.sepia || 0) * k;
  e.lift = (f.lift || [0, 0, 0]).map(x => x * k); e.gain = (f.gain || [1, 1, 1]).map(x => 1 + (x - 1) * k);
  e.duoA = hex2rgb((f.duo || ['#1a1033', '#f2c36b'])[0]); e.duoB = hex2rgb((f.duo || ['#1a1033', '#f2c36b'])[1]);
  e.hsl = new Float32Array(hsl.flat().map(x => x / 100)); e.hslOn = hsl.some(b => b[0] || b[1] || b[2]) ? 1 : 0;
  return e;
}
const ZERO_EFF = () => effective(zeroParams(), Array.from({ length: 8 }, () => [0, 0, 0]), { id: 'orig', int: 100 });
function frameSize(rot) { return rot % 2 ? [S.sh, S.sw] : [S.sw, S.sh]; }
function coverScale(ang, fw, fh) { const a = Math.abs(ang * Math.PI / 180); if (!a) return 1; const asp = fw / fh; return Math.cos(a) + Math.sin(a) * Math.max(asp, 1 / asp); }
function drawGL(geo, crop, eff, W, H) {
  glc.width = W; glc.height = H; gl.viewport(0, 0, W, H);
  const [fw, fh] = frameSize(geo.rot);
  gl.useProgram(prog); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U.T, 0);
  gl.uniform2f(U.uSrc, S.sw, S.sh); gl.uniform2f(U.uFrame, fw, fh); gl.uniform2f(U.uOut, W, H); gl.uniform2f(U.uFlip, geo.fx, geo.fy);
  gl.uniform4f(U.uCrop, crop.x, crop.y, crop.w, crop.h); gl.uniform1f(U.uRot, geo.rot); gl.uniform1f(U.uAng, geo.ang * Math.PI / 180);
  gl.uniform1f(U.uCover, coverScale(geo.ang, fw, fh));
  for (const k of PKEYS) gl.uniform1f(U['u_' + k], eff.v[k]);
  gl.uniform1f(U.u_mono, eff.mono); gl.uniform1f(U.u_sepia, eff.sepia); gl.uniform1f(U.uHSLon, eff.hslOn);
  gl.uniform3fv(U.uLift, eff.lift); gl.uniform3fv(U.uGain, eff.gain); gl.uniform3fv(U.uDuoA, eff.duoA); gl.uniform3fv(U.uDuoB, eff.duoB);
  gl.uniform3fv(U.uHSL, eff.hsl);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

/* ------------------------------------------------------------------ */
/*  ЗАГРУЗКА ФОТО                                                      */
/* ------------------------------------------------------------------ */
const MAXTEX = 3600;
function loadImage(url, isSample) {
  $('load').classList.add('on');
  const im = new Image();
  im.onload = () => {
    let w = im.naturalWidth, h = im.naturalHeight; const k = Math.min(1, MAXTEX / Math.max(w, h));
    w = Math.round(w * k); h = Math.round(h * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
    S.src = c; S.sw = w; S.sh = h; setTexture(c);
    S.geo = { rot: 0, fx: 1, fy: 1, ang: 0, crop: { x: 0, y: 0, w: 1, h: 1 }, aspect: 'free' };
    S.p = zeroParams(); S.hsl = Array.from({ length: 8 }, () => [0, 0, 0]); S.filter = { id: 'orig', int: 100 };
    S.layers = []; S.strokes = []; S.fx = []; S.frame = { id: 'none', size: 4, color: '#ffffff' }; S.sel = -1; S.fxSel = -1; S.hist = []; S.redo = [];
    document.body.classList.remove('noimg'); $('empty').style.display = 'none'; $('cv').style.display = 'block'; $('bCmp').style.display = 'flex'; $('bExport').disabled = false;
    $('load').classList.remove('on');
    analyze(); buildThumbs(); pushHist(true); setTab('filters'); syncUI(); layout(); render();
    if (!isSample) URL.revokeObjectURL(url);
    try { tg && tg.enableClosingConfirmation(); } catch (e) {}
    if (!lsGet('studio_tour')) setTimeout(() => startTour(), 500);
  };
  im.onerror = () => { $('load').classList.remove('on'); toast('Не удалось открыть файл'); };
  im.src = url;
}
function makeSample() {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1066; const x = c.getContext('2d');
  let g = x.createLinearGradient(0, 0, 0, 1066); g.addColorStop(0, '#2b2f6b'); g.addColorStop(.45, '#d98a5a'); g.addColorStop(.7, '#f3c98b'); g.addColorStop(1, '#2a3d3a');
  x.fillStyle = g; x.fillRect(0, 0, 1600, 1066);
  const sun = x.createRadialGradient(1100, 520, 10, 1100, 520, 230); sun.addColorStop(0, '#fff7d8'); sun.addColorStop(.35, 'rgba(255,220,150,.9)'); sun.addColorStop(1, 'rgba(255,200,120,0)');
  x.fillStyle = sun; x.fillRect(0, 0, 1600, 1066);
  const mt = (col, base, amp, seed) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, 1066);
    for (let i = 0; i <= 1600; i += 20) x.lineTo(i, base - amp * (Math.sin(i * .004 + seed) * .6 + Math.sin(i * .011 + seed * 2) * .3 + Math.sin(i * .027 + seed) * .1));
    x.lineTo(1600, 1066); x.fill(); };
  mt('#4a3b5c', 640, 120, 1); mt('#2f3f4a', 760, 110, 3); mt('#1b2e2a', 880, 90, 5); mt('#0f1f1a', 980, 60, 8);
  const r = mulberry(5);
  for (let i = 0; i < 70; i++) { const px = r() * 1600, py = 900 + r() * 150, s = 20 + r() * 50; x.fillStyle = 'rgba(8,24,18,.9)'; x.beginPath(); x.moveTo(px, py - s * 2.2); x.lineTo(px - s * .7, py); x.lineTo(px + s * .7, py); x.fill(); }
  for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(255,255,255,' + (r() * .7) + ')'; x.fillRect(r() * 1600, r() * 300, 2, 2); }
  return c.toDataURL('image/jpeg', .95);
}
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ------------------------------------------------------------------ */
/*  РАСКЛАДКА И ОТРИСОВКА                                              */
/* ------------------------------------------------------------------ */
let outW = 1, outH = 1; const PREV = 1500;
function cropMode() { return S.tab === 'crop' && !S.compare; }
function currentCrop() { return cropMode() ? { x: 0, y: 0, w: 1, h: 1 } : S.geo.crop; }
function outDims() {
  const [fw, fh] = frameSize(S.geo.rot), c = currentCrop(); let w = fw * c.w, h = fh * c.h;
  const k = Math.min(1, PREV / Math.max(w, h)); return [Math.max(2, Math.round(w * k)), Math.max(2, Math.round(h * k))];
}
function layout() {
  if (!S.src) return;
  const st = $('stage'), aw = st.clientWidth - 24, ah = st.clientHeight - 24, [w, h] = outDims(); const r = w / h;
  let cw = aw, ch = aw / r; if (ch > ah) { ch = ah; cw = ah * r; }
  const cv = $('cv'); cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; placeCrop();
}
function render() {
  if (!S.src) return;
  const [W, H] = outDims(); outW = W; outH = H;
  drawGL(S.geo, currentCrop(), S.compare ? ZERO_EFF() : effective(S.p, S.hsl, S.filter), W, H);
  if (ovc.width !== W || ovc.height !== H) { ovc.width = W; ovc.height = H; }
  drawOverlay();
}

/* ------------------------------------------------------------------ */
/*  ЭФФЕКТЫ-НАЛОЖЕНИЯ (процедурные)                                    */
/* ------------------------------------------------------------------ */
const lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const rg = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const FX = [
  { id: 'leak1', n: 'Янтарь', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, 0, W * .8, H * .35, [[0, 'rgba(255,140,40,.95)'], [.5, 'rgba(255,80,60,.35)'], [1, 'rgba(255,80,60,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'leak2', n: 'Розовый', blend: 'screen', draw: (c, W, H) => { c.fillStyle = rg(c, W, 0, 0, W * .9, [[0, 'rgba(255,90,170,.9)'], [.5, 'rgba(160,70,255,.35)'], [1, 'rgba(160,70,255,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'leak3', n: 'Золотой луч', blend: 'screen', draw: (c, W, H) => { c.save(); c.translate(W / 2, H / 2); c.rotate(-.5); c.fillStyle = lg(c, -W, 0, W, 0, [[0, 'rgba(255,200,90,0)'], [.5, 'rgba(255,214,120,.8)'], [1, 'rgba(255,200,90,0)']]); c.fillRect(-W, -H * .12, W * 2, H * .24); c.restore(); } },
  { id: 'leak4', n: 'Бирюза', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, H, W * .6, H * .4, [[0, 'rgba(40,220,200,.85)'], [.6, 'rgba(40,120,255,.3)'], [1, 'rgba(40,120,255,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'bokeh', n: 'Боке', blend: 'screen', draw: (c, W, H, r) => { for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H, s = (.02 + r() * .06) * Math.min(W, H); const col = ['255,214,140', '255,160,120', '170,210,255', '255,255,255'][i % 4];
      c.fillStyle = rg(c, x, y, s * .2, s, [[0, `rgba(${col},.55)`], [.8, `rgba(${col},.3)`], [1, `rgba(${col},0)`]]); c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); } } },
  { id: 'dust', n: 'Пыль', blend: 'screen', draw: (c, W, H, r) => { for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,255,255,${.15 + r() * .6})`; const s = .6 + r() * 2.2 * Math.min(W, H) / 700; c.beginPath(); c.arc(r() * W, r() * H, s, 0, 7); c.fill(); } } },
  { id: 'scratch', n: 'Царапины', blend: 'screen', draw: (c, W, H, r) => { c.lineWidth = Math.max(1, W / 900); for (let i = 0; i < 24; i++) { const x = r() * W; c.strokeStyle = `rgba(255,255,255,${.2 + r() * .5})`; c.beginPath(); c.moveTo(x, r() * H * .3); c.lineTo(x + (r() - .5) * 14, H * (.5 + r() * .5)); c.stroke(); } } },
  { id: 'rain', n: 'Дождь', blend: 'screen', draw: (c, W, H, r) => { c.lineWidth = Math.max(1, W / 800); for (let i = 0; i < 160; i++) { const x = r() * W, y = r() * H, l = H * (.03 + r() * .05); c.strokeStyle = `rgba(200,225,255,${.25 + r() * .4})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * .25, y + l); c.stroke(); } } },
  { id: 'snow', n: 'Снег', blend: 'source-over', draw: (c, W, H, r) => { for (let i = 0; i < 140; i++) { const s = (.003 + r() * .012) * Math.min(W, H); c.fillStyle = `rgba(255,255,255,${.5 + r() * .5})`; c.beginPath(); c.arc(r() * W, r() * H, s, 0, 7); c.fill(); } } },
  { id: 'stars', n: 'Искры', blend: 'screen', draw: (c, W, H, r) => { for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H, s = (.008 + r() * .026) * Math.min(W, H); c.fillStyle = `rgba(255,${230 + r() * 25 | 0},${170 + r() * 60 | 0},${.5 + r() * .5})`;
      c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? s * .22 : s; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); } } },
  { id: 'flare', n: 'Блик', blend: 'screen', draw: (c, W, H) => { const x = W * .78, y = H * .2; c.fillStyle = rg(c, x, y, 0, W * .35, [[0, 'rgba(255,240,200,.95)'], [.25, 'rgba(255,190,110,.4)'], [1, 'rgba(255,160,80,0)']]); c.fillRect(0, 0, W, H);
      const dx = W / 2 - x, dy = H / 2 - y; [[.6, .05, '255,120,80'], [1.1, .08, '120,200,255'], [1.6, .04, '255,230,130'], [2.0, .1, '255,150,230']].forEach(([t, s, col]) => { const px = x + dx * t, py = y + dy * t, rr = s * Math.min(W, H);
        c.fillStyle = rg(c, px, py, 0, rr, [[0, `rgba(${col},.55)`], [1, `rgba(${col},0)`]]); c.beginPath(); c.arc(px, py, rr, 0, 7); c.fill(); }); } },
  { id: 'prism', n: 'Призма', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, 0, W, H, [[0, 'rgba(255,0,80,0)'], [.25, 'rgba(255,170,0,.45)'], [.45, 'rgba(120,255,120,.4)'], [.65, 'rgba(60,160,255,.5)'], [.85, 'rgba(200,60,255,.4)'], [1, 'rgba(200,60,255,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'confetti', n: 'Конфетти', blend: 'source-over', draw: (c, W, H, r) => { const cols = ['#ff5fa2', '#ffd23f', '#3ddc84', '#3d9bff', '#b36bff', '#ff8a3d']; for (let i = 0; i < 90; i++) { c.save(); c.translate(r() * W, r() * H); c.rotate(r() * 6); c.fillStyle = cols[i % 6]; const s = (.006 + r() * .012) * Math.min(W, H); c.fillRect(-s, -s / 2, s * 2, s); c.restore(); } } },
  { id: 'haze', n: 'Дымка', blend: 'screen', draw: (c, W, H) => { c.fillStyle = lg(c, 0, H, 0, H * .3, [[0, 'rgba(255,245,230,.75)'], [1, 'rgba(255,245,230,0)']]); c.fillRect(0, 0, W, H); } },
  { id: 'bars', n: 'Кино-полосы', blend: 'source-over', draw: (c, W, H) => { c.fillStyle = '#000'; const b = H * .11; c.fillRect(0, 0, W, b); c.fillRect(0, H - b, W, b); } },
];
const fxCache = {};
function drawFx(ctx, L, W, H) {
  const def = FX.find(f => f.id === L.id); if (!def) return;
  const key = `${L.id}|${L.seed}|${W}|${H}`;
  let cv = fxCache[key];
  if (!cv) { cv = document.createElement('canvas'); cv.width = W; cv.height = H; def.draw(cv.getContext('2d'), W, H, mulberry(L.seed)); fxCache[key] = cv;
    const keys = Object.keys(fxCache); if (keys.length > 30) delete fxCache[keys[0]]; }
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = def.blend; ctx.drawImage(cv, 0, 0); ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  ФИГУРЫ                                                             */
/* ------------------------------------------------------------------ */
const SHAPES = [['rect', 'Квадрат', 1], ['round', 'Скруглённый', 1], ['circle', 'Круг', 1], ['ellipse', 'Овал', .6], ['tri', 'Треугольник', .9], ['star', 'Звезда', 1],
  ['heart', 'Сердце', .9], ['arrow', 'Стрелка', .6], ['line', 'Линия', .05], ['bubble', 'Облачко', .8], ['diamond', 'Ромб', 1], ['ring', 'Кольцо', 1],
  ['cross', 'Плюс', 1], ['check', 'Галочка', .8], ['burst', 'Взрыв', 1], ['cloud', 'Облако', .6]];
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
  }
}

/* ------------------------------------------------------------------ */
/*  СЛОИ                                                               */
/* ------------------------------------------------------------------ */
const strokeCv = document.createElement('canvas');
function drawStrokes(ctx, W, H) {
  if (!S.strokes.length) return;
  strokeCv.width = W; strokeCv.height = H; const s = strokeCv.getContext('2d'); s.clearRect(0, 0, W, H); s.lineCap = 'round'; s.lineJoin = 'round';
  const unit = Math.min(W, H) / 700;
  for (const st of S.strokes) {
    const p = st.pts, pass = (width, color, alpha, comp, blur) => {
      s.globalCompositeOperation = comp; s.globalAlpha = alpha; s.strokeStyle = s.fillStyle = color; s.lineWidth = width; s.shadowBlur = blur || 0; s.shadowColor = color;
      if (p.length === 1) { s.beginPath(); s.arc(p[0][0] * W, p[0][1] * H, width / 2, 0, 7); s.fill(); }
      else { s.beginPath(); s.moveTo(p[0][0] * W, p[0][1] * H);
        for (let i = 1; i < p.length - 1; i++) s.quadraticCurveTo(p[i][0] * W, p[i][1] * H, (p[i][0] + p[i + 1][0]) / 2 * W, (p[i][1] + p[i + 1][1]) / 2 * H);
        s.lineTo(p[p.length - 1][0] * W, p[p.length - 1][1] * H); s.stroke(); }
      s.shadowBlur = 0; s.globalAlpha = 1;
    };
    const w = st.size * unit;
    if (st.type === 'erase') pass(w * 1.4, '#000', 1, 'destination-out');
    else if (st.type === 'marker') pass(w * 1.8, st.color, .45, 'source-over');
    else if (st.type === 'neon') { pass(w * 2.6, st.color, .55, 'source-over', w * 3); pass(w * .9, '#ffffff', .95, 'source-over'); }
    else pass(w, st.color, 1, 'source-over');
  }
  ctx.drawImage(strokeCv, 0, 0);
}
function layerFont(L, px) { return `${L.italic ? 'italic ' : ''}${L.bold ? 'bold ' : ''}${px}px ${L.font}, sans-serif`; }
function lineWidth(ctx, ln, kern) { if (!kern) return ctx.measureText(ln).width; let w = 0; for (const ch of ln) w += ctx.measureText(ch).width + kern; return w - kern; }
function metrics(ctx, L, W, H) {
  const m = Math.min(W, H);
  if (L.kind === 'shape' || L.kind === 'img') { const w = L.size / 100 * m; return { w, h: Math.max(w * L.aspect, 4), pad: W / 55 }; }
  const px = L.size * m / 100; ctx.font = layerFont(L, px); const kern = (L.kern || 0) * px / 100;
  const lines = L.text.split('\n'); let w = 0; for (const ln of lines) w = Math.max(w, lineWidth(ctx, ln, kern));
  return { px, lines, w, h: lines.length * px * 1.2, kern, pad: px * .4 };
}
function drawLine(ctx, ln, x, y, kern, stroke) {
  if (!kern) { stroke ? ctx.strokeText(ln, x, y) : ctx.fillText(ln, x, y); return; }
  for (const ch of ln) { stroke ? ctx.strokeText(ch, x, y) : ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + kern; }
}
function drawLayer(ctx, L, W, H) {
  const m = metrics(ctx, L, W, H);
  ctx.save(); ctx.translate(L.x * W, L.y * H); ctx.rotate(L.rot); ctx.globalAlpha = L.alpha == null ? 1 : L.alpha;
  if (L.kind === 'shape') {
    shapePath(ctx, L.shape, m.w, m.h);
    if (L.filled) { ctx.fillStyle = L.color; ctx.fill('evenodd'); }
    if (L.outline) { ctx.lineWidth = Math.max(2, m.w * .03); ctx.strokeStyle = L.filled ? '#0b0805' : L.color; ctx.lineJoin = 'round'; ctx.stroke(); }
  } else if (L.kind === 'img') {
    const im = imgReg[L.imgId]; if (im) ctx.drawImage(im, -m.w / 2, -m.h / 2, m.w, m.h);
  } else {
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = layerFont(L, m.px);
    if (L.bg) { const pad = m.px * .35; ctx.fillStyle = L.bgColor || 'rgba(12,10,7,.78)'; const x = -m.w / 2 - pad, y = -m.h / 2 - pad / 2, w = m.w + pad * 2, h = m.h + pad;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, m.px * .28) : ctx.rect(x, y, w, h); ctx.fill(); }
    m.lines.forEach((ln, i) => {
      const y = (i - (m.lines.length - 1) / 2) * m.px * 1.2, lw = lineWidth(ctx, ln, m.kern);
      const x0 = L.align === 'left' ? -m.w / 2 : L.align === 'right' ? m.w / 2 - lw : -lw / 2;
      if (L.neon) { ctx.fillStyle = L.color; for (const b of [.55, .28, .12]) { ctx.shadowColor = L.color; ctx.shadowBlur = m.px * b; drawLine(ctx, ln, x0, y, m.kern, false); } ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.fillStyle = '#ffffff'; drawLine(ctx, ln, x0, y, m.kern, false); return; }
      if (L.shadow) { ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = m.px * .22; ctx.shadowOffsetY = m.px * .06; }
      if (L.stroke) { ctx.lineWidth = m.px * .14; ctx.strokeStyle = L.strokeColor || '#0b0805'; ctx.lineJoin = 'round'; drawLine(ctx, ln, x0, y, m.kern, true); }
      if (L.grad) { const g = ctx.createLinearGradient(0, -m.h / 2, 0, m.h / 2); g.addColorStop(0, L.color); g.addColorStop(1, L.color2 || '#a67c32'); ctx.fillStyle = g; } else ctx.fillStyle = L.color;
      drawLine(ctx, ln, x0, y, m.kern, false); ctx.shadowColor = 'transparent';
    });
  }
  ctx.restore();
}
/* рамки */
function drawFrame(ctx, W, H, f, preview) {
  if (!f || f.id === 'none') return;
  const m = Math.min(W, H), t = Math.max(2, f.size / 100 * m * 1.4);
  ctx.save();
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const border = (th, c) => { rect(0, 0, W, th, c); rect(0, H - th, W, th, c); rect(0, th, th, H - 2 * th, c); rect(W - th, th, th, H - 2 * th, c); };
  switch (f.id) {
    case 'solid': border(t, f.color); break;
    case 'double': border(t, f.color); ctx.strokeStyle = f.color; ctx.lineWidth = Math.max(1, t * .18); ctx.strokeRect(t * 1.6, t * 1.6, W - t * 3.2, H - t * 3.2); break;
    case 'polaroid': rect(0, 0, W, t, '#faf6ec'); rect(0, 0, t, H, '#faf6ec'); rect(W - t, 0, t, H, '#faf6ec'); rect(0, H - t * 3.6, W, t * 3.6, '#faf6ec'); break;
    case 'film': { const b = t * 1.5; rect(0, 0, W, b, '#0b0b0b'); rect(0, H - b, W, b, '#0b0b0b'); const hs = b * .42, gap = hs * 2.1; ctx.fillStyle = '#d8d0bd';
      for (let x = gap / 2; x < W; x += gap) { ctx.fillRect(x, b * .28, hs, hs * .8); ctx.fillRect(x, H - b * .28 - hs * .8, hs, hs * .8); } break; }
    case 'gold': { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f7e2ad'); g.addColorStop(.5, '#a67c32'); g.addColorStop(1, '#f7e2ad'); border(t, g);
      ctx.strokeStyle = '#1a1208'; ctx.lineWidth = Math.max(1, t * .12); ctx.strokeRect(t, t, W - 2 * t, H - 2 * t); break; }
    case 'glow': { const c = f.color, e = t * 3; const gs = [[0, 0, 0, e], [0, 0, e, 0]]; ctx.globalAlpha = .85;
      let g = ctx.createLinearGradient(0, 0, 0, e); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, e);
      g = ctx.createLinearGradient(0, H, 0, H - e); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, H - e, W, e);
      g = ctx.createLinearGradient(0, 0, e, 0); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, e, H);
      g = ctx.createLinearGradient(W, 0, W - e, 0); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(W - e, 0, e, H); break; }
    case 'round': case 'circle': {
      const cut = () => { ctx.beginPath(); ctx.rect(0, 0, W, H);
        if (f.id === 'circle') { ctx.moveTo(W / 2 + Math.min(W, H) / 2, H / 2); ctx.ellipse(W / 2, H / 2, Math.min(W, H) / 2, Math.min(W, H) / 2, 0, 0, 7, true); }
        else { const r = Math.min(W, H) * (.04 + f.size / 100 * .5); ctx.moveTo(r, 0); ctx.arcTo(W, 0, W, H, r); ctx.arcTo(W, H, 0, H, r); ctx.arcTo(0, H, 0, 0, r); ctx.arcTo(0, 0, W, 0, r); ctx.closePath(); } };
      cut();
      if (preview) { ctx.fillStyle = '#0b0906'; ctx.fill('evenodd'); } else { ctx.globalCompositeOperation = 'destination-out'; ctx.fill('evenodd'); }
      break; }
  }
  ctx.restore();
}
function drawOverlay() {
  ov.clearRect(0, 0, ovc.width, ovc.height);
  if (S.compare || cropMode()) return;
  const W = ovc.width, H = ovc.height;
  S.fx.forEach(L => drawFx(ov, L, W, H));
  drawStrokes(ov, W, H);
  S.layers.forEach(L => drawLayer(ov, L, W, H));
  drawFrame(ov, W, H, S.frame, true);
  const L = S.layers[S.sel];
  if (L && ['text', 'shape', 'stick'].includes(S.tab)) {
    const m = metrics(ov, L, W, H), pad = m.pad;
    ov.save(); ov.translate(L.x * W, L.y * H); ov.rotate(L.rot); ov.strokeStyle = '#f5dea5'; ov.lineWidth = Math.max(2, W / 400); ov.setLineDash([W / 90, W / 130]);
    ov.strokeRect(-m.w / 2 - pad, -m.h / 2 - pad, m.w + pad * 2, m.h + pad * 2); ov.restore();
  }
}
function hitLayer(nx, ny) {
  const W = ovc.width, H = ovc.height, x = nx * W, y = ny * H;
  for (let i = S.layers.length - 1; i >= 0; i--) {
    const L = S.layers[i], m = metrics(ov, L, W, H), dx = x - L.x * W, dy = y - L.y * H, c = Math.cos(-L.rot), s = Math.sin(-L.rot);
    const lx = dx * c - dy * s, ly = dx * s + dy * c, pad = m.pad * 1.1;
    if (Math.abs(lx) <= m.w / 2 + pad && Math.abs(ly) <= m.h / 2 + pad) return i;
  } return -1;
}

/* ------------------------------------------------------------------ */
/*  ЖЕСТЫ НА ХОЛСТЕ                                                    */
/* ------------------------------------------------------------------ */
const ptrs = new Map(); let gest = null, curStroke = null;
const layerTab = () => ['text', 'shape', 'stick'].includes(S.tab);
function norm(e) { const r = ovc.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
ovc.addEventListener('pointerdown', e => {
  if (!S.src || cropMode()) return; ovc.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const [nx, ny] = norm(e);
  if (S.tab === 'draw') { curStroke = { color: S.brush.color, size: S.brush.size, type: S.brush.type, pts: [[nx, ny]] }; S.strokes.push(curStroke); render(); return; }
  if (!layerTab()) return;
  if (ptrs.size === 1) {
    const i = hitLayer(nx, ny);
    if (i >= 0) { S.sel = i; const L = S.layers[i]; gest = { type: 'move', ox: nx - L.x, oy: ny - L.y }; } else { S.sel = -1; gest = null; }
    syncLayerUI(); render();
  } else if (ptrs.size === 2 && S.layers[S.sel]) {
    const [a, b] = [...ptrs.values()], L = S.layers[S.sel];
    gest = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x), s0: L.size, r0: L.rot };
  }
});
ovc.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); const [nx, ny] = norm(e);
  if (curStroke) { const l = curStroke.pts[curStroke.pts.length - 1]; if (Math.hypot(l[0] - nx, l[1] - ny) > .002) { curStroke.pts.push([nx, ny]); render(); } return; }
  const L = S.layers[S.sel]; if (!L || !gest) return;
  if (gest.type === 'move' && ptrs.size === 1) { L.x = nx - gest.ox; L.y = ny - gest.oy; render(); }
  else if (gest.type === 'pinch' && ptrs.size === 2) {
    const [a, b] = [...ptrs.values()]; L.size = Math.max(2, Math.min(100, gest.s0 * Math.hypot(a.x - b.x, a.y - b.y) / gest.d0));
    L.rot = gest.r0 + (Math.atan2(b.y - a.y, b.x - a.x) - gest.a0); syncLayerUI(); render();
  }
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  if (curStroke) { curStroke = null; pushHist(); return; }
  if (gest && (ptrs.size === 0 || gest.type === 'pinch')) { gest = null; pushHist(); }
}
ovc.addEventListener('pointerup', endPtr); ovc.addEventListener('pointercancel', endPtr);
ovc.addEventListener('wheel', e => { const L = S.layers[S.sel]; if (!L) return; e.preventDefault(); L.size = Math.max(2, Math.min(100, L.size * (e.deltaY < 0 ? 1.06 : .94))); syncLayerUI(); render(); }, { passive: false });

/* ------------------------------------------------------------------ */
/*  ИСТОРИЯ                                                            */
/* ------------------------------------------------------------------ */
function snap() { return JSON.stringify({ geo: S.geo, p: S.p, hsl: S.hsl, filter: S.filter, layers: S.layers, strokes: S.strokes, fx: S.fx, frame: S.frame }); }
function pushHist(first) {
  const s = snap(); if (S.hist.length && S.hist[S.hist.length - 1] === s) return;
  S.hist.push(s); if (S.hist.length > 80) S.hist.shift(); if (!first) S.redo = []; updUndo();
}
function restore(s) { const o = JSON.parse(s); Object.assign(S, { geo: o.geo, p: o.p, hsl: o.hsl, filter: o.filter, layers: o.layers, strokes: o.strokes, fx: o.fx, frame: o.frame, sel: -1 }); syncUI(); layout(); render(); }
function updUndo() { $('bUndo').disabled = S.hist.length < 2; $('bRedo').disabled = !S.redo.length; }
$('bUndo').onclick = () => { if (S.hist.length < 2) return; S.redo.push(S.hist.pop()); restore(S.hist[S.hist.length - 1]); updUndo(); hap(); };
$('bRedo').onclick = () => { if (!S.redo.length) return; const s = S.redo.pop(); S.hist.push(s); restore(s); updUndo(); hap(); };
function fill(el) { const mn = +el.min, mx = +el.max, p = (el.value - mn) / (mx - mn) * 100; el.style.setProperty('--p', p + '%'); }
function mkPill(txt, on, fn, cls = '') { const b = document.createElement('button'); b.className = 'pill ' + cls + (on ? ' on' : ''); b.innerHTML = txt; b.onclick = fn; return b; }

/* ------------------------------------------------------------------ */
/*  ФИЛЬТРЫ (панель)                                                   */
/* ------------------------------------------------------------------ */
function buildThumbs() {
  const row = $('fltRow'); row.innerHTML = ''; const k = 150 / Math.max(S.sw, S.sh);
  const tw = Math.max(2, Math.round(S.sw * k)), th = Math.max(2, Math.round(S.sh * k)), zero = zeroParams(), z8 = Array.from({ length: 8 }, () => [0, 0, 0]);
  for (const f of FILTERS) {
    drawGL({ rot: 0, fx: 1, fy: 1, ang: 0 }, { x: 0, y: 0, w: 1, h: 1 }, effective(zero, z8, { id: f.id, int: 100 }), tw, th);
    const c = document.createElement('canvas'); c.width = c.height = 150; const x = c.getContext('2d'); const s = Math.max(150 / tw, 150 / th);
    x.drawImage(glc, (150 - tw * s) / 2, (150 - th * s) / 2, tw * s, th * s);
    const d = document.createElement('div'); d.className = 'flt'; d.dataset.id = f.id; d.dataset.cat = f.cat; d.appendChild(c); d.appendChild(document.createTextNode(f.n));
    d.onclick = () => { S.filter = { id: f.id, int: f.id === 'orig' ? 100 : (S.filter.id === f.id ? S.filter.int : 100) }; syncFilters(); render(); pushHist(); hap(); };
    row.appendChild(d);
  }
  const cr = $('fcat'); cr.innerHTML = '';
  FCATS.forEach(([id, n]) => cr.appendChild(mkPill(n, id === S.fcat, () => { S.fcat = id; syncFilters(); const first = document.querySelector(`.flt[data-cat="${id}"]`); if (first) first.scrollIntoView({ inline: 'start', behavior: 'smooth', block: 'nearest' }); hap(); }, 'grp')));
}
function syncFilters() {
  document.querySelectorAll('.flt').forEach(d => d.classList.toggle('on', d.dataset.id === S.filter.id));
  document.querySelectorAll('#fcat .pill').forEach((b, i) => b.classList.toggle('on', FCATS[i][0] === S.fcat));
  $('fInt').value = S.filter.int; $('fiV').textContent = S.filter.int; fill($('fInt')); $('fInt').disabled = S.filter.id === 'orig';
}
$('fInt').oninput = e => { S.filter.int = +e.target.value; $('fiV').textContent = e.target.value; fill(e.target); render(); };
$('fInt').onchange = () => pushHist();

/* ------------------------------------------------------------------ */
/*  ПРАВКА (панель)                                                    */
/* ------------------------------------------------------------------ */
function buildAdjust() {
  const g = $('agrp'); g.innerHTML = '';
  GROUPS.forEach(([id, n]) => g.appendChild(mkPill(n, id === S.adjG, () => { S.adjG = id; S.adj = PARAMS.find(p => p[4] === id)[0]; syncAdjust(); hap(); }, 'grp')));
}
function syncAdjust() {
  document.querySelectorAll('#agrp .pill').forEach((b, i) => b.classList.toggle('on', GROUPS[i][0] === S.adjG));
  const row = $('adjRow'); row.innerHTML = '';
  PARAMS.filter(p => p[4] === S.adjG).forEach(([k, n]) => { const b = mkPill(`${n}<i></i>`, k === S.adj, () => { S.adj = k; syncAdjust(); hap(); });
    b.classList.toggle('chg', S.p[k] !== PDEF[k]); row.appendChild(b); });
  const def = PARAMS.find(p => p[0] === S.adj), sl = $('aSl');
  sl.min = def[2]; sl.max = def[3]; sl.value = S.p[S.adj]; $('aName').textContent = def[1]; $('aVal').textContent = S.p[S.adj]; fill(sl);
  const on = row.querySelector('.pill.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}
$('aSl').oninput = e => { S.p[S.adj] = +e.target.value; $('aVal').textContent = e.target.value; fill(e.target); render();
  const idx = PARAMS.filter(p => p[4] === S.adjG).findIndex(p => p[0] === S.adj); const pill = $('adjRow').children[idx]; if (pill) pill.classList.toggle('chg', S.p[S.adj] !== PDEF[S.adj]); };
$('aSl').onchange = () => pushHist();
$('aReset').onclick = () => { S.p[S.adj] = PDEF[S.adj]; syncAdjust(); render(); pushHist(); hap(); };
$('aSl').ondblclick = $('aReset').onclick;

/* ------------------------------------------------------------------ */
/*  ЦВЕТА HSL                                                          */
/* ------------------------------------------------------------------ */
function buildHSL() {
  const c = $('hslC'); c.innerHTML = '';
  HSLC.forEach(([n, col], i) => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = col; b.title = n; b.onclick = () => { S.hslI = i; syncHSL(); hap(); }; c.appendChild(b); });
}
function syncHSL() {
  document.querySelectorAll('#hslC .sw').forEach((b, i) => { b.classList.toggle('on', i === S.hslI); b.style.opacity = S.hsl[i].some(v => v) ? 1 : .75; });
  const v = S.hsl[S.hslI]; [['hH', 'hhV', 0], ['hS', 'hsV', 1], ['hL', 'hlV', 2]].forEach(([id, lab, k]) => { $(id).value = v[k]; $(lab).textContent = v[k]; fill($(id)); });
}
[['hH', 'hhV', 0], ['hS', 'hsV', 1], ['hL', 'hlV', 2]].forEach(([id, lab, k]) => {
  $(id).oninput = e => { S.hsl[S.hslI][k] = +e.target.value; $(lab).textContent = e.target.value; fill(e.target); render(); }; $(id).onchange = () => { syncHSL(); pushHist(); }; });
$('hReset').onclick = () => { S.hsl[S.hslI] = [0, 0, 0]; syncHSL(); render(); pushHist(); hap(); };

/* ------------------------------------------------------------------ */
/*  КАДР                                                               */
/* ------------------------------------------------------------------ */
const ASPECTS = [['free', 'Свободно'], ['orig', 'Оригинал'], ['1:1', '1:1'], ['4:5', '4:5'], ['3:4', '3:4'], ['2:3', '2:3'], ['9:16', '9:16'], ['16:9', '16:9'], ['3:2', '3:2'], ['21:9', '21:9']];
function buildAspects() { const row = $('aspRow'); row.innerHTML = '';
  for (const [k, n] of ASPECTS) { const b = mkPill(n, false, () => { S.geo.aspect = k; applyAspect(); syncCrop(); render(); layout(); pushHist(); hap(); }); b.dataset.k = k; row.appendChild(b); } }
function aspectRatio() { const a = S.geo.aspect; if (a === 'free') return null; const [fw, fh] = frameSize(S.geo.rot); if (a === 'orig') return fw / fh; const [x, y] = a.split(':').map(Number); return x / y; }
function applyAspect() { const r = aspectRatio(); const [fw, fh] = frameSize(S.geo.rot); if (!r) return;
  let cw = fw, ch = fw / r; if (ch > fh) { ch = fh; cw = fh * r; } S.geo.crop = { x: (1 - cw / fw) / 2, y: (1 - ch / fh) / 2, w: cw / fw, h: ch / fh }; }
function syncCrop() {
  document.querySelectorAll('#aspRow .pill').forEach(b => b.classList.toggle('on', b.dataset.k === S.geo.aspect));
  $('stSl').value = S.geo.ang; $('stV').textContent = S.geo.ang + '°'; fill($('stSl')); $('flipH').classList.toggle('on', S.geo.fx < 0); $('flipV').classList.toggle('on', S.geo.fy < 0);
}
function resetCrop() { S.geo.crop = { x: 0, y: 0, w: 1, h: 1 }; applyAspect(); }
$('rotL').onclick = () => { S.geo.rot = (S.geo.rot + 3) % 4; resetCrop(); syncCrop(); layout(); render(); pushHist(); hap(); };
$('rotR').onclick = () => { S.geo.rot = (S.geo.rot + 1) % 4; resetCrop(); syncCrop(); layout(); render(); pushHist(); hap(); };
$('flipH').onclick = () => { S.geo.fx *= -1; syncCrop(); render(); pushHist(); hap(); };
$('flipV').onclick = () => { S.geo.fy *= -1; syncCrop(); render(); pushHist(); hap(); };
$('cropReset').onclick = () => { S.geo.aspect = 'free'; S.geo.crop = { x: 0, y: 0, w: 1, h: 1 }; syncCrop(); layout(); render(); pushHist(); };
$('stSl').oninput = e => { S.geo.ang = +e.target.value; $('stV').textContent = e.target.value + '°'; fill(e.target); render(); };
$('stSl').onchange = () => pushHist();
$('stReset').onclick = () => { S.geo.ang = 0; syncCrop(); render(); pushHist(); };
const cropEl = $('crop');
function placeCrop() { cropEl.style.display = cropMode() ? 'block' : 'none'; if (!cropMode()) return; const c = S.geo.crop;
  cropEl.style.left = c.x * 100 + '%'; cropEl.style.top = c.y * 100 + '%'; cropEl.style.width = c.w * 100 + '%'; cropEl.style.height = c.h * 100 + '%'; }
let cd = null;
cropEl.addEventListener('pointerdown', e => { e.preventDefault(); cropEl.setPointerCapture(e.pointerId); const r = $('cv').getBoundingClientRect(); cd = { kind: e.target.dataset.c || 'move', sx: e.clientX, sy: e.clientY, c: { ...S.geo.crop }, W: r.width, H: r.height }; });
cropEl.addEventListener('pointermove', e => {
  if (!cd) return; const [fw, fh] = frameSize(S.geo.rot); const dx = (e.clientX - cd.sx) / cd.W, dy = (e.clientY - cd.sy) / cd.H, c0 = cd.c; let n;
  if (cd.kind === 'move') n = { ...c0, x: Math.min(1 - c0.w, Math.max(0, c0.x + dx)), y: Math.min(1 - c0.h, Math.max(0, c0.y + dy)) };
  else {
    const right = cd.kind.includes('r'), bottom = cd.kind.includes('b'), fx = right ? c0.x : c0.x + c0.w, fy = bottom ? c0.y : c0.y + c0.h;
    const nx = Math.min(1, Math.max(0, (right ? c0.x + c0.w : c0.x) + dx)), ny = Math.min(1, Math.max(0, (bottom ? c0.y + c0.h : c0.y) + dy));
    let w = Math.max(.06, Math.abs(nx - fx)), h = Math.max(.06, Math.abs(ny - fy)); const r = aspectRatio();
    if (r) { let wp = w * fw, hp = h * fh; if (wp / hp > r) wp = hp * r; else hp = wp / r; w = wp / fw; h = hp / fh; }
    let x = right ? fx : fx - w, y = bottom ? fy : fy - h; if (x < 0) x = 0; if (y < 0) y = 0; if (x + w > 1) w = 1 - x; if (y + h > 1) h = 1 - y;
    if (r) { let wp = w * fw, hp = h * fh; if (wp / hp > r) wp = hp * r; else hp = wp / r; w = wp / fw; h = hp / fh; if (!right) x = fx - w; if (!bottom) y = fy - h; }
    n = { x, y, w, h };
  }
  S.geo.crop = n; placeCrop();
});
const endCrop = () => { if (cd) { cd = null; pushHist(); } };
cropEl.addEventListener('pointerup', endCrop); cropEl.addEventListener('pointercancel', endCrop);

/* ------------------------------------------------------------------ */
/*  ЭФФЕКТЫ-НАЛОЖЕНИЯ (панель)                                         */
/* ------------------------------------------------------------------ */
function buildFx() {
  const row = $('fxRow'); row.innerHTML = '';
  for (const f of FX) {
    const c = document.createElement('canvas'); c.width = c.height = 120; const x = c.getContext('2d');
    x.fillStyle = lg(x, 0, 0, 120, 120, [[0, '#3a4a5a'], [.5, '#6a5a50'], [1, '#2a2a30']]); x.fillRect(0, 0, 120, 120);
    x.globalCompositeOperation = f.blend; f.draw(x, 120, 120, mulberry(3));
    const d = document.createElement('div'); d.className = 'fxt'; d.dataset.id = f.id; d.appendChild(c); d.appendChild(document.createTextNode(f.n));
    d.onclick = () => { const i = S.fx.findIndex(l => l.id === f.id);
      if (i >= 0) S.fxSel = i; else { S.fx.push({ id: f.id, alpha: .75, seed: 1 + (Math.random() * 1e6 | 0) }); S.fxSel = S.fx.length - 1; }
      syncFx(); render(); pushHist(); hap(); }; row.appendChild(d);
  }
}
function syncFx() {
  document.querySelectorAll('.fxt').forEach(d => d.classList.toggle('on', S.fx.some(l => l.id === d.dataset.id)));
  const L = S.fx[S.fxSel], sl = $('fxOp'); sl.disabled = !L; $('fxDel').style.visibility = L ? 'visible' : 'hidden';
  if (L) { sl.value = Math.round(L.alpha * 100); $('fxV').textContent = sl.value; $('fxName').textContent = 'Прозрачность: ' + FX.find(f => f.id === L.id).n; } else { $('fxName').textContent = 'Выбери эффект выше'; $('fxV').textContent = '—'; }
  fill(sl);
}
$('fxOp').oninput = e => { const L = S.fx[S.fxSel]; if (!L) return; L.alpha = e.target.value / 100; $('fxV').textContent = e.target.value; fill(e.target); render(); };
$('fxOp').onchange = () => pushHist();
$('fxDel').onclick = () => { if (S.fxSel < 0) return; S.fx.splice(S.fxSel, 1); S.fxSel = S.fx.length - 1; syncFx(); render(); pushHist(); hap('light'); };

/* ------------------------------------------------------------------ */
/*  СЛОИ: общие кнопки                                                 */
/* ------------------------------------------------------------------ */
function makeBars() {
  document.querySelectorAll('[data-bar]').forEach(bar => {
    bar.innerHTML = `<div class="sl"><div class="lab"><span>Прозрачность слоя</span><b class="bv">100</b></div><input type="range" class="bo" min="5" max="100" value="100"></div>
      <button class="tb bd" title="Дублировать">⧉</button><button class="tb bf" title="Выше">▲</button><button class="tb bb" title="Ниже">▼</button><button class="tb danger bx" title="Удалить">🗑</button>`;
    const sl = bar.querySelector('.bo');
    sl.oninput = e => { const L = S.layers[S.sel]; if (!L) return; L.alpha = e.target.value / 100; syncLayerUI(); render(); }; sl.onchange = () => pushHist();
    bar.querySelector('.bd').onclick = () => { const L = S.layers[S.sel]; if (!L) return; const c = JSON.parse(JSON.stringify(L)); c.id = nextId++; c.x = Math.min(.92, c.x + .05); c.y = Math.min(.92, c.y + .05); S.layers.push(c); S.sel = S.layers.length - 1; syncLayerUI(); render(); pushHist(); hap(); };
    bar.querySelector('.bf').onclick = () => { const i = S.sel; if (i < 0 || i >= S.layers.length - 1) return; [S.layers[i], S.layers[i + 1]] = [S.layers[i + 1], S.layers[i]]; S.sel = i + 1; render(); pushHist(); hap(); };
    bar.querySelector('.bb').onclick = () => { const i = S.sel; if (i <= 0) return; [S.layers[i], S.layers[i - 1]] = [S.layers[i - 1], S.layers[i]]; S.sel = i - 1; render(); pushHist(); hap(); };
    bar.querySelector('.bx').onclick = () => { if (S.sel < 0) return; S.layers.splice(S.sel, 1); S.sel = -1; syncLayerUI(); render(); pushHist(); hap('light'); };
  });
}
function syncLayerUI() {
  const L = S.layers[S.sel];
  document.querySelectorAll('[data-bar]').forEach(bar => { const sl = bar.querySelector('.bo'); sl.disabled = !L; const a = L ? Math.round((L.alpha == null ? 1 : L.alpha) * 100) : 100; sl.value = a; bar.querySelector('.bv').textContent = L ? a : '—'; fill(sl);
    bar.querySelectorAll('.tb').forEach(b => b.style.opacity = L ? 1 : .4); });
  syncTextUI(); syncShapeUI();
}
function addLayer(o) { const L = Object.assign({ id: nextId++, kind: 'text', text: 'Текст', x: .5, y: .5, size: 10, rot: 0, alpha: 1, font: S.text.font, color: S.text.color, bold: false, italic: false, stroke: false, bg: false, shadow: false, align: 'center', kern: 0 }, o);
  S.layers.push(L); S.sel = S.layers.length - 1; syncLayerUI(); render(); pushHist(); return L; }

/* ТЕКСТ */
const FONTS = [['Georgia', 'Georgia'], ['Impact', 'Impact'], ['Arial', 'Arial'], ['"Trebuchet MS"', 'Trebuchet'], ['"Courier New"', 'Courier'], ['"Palatino Linotype"', 'Palatino'], ['"Brush Script MT"', 'Рукопись'], ['Verdana', 'Verdana'], ['"Times New Roman"', 'Times'], ['"Comic Sans MS"', 'Comic']];
const COLORS = ['#ffffff', '#f5dea5', '#d4af64', '#f0e6d0', '#0b0805', '#d4543f', '#ff8a3d', '#ffd23f', '#3ddc84', '#1a8c6a', '#7df9ff', '#3d9bff', '#b36bff', '#ff5fa2'];
const TPRE = [['Заголовок', { font: 'Georgia', bold: true, size: 14, color: '#f5dea5', shadow: true }], ['Подпись', { font: 'Georgia', italic: true, size: 6, color: '#ffffff', shadow: true }],
  ['Мем', { font: 'Impact', size: 14, color: '#ffffff', stroke: true }], ['Неон', { font: 'Arial', bold: true, size: 12, color: '#7df9ff', neon: true }],
  ['Золото', { font: 'Georgia', bold: true, size: 13, grad: true, color: '#f7e2ad', color2: '#a67c32', shadow: true }], ['Ретро', { font: '"Courier New"', bold: true, size: 9, color: '#ffd23f', bg: true }],
  ['Плашка', { font: 'Arial', bold: true, size: 8, color: '#0b0805', bg: true, bgColor: 'rgba(245,222,165,.95)' }], ['Крупно', { font: 'Impact', size: 24, color: '#ffffff', shadow: true, kern: 8 }]];
function buildSwatches(el, get, set) { el.innerHTML = ''; for (const c of COLORS) { const b = document.createElement('button'); b.className = 'sw'; b.style.background = c; b.dataset.c = c; b.onclick = () => { set(c); markSw(el, get()); hap(); }; el.appendChild(b); } markSw(el, get()); }
function markSw(el, cur) { el.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', b.dataset.c === cur)); }
function selText() { const L = S.layers[S.sel]; return L && L.kind === 'text' ? L : null; }
function buildText() {
  const fr = $('fontRow'); fr.innerHTML = '';
  for (const [f, n] of FONTS) { const b = mkPill(n, false, () => { S.text.font = f; const L = selText(); if (L) { L.font = f; render(); pushHist(); } syncTextUI(); hap(); }); b.style.fontFamily = f; b.dataset.f = f; fr.appendChild(b); }
  const pr = $('tPre'); pr.innerHTML = '';
  TPRE.forEach(([n, st]) => pr.appendChild(mkPill(n, false, () => openTextModal('', v => addLayer({ text: v, ...st })), 'grp')));
}
function syncTextUI() {
  const L = selText(), on = !!L;
  document.querySelectorAll('#fontRow .pill').forEach(b => b.classList.toggle('on', b.dataset.f === (on ? L.font : S.text.font)));
  markSw($('colRow'), on ? L.color : S.text.color);
  [['tBold', 'bold'], ['tItal', 'italic'], ['tStroke', 'stroke'], ['tBg', 'bg'], ['tShadow', 'shadow'], ['tNeon', 'neon'], ['tGrad', 'grad']].forEach(([id, k]) => $(id).classList.toggle('on', on && !!L[k]));
  $('tAlign').textContent = on ? ({ left: '⇤', center: '≡', right: '⇥' })[L.align] : '≡';
  ['tEdit', 'tBold', 'tItal', 'tAlign', 'tStroke', 'tBg', 'tShadow', 'tNeon', 'tGrad'].forEach(i => $(i).style.opacity = on ? 1 : .4);
  if (on) { $('tSize').value = Math.round(L.size); $('tsV').textContent = Math.round(L.size); fill($('tSize')); $('tKern').value = L.kern || 0; $('tkV').textContent = L.kern || 0; fill($('tKern')); }
}
function openTextModal(initial, cb) { $('txIn').value = initial; $('mText').classList.add('on'); setTimeout(() => $('txIn').focus(), 80);
  $('txOk').onclick = () => { const v = $('txIn').value.trim(); $('mText').classList.remove('on'); if (v) cb(v); }; $('txCancel').onclick = () => $('mText').classList.remove('on'); }
$('tAdd').onclick = () => openTextModal('', v => addLayer({ text: v }));
$('tEdit').onclick = () => { const L = selText(); if (L) openTextModal(L.text, v => { L.text = v; render(); pushHist(); }); };
[['tBold', 'bold'], ['tItal', 'italic'], ['tStroke', 'stroke'], ['tBg', 'bg'], ['tShadow', 'shadow'], ['tNeon', 'neon'], ['tGrad', 'grad']].forEach(([id, k]) => $(id).onclick = () => {
  const L = selText(); if (!L) return; L[k] = !L[k]; syncTextUI(); render(); pushHist(); hap(); });
$('tAlign').onclick = () => { const L = selText(); if (!L) return; L.align = ({ center: 'left', left: 'right', right: 'center' })[L.align]; syncTextUI(); render(); pushHist(); hap(); };
$('tSize').oninput = e => { const L = S.layers[S.sel]; $('tsV').textContent = e.target.value; fill(e.target); if (L && L.kind === 'text') { L.size = +e.target.value; render(); } };
$('tSize').onchange = () => pushHist();
$('tKern').oninput = e => { const L = selText(); $('tkV').textContent = e.target.value; fill(e.target); if (L) { L.kern = +e.target.value; render(); } };
$('tKern').onchange = () => pushHist();

/* ФИГУРЫ */
function buildShapes() {
  const row = $('shpRow'); row.innerHTML = '';
  for (const [name, label, asp] of SHAPES) { const b = document.createElement('button'); b.className = 'shp'; b.title = label; const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d');
    x.translate(24, 24); x.fillStyle = '#f5dea5'; shapePath(x, name, 36, Math.max(36 * Math.min(asp, 1), 4)); x.fill('evenodd'); b.appendChild(c);
    b.onclick = () => { S.shape.name = name; addLayer({ kind: 'shape', shape: name, size: name === 'line' ? 50 : 30, aspect: asp, color: S.shape.color, filled: S.shape.fill, outline: !S.shape.fill }); hap('light'); }; row.appendChild(b); }
}
function selShape() { const L = S.layers[S.sel]; return L && L.kind === 'shape' ? L : null; }
function syncShapeUI() {
  const L = selShape(); markSw($('shpCol'), L ? L.color : S.shape.color);
  $('shFill').classList.toggle('on', L ? L.filled : S.shape.fill); $('shStroke').classList.toggle('on', L ? L.outline : !S.shape.fill);
  if (L) { $('shSize').value = Math.round(L.size); $('shV').textContent = Math.round(L.size); fill($('shSize')); }
}
$('shFill').onclick = () => { const L = selShape(); S.shape.fill = true; if (L) { L.filled = !L.filled || !L.outline ? true : false; if (!L.filled && !L.outline) L.outline = true; render(); pushHist(); } syncShapeUI(); };
$('shStroke').onclick = () => { const L = selShape(); S.shape.fill = false; if (L) { L.outline = !L.outline; if (!L.outline && !L.filled) L.filled = true; render(); pushHist(); } syncShapeUI(); };
$('shSize').oninput = e => { const L = selShape(); $('shV').textContent = e.target.value; fill(e.target); if (L) { L.size = +e.target.value; render(); } };
$('shSize').onchange = () => pushHist();

/* СТИКЕРЫ */
const EMCATS = [['Лица', '😀😁😂🤣😊😍😘😎🤩🥳😇🤔😴🥺😭😡🤯🥵🥶😱🙄😏😜🤪🤗🫡😈👻💀🤖👽🤡'], ['Жесты', '👍👎👏🙌🙏💪✌️🤞👌🤟👋🫶👀🧠💋👑💍🕶️🎩'], ['Символы', '❤️🧡💛💚💙💜🖤🤍💔💯🔥✨⭐🌟💫⚡💥💢💤💬💭➡️⬆️✅❌⚠️🔔📌📍🎵'],
  ['Природа', '🌈☀️🌙☁️❄️🌸🌹🌻🍀🌴🌊🌋🏔️🦋🐶🐱🦊🐼🦄🐸🐝🦉🐢🐬'], ['Еда', '🍕🍔🍟🍩🍪🎂🍷☕🍓🍉🍒🍑🥑🌮🍣🍦'], ['Объекты', '⚽🏀🎮🎧🎬🎁🎉🎈💎🏆🚀✈️🚗📷💡🔮🪄🧿']];
const EMRE = /\p{Extended_Pictographic}(?:️)?(?:‍\p{Extended_Pictographic}️?)*/gu;
function buildEmoji() {
  const cr = $('emcat'); cr.innerHTML = '';
  EMCATS.forEach(([n], i) => cr.appendChild(mkPill(n, i === S.emcat, () => { S.emcat = i; buildEmoji(); hap(); }, 'grp')));
  const g = $('emg'); g.innerHTML = '';
  for (const e of EMCATS[S.emcat][1].match(EMRE)) { const b = document.createElement('button'); b.className = 'em'; b.textContent = e;
    b.onclick = () => { addLayer({ kind: 'emoji', text: e, size: 24, font: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif', color: '#fff' }); hap('light'); }; g.appendChild(b); }
}
$('addPhoto').onclick = () => $('file2').click();
$('file2').onchange = e => { const f = e.target.files[0]; if (!f) return; const url = URL.createObjectURL(f), im = new Image();
  im.onload = () => { const id = 'i' + nextId++; imgReg[id] = im; addLayer({ kind: 'img', imgId: id, size: 45, aspect: im.naturalHeight / im.naturalWidth }); URL.revokeObjectURL(url); }; im.src = url; e.target.value = ''; };

/* РИСОВАНИЕ */
function syncDraw() { [['dBrush', 'brush'], ['dNeon', 'neon'], ['dMark', 'marker'], ['dEr', 'erase']].forEach(([id, t]) => $(id).classList.toggle('on', S.brush.type === t)); markSw($('dCol'), S.brush.color); }
[['dBrush', 'brush'], ['dNeon', 'neon'], ['dMark', 'marker'], ['dEr', 'erase']].forEach(([id, t]) => $(id).onclick = () => { S.brush.type = t; syncDraw(); hap(); });
$('dClear').onclick = () => { if (!S.strokes.length) return; S.strokes = []; render(); pushHist(); hap('light'); };
$('dSize').oninput = e => { S.brush.size = +e.target.value; $('dwV').textContent = e.target.value; fill(e.target); };

/* РАМКИ */
const FRAMES = [['none', 'Нет'], ['solid', 'Сплошная'], ['double', 'Двойная'], ['polaroid', 'Полароид'], ['film', 'Плёнка'], ['gold', 'Золото'], ['glow', 'Сияние'], ['round', 'Скруглить'], ['circle', 'Круг']];
function buildFrames() {
  const row = $('frRow'); row.innerHTML = ''; FRAMES.forEach(([id, n]) => { const b = mkPill(n, id === S.frame.id, () => { S.frame.id = id; syncFrame(); render(); pushHist(); hap(); }); b.dataset.k = id; row.appendChild(b); });
  buildSwatches($('frCol'), () => S.frame.color, c => { S.frame.color = c; render(); pushHist(); });
}
function syncFrame() { document.querySelectorAll('#frRow .pill').forEach(b => b.classList.toggle('on', b.dataset.k === S.frame.id)); markSw($('frCol'), S.frame.color);
  $('frSize').value = S.frame.size; $('frV').textContent = S.frame.size; fill($('frSize')); }
$('frSize').oninput = e => { S.frame.size = +e.target.value; $('frV').textContent = e.target.value; fill(e.target); render(); };
$('frSize').onchange = () => pushHist();

/* ------------------------------------------------------------------ */
/*  АНАЛИЗ ФОТО, АВТО-УЛУЧШЕНИЕ, ПОМОЩНИК                              */
/* ------------------------------------------------------------------ */
function analyze() {
  const c = document.createElement('canvas'), n = 72, k = n / Math.max(S.sw, S.sh); c.width = Math.max(2, Math.round(S.sw * k)); c.height = Math.max(2, Math.round(S.sh * k));
  const x = c.getContext('2d'); x.drawImage(S.src, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height).data;
  const ls = [], N = d.length / 4; let sr = 0, sb = 0, sat = 0, dark = 0, bright = 0;
  for (let i = 0; i < d.length; i += 4) { const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, l = .299 * r + .587 * g + .114 * b; ls.push(l); sr += r; sb += b; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); sat += mx ? (mx - mn) / mx : 0; if (l < .08) dark++; if (l > .94) bright++; }
  ls.sort((a, b) => a - b); const q = p => ls[Math.min(ls.length - 1, Math.floor(p * ls.length))];
  S.stats = { mean: ls.reduce((a, b) => a + b, 0) / N, p5: q(.05), p50: q(.5), p95: q(.95), sat: sat / N, warm: (sr - sb) / N, dark: dark / N, bright: bright / N };
  const s = S.stats, sg = [];
  const add = (title, desc, fn) => sg.push({ title, desc, fn });
  if (s.mean < .3) add('Фото тёмное', 'Осветлим и вытянем тени.', () => { Object.assign(S.p, { exposure: clamp((.46 - s.mean) * 140, 0, 60), shadows: 30, blacks: -10 }); });
  if (s.mean > .68) add('Фото пересвечено', 'Приглушим света и яркость.', () => { Object.assign(S.p, { exposure: -clamp((s.mean - .5) * 120, 0, 45), highlights: -35, whites: -15 }); });
  if (s.p95 - s.p5 < .6) add('Мало контраста', 'Добавим глубину и чёткость.', () => { Object.assign(S.p, { contrast: clamp((.8 - (s.p95 - s.p5)) * 90, 10, 40), clarity: 18 }); });
  if (s.sat < .24) add('Блеклые цвета', 'Сделаем цвета живее.', () => { Object.assign(S.p, { saturation: 14, vibrance: 28 }); });
  if (Math.abs(s.warm) > .07) add(s.warm < 0 ? 'Фото холодное (синее)' : 'Фото слишком тёплое', 'Выровняем баланс белого.', () => { S.p.temperature = clamp(-s.warm * 260, -40, 40); });
  if (s.bright > .06) add('Есть пересветы', 'Вернём детали в светлых местах.', () => { S.p.highlights = Math.min(S.p.highlights, -30); });
  if (s.dark > .12) add('Много чёрных провалов', 'Подтянем тени.', () => { S.p.shadows = Math.max(S.p.shadows, 28); });
  add('Добавить «кино»', 'Фильтр «Кино» на 70% — тёплые света, прохладные тени.', () => { S.filter = { id: 'cinema', int: 70 }; });
  S.sugg = sg;
  const dot = $('owlDot'); dot.style.display = sg.length > 1 ? 'block' : 'none';
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function applySugg(i) { const s = S.sugg[i]; if (!s) return; s.fn(); syncUI(); render(); pushHist(); toast('Применено: ' + s.title); hap('light'); }
function autoApply(kind) {
  const s = S.stats; if (!s) return;
  if (kind === 'light' || kind === 'all') Object.assign(S.p, { exposure: clamp(Math.log2(.46 / Math.max(.05, s.mean)) / 1.4 * 60, -45, 55), shadows: s.mean < .4 ? 26 : 8, highlights: s.p95 > .97 ? -28 : 0, contrast: s.p95 - s.p5 < .7 ? 18 : 6 });
  if (kind === 'color' || kind === 'all') Object.assign(S.p, { temperature: clamp(-s.warm * 240, -35, 35), saturation: s.sat < .3 ? 14 : 4, vibrance: 22 });
  if (kind === 'all') Object.assign(S.p, { clarity: 14, sharpen: 12, denoise: 8 });
  syncUI(); render(); pushHist(); toast('Готово — можно докрутить вручную'); hap('light');
}
$('aAuto').onclick = () => autoApply('all'); $('aLight').onclick = () => autoApply('light'); $('aColor').onclick = () => autoApply('color');
$('aAll').onclick = () => { S.p = zeroParams(); S.hsl = Array.from({ length: 8 }, () => [0, 0, 0]); S.filter = { id: 'orig', int: 100 }; S.fx = []; S.frame = { id: 'none', size: 4, color: '#ffffff' }; S.geo.ang = 0; syncUI(); render(); pushHist(); hap('light'); };
function renderSugg(el, withDone) {
  el.innerHTML = '';
  if (!S.sugg.length) { el.innerHTML = '<div class="note">Загрузи фото — я его осмотрю.</div>'; return; }
  S.sugg.forEach((s, i) => { const d = document.createElement('div'); d.className = 'sug'; d.innerHTML = `<div><b>${s.title}</b>${s.desc}</div>`; const b = document.createElement('button'); b.textContent = 'Применить';
    b.onclick = () => { applySugg(i); if (withDone) $('mOwl').classList.remove('on'); }; d.appendChild(b); el.appendChild(d); });
}
const TIPS = { filters: 'Листай фильтры вбок, а ползунок снизу меняет силу эффекта.', adjust: 'Выбери настройку и двигай ползунок. Точка рядом с названием — значит, ты её менял(а).',
  hsl: 'Меняй один цвет отдельно: например, сделай небо синее, не трогая кожу.', crop: 'Тяни углы рамки. Пропорции сверху — для Instagram, историй и экрана.',
  fx: 'Эффекты света и осадков ложатся поверх фото. Ползунок регулирует прозрачность.', text: 'Тап по тексту выбирает его. Двумя пальцами — размер и поворот.',
  shape: 'Фигуры — для рамок, стрелок и выделения. Цвет и заливку можно менять.', stick: 'Стикеры двигай пальцем. Можно добавить даже своё фото.',
  draw: 'Рисуй пальцем. «Неон» светится, «Маркер» полупрозрачный, «Ластик» стирает.', frame: 'Рамки рисуются поверх. «Скруглить» и «Круг» дадут прозрачные углы в PNG.',
  auto: 'Одно нажатие — и я подберу свет и цвет сама. Потом можно докрутить.' };
function setTip(t) { $('tipText').textContent = t; }
$('tipX').onclick = () => { $('tipbar').classList.add('off'); lsSet('studio_notips', '1'); };
$('bOwl').onclick = () => { $('owlSay').textContent = S.src ? (S.sugg[0] ? `Я осмотрела фото. ${S.sugg[0].title}: ${S.sugg[0].desc} Вот что можно сделать:` : 'С фото всё хорошо! Можно сразу играть с фильтрами.') : 'Загрузи фото — и я подскажу, что в нём улучшить.'; renderSugg($('owlSug'), true); $('mOwl').classList.add('on'); };
$('owlClose').onclick = () => $('mOwl').classList.remove('on');
$('owlTour').onclick = () => { $('mOwl').classList.remove('on'); startTour(); };

/* ТУР */
const TOUR = [['Добро пожаловать!', 'Я Сова-мастер. Покажу, как тут всё устроено — это быстро.'], ['Инструменты внизу', 'Листай нижнюю панель вбок: фильтры, правка, цвета, кадр, эффекты, текст, фигуры, стикеры, рисунок, рамки.'],
  ['Слои двигай пальцами', 'Текст, стикеры и фигуры можно тянуть пальцем, а двумя пальцами — менять размер и поворот.'], ['Сравнивай и отменяй', 'Зажми «Оригинал» — увидишь фото до правок. Стрелки сверху отменяют и повторяют шаги.'], ['Готово — сохраняй', 'Нажми «Готово» справа вверху, выбери формат и сохрани результат.']];
let tourI = 0;
function startTour() { tourI = 0; showTour(); $('tour').classList.add('on'); }
function showTour() { $('tourH').textContent = TOUR[tourI][0]; $('tourP').textContent = TOUR[tourI][1]; $('tourDots').innerHTML = TOUR.map((_, i) => `<i class="${i === tourI ? 'on' : ''}"></i>`).join(''); $('tourNext').textContent = tourI === TOUR.length - 1 ? 'Поехали!' : 'Дальше'; }
$('tourNext').onclick = () => { if (tourI < TOUR.length - 1) { tourI++; showTour(); } else { $('tour').classList.remove('on'); lsSet('studio_tour', '1'); } };

/* ------------------------------------------------------------------ */
/*  ВКЛАДКИ                                                            */
/* ------------------------------------------------------------------ */
function setTab(t) {
  S.tab = t; if (!['text', 'shape', 'stick'].includes(t)) S.sel = -1; else if (S.layers[S.sel] && ((t === 'text' && S.layers[S.sel].kind !== 'text') || (t === 'shape' && S.layers[S.sel].kind !== 'shape'))) S.sel = -1;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
  if (t === 'auto') renderSugg($('sugList'), false);
  if (!lsGet('studio_notips')) { $('tipbar').classList.remove('off'); setTip(TIPS[t]); }
  if (S.src) { syncUI(); layout(); render(); }
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => { setTab(b.dataset.t); hap(); b.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' }); });
function syncUI() { syncFilters(); syncAdjust(); syncHSL(); syncCrop(); syncFx(); syncLayerUI(); syncDraw(); syncFrame(); updUndo(); }

/* сравнение */
function holdCmp(on) { if (S.compare === on) return; S.compare = on; $('hint').classList.toggle('on', on); layout(); render(); }
const cmp = $('bCmp');
cmp.addEventListener('pointerdown', e => { e.preventDefault(); holdCmp(true); hap(); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => cmp.addEventListener(ev, () => holdCmp(false)));

/* ------------------------------------------------------------------ */
/*  ЭКСПОРТ                                                            */
/* ------------------------------------------------------------------ */
let expFmt = 'jpg', expSize = 4096, expUrl = null, expBlob = null;
function renderExport(maxSide) {
  const [fw, fh] = frameSize(S.geo.rot), c = S.geo.crop; let w = fw * c.w, h = fh * c.h;
  const k = Math.min(1, maxSide / Math.max(w, h)); w = Math.max(2, Math.round(w * k)); h = Math.max(2, Math.round(h * k));
  drawGL(S.geo, c, effective(S.p, S.hsl, S.filter), w, h);
  const out = document.createElement('canvas'); out.width = w; out.height = h; const x = out.getContext('2d');
  if (expFmt === 'jpg') { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); }
  x.drawImage(glc, 0, 0); S.fx.forEach(L => drawFx(x, L, w, h)); drawStrokes(x, w, h); S.layers.forEach(L => drawLayer(x, L, w, h));
  drawFrame(x, w, h, S.frame, expFmt === 'jpg'); render(); return out;
}
async function makeExport() {
  $('expNote').textContent = 'Готовлю…'; const cv = renderExport(expSize);
  const type = ({ png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg' })[expFmt];
  expBlob = await new Promise(r => cv.toBlob(r, type, .94)); if (expUrl) URL.revokeObjectURL(expUrl); expUrl = URL.createObjectURL(expBlob);
  $('expImg').src = expUrl; $('expNote').textContent = `${cv.width}×${cv.height} · ${(expBlob.size / 1048576).toFixed(1)} МБ. Нажми и удерживай картинку, чтобы сохранить в галерею.`;
}
$('bExport').onclick = async () => { $('mExp').classList.add('on'); await makeExport(); hap('light'); };
$('segFmt').onclick = e => { const b = e.target.closest('button'); if (!b) return; expFmt = b.dataset.f; [...$('segFmt').children].forEach(x => x.classList.toggle('on', x === b)); makeExport(); };
$('segSz').onclick = e => { const b = e.target.closest('button'); if (!b) return; expSize = +b.dataset.s; [...$('segSz').children].forEach(x => x.classList.toggle('on', x === b)); makeExport(); };
$('expClose').onclick = () => $('mExp').classList.remove('on');
$('expSave').onclick = () => { if (!expBlob) return; const a = document.createElement('a'); a.href = expUrl; a.download = 'studio.' + expFmt; document.body.appendChild(a); a.click(); a.remove(); toast('Файл сохранён'); };
$('expShare').onclick = async () => { if (!expBlob) return; const f = new File([expBlob], 'studio.' + expFmt, { type: expBlob.type });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Студия' }); else toast('Удерживай картинку, чтобы сохранить'); } catch (e) {} };

/* ------------------------------------------------------------------ */
/*  ПРОЧЕЕ                                                             */
/* ------------------------------------------------------------------ */
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); }
$('bOpen').onclick = () => $('file').click();
$('file').onchange = e => { const f = e.target.files[0]; if (f) loadImage(URL.createObjectURL(f)); e.target.value = ''; };
$('bSample').onclick = () => loadImage(makeSample(), true);
$('bClose').onclick = () => { if (tg) { try { tg.close(); return; } catch (e) {} } if (S.src && !confirm('Закрыть студию? Правки не сохранятся.')) return; location.reload(); };
window.addEventListener('resize', () => { layout(); render(); });
['dragover', 'drop'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' && e.dataTransfer.files[0]) loadImage(URL.createObjectURL(e.dataTransfer.files[0])); }));

try { initGL(); } catch (err) { document.querySelector('.room h1').textContent = 'Графика недоступна: ' + err.message; }
buildAdjust(); buildHSL(); buildAspects(); buildFx(); buildText(); buildShapes(); buildEmoji(); buildFrames(); makeBars();
buildSwatches($('colRow'), () => selText() ? selText().color : S.text.color, c => { S.text.color = c; const L = selText(); if (L) { L.color = c; render(); pushHist(); } });
buildSwatches($('shpCol'), () => selShape() ? selShape().color : S.shape.color, c => { S.shape.color = c; const L = selShape(); if (L) { L.color = c; render(); pushHist(); } });
buildSwatches($('dCol'), () => S.brush.color, c => { S.brush.color = c; if (S.brush.type === 'erase') S.brush.type = 'brush'; syncDraw(); });
document.querySelectorAll('input[type=range]').forEach(fill);
if (lsGet('studio_notips')) $('tipbar').classList.add('off');
setTab('filters');
window.__S = S;

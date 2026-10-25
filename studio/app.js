"use strict";
/* ============ Студия v3: полноценный фоторедактор (WebGL) ============ */
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));
const tg = (window.Telegram && Telegram.WebApp) || null;
const hap = (t = 'selection') => { try { t === 'selection' ? tg.HapticFeedback.selectionChanged() : tg.HapticFeedback.impactOccurred(t); } catch (e) {} };
if (tg) { try { tg.ready(); tg.expand(); tg.setHeaderColor('#0b0805'); tg.setBackgroundColor('#0b0805'); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {} }
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const TABN = { filters: 'Фильтр', adjust: 'Правка', curves: 'Кривые', hsl: 'Цвета', local: 'Кисть', crop: 'Кадр', fx: 'Эффект', text: 'Текст', shape: 'Фигура', stick: 'Стикер', draw: 'Рисунок', frame: 'Рамка', auto: 'Авто', smart: 'Умное', erase: 'Удаление' };
const HIST_MAX = 70;

/* ------------------------------------------------------------------ */
/*  СОСТОЯНИЕ                                                          */
/* ------------------------------------------------------------------ */
const NOCURVE = () => ({ m: [[0, 0], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] });
const NOLOCAL = () => ({ exp: 0, con: 0, sat: 0, warm: 0, smooth: 0, sharp: 0, clar: 0, red: 0 });
const NOFRAME = () => ({ id: 'none', size: 4, color: '#ffffff' });
const S = {
  src: null, sw: 0, sh: 0,
  geo: { rot: 0, fx: 1, fy: 1, ang: 0, crop: { x: 0, y: 0, w: 1, h: 1 }, aspect: 'free' },
  p: zeroParams(), hsl: Array.from({ length: 8 }, () => [0, 0, 0]), filter: { id: 'orig', int: 100 },
  curves: NOCURVE(), local: NOLOCAL(),
  layers: [], strokes: [], fx: [], frame: NOFRAME(), sel: -1, fxSel: -1,
  tab: 'filters', adjG: 'light', adj: 'exposure', fcat: 'top', hslI: 0, emcat: 0, curveCh: 'm', curveSel: -1, lpar: 'exp',
  brush: { color: '#f5dea5', size: 8, type: 'brush' }, text: { font: 'Georgia', color: '#f5dea5' }, shape: { name: 'rect', color: '#d4af64', fill: true },
  lTool: 'paint', lSize: 40, maskView: true, maskHas: false, mv: 0,
  hist: [], redo: [], compare: false, split: null, stats: null, sugg: [], mine: [], mineOn: null, lookPrev: null, pick: false,
  view: { s: 1, x: 0, y: 0 }, sv: 0,
};
let nextId = 1;
const imgReg = {};
const srcStore = {};
function cloneCanvas(c) { const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; k.getContext('2d').drawImage(c, 0, 0); return k; }
function ensureBase() { if (!srcStore[S.sv]) srcStore[S.sv] = cloneCanvas(S.src); }
function commitSrc() { S.sv++; srcStore[S.sv] = cloneCanvas(S.src); const ks = Object.keys(srcStore).map(Number).sort((a, b) => a - b); while (ks.length > 4) delete srcStore[ks.shift()]; }
const maskStore = {};
let mkA, mkH, mkAc, mkHc, mkW = 0, mkH_ = 0;

/* ------------------------------------------------------------------ */
/*  WEBGL                                                              */
/* ------------------------------------------------------------------ */
const glc = $('gl'), ovc = $('ov'), ov = ovc.getContext('2d');
const gl = glc.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false }) || glc.getContext('experimental-webgl');
const NP = PKEYS.length, NV = Math.ceil(NP / 4);
const DEFS = PKEYS.map((k, i) => `#define u_${k} uP[${i >> 2}].${'xyzw'[i & 3]}`).join('\n');
const VS = `attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}`;
const FS = `precision highp float;varying vec2 v;
uniform sampler2D T,uCurve,uMaskA,uMaskH;
uniform vec2 uSrc,uFrame,uOut,uFlip;uniform vec4 uCrop;uniform float uRot,uAng,uCover;
uniform vec4 uP[${NV}];
${DEFS}
uniform float u_mono,u_sepia,uHSLon,uCurveOn,uMaskOn,uMaskView;
uniform vec3 uLift,uGain,uDuoA,uDuoB;uniform vec3 uHSL[8];uniform vec4 uL1,uL2;
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
float lum3(vec3 c){return dot(c,vec3(.299,.587,.114));}
float bandC(int i){if(i==0)return 0.;if(i==1)return .083;if(i==2)return .167;if(i==3)return .33;if(i==4)return .5;if(i==5)return .62;if(i==6)return .77;return .9;}
vec2 warp(vec2 uv){
  vec2 asp=vec2(uOut.x/uOut.y,1.);vec2 p=uv-.5;
  if(abs(u_kv)>.001)p.x/=1.+p.y*u_kv*.8;
  if(abs(u_kh)>.001)p.y/=1.+p.x*u_kh*.8;
  if(abs(u_distort)>.001){vec2 q=p*asp;p*=1.+u_distort*.9*dot(q,q);}
  vec2 lc=vec2(u_lensX,u_lensY)-.5;
  if(abs(u_lensA)>.001||abs(u_swirl)>.001){
    vec2 d=(p-lc)*asp;float R=u_lensR*.8+.01;float r=length(d)/R;
    if(r<1.){float k=1.-r*r;
      if(abs(u_lensA)>.001)p=lc+(p-lc)*(1.-u_lensA*.7*k);
      if(abs(u_swirl)>.001){float a=u_swirl*3.*k*k;vec2 dd=p-lc;float cs=cos(a),sn=sin(a);p=lc+vec2(cs*dd.x-sn*dd.y,sn*dd.x+cs*dd.y);}}}
  if(u_wave>.001){p.x+=sin(p.y*28.+1.)*u_wave*.02;p.y+=sin(p.x*28.)*u_wave*.02;}
  if(u_mirrorH>.49)p.x=-abs(p.x);
  if(u_mirrorV>.49)p.y=-abs(p.y);
  if(u_kaleido>.01){float n=floor(mix(2.,12.,u_kaleido)+.5);float a=atan(p.y,p.x);float r=length(p);float seg=6.28318/n;a=mod(a+6.28318,seg);a=abs(a-seg*.5);p=vec2(cos(a),sin(a))*r;}
  return p+.5;}
void main(){
  vec2 uv=warp(v);
  if(u_pixelate>.001){float n=mix(260.,14.,u_pixelate);vec2 g=vec2(n*uOut.x/uOut.y,n);uv=(floor(uv*g)+.5)/g;}
  if(u_glitch>.001){float row=floor(uv.y*38.);float h=hash(vec2(row,7.));if(h>1.-u_glitch*.45)uv.x+=(hash(vec2(row,3.))-.5)*.14*u_glitch;}
  float fm=0.;
  if(u_focus>.001){float d=length((uv-vec2(u_focusX,u_focusY))*vec2(uOut.x/uOut.y,1.));float R=u_focusR*.8;fm=smoothstep(R,R+u_focusF*.8+.001,d)*u_focus;}
  vec4 mk=vec4(0.);
  if(uMaskOn>.5){vec2 su=clamp(suv(uv),0.,1.);mk.r=texture2D(uMaskA,su).a;mk.g=texture2D(uMaskH,su).a;}
  float br=u_blur+fm;vec3 c;
  if(u_motion>.001){float a=u_motionAng*6.28318;vec2 dir=vec2(cos(a),sin(a));float L=u_motion*uOut.y*.09;c=vec3(0.);for(int i=0;i<16;i++){float t=(float(i)/15.-.5)*L;c+=base(uv+dir*t/uOut);}c/=16.;}
  else if(u_zoomblur>.001){c=vec3(0.);for(int i=0;i<16;i++){float t=float(i)/15.*u_zoomblur*.25;c+=base(uv+(.5-uv)*t);}c/=16.;}
  else if(br>.001){float r=br*uOut.y*.02;c=vec3(0.);for(int i=0;i<24;i++){float fi=float(i);float a=fi*2.39996;float rr=sqrt((fi+.5)/24.)*r;c+=base(uv+vec2(cos(a),sin(a))*rr/uOut);}c/=24.;}
  else c=base(uv);
  if(mk.g>.02){vec3 ring=vec3(0.);for(int i=0;i<12;i++){float a=float(i)*.5236;ring+=base(uv+vec2(cos(a),sin(a))*uOut.y*.03/uOut);}ring/=12.;c=mix(c,ring,smoothstep(.02,.5,mk.g));}
  if(u_skin>.001){vec3 sb=vec3(0.);for(int i=0;i<12;i++){float a=float(i)*.5236;sb+=base(uv+vec2(cos(a),sin(a))*uOut.y*.0045/uOut);}sb/=12.;
    float m=skinMask(c);c=mix(c,mix(sb,c,.3),m*u_skin);}
  if(u_denoise>.001){vec3 s=c;float ws=1.;for(int i=0;i<8;i++){float a=float(i)*.7854;vec3 t=base(uv+vec2(cos(a),sin(a))*1.8/uOut);float w=exp(-dot(t-c,t-c)*18.);s+=t*w;ws+=w;}c=mix(c,s/ws,min(1.,u_denoise*1.2));}
  if(u_sharpen>.001){vec3 b=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.7854;b+=base(uv+vec2(cos(a),sin(a))*1.6/uOut);}b/=8.;c+=(c-b)*u_sharpen*2.2;}
  if(abs(u_texture)>.001){vec3 b=vec3(0.);for(int i=0;i<4;i++){float a=float(i)*1.5708+.785;b+=base(uv+vec2(cos(a),sin(a))*1.1/uOut);}b/=4.;c+=(c-b)*u_texture*2.4;}
  if(abs(u_clarity)>.001||u_glow>.001||abs(u_dehaze)>.001){
    vec3 bl=vec3(0.);for(int i=0;i<12;i++){float fi=float(i);float a=fi*2.39996;float rr=sqrt((fi+.5)/12.)*uOut.y*.035;bl+=base(uv+vec2(cos(a),sin(a))*rr/uOut);}bl/=12.;
    c+=(c-bl)*u_clarity*1.6;c+=max(bl-.45,0.)*u_glow*1.5;
    float mn=min(bl.r,min(bl.g,bl.b));float a2=u_dehaze*.8;c=(c-mn*a2)/(1.-a2*.55);}
  c*=pow(2.,u_exposure*1.4);c+=u_brightness*.22;
  float bp=-u_blacks*.12,wp=1.-u_whites*.15;c=(c-bp)/(wp-bp);
  c=(c-.5)*(1.+u_contrast*.85)+.5;
  float l=lum3(c);
  c+=vec3(u_shadows*.3*smoothstep(.55,.0,l)+u_highlights*.3*smoothstep(.45,1.,l));
  if(mk.r>.02){vec3 q=c;q*=pow(2.,uL1.x*1.4);q=(q-.5)*(1.+uL1.y*.85)+.5;float ql=lum3(q);q=mix(vec3(ql),q,1.+uL1.z);q.r+=uL1.w*.12;q.b-=uL1.w*.12;
    if(uL2.x>.001||uL2.y>.001||abs(uL2.z)>.001){vec3 lb=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.7854;lb+=base(uv+vec2(cos(a),sin(a))*uOut.y*.006/uOut);}lb/=8.;q=mix(q,lb,uL2.x);q+=(q-lb)*(uL2.y*2.+uL2.z*1.2);}
    float rd=max(0.,q.r-max(q.g,q.b));q.r-=rd*uL2.w*.85;c=mix(c,q,mk.r);}
  if(uCurveOn>.5){vec3 cc=clamp(c,0.,1.)*.992+.004;c=vec3(texture2D(uCurve,vec2(cc.r,.5)).r,texture2D(uCurve,vec2(cc.g,.5)).g,texture2D(uCurve,vec2(cc.b,.5)).b);}
  c.r+=u_temperature*.13;c.b-=u_temperature*.13;c.g-=u_tint*.08;c.r+=u_tint*.045;c.b+=u_tint*.045;
  l=lum3(c);
  float mx=max(c.r,max(c.g,c.b)),mn2=min(c.r,min(c.g,c.b));
  c=mix(vec3(l),c,1.+u_saturation+u_vibrance*(1.-(mx-mn2))*.9);
  if(abs(u_hue)>.001){float h=u_hue*3.14159;float cs=cos(h),sn=sin(h);
    mat3 m=mat3(.299+.701*cs+.168*sn,.299-.299*cs-.328*sn,.299-.3*cs+1.25*sn,.587-.587*cs+.33*sn,.587+.413*cs+.035*sn,.587-.588*cs-1.05*sn,.114-.114*cs-.497*sn,.114-.114*cs+.292*sn,.114+.886*cs-.203*sn);c=m*c;}
  if(uHSLon>.5){vec3 hv=rgb2hsv(clamp(c,0.,1.));float hs=0.,ss=0.,ls=0.;
    for(int i=0;i<8;i++){float d=abs(hv.x-bandC(i));d=min(d,1.-d);float w=1.-smoothstep(0.,.11,d);hs+=w*uHSL[i].x;ss+=w*uHSL[i].y;ls+=w*uHSL[i].z;}
    float sm=smoothstep(.04,.3,hv.y);hv.x=fract(hv.x+hs*.1*sm+1.);hv.y=clamp(hv.y*(1.+ss*sm),0.,1.);hv.z=clamp(hv.z*(1.+ls*.6*sm),0.,1.);c=hsv2rgb(hv);}
  if(u_gShadS>.001||u_gMidS>.001||u_gHighS>.001){
    float l2=lum3(c);float bal=u_gBal*.25;float sh=1.-smoothstep(.0,.55+bal,l2);float hi=smoothstep(.45+bal,1.,l2);float md=clamp(1.-sh-hi,0.,1.);
    c+=(hsv2rgb(vec3(u_gShadH,1.,1.))-.5)*u_gShadS*sh*.55+(hsv2rgb(vec3(u_gMidH,1.,1.))-.5)*u_gMidS*md*.45+(hsv2rgb(vec3(u_gHighH,1.,1.))-.5)*u_gHighS*hi*.55;}
  l=lum3(c);
  c=mix(c,vec3(l),u_mono);c=mix(c,vec3(l)*vec3(1.2,1.,.78),u_sepia);
  c=mix(c,mix(uDuoA,uDuoB,clamp(l,0.,1.)),u_duotone);
  c=c*uGain+uLift*(1.-c);
  c=mix(c,vec3(.5),u_fade*.22);c=c*(1.-u_fade*.16)+u_fade*.09;
  if(u_edge>.001||u_sketch>.001||u_emboss>.001){
    float a1=lum3(base(uv+vec2(-1.,-1.)/uOut)),a2=lum3(base(uv+vec2(0.,-1.)/uOut)),a3=lum3(base(uv+vec2(1.,-1.)/uOut));
    float b1=lum3(base(uv+vec2(-1.,0.)/uOut)),b3=lum3(base(uv+vec2(1.,0.)/uOut));
    float c1=lum3(base(uv+vec2(-1.,1.)/uOut)),c2=lum3(base(uv+vec2(0.,1.)/uOut)),c3=lum3(base(uv+vec2(1.,1.)/uOut));
    float gx=(a3+2.*b3+c3)-(a1+2.*b1+c1),gy=(c1+2.*c2+c3)-(a1+2.*a2+a3);float e=length(vec2(gx,gy));
    c=mix(c,vec3(1.-clamp(e*3.,0.,1.)),u_edge);
    float g=1.-clamp(e*4.2,0.,1.);c=mix(c,vec3(.97,.95,.9)*(g*.92+.08),u_sketch);
    c=mix(c,vec3(.5+(c3-a1)*2.4),u_emboss);}
  if(u_halftone>.001){float cell=uOut.y*.011+3.;vec2 g=uv*uOut/cell;vec2 f=fract(g)-.5;float d=length(f);float lm=lum3(c);float rad=(1.-lm)*.72;float m=smoothstep(rad,rad-.1,d);c=mix(c,mix(vec3(.97),c*.55,m),u_halftone);}
  if(u_posterize>.001){float Lq=mix(32.,3.,u_posterize);c=floor(c*Lq+.5)/Lq;}
  if(u_threshold>.001){c=mix(c,vec3(step(.5,lum3(c))),u_threshold);}
  if(u_solarize>.001){c=mix(c,mix(c,1.-c,step(.5,c)),u_solarize);}
  c=mix(c,1.-c,u_invert);
  if(u_blush>.001){float m=skinMask(c);c.r+=u_blush*.07*m;c.g-=u_blush*.02*m;c.b+=u_blush*.012*m;}
  c*=1.-u_scanlines*.35*(.5+.5*sin(v.y*uOut.y*3.14159));
  float d=distance(v,vec2(.5))*1.41;
  c*=1.-u_vignette*smoothstep(.3,1.,d)*.92;if(u_vignette<0.)c+=-u_vignette*smoothstep(.3,1.,d)*.5;
  float n=hash(v*uOut+fract(sin(uOut.x)*3.1))-.5;l=lum3(c);
  c+=n*u_grain*.34*(1.-abs(l-.5)*1.4);
  if(uMaskView>.5){c=mix(c,vec3(1.,.15,.15),mk.r*.55);c=mix(c,vec3(.15,1.,.3),mk.g*.55);}
  gl_FragColor=vec4(clamp(c,0.,1.),1.);}`;
function shader(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s;
}
let prog, U = {}, tex, texC, texMA, texMH;
function mkTex(unit) {
  const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t;
}
function initGL() {
  prog = gl.createProgram(); gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog); gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  ['T', 'uCurve', 'uMaskA', 'uMaskH', 'uSrc', 'uFrame', 'uOut', 'uFlip', 'uCrop', 'uRot', 'uAng', 'uCover', 'uP', 'u_mono', 'u_sepia', 'uHSLon', 'uCurveOn', 'uMaskOn', 'uMaskView',
    'uLift', 'uGain', 'uDuoA', 'uDuoB', 'uHSL', 'uL1', 'uL2'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
  tex = mkTex(0); texC = mkTex(1); texMA = mkTex(2); texMH = mkTex(3);
  const blank = new Uint8Array(4);
  [2, 3].forEach(u => { gl.activeTexture(gl.TEXTURE0 + u); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blank); });
  updateCurveTex();
}
function setTexture(img) {
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
}
function uploadMask() {
  if (!mkA) return; gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texMA); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mkAc);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, texMH); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mkHc);
}
/* кривые: монотонный кубический сплайн -> LUT */
function spline(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0]), n = p.length, xs = p.map(a => a[0]), ys = p.map(a => a[1]);
  if (n < 2) return x => x;
  const d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m.push(d[0]); for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2); m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  return x => { if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1]; let i = 0; while (x > xs[i + 1]) i++; const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return clamp((2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1], 0, 1); };
}
function curveIdentity() { return ['m', 'r', 'g', 'b'].every(k => { const c = S.curves[k]; return c.length === 2 && c[0][1] === 0 && c[1][1] === 1 && c[0][0] === 0 && c[1][0] === 1; }); }
function updateCurveTex() {
  const fm = spline(S.curves.m), fr = spline(S.curves.r), fg = spline(S.curves.g), fb = spline(S.curves.b), d = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) { const x = i / 255, y = fm(x); d[i * 4] = fr(y) * 255; d[i * 4 + 1] = fg(y) * 255; d[i * 4 + 2] = fb(y) * 255; d[i * 4 + 3] = 255; }
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texC); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
}
const CENTERK = new Set(['focusX', 'focusY', 'focusR', 'focusF', 'lensX', 'lensY', 'lensR']);
function effective(params, hsl, filter, full) {
  const f = FILTERS.find(x => x.id === filter.id) || FILTERS[0], k = filter.int / 100, e = { vec: new Float32Array(NV * 4) };
  PKEYS.forEach((key, i) => { e.vec[i] = (params[key] + (CENTERK.has(key) ? 0 : ((f.p && f.p[key]) || 0) * k)) / 100; });
  e.mono = (f.mono || 0) * k; e.sepia = (f.sepia || 0) * k;
  e.lift = (f.lift || [0, 0, 0]).map(x => x * k); e.gain = (f.gain || [1, 1, 1]).map(x => 1 + (x - 1) * k);
  const duo = f.duo || ['#1a1033', '#f2c36b']; e.duoA = hex2rgb(duo[0]); e.duoB = hex2rgb(duo[1]);
  e.hsl = new Float32Array(hsl.flat().map(x => x / 100)); e.hslOn = hsl.some(b => b[0] || b[1] || b[2]) ? 1 : 0;
  const L = S.local; e.curveOn = full && !curveIdentity() ? 1 : 0; e.maskOn = full && S.maskHas ? 1 : 0;
  e.l1 = full ? [L.exp / 100, L.con / 100, L.sat / 100, L.warm / 100] : [0, 0, 0, 0]; e.l2 = full ? [L.smooth / 100, L.sharp / 100, L.clar / 100, L.red / 100] : [0, 0, 0, 0];
  e.maskView = full && S.tab === 'local' && S.maskView ? 1 : 0;
  return e;
}
const ZERO_EFF = () => effective(zeroParams(), Array.from({ length: 8 }, () => [0, 0, 0]), { id: 'orig', int: 100 }, false);
function frameSize(rot) { return rot % 2 ? [S.sh, S.sw] : [S.sw, S.sh]; }
function coverScale(ang, fw, fh) { const a = Math.abs(ang * Math.PI / 180); if (!a) return 1; const asp = fw / fh; return Math.cos(a) + Math.sin(a) * Math.max(asp, 1 / asp); }
function drawGL(geo, crop, eff, W, H) {
  glc.width = W; glc.height = H; gl.viewport(0, 0, W, H);
  const [fw, fh] = frameSize(geo.rot);
  gl.useProgram(prog);
  gl.uniform1i(U.T, 0); gl.uniform1i(U.uCurve, 1); gl.uniform1i(U.uMaskA, 2); gl.uniform1i(U.uMaskH, 3);
  gl.uniform2f(U.uSrc, S.sw, S.sh); gl.uniform2f(U.uFrame, fw, fh); gl.uniform2f(U.uOut, W, H); gl.uniform2f(U.uFlip, geo.fx, geo.fy);
  gl.uniform4f(U.uCrop, crop.x, crop.y, crop.w, crop.h); gl.uniform1f(U.uRot, geo.rot); gl.uniform1f(U.uAng, geo.ang * Math.PI / 180);
  gl.uniform1f(U.uCover, coverScale(geo.ang, fw, fh));
  gl.uniform4fv(U.uP, eff.vec);
  gl.uniform1f(U.u_mono, eff.mono); gl.uniform1f(U.u_sepia, eff.sepia); gl.uniform1f(U.uHSLon, eff.hslOn);
  gl.uniform1f(U.uCurveOn, eff.curveOn || 0); gl.uniform1f(U.uMaskOn, eff.maskOn || 0); gl.uniform1f(U.uMaskView, eff.maskView || 0);
  gl.uniform3fv(U.uLift, eff.lift); gl.uniform3fv(U.uGain, eff.gain); gl.uniform3fv(U.uDuoA, eff.duoA); gl.uniform3fv(U.uDuoB, eff.duoB);
  gl.uniform3fv(U.uHSL, eff.hsl); gl.uniform4fv(U.uL1, eff.l1 || [0, 0, 0, 0]); gl.uniform4fv(U.uL2, eff.l2 || [0, 0, 0, 0]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

/* ------------------------------------------------------------------ */
/*  ГЕОМЕТРИЯ: вывод <-> исходник                                      */
/* ------------------------------------------------------------------ */
function outToSrc(u, v) {
  const g = S.geo, [fw, fh] = frameSize(g.rot), c = g.crop; let qx = (c.x + u * c.w - .5) * fw, qy = (c.y + v * c.h - .5) * fh;
  const cov = coverScale(g.ang, fw, fh); qx /= cov; qy /= cov; const a = g.ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  [qx, qy] = [ca * qx + sa * qy, -sa * qx + ca * qy]; qx *= g.fx; qy *= g.fy;
  if (g.rot === 1) [qx, qy] = [qy, -qx]; else if (g.rot === 2) [qx, qy] = [-qx, -qy]; else if (g.rot === 3) [qx, qy] = [-qy, qx];
  return [qx / S.sw + .5, qy / S.sh + .5];
}
function srcToOut(su, sv) {
  const g = S.geo, [fw, fh] = frameSize(g.rot), c = g.crop; let qx = (su - .5) * S.sw, qy = (sv - .5) * S.sh;
  if (g.rot === 1) [qx, qy] = [-qy, qx]; else if (g.rot === 2) [qx, qy] = [-qx, -qy]; else if (g.rot === 3) [qx, qy] = [qy, -qx];
  qx *= g.fx; qy *= g.fy; const a = g.ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a); [qx, qy] = [ca * qx - sa * qy, sa * qx + ca * qy];
  const cov = coverScale(g.ang, fw, fh); qx *= cov; qy *= cov; return [((qx / fw + .5) - c.x) / c.w, ((qy / fh + .5) - c.y) / c.h];
}

/* ------------------------------------------------------------------ */
/*  ЗАГРУЗКА ФОТО                                                      */
/* ------------------------------------------------------------------ */
const MAXTEX = 3600;
function resetAll() {
  S.geo = { rot: 0, fx: 1, fy: 1, ang: 0, crop: { x: 0, y: 0, w: 1, h: 1 }, aspect: 'free' };
  S.p = zeroParams(); S.hsl = Array.from({ length: 8 }, () => [0, 0, 0]); S.filter = { id: 'orig', int: 100 }; S.curves = NOCURVE(); S.local = NOLOCAL();
  S.layers = []; S.strokes = []; S.fx = []; S.frame = NOFRAME(); S.sel = -1; S.fxSel = -1; S.mineOn = null; S.lookPrev = null; S.view = { s: 1, x: 0, y: 0 }; S.split = null;
  initMasks(); updateCurveTex();
}
function loadImage(url, isSample) {
  $('load').classList.add('on');
  const im = new Image();
  im.onload = () => {
    let w = im.naturalWidth, h = im.naturalHeight; const k = Math.min(1, MAXTEX / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
    S.src = c; S.sw = w; S.sh = h; setTexture(c); S.hist = []; S.redo = []; S.sv = 0; for (const k in srcStore) delete srcStore[k]; resetAll();
    document.body.classList.remove('noimg'); $('empty').style.display = 'none'; $('cv').style.display = 'block'; $('bExport').disabled = false;
    ['bMagic', 'cmpBox'].forEach(id => $(id).style.display = 'flex'); $('histc').style.display = 'block';
    $('load').classList.remove('on');
    analyze(); buildThumbs(); pushHist('Открыто фото', true); setTab('filters'); applyView(); syncUI(); layout(); render();
    if (!isSample) URL.revokeObjectURL(url);
    try { tg && tg.enableClosingConfirmation(); } catch (e) {}
    if (!lsGet('studio_tour')) setTimeout(() => startTour(), 600);
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
  const mt = (col, base, amp, seed) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, 1066); for (let i = 0; i <= 1600; i += 20) x.lineTo(i, base - amp * (Math.sin(i * .004 + seed) * .6 + Math.sin(i * .011 + seed * 2) * .3 + Math.sin(i * .027 + seed) * .1)); x.lineTo(1600, 1066); x.fill(); };
  mt('#4a3b5c', 640, 120, 1); mt('#2f3f4a', 760, 110, 3); mt('#1b2e2a', 880, 90, 5); mt('#0f1f1a', 980, 60, 8);
  const r = mulberry(5);
  for (let i = 0; i < 70; i++) { const px = r() * 1600, py = 900 + r() * 150, s = 20 + r() * 50; x.fillStyle = 'rgba(8,24,18,.9)'; x.beginPath(); x.moveTo(px, py - s * 2.2); x.lineTo(px - s * .7, py); x.lineTo(px + s * .7, py); x.fill(); }
  for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(255,255,255,' + (r() * .7) + ')'; x.fillRect(r() * 1600, r() * 300, 2, 2); }
  // «лицо» для проверки кожи
  x.fillStyle = '#e0a98a'; x.beginPath(); x.ellipse(430, 700, 70, 90, 0, 0, 7); x.fill(); x.fillStyle = '#c98a6c'; x.beginPath(); x.ellipse(430, 740, 30, 14, 0, 0, 7); x.fill();
  return c.toDataURL('image/jpeg', .95);
}

/* ------------------------------------------------------------------ */
/*  РАСКЛАДКА, ВИД (зум/пан), ОТРИСОВКА                                */
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
  const cv = $('cv'); cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; placeCrop(); placeSplit();
}
function applyView() { const v = S.view; $('cv').style.transform = `translate(${v.x}px,${v.y}px) scale(${v.s})`; $('zoomR').style.display = v.s > 1.02 ? 'block' : 'none'; $('zoomR').textContent = '⤢ ' + Math.round(v.s * 100) + '%'; }
function setView(s, x, y) { S.view.s = clamp(s, 1, 8); if (S.view.s === 1) { x = 0; y = 0; } S.view.x = x; S.view.y = y; applyView(); }
$('zoomR').onclick = () => setView(1, 0, 0);
let histTimer = 0;
function render() {
  if (!S.src) return;
  const [W, H] = outDims(); outW = W; outH = H;
  const eff = S.compare ? ZERO_EFF() : effective(S.p, S.hsl, S.filter, true);
  drawGL(S.geo, currentCrop(), eff, W, H);
  if (ovc.width !== W || ovc.height !== H) { ovc.width = W; ovc.height = H; }
  drawOverlay();
  if (!histTimer) histTimer = setTimeout(() => { histTimer = 0; drawHist(); }, 140);
}
const histCtx = $('histc').getContext('2d'), hsmall = document.createElement('canvas');
function drawHist() {
  if (!S.src) return; const w = 64, h = Math.max(2, Math.round(64 * glc.height / glc.width)); hsmall.width = w; hsmall.height = h;
  const x = hsmall.getContext('2d'); x.drawImage(glc, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, bins = [new Array(32).fill(0), new Array(32).fill(0), new Array(32).fill(0)];
  for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) bins[c][d[i + c] >> 3]++;
  const mx = Math.max(...bins.flat()) || 1, W = 160, H = 64; histCtx.clearRect(0, 0, W, H);
  [['rgba(255,70,70,.55)', 0], ['rgba(70,230,110,.55)', 1], ['rgba(90,150,255,.55)', 2]].forEach(([col, c]) => { histCtx.fillStyle = col; histCtx.beginPath(); histCtx.moveTo(0, H);
    bins[c].forEach((v, i) => histCtx.lineTo(i * W / 31, H - Math.min(1, v / mx * 1.4) * (H - 4))); histCtx.lineTo(W, H); histCtx.fill(); });
  if (S.tab === 'curves') drawCurve();
}

/* ------------------------------------------------------------------ */
/*  СЛОИ: наложения, штрихи, текст, фигуры, рамки                      */
/* ------------------------------------------------------------------ */
const fxCache = {};
function drawFx(ctx, L, W, H) {
  const def = FX.find(f => f.id === L.id); if (!def) return;
  const key = `${L.id}|${L.seed}|${W}|${H}`; let cv = fxCache[key];
  if (!cv) { cv = document.createElement('canvas'); cv.width = W; cv.height = H; def.draw(cv.getContext('2d'), W, H, mulberry(L.seed)); fxCache[key] = cv; const keys = Object.keys(fxCache); if (keys.length > 24) delete fxCache[keys[0]]; }
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = def.blend; ctx.drawImage(cv, 0, 0); ctx.restore();
}
const strokeCv = document.createElement('canvas');
function drawStrokes(ctx, W, H) {
  if (!S.strokes.length) return;
  strokeCv.width = W; strokeCv.height = H; const s = strokeCv.getContext('2d'); s.clearRect(0, 0, W, H); s.lineCap = 'round'; s.lineJoin = 'round'; const unit = Math.min(W, H) / 700;
  for (const st of S.strokes) {
    const p = st.pts, pass = (width, color, alpha, comp, blur) => {
      s.globalCompositeOperation = comp; s.globalAlpha = alpha; s.strokeStyle = s.fillStyle = color; s.lineWidth = width; s.shadowBlur = blur || 0; s.shadowColor = color;
      if (p.length === 1) { s.beginPath(); s.arc(p[0][0] * W, p[0][1] * H, width / 2, 0, 7); s.fill(); }
      else { s.beginPath(); s.moveTo(p[0][0] * W, p[0][1] * H); for (let i = 1; i < p.length - 1; i++) s.quadraticCurveTo(p[i][0] * W, p[i][1] * H, (p[i][0] + p[i + 1][0]) / 2 * W, (p[i][1] + p[i + 1][1]) / 2 * H); s.lineTo(p[p.length - 1][0] * W, p[p.length - 1][1] * H); s.stroke(); }
      s.shadowBlur = 0; s.globalAlpha = 1; };
    const w = st.size * unit;
    if (st.type === 'erase') pass(w * 1.4, '#000', 1, 'destination-out'); else if (st.type === 'marker') pass(w * 1.8, st.color, .45, 'source-over');
    else if (st.type === 'neon') { pass(w * 2.6, st.color, .55, 'source-over', w * 3); pass(w * .9, '#ffffff', .95, 'source-over'); } else pass(w, st.color, 1, 'source-over');
  }
  ctx.drawImage(strokeCv, 0, 0);
}
function layerFont(L, px) { return `${L.italic ? 'italic ' : ''}${L.bold ? 'bold ' : ''}${px}px ${L.font}, sans-serif`; }
function lineWidth(ctx, ln, kern) { if (!kern) return ctx.measureText(ln).width; let w = 0; for (const ch of ln) w += ctx.measureText(ch).width + kern; return w - kern; }
function metrics(ctx, L, W, H) {
  const m = Math.min(W, H);
  if (L.kind === 'shape' || L.kind === 'img' || L.kind === 'redact') { const w = L.size / 100 * m; return { w, h: Math.max(w * L.aspect, 4), pad: W / 55 }; }
  const px = L.size * m / 100; ctx.font = layerFont(L, px); const kern = (L.kern || 0) * px / 100;
  const lines = L.text.split('\n'); let w = 0; for (const ln of lines) w = Math.max(w, lineWidth(ctx, ln, kern));
  return { px, lines, w, h: lines.length * px * 1.2, kern, pad: px * .4 };
}
function drawLine(ctx, ln, x, y, kern, stroke) {
  if (!kern) { stroke ? ctx.strokeText(ln, x, y) : ctx.fillText(ln, x, y); return; }
  for (const ch of ln) { stroke ? ctx.strokeText(ch, x, y) : ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + kern; }
}
let BASE = null; const redCv = document.createElement('canvas');
function drawLayer(ctx, L, W, H) {
  const m = metrics(ctx, L, W, H);
  ctx.save(); ctx.translate(L.x * W, L.y * H); ctx.rotate(L.rot); ctx.globalAlpha = L.alpha == null ? 1 : L.alpha; ctx.globalCompositeOperation = L.blend || 'source-over';
  if (L.kind === 'shape') {
    shapePath(ctx, L.shape, m.w, m.h);
    if (L.filled) { ctx.fillStyle = L.color; ctx.fill('evenodd'); }
    if (L.outline) { ctx.lineWidth = Math.max(2, m.w * .03); ctx.strokeStyle = L.filled ? '#0b0805' : L.color; ctx.lineJoin = 'round'; ctx.stroke(); }
  } else if (L.kind === 'img') { const im = imgReg[L.imgId]; if (im) ctx.drawImage(im, -m.w / 2, -m.h / 2, m.w, m.h); }
  else if (L.kind === 'redact') {
    ctx.beginPath(); ctx.rect(-m.w / 2, -m.h / 2, m.w, m.h); ctx.clip();
    if (L.mode === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(-m.w, -m.h, m.w * 2, m.h * 2); }
    else if (BASE) { ctx.setTransform(1, 0, 0, 1, 0, 0); const k = L.mode === 'pixel' ? Math.max(8, Math.min(W, H) / 28) : Math.max(16, Math.min(W, H) / 10); redCv.width = Math.max(1, Math.round(W / k)); redCv.height = Math.max(1, Math.round(H / k));
      const rc = redCv.getContext('2d'); rc.imageSmoothingEnabled = true; rc.drawImage(BASE, 0, 0, redCv.width, redCv.height); ctx.imageSmoothingEnabled = L.mode !== 'pixel'; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(redCv, 0, 0, W, H); ctx.imageSmoothingEnabled = true; }
  } else {
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = layerFont(L, m.px);
    if (L.bg) { const pad = m.px * .35; ctx.fillStyle = L.bgColor || 'rgba(12,10,7,.78)'; const x = -m.w / 2 - pad, y = -m.h / 2 - pad / 2, w = m.w + pad * 2, h = m.h + pad; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, m.px * .28) : ctx.rect(x, y, w, h); ctx.fill(); }
    m.lines.forEach((ln, i) => {
      const y = (i - (m.lines.length - 1) / 2) * m.px * 1.2, lw = lineWidth(ctx, ln, m.kern), x0 = L.align === 'left' ? -m.w / 2 : L.align === 'right' ? m.w / 2 - lw : -lw / 2;
      if (L.neon) { ctx.fillStyle = L.color; for (const b of [.55, .28, .12]) { ctx.shadowColor = L.color; ctx.shadowBlur = m.px * b; drawLine(ctx, ln, x0, y, m.kern, false); } ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.fillStyle = '#ffffff'; drawLine(ctx, ln, x0, y, m.kern, false); return; }
      if (L.shadow) { ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = m.px * .22; ctx.shadowOffsetY = m.px * .06; }
      if (L.stroke) { ctx.lineWidth = m.px * .14; ctx.strokeStyle = L.strokeColor || '#0b0805'; ctx.lineJoin = 'round'; drawLine(ctx, ln, x0, y, m.kern, true); }
      if (L.grad) { const g = ctx.createLinearGradient(0, -m.h / 2, 0, m.h / 2); g.addColorStop(0, L.color); g.addColorStop(1, L.color2 || '#a67c32'); ctx.fillStyle = g; } else ctx.fillStyle = L.color;
      drawLine(ctx, ln, x0, y, m.kern, false); ctx.shadowColor = 'transparent';
    });
  }
  ctx.restore();
}
function drawFrame(ctx, W, H, f, preview) {
  if (!f || f.id === 'none') return;
  const m = Math.min(W, H), t = Math.max(2, f.size / 100 * m * 1.4);
  ctx.save(); const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const border = (th, c) => { rect(0, 0, W, th, c); rect(0, H - th, W, th, c); rect(0, th, th, H - 2 * th, c); rect(W - th, th, th, H - 2 * th, c); };
  const edgeGrad = (e, c, a) => { ctx.globalAlpha = a; [[0, 0, 0, e, 0, 0, W, e], [0, H, 0, H - e, 0, H - e, W, e], [0, 0, e, 0, 0, 0, e, H], [W, 0, W - e, 0, W - e, 0, e, H]].forEach(([x0, y0, x1, y1, rx, ry, rw, rh]) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh); }); ctx.globalAlpha = 1; };
  switch (f.id) {
    case 'solid': border(t, f.color); break;
    case 'double': border(t, f.color); ctx.strokeStyle = f.color; ctx.lineWidth = Math.max(1, t * .18); ctx.strokeRect(t * 1.6, t * 1.6, W - t * 3.2, H - t * 3.2); break;
    case 'polaroid': rect(0, 0, W, t, '#faf6ec'); rect(0, 0, t, H, '#faf6ec'); rect(W - t, 0, t, H, '#faf6ec'); rect(0, H - t * 3.6, W, t * 3.6, '#faf6ec'); break;
    case 'instax': rect(0, 0, W, t * 1.2, '#fbf8f0'); rect(0, 0, t * 1.2, H, '#fbf8f0'); rect(W - t * 1.2, 0, t * 1.2, H, '#fbf8f0'); rect(0, H - t * 2.6, W, t * 2.6, '#fbf8f0'); break;
    case 'film': { const b = t * 1.5; rect(0, 0, W, b, '#0b0b0b'); rect(0, H - b, W, b, '#0b0b0b'); const hs = b * .42, gap = hs * 2.1; ctx.fillStyle = '#d8d0bd'; for (let x = gap / 2; x < W; x += gap) { ctx.fillRect(x, b * .28, hs, hs * .8); ctx.fillRect(x, H - b * .28 - hs * .8, hs, hs * .8); } break; }
    case 'gold': { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f7e2ad'); g.addColorStop(.5, '#a67c32'); g.addColorStop(1, '#f7e2ad'); border(t, g); ctx.strokeStyle = '#1a1208'; ctx.lineWidth = Math.max(1, t * .12); ctx.strokeRect(t, t, W - 2 * t, H - 2 * t); break; }
    case 'glow': edgeGrad(t * 3, f.color, .85); break;
    case 'shadow': edgeGrad(t * 3.5, '#000000', .8); break;
    case 'vhs': { const b = t * 1.2; rect(0, 0, W, b, '#000'); rect(0, H - b, W, b, '#000'); ctx.fillStyle = '#fff'; ctx.font = `${Math.max(10, b * .55)}px "Courier New",monospace`; ctx.fillText('▶ PLAY', b * .6, b * .75); ctx.fillStyle = '#ff4040'; ctx.fillText('● REC', W - b * 3.4, H - b * .3); break; }
    case 'corners': { const L = m * .08, th = Math.max(2, t * .35); ctx.strokeStyle = f.color; ctx.lineWidth = th; const o = m * .04; [[o, o, 1, 1], [W - o, o, -1, 1], [o, H - o, 1, -1], [W - o, H - o, -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke(); }); break; }
    case 'cinema': { const b = Math.max(0, (H - W / 2.39) / 2); if (b > 1) { rect(0, 0, W, b, '#000'); rect(0, H - b, W, b, '#000'); } else { const bw = Math.max(0, (W - H * 2.39) / 2); rect(0, 0, bw, H, '#000'); rect(W - bw, 0, bw, H, '#000'); } break; }
    case 'round': case 'circle': case 'heartf': {
      ctx.beginPath(); ctx.rect(0, 0, W, H);
      if (f.id === 'circle') { ctx.moveTo(W / 2 + Math.min(W, H) / 2, H / 2); ctx.ellipse(W / 2, H / 2, Math.min(W, H) / 2, Math.min(W, H) / 2, 0, 0, 7, true); }
      else if (f.id === 'heartf') { ctx.translate(W / 2, H / 2); const s = Math.min(W, H) * .5; ctx.moveTo(0, s * .95); ctx.bezierCurveTo(-s * 1.4, s * .1, -s * 1, -s * 1.1, 0, -s * .4); ctx.bezierCurveTo(s * 1, -s * 1.1, s * 1.4, s * .1, 0, s * .95); ctx.setTransform(1, 0, 0, 1, 0, 0); }
      else { const r = Math.min(W, H) * (.04 + f.size / 100 * .5); ctx.moveTo(r, 0); ctx.arcTo(W, 0, W, H, r); ctx.arcTo(W, H, 0, H, r); ctx.arcTo(0, H, 0, 0, r); ctx.arcTo(0, 0, W, 0, r); ctx.closePath(); }
      if (preview) { ctx.fillStyle = '#0b0906'; ctx.fill('evenodd'); } else { ctx.globalCompositeOperation = 'destination-out'; ctx.fill('evenodd'); } break; }
  }
  ctx.restore();
}
function drawOverlay() {
  ov.clearRect(0, 0, ovc.width, ovc.height);
  const W = ovc.width, H = ovc.height;
  if (S.split != null && !S.compare && !cropMode()) drawSplit(W, H);
  if (S.compare || cropMode()) return;
  BASE = glc;
  if (S.tab === 'erase' && (typeof SMART !== 'undefined')) SMART.drawSel(ov, W, H);
  S.fx.forEach(L => drawFx(ov, L, W, H)); drawStrokes(ov, W, H); S.layers.forEach(L => drawLayer(ov, L, W, H)); drawFrame(ov, W, H, S.frame, true);
  const L = S.layers[S.sel];
  if (L && ['text', 'shape', 'stick'].includes(S.tab)) { const m = metrics(ov, L, W, H), pad = m.pad;
    ov.save(); ov.translate(L.x * W, L.y * H); ov.rotate(L.rot); ov.strokeStyle = '#f5dea5'; ov.lineWidth = Math.max(2, W / 400); ov.setLineDash([W / 90, W / 130]); ov.strokeRect(-m.w / 2 - pad, -m.h / 2 - pad, m.w + pad * 2, m.h + pad * 2); ov.restore(); }
}
/* шторка «до / после» */
const origCv = document.createElement('canvas');
function drawSplit(W, H) {
  const keep = effective(S.p, S.hsl, S.filter, true);
  drawGL(S.geo, currentCrop(), ZERO_EFF(), W, H); origCv.width = W; origCv.height = H; origCv.getContext('2d').drawImage(glc, 0, 0);
  drawGL(S.geo, currentCrop(), keep, W, H);
  ov.save(); ov.beginPath(); ov.rect(0, 0, W * S.split, H); ov.clip(); ov.drawImage(origCv, 0, 0); ov.restore();
  ov.fillStyle = 'rgba(12,10,7,.7)'; ov.font = `bold ${Math.max(12, W / 32)}px sans-serif`; ov.fillText('ДО', W * .02, H * .06); ov.fillText('ПОСЛЕ', W * Math.min(.9, S.split + .02), H * .06);
}
function placeSplit() { const el = $('splitLine'); el.style.display = S.split != null && !cropMode() ? 'block' : 'none'; if (S.split != null) el.style.left = S.split * 100 + '%'; }
$('bSplit').onclick = () => { S.split = S.split == null ? .5 : null; placeSplit(); render(); hap(); };
function hitLayer(nx, ny) {
  const W = ovc.width, H = ovc.height, x = nx * W, y = ny * H;
  for (let i = S.layers.length - 1; i >= 0; i--) { const L = S.layers[i], m = metrics(ov, L, W, H), dx = x - L.x * W, dy = y - L.y * H, c = Math.cos(-L.rot), s = Math.sin(-L.rot);
    const lx = dx * c - dy * s, ly = dx * s + dy * c, pad = m.pad * 1.1; if (Math.abs(lx) <= m.w / 2 + pad && Math.abs(ly) <= m.h / 2 + pad) return i; } return -1;
}

/* ------------------------------------------------------------------ */
/*  ЖЕСТЫ: слои, рисование, кисть-маска, зум, шторка, свайп            */
/* ------------------------------------------------------------------ */
const ptrs = new Map(); let gest = null, curStroke = null, paintLast = null, lastTap = { t: 0, x: 0, y: 0 }, swipe = null;
const layerTab = () => ['text', 'shape', 'stick'].includes(S.tab);
function norm(e) { const r = ovc.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
function stampMask(ctx, x, y, r, flow, erase) {
  ctx.save(); ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over'; const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${flow})`); g.addColorStop(.55, `rgba(255,255,255,${flow * .75})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
}
function paintAt(nx, ny, from) {
  const [su, sv] = outToSrc(nx, ny); if (su < -.05 || su > 1.05 || sv < -.05 || sv > 1.05) return;
  const heal = S.lTool === 'heal' || S.lTool === 'unheal', erase = S.lTool === 'erase' || S.lTool === 'unheal', ctx = heal ? mkH : mkA;
  const r = (S.lSize / 100) * .16 * Math.min(mkW, mkH_) + 2, x = su * mkW, y = sv * mkH_, flow = heal ? .55 : .4;
  if (from) { const dx = x - from[0], dy = y - from[1], d = Math.hypot(dx, dy), st = Math.max(1, r * .3); for (let t = st; t < d; t += st) stampMask(ctx, from[0] + dx * t / d, from[1] + dy * t / d, r, flow, erase); }
  stampMask(ctx, x, y, r, flow, erase); paintLast = [x, y]; S.maskHas = true; uploadMask(); render();
}
ovc.addEventListener('pointerdown', e => {
  if (!S.src || cropMode()) return; ovc.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); const [nx, ny] = norm(e);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; curStroke = null; paintLast = null; swipe = null;
    if (layerTab() && S.layers[S.sel]) { const L = S.layers[S.sel]; gest = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), a0: Math.atan2(b.y - a.y, b.x - a.x), s0: L.size, r0: L.rot }; }
    else gest = { type: 'zoom', d0: Math.hypot(a.x - b.x, a.y - b.y), s0: S.view.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, vx: S.view.x, vy: S.view.y };
    return; }
  if (S.pick) { pickWB(nx, ny); return; }
  if (S.tab === 'draw') { curStroke = { color: S.brush.color, size: S.brush.size, type: S.brush.type, pts: [[nx, ny]] }; S.strokes.push(curStroke); render(); return; }
  if (S.tab === 'local') { paintLast = null; paintAt(nx, ny, null); gest = { type: 'paint' }; return; }
  if (S.tab === 'erase' && (typeof SMART !== 'undefined')) { SMART.eraseDown(nx, ny); gest = { type: 'erase' }; return; }
  if (layerTab()) { const i = hitLayer(nx, ny);
    if (i >= 0) { S.sel = i; const L = S.layers[i]; gest = { type: 'move', ox: nx - L.x, oy: ny - L.y }; } else { S.sel = -1; gest = null; }
    syncLayerUI(); render(); return; }
  if (S.split != null) { S.split = clamp(nx, .02, .98); placeSplit(); render(); gest = { type: 'split' }; return; }
  if (S.view.s > 1.02) { gest = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: S.view.x, vy: S.view.y }; return; }
  if (S.tab === 'filters') swipe = { x: e.clientX, y: e.clientY, t: Date.now() };
});
ovc.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); const [nx, ny] = norm(e);
  if (curStroke) { const l = curStroke.pts[curStroke.pts.length - 1]; if (Math.hypot(l[0] - nx, l[1] - ny) > .002) { curStroke.pts.push([nx, ny]); render(); } return; }
  if (!gest) return;
  if (gest.type === 'paint') { paintAt(nx, ny, paintLast); return; }
  if (gest.type === 'erase') { typeof SMART !== 'undefined' && SMART.eraseMove(nx, ny); return; }
  if (gest.type === 'split') { S.split = clamp(nx, .02, .98); placeSplit(); render(); return; }
  if (gest.type === 'pan') { setView(S.view.s, gest.vx + e.clientX - gest.sx, gest.vy + e.clientY - gest.sy); return; }
  if (gest.type === 'zoom' && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    setView(gest.s0 * d / gest.d0, gest.vx + cx - gest.cx, gest.vy + cy - gest.cy); return; }
  const L = S.layers[S.sel]; if (!L) return;
  if (gest.type === 'move' && ptrs.size === 1) { L.x = nx - gest.ox; L.y = ny - gest.oy; render(); }
  else if (gest.type === 'pinch' && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; L.size = clamp(gest.s0 * Math.hypot(a.x - b.x, a.y - b.y) / gest.d0, 2, 100); L.rot = gest.r0 + (Math.atan2(b.y - a.y, b.x - a.x) - gest.a0); syncLayerUI(); render(); }
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return; const p0 = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
  if (curStroke) { curStroke = null; pushHist('Рисунок'); return; }
  if (swipe && ptrs.size === 0) { const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2 && Date.now() - swipe.t < 700) cycleFilter(dx < 0 ? 1 : -1);
    else if (Math.hypot(dx, dy) < 8) doubleTap(e); swipe = null; return; }
  if (gest && gest.type === 'paint') { gest = null; paintLast = null; commitMask(); pushHist('Кисть'); return; }
  if (gest && gest.type === 'erase') { gest = null; typeof SMART !== 'undefined' && SMART.eraseUp(); return; }
  if (gest && (ptrs.size === 0 || gest.type === 'pinch' || gest.type === 'zoom')) { const t = gest.type; gest = null; if (t === 'move' || t === 'pinch') pushHist(TABN[S.tab]); if (t === 'pan' && Math.hypot(e.clientX - p0.x, e.clientY - p0.y) < 6) doubleTap(e); return; }
  if (!gest && ptrs.size === 0 && !layerTab() && S.tab !== 'draw' && S.tab !== 'local') doubleTap(e);
}
function doubleTap(e) {
  const now = Date.now(), near = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30;
  if (now - lastTap.t < 320 && near) { lastTap.t = 0; if (S.view.s > 1.02) setView(1, 0, 0); else { const r = $('cv').getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; setView(2.6, (cx - e.clientX) * 1.6, (cy - e.clientY) * 1.6); } hap(); }
  else lastTap = { t: now, x: e.clientX, y: e.clientY };
}
ovc.addEventListener('pointerup', endPtr); ovc.addEventListener('pointercancel', endPtr);
ovc.addEventListener('wheel', e => { e.preventDefault(); const L = S.layers[S.sel];
  if (L && layerTab()) { L.size = clamp(L.size * (e.deltaY < 0 ? 1.06 : .94), 2, 100); syncLayerUI(); render(); return; }
  const r = $('cv').getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, k = e.deltaY < 0 ? 1.12 : .89, ns = clamp(S.view.s * k, 1, 8);
  setView(ns, S.view.x + (e.clientX - cx) * (1 - ns / S.view.s) * 0, S.view.y); }, { passive: false });
function cycleFilter(dir) {
  const vis = FILTERS.filter(f => f.cat === S.fcat || f.id === 'orig' && false); if (!vis.length) return; let i = vis.findIndex(f => f.id === S.filter.id);
  const nf = vis[(i + dir + vis.length) % vis.length]; S.filter = { id: nf.id, int: 100 }; syncFilters(); render(); pushHist('Фильтр: ' + nf.n); toast(nf.n); hap();
}

/* ------------------------------------------------------------------ */
/*  МАСКИ (кисть и лечение)                                            */
/* ------------------------------------------------------------------ */
function initMasks() {
  const k = 512 / Math.max(S.sw || 1, S.sh || 1); mkW = Math.max(2, Math.round((S.sw || 2) * k)); mkH_ = Math.max(2, Math.round((S.sh || 2) * k));
  mkAc = document.createElement('canvas'); mkHc = document.createElement('canvas'); mkAc.width = mkHc.width = mkW; mkAc.height = mkHc.height = mkH_; mkA = mkAc.getContext('2d'); mkH = mkHc.getContext('2d');
  S.maskHas = false; S.mv = 0; if (S.src) uploadMask();
}
function maskDirtyCommit() { return true; }
function commitMask() { S.mv = (S.mv || 0) + 1; maskStore[S.mv] = { a: mkAc.toDataURL(), h: mkHc.toDataURL(), has: S.maskHas }; }
function restoreMask(v, cb) {
  const m = maskStore[v]; mkA.clearRect(0, 0, mkW, mkH_); mkH.clearRect(0, 0, mkW, mkH_);
  if (!m) { S.maskHas = false; uploadMask(); cb(); return; } S.maskHas = m.has; let n = 2; const done = () => { if (--n === 0) { uploadMask(); cb(); } };
  const a = new Image(), h = new Image(); a.onload = () => { mkA.drawImage(a, 0, 0); done(); }; h.onload = () => { mkH.drawImage(h, 0, 0); done(); }; a.src = m.a; h.src = m.h;
}
function gradientMask(kind) {
  const im = mkA.createImageData(mkW, mkH_), d = im.data;
  for (let y = 0; y < mkH_; y++) for (let x = 0; x < mkW; x++) { const [u, v] = srcToOut((x + .5) / mkW, (y + .5) / mkH_); let a = 0;
    switch (kind) { case 'top': a = 1 - v * 1.6; break; case 'bottom': a = v * 1.6 - .6; break; case 'left': a = 1 - u * 1.6; break; case 'right': a = u * 1.6 - .6; break;
      case 'center': a = 1.25 - Math.hypot(u - .5, v - .5) * 2.6; break; case 'edges': a = Math.hypot(u - .5, v - .5) * 2.6 - .5; break; }
    d[(y * mkW + x) * 4] = d[(y * mkW + x) * 4 + 1] = d[(y * mkW + x) * 4 + 2] = 255; d[(y * mkW + x) * 4 + 3] = clamp(a, 0, 1) * 255; }
  mkA.putImageData(im, 0, 0); S.maskHas = true; uploadMask(); render(); commitMask(); pushHist('Градиентная маска');
}
function invertMask() { const im = mkA.getImageData(0, 0, mkW, mkH_), d = im.data; for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255 - d[i + 3]; } mkA.putImageData(im, 0, 0); S.maskHas = true; uploadMask(); render(); commitMask(); pushHist('Инверсия маски'); }
function clearMasks() { mkA.clearRect(0, 0, mkW, mkH_); mkH.clearRect(0, 0, mkW, mkH_); S.maskHas = false; S.local = NOLOCAL(); uploadMask(); syncLocal(); render(); commitMask(); pushHist('Очистка масок'); }

/* ------------------------------------------------------------------ */
/*  ИСТОРИЯ                                                            */
/* ------------------------------------------------------------------ */
function snap() { return JSON.stringify({ geo: S.geo, p: S.p, hsl: S.hsl, filter: S.filter, curves: S.curves, local: S.local, layers: S.layers, strokes: S.strokes, fx: S.fx, frame: S.frame, mv: S.mv, mh: S.maskHas, sv: S.sv }); }
function pushHist(label, first) {
  const s = snap(); if (S.hist.length && S.hist[S.hist.length - 1].s === s) return;
  S.hist.push({ s, l: label || TABN[S.tab] || 'Правка' }); if (S.hist.length > HIST_MAX) S.hist.shift(); if (!first) S.redo = []; updUndo();
}
function restore(entry, cb) {
  const o = JSON.parse(entry.s); Object.assign(S, { geo: o.geo, p: o.p, hsl: o.hsl, filter: o.filter, curves: o.curves || NOCURVE(), local: o.local || NOLOCAL(), layers: o.layers, strokes: o.strokes, fx: o.fx, frame: o.frame, sel: -1 });
  if ((o.sv || 0) !== S.sv && srcStore[o.sv || 0]) { S.src = cloneCanvas(srcStore[o.sv || 0]); S.sw = S.src.width; S.sh = S.src.height; setTexture(S.src); S.sv = o.sv || 0; }
  updateCurveTex(); const fin = () => { S.mv = o.mv || 0; syncUI(); layout(); render(); cb && cb(); };
  if ((o.mv || 0) !== S.mv || S.maskHas !== !!o.mh) restoreMask(o.mv || 0, fin); else fin();
}
function updUndo() { $('bUndo').disabled = S.hist.length < 2; $('bRedo').disabled = !S.redo.length; }
$('bUndo').onclick = () => { if (S.hist.length < 2) return; S.redo.push(S.hist.pop()); restore(S.hist[S.hist.length - 1]); updUndo(); hap(); };
$('bRedo').onclick = () => { if (!S.redo.length) return; const e = S.redo.pop(); S.hist.push(e); restore(e); updUndo(); hap(); };
function fill(el) { const mn = +el.min, mx = +el.max, p = (el.value - mn) / (mx - mn) * 100; el.style.setProperty('--p', p + '%'); }
function mkPill(txt, on, fn, cls = '') { const b = document.createElement('button'); b.className = 'pill ' + cls + (on ? ' on' : ''); b.innerHTML = txt; b.onclick = fn; return b; }
function openHist() { const l = $('histList'); l.innerHTML = ''; S.hist.map((h, i) => [h, i]).reverse().forEach(([h, i]) => { const d = document.createElement('div'); d.className = 'hrow' + (i === S.hist.length - 1 ? ' cur' : ''); d.innerHTML = `<i>${i}</i>${h.l}`;
  d.onclick = () => { while (S.hist.length - 1 > i) S.redo.push(S.hist.pop()); restore(S.hist[i]); updUndo(); $('mHist').classList.remove('on'); hap(); }; l.appendChild(d); }); $('mHist').classList.add('on'); }
$('aHist').onclick = openHist; $('histClose').onclick = () => $('mHist').classList.remove('on');

/* ------------------------------------------------------------------ */
/*  ФИЛЬТРЫ + МОИ ПРЕСЕТЫ                                              */
/* ------------------------------------------------------------------ */
const thumbQueue = []; let thumbBusy = false;
function thumbDraw(f, c) {
  const k = 150 / Math.max(S.sw, S.sh), tw = Math.max(2, Math.round(S.sw * k)), th = Math.max(2, Math.round(S.sh * k)), z8 = Array.from({ length: 8 }, () => [0, 0, 0]);
  const e = f.mine ? effective(f.mine.p, f.mine.hsl, f.mine.filter, false) : effective(zeroParams(), z8, { id: f.id, int: 100 }, false);
  drawGL({ rot: 0, fx: 1, fy: 1, ang: 0 }, { x: 0, y: 0, w: 1, h: 1 }, e, tw, th); const s = Math.max(150 / tw, 150 / th); c.getContext('2d').drawImage(glc, (150 - tw * s) / 2, (150 - th * s) / 2, tw * s, th * s);
}
function runThumbs() {
  if (thumbBusy) return; thumbBusy = true;
  const step = () => { let n = 0; while (thumbQueue.length && n < 6) { const [f, c] = thumbQueue.shift(); if (c.isConnected) { thumbDraw(f, c); n++; } } render();
    if (thumbQueue.length) setTimeout(step, 8); else thumbBusy = false; };
  setTimeout(step, 0);
}
function buildThumbs() {
  const row = $('fltRow'); row.innerHTML = ''; thumbQueue.length = 0;
  const addTile = (f, mine) => { const d = document.createElement('div'); d.className = 'flt'; d.dataset.id = f.id; d.dataset.cat = mine ? 'mine' : f.cat; const c = document.createElement('canvas'); c.width = c.height = 150; d.appendChild(c); d.appendChild(document.createTextNode(f.n));
    if (mine) { const x = document.createElement('span'); x.className = 'x'; x.textContent = '✕'; x.onclick = ev => { ev.stopPropagation(); S.mine = S.mine.filter(m => m.id !== f.id); lsSet('studio_mine', JSON.stringify(S.mine)); buildThumbs(); syncFilters(); hap('light'); }; d.appendChild(x); }
    d.onclick = () => mine ? applyMine(f) : applyFilter(f); row.appendChild(d); return [f, c]; };
  const add = document.createElement('div'); add.className = 'flt add'; add.dataset.cat = 'mine'; add.innerHTML = '<div class="plus">＋</div>Сохранить вид'; add.onclick = saveMine; row.appendChild(add);
  const jobs = [];
  S.mine.forEach(m => jobs.push(addTile({ id: m.id, n: m.name, mine: m }, true)));
  FILTERS.forEach(f => jobs.push(addTile(f, false)));
  const cur = f => (f[0].mine ? 'mine' : f[0].cat) === S.fcat; thumbQueue.push(...jobs.filter(cur), ...jobs.filter(j => !cur(j))); runThumbs();
  const cr = $('fcat'); cr.innerHTML = ''; FCATS.forEach(([id, n]) => cr.appendChild(mkPill(n, id === S.fcat, () => { S.fcat = id; syncFilters(); const first = row.querySelector('.flt:not(.hide)'); if (first) row.scrollTo({ left: 0 }); hap(); }, 'grp')));
}
function applyFilter(f) {
  if (S.filter.id === f.id && f.id !== 'orig') { S.filter = { id: 'orig', int: 100 }; toast('Фильтр отключён'); pushHist('Фильтр выкл.'); }
  else { S.filter = { id: f.id, int: 100 }; S.mineOn = null; pushHist('Фильтр: ' + f.n); sparkAtEl(document.querySelector(`.flt[data-id="${f.id}"]`)); }
  syncFilters(); render(); hap();
}
function saveMine() { openTextModal('Мой вид', 'Название пресета', v => { const id = 'mine' + Date.now(); S.mine.push({ id, name: v.slice(0, 18), p: { ...S.p }, hsl: JSON.parse(JSON.stringify(S.hsl)), filter: { ...S.filter } }); lsSet('studio_mine', JSON.stringify(S.mine)); S.fcat = 'mine'; buildThumbs(); syncFilters(); toast('Пресет сохранён'); hap('light'); }); }
function applyMine(f) {
  if (S.mineOn === f.id && S.lookPrev) { Object.assign(S, S.lookPrev); S.mineOn = null; S.lookPrev = null; toast('Пресет отключён'); }
  else { if (!S.mineOn) S.lookPrev = { p: { ...S.p }, hsl: JSON.parse(JSON.stringify(S.hsl)), filter: { ...S.filter } }; const m = f.mine; S.p = { ...zeroParams(), ...m.p }; S.hsl = JSON.parse(JSON.stringify(m.hsl)); S.filter = { ...m.filter }; S.mineOn = f.id; toast('Пресет: ' + f.n); }
  syncUI(); render(); pushHist('Пресет'); hap();
}
function syncFilters() {
  document.querySelectorAll('.flt').forEach(d => { const isMine = d.dataset.cat === 'mine'; d.classList.toggle('hide', d.dataset.cat !== S.fcat); d.classList.toggle('on', isMine ? d.dataset.id === S.mineOn : d.dataset.id === S.filter.id && !S.mineOn); });
  document.querySelectorAll('#fcat .pill').forEach((b, i) => b.classList.toggle('on', FCATS[i][0] === S.fcat));
  $('fInt').value = S.filter.int; $('fiV').textContent = S.filter.int; fill($('fInt')); $('fInt').disabled = S.filter.id === 'orig';
}
$('fInt').oninput = e => { S.filter.int = +e.target.value; $('fiV').textContent = e.target.value; fill(e.target); render(); };
$('fInt').onchange = () => pushHist('Сила фильтра');
$('aSave').onclick = saveMine;

/* ------------------------------------------------------------------ */
/*  ПРАВКА                                                             */
/* ------------------------------------------------------------------ */
function buildAdjust() { const g = $('agrp'); g.innerHTML = ''; GROUPS.forEach(([id, n]) => g.appendChild(mkPill(n, id === S.adjG, () => { S.adjG = id; S.adj = PARAMS.find(p => p[4] === id)[0]; syncAdjust(); hap(); }, 'grp'))); }
function syncAdjust() {
  document.querySelectorAll('#agrp .pill').forEach((b, i) => { b.classList.toggle('on', GROUPS[i][0] === S.adjG); b.classList.toggle('chg', PARAMS.some(p => p[4] === GROUPS[i][0] && S.p[p[0]] !== PDEF[p[0]])); });
  const row = $('adjRow'); row.innerHTML = '';
  PARAMS.filter(p => p[4] === S.adjG).forEach(([k, n]) => { const b = mkPill(`${n}<i></i>`, k === S.adj, () => { S.adj = k; syncAdjust(); hap(); }); b.classList.toggle('chg', S.p[k] !== PDEF[k]); row.appendChild(b); });
  const def = PARAMS.find(p => p[0] === S.adj), sl = $('aSl'); sl.min = def[2]; sl.max = def[3]; sl.value = S.p[S.adj]; $('aName').textContent = def[1]; $('aVal').textContent = S.p[S.adj]; fill(sl);
  const on = row.querySelector('.pill.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  $('bPick').style.display = S.adjG === 'color' ? 'flex' : 'none';
}
$('aSl').oninput = e => { S.p[S.adj] = +e.target.value; $('aVal').textContent = e.target.value; fill(e.target); render();
  const idx = PARAMS.filter(p => p[4] === S.adjG).findIndex(p => p[0] === S.adj), pill = $('adjRow').children[idx]; if (pill) pill.classList.toggle('chg', S.p[S.adj] !== PDEF[S.adj]); };
$('aSl').onchange = () => { pushHist(PARAMS.find(p => p[0] === S.adj)[1]); };
$('aReset').onclick = () => { S.p[S.adj] = PDEF[S.adj]; syncAdjust(); render(); pushHist('Сброс: ' + PARAMS.find(p => p[0] === S.adj)[1]); hap(); };
$('aSl').ondblclick = $('aReset').onclick;
$('bGroupReset').onclick = () => { PARAMS.filter(p => p[4] === S.adjG).forEach(p => S.p[p[0]] = PDEF[p[0]]); syncAdjust(); render(); pushHist('Сброс группы'); hap(); };
$('bPick').onclick = () => { S.pick = true; toast('Нажми на нейтрально-серое или белое место фото'); };
function pickWB(nx, ny) {
  S.pick = false; const [su, sv] = outToSrc(nx, ny), x = clamp(Math.round(su * S.sw), 1, S.sw - 2), y = clamp(Math.round(sv * S.sh), 1, S.sh - 2), d = S.src.getContext('2d').getImageData(x - 2, y - 2, 5, 5).data;
  let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; r /= n * 255; g /= n * 255; b /= n * 255;
  S.p.temperature = clamp(Math.round(S.p.temperature + (b - r) / .26 * 100), -100, 100); S.p.tint = clamp(Math.round(S.p.tint + (g - (r + b) / 2) / .08 * 100 * .6), -100, 100);
  syncAdjust(); render(); pushHist('Баланс белого'); toast('Баланс белого выставлен'); hap('light');
}

/* ------------------------------------------------------------------ */
/*  КРИВЫЕ                                                             */
/* ------------------------------------------------------------------ */
const CPRE = [['Линейная', () => NOCURVE()], ['Контраст', () => ({ ...NOCURVE(), m: [[0, 0], [.25, .18], [.75, .82], [1, 1]] })], ['Мягкий контраст', () => ({ ...NOCURVE(), m: [[0, 0], [.25, .22], [.75, .78], [1, 1]] })],
  ['Матовый', () => ({ ...NOCURVE(), m: [[0, .08], [.5, .5], [1, .93]] })], ['Светлее', () => ({ ...NOCURVE(), m: [[0, 0], [.5, .64], [1, 1]] })], ['Темнее', () => ({ ...NOCURVE(), m: [[0, 0], [.5, .38], [1, 1]] })],
  ['Кросс', () => ({ ...NOCURVE(), r: [[0, 0], [.5, .56], [1, 1]], b: [[0, .06], [.5, .46], [1, .92]] })], ['Тёплые тени', () => ({ ...NOCURVE(), r: [[0, .04], [1, 1]], b: [[0, 0], [1, .94]] })], ['Негатив', () => ({ ...NOCURVE(), m: [[0, 1], [1, 0]] })]];
const cc = $('curveCv'), cctx = cc.getContext('2d');
function buildCurves() {
  const ch = $('cchan'); ch.innerHTML = ''; [['m', 'RGB'], ['r', 'R'], ['g', 'G'], ['b', 'B']].forEach(([k, n]) => ch.appendChild(mkPill(n, k === S.curveCh, () => { S.curveCh = k; S.curveSel = -1; buildCurves(); drawCurve(); hap(); })));
  const pr = $('cpre'); pr.innerHTML = ''; CPRE.forEach(([n, fn]) => pr.appendChild(mkPill(n, false, () => { S.curves = fn(); S.curveSel = -1; updateCurveTex(); drawCurve(); render(); pushHist('Кривые: ' + n); hap(); }, 'grp')));
}
function drawCurve() {
  const W = cc.width, H = cc.height, col = { m: '#f5dea5', r: '#ff6a6a', g: '#5fe08a', b: '#6aa8ff' }[S.curveCh]; cctx.clearRect(0, 0, W, H);
  cctx.strokeStyle = 'rgba(212,175,100,.18)'; cctx.lineWidth = 1; for (let i = 1; i < 4; i++) { cctx.beginPath(); cctx.moveTo(i * W / 4, 0); cctx.lineTo(i * W / 4, H); cctx.moveTo(0, i * H / 4); cctx.lineTo(W, i * H / 4); cctx.stroke(); }
  cctx.strokeStyle = 'rgba(212,175,100,.25)'; cctx.beginPath(); cctx.moveTo(0, H); cctx.lineTo(W, 0); cctx.stroke();
  const f = spline(S.curves[S.curveCh]); cctx.strokeStyle = col; cctx.lineWidth = 3; cctx.beginPath(); for (let i = 0; i <= 64; i++) { const x = i / 64; i ? cctx.lineTo(x * W, (1 - f(x)) * H) : cctx.moveTo(0, (1 - f(0)) * H); } cctx.stroke();
  S.curves[S.curveCh].forEach((p, i) => { cctx.fillStyle = i === S.curveSel ? '#fff' : col; cctx.strokeStyle = '#0b0805'; cctx.lineWidth = 3; cctx.beginPath(); cctx.arc(p[0] * W, (1 - p[1]) * H, 11, 0, 7); cctx.fill(); cctx.stroke(); });
}
let cdrag = -1;
function cpos(e) { const r = cc.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp(1 - (e.clientY - r.top) / r.height, 0, 1)]; }
cc.addEventListener('pointerdown', e => { cc.setPointerCapture(e.pointerId); const [x, y] = cpos(e), pts = S.curves[S.curveCh]; let best = -1, bd = .09;
  pts.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = i; } });
  if (best < 0) { pts.push([x, y]); pts.sort((a, b) => a[0] - b[0]); best = pts.findIndex(p => p[0] === x && p[1] === y); }
  S.curveSel = best; cdrag = best; drawCurve(); updateCurveTex(); render(); });
cc.addEventListener('pointermove', e => { if (cdrag < 0) return; const [x, y] = cpos(e), pts = S.curves[S.curveCh], last = pts.length - 1;
  if (cdrag === 0 || cdrag === last) pts[cdrag][1] = y; else pts[cdrag] = [clamp(x, pts[cdrag - 1][0] + .02, pts[cdrag + 1][0] - .02), y];
  drawCurve(); updateCurveTex(); render(); });
const cend = () => { if (cdrag >= 0) { cdrag = -1; pushHist('Кривые'); } };
cc.addEventListener('pointerup', cend); cc.addEventListener('pointercancel', cend);
$('cDel').onclick = () => { const pts = S.curves[S.curveCh]; if (S.curveSel > 0 && S.curveSel < pts.length - 1) { pts.splice(S.curveSel, 1); S.curveSel = -1; drawCurve(); updateCurveTex(); render(); pushHist('Кривые'); hap('light'); } else toast('Выбери точку (не крайнюю)'); };
$('cReset').onclick = () => { S.curves[S.curveCh] = [[0, 0], [1, 1]]; S.curveSel = -1; drawCurve(); updateCurveTex(); render(); pushHist('Кривая сброшена'); hap(); };

/* ------------------------------------------------------------------ */
/*  ЦВЕТА HSL                                                          */
/* ------------------------------------------------------------------ */
function buildHSL() { const c = $('hslC'); c.innerHTML = ''; HSLC.forEach(([n, col], i) => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = col; b.title = n; b.onclick = () => { S.hslI = i; syncHSL(); hap(); }; c.appendChild(b); }); }
function syncHSL() {
  document.querySelectorAll('#hslC .sw').forEach((b, i) => { b.classList.toggle('on', i === S.hslI); b.style.opacity = S.hsl[i].some(v => v) ? 1 : .72; });
  const v = S.hsl[S.hslI]; [['hH', 'hhV', 0], ['hS', 'hsV', 1], ['hL', 'hlV', 2]].forEach(([id, lab, k]) => { $(id).value = v[k]; $(lab).textContent = v[k]; fill($(id)); });
}
[['hH', 'hhV', 0], ['hS', 'hsV', 1], ['hL', 'hlV', 2]].forEach(([id, lab, k]) => { $(id).oninput = e => { S.hsl[S.hslI][k] = +e.target.value; $(lab).textContent = e.target.value; fill(e.target); render(); }; $(id).onchange = () => { syncHSL(); pushHist('Цвет: ' + HSLC[S.hslI][0]); }; });
$('hReset').onclick = () => { S.hsl[S.hslI] = [0, 0, 0]; syncHSL(); render(); pushHist('Сброс цвета'); hap(); };

/* ------------------------------------------------------------------ */
/*  КИСТЬ (локальные правки)                                           */
/* ------------------------------------------------------------------ */
function buildLocal() {
  const pr = $('lPre'); pr.innerHTML = ''; LPRE.forEach(([n, set]) => pr.appendChild(mkPill(n, false, () => { S.local = { ...NOLOCAL(), ...set }; syncLocal(); render(); pushHist('Кисть: ' + n); hap(); }, 'grp')));
  const pa = $('lPar'); pa.innerHTML = ''; LOCAL.forEach(([k, n]) => pa.appendChild(mkPill(`${n}<i></i>`, k === S.lpar, () => { S.lpar = k; syncLocal(); hap(); })));
  const gr = $('lGrad'); gr.innerHTML = ''; [['top', '↓ Сверху'], ['bottom', '↑ Снизу'], ['left', '→ Слева'], ['right', '← Справа'], ['center', '◎ Центр'], ['edges', '◉ Края']].forEach(([k, n]) => gr.appendChild(mkPill(n, false, () => { gradientMask(k); hap(); }, 'grp')));
}
function syncLocal() {
  [['lPaint', 'paint'], ['lErase', 'erase'], ['lHeal', 'heal'], ['lUnheal', 'unheal']].forEach(([id, t]) => $(id).classList.toggle('on', S.lTool === t));
  $('lView').classList.toggle('on', S.maskView);
  document.querySelectorAll('#lPar .pill').forEach((b, i) => { b.classList.toggle('on', LOCAL[i][0] === S.lpar); b.classList.toggle('chg', S.local[LOCAL[i][0]] !== 0); });
  const sl = $('lSl'); sl.value = S.local[S.lpar]; $('lVal').textContent = S.local[S.lpar]; $('lName').textContent = LOCAL.find(l => l[0] === S.lpar)[1]; fill(sl); $('lBrush').value = S.lSize; $('lbV').textContent = S.lSize; fill($('lBrush'));
}
[['lPaint', 'paint'], ['lErase', 'erase'], ['lHeal', 'heal'], ['lUnheal', 'unheal']].forEach(([id, t]) => $(id).onclick = () => { S.lTool = t; syncLocal(); hap(); });
$('lView').onclick = () => { S.maskView = !S.maskView; syncLocal(); render(); };
$('lSl').oninput = e => { S.local[S.lpar] = +e.target.value; $('lVal').textContent = e.target.value; fill(e.target); render(); const i = LOCAL.findIndex(l => l[0] === S.lpar); $('lPar').children[i].classList.toggle('chg', S.local[S.lpar] !== 0); };
$('lSl').onchange = () => pushHist('Кисть: ' + LOCAL.find(l => l[0] === S.lpar)[1]);
$('lReset').onclick = () => { S.local[S.lpar] = 0; syncLocal(); render(); pushHist('Сброс кисти'); hap(); };
$('lBrush').oninput = e => { S.lSize = +e.target.value; $('lbV').textContent = e.target.value; fill(e.target); };
$('lInv').onclick = invertMask; $('lClear').onclick = clearMasks;

/* ------------------------------------------------------------------ */
/*  КАДР                                                               */
/* ------------------------------------------------------------------ */
const ASPECTS = [['free', 'Свободно'], ['orig', 'Оригинал'], ['1:1', '1:1'], ['4:5', '4:5'], ['3:4', '3:4'], ['2:3', '2:3'], ['9:16', '9:16'], ['16:9', '16:9'], ['3:2', '3:2'], ['21:9', '21:9']];
function buildAspects() { const row = $('aspRow'); row.innerHTML = ''; for (const [k, n] of ASPECTS) { const b = mkPill(n, false, () => { S.geo.aspect = S.geo.aspect === k && k !== 'free' ? 'free' : k; applyAspect(); syncCrop(); render(); layout(); pushHist('Кадр ' + n); hap(); }); b.dataset.k = k; row.appendChild(b); } }
function aspectRatio() { const a = S.geo.aspect; if (a === 'free') return null; const [fw, fh] = frameSize(S.geo.rot); if (a === 'orig') return fw / fh; const [x, y] = a.split(':').map(Number); return x / y; }
function applyAspect() { const r = aspectRatio(); const [fw, fh] = frameSize(S.geo.rot); if (!r) return; let cw = fw, ch = fw / r; if (ch > fh) { ch = fh; cw = fh * r; } S.geo.crop = { x: (1 - cw / fw) / 2, y: (1 - ch / fh) / 2, w: cw / fw, h: ch / fh }; }
function syncCrop() { document.querySelectorAll('#aspRow .pill').forEach(b => b.classList.toggle('on', b.dataset.k === S.geo.aspect)); $('stSl').value = S.geo.ang; $('stV').textContent = S.geo.ang + '°'; fill($('stSl')); $('flipH').classList.toggle('on', S.geo.fx < 0); $('flipV').classList.toggle('on', S.geo.fy < 0); }
function resetCrop() { S.geo.crop = { x: 0, y: 0, w: 1, h: 1 }; applyAspect(); }
$('rotL').onclick = () => { S.geo.rot = (S.geo.rot + 3) % 4; resetCrop(); syncCrop(); layout(); render(); pushHist('Поворот'); hap(); };
$('rotR').onclick = () => { S.geo.rot = (S.geo.rot + 1) % 4; resetCrop(); syncCrop(); layout(); render(); pushHist('Поворот'); hap(); };
$('flipH').onclick = () => { S.geo.fx *= -1; syncCrop(); render(); pushHist('Зеркало'); hap(); };
$('flipV').onclick = () => { S.geo.fy *= -1; syncCrop(); render(); pushHist('Зеркало'); hap(); };
$('cropReset').onclick = () => { S.geo.aspect = 'free'; S.geo.crop = { x: 0, y: 0, w: 1, h: 1 }; syncCrop(); layout(); render(); pushHist('Сброс кадра'); };
$('stSl').oninput = e => { S.geo.ang = +e.target.value; $('stV').textContent = e.target.value + '°'; fill(e.target); render(); };
$('stSl').onchange = () => pushHist('Горизонт');
$('stReset').onclick = () => { S.geo.ang = 0; syncCrop(); render(); pushHist('Горизонт'); };
const cropEl = $('crop');
function placeCrop() { cropEl.style.display = cropMode() ? 'block' : 'none'; if (!cropMode()) return; const c = S.geo.crop; cropEl.style.left = c.x * 100 + '%'; cropEl.style.top = c.y * 100 + '%'; cropEl.style.width = c.w * 100 + '%'; cropEl.style.height = c.h * 100 + '%'; }
let cd = null;
cropEl.addEventListener('pointerdown', e => { e.preventDefault(); cropEl.setPointerCapture(e.pointerId); const r = $('cv').getBoundingClientRect(); cd = { kind: e.target.dataset.c || 'move', sx: e.clientX, sy: e.clientY, c: { ...S.geo.crop }, W: r.width, H: r.height }; });
cropEl.addEventListener('pointermove', e => {
  if (!cd) return; const [fw, fh] = frameSize(S.geo.rot), dx = (e.clientX - cd.sx) / cd.W, dy = (e.clientY - cd.sy) / cd.H, c0 = cd.c; let n;
  if (cd.kind === 'move') n = { ...c0, x: clamp(c0.x + dx, 0, 1 - c0.w), y: clamp(c0.y + dy, 0, 1 - c0.h) };
  else { const right = cd.kind.includes('r'), bottom = cd.kind.includes('b'), fx = right ? c0.x : c0.x + c0.w, fy = bottom ? c0.y : c0.y + c0.h;
    const nx = clamp((right ? c0.x + c0.w : c0.x) + dx, 0, 1), ny = clamp((bottom ? c0.y + c0.h : c0.y) + dy, 0, 1); let w = Math.max(.06, Math.abs(nx - fx)), h = Math.max(.06, Math.abs(ny - fy)); const r = aspectRatio();
    if (r) { let wp = w * fw, hp = h * fh; if (wp / hp > r) wp = hp * r; else hp = wp / r; w = wp / fw; h = hp / fh; }
    let x = right ? fx : fx - w, y = bottom ? fy : fy - h; if (x < 0) x = 0; if (y < 0) y = 0; if (x + w > 1) w = 1 - x; if (y + h > 1) h = 1 - y;
    if (r) { let wp = w * fw, hp = h * fh; if (wp / hp > r) wp = hp * r; else hp = wp / r; w = wp / fw; h = hp / fh; if (!right) x = fx - w; if (!bottom) y = fy - h; } n = { x, y, w, h }; }
  S.geo.crop = n; placeCrop();
});
const endCrop = () => { if (cd) { cd = null; pushHist('Кадр'); } };
cropEl.addEventListener('pointerup', endCrop); cropEl.addEventListener('pointercancel', endCrop);

/* ------------------------------------------------------------------ */
/*  ЭФФЕКТЫ-НАЛОЖЕНИЯ                                                  */
/* ------------------------------------------------------------------ */
function buildFx() {
  const row = $('fxRow'); row.innerHTML = '';
  for (const f of FX) { const c = document.createElement('canvas'); c.width = c.height = 120; const x = c.getContext('2d'); x.fillStyle = lg(x, 0, 0, 120, 120, [[0, '#3a4a5a'], [.5, '#6a5a50'], [1, '#2a2a30']]); x.fillRect(0, 0, 120, 120);
    x.save(); x.globalCompositeOperation = f.blend; f.draw(x, 120, 120, mulberry(3)); x.restore();
    const d = document.createElement('div'); d.className = 'fxt'; d.dataset.id = f.id; d.appendChild(c); d.appendChild(document.createTextNode(f.n));
    d.onclick = () => { const i = S.fx.findIndex(l => l.id === f.id);
      if (i >= 0) { S.fx.splice(i, 1); S.fxSel = S.fx.length - 1; toast('Эффект убран'); } else { S.fx.push({ id: f.id, alpha: .75, seed: 1 + (Math.random() * 1e6 | 0) }); S.fxSel = S.fx.length - 1; sparkAtEl(d); }
      syncFx(); render(); pushHist('Эффект: ' + f.n); hap(); }; row.appendChild(d); }
}
function syncFx() {
  document.querySelectorAll('.fxt').forEach(d => d.classList.toggle('on', S.fx.some(l => l.id === d.dataset.id)));
  const L = S.fx[S.fxSel], sl = $('fxOp'); sl.disabled = !L; $('fxDel').style.visibility = L ? 'visible' : 'hidden';
  if (L) { sl.value = Math.round(L.alpha * 100); $('fxV').textContent = sl.value; $('fxName').textContent = 'Прозрачность: ' + FX.find(f => f.id === L.id).n; } else { $('fxName').textContent = 'Выбери эффект выше'; $('fxV').textContent = '—'; } fill(sl);
}
$('fxOp').oninput = e => { const L = S.fx[S.fxSel]; if (!L) return; L.alpha = e.target.value / 100; $('fxV').textContent = e.target.value; fill(e.target); render(); };
$('fxOp').onchange = () => pushHist('Эффект');
$('fxDel').onclick = () => { if (S.fxSel < 0) return; S.fx.splice(S.fxSel, 1); S.fxSel = S.fx.length - 1; syncFx(); render(); pushHist('Эффект убран'); hap('light'); };

/* ------------------------------------------------------------------ */
/*  СЛОИ: панель, текст, фигуры, стикеры                               */
/* ------------------------------------------------------------------ */
const BLENDS = [['source-over', 'Обычный'], ['multiply', 'Умножение'], ['screen', 'Экран'], ['overlay', 'Наложение'], ['soft-light', 'Мягкий свет'], ['difference', 'Разница'], ['lighten', 'Светлее'], ['darken', 'Темнее']];
function makeBars() {
  document.querySelectorAll('[data-bar]').forEach(bar => {
    bar.innerHTML = `<div class="sl"><div class="lab"><span>Прозрачность</span><b class="bv">100</b></div><input type="range" class="bo" min="5" max="100" value="100"></div>
      <select class="sel bm">${BLENDS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>
      <button class="tb bd" title="Дублировать">⧉</button><button class="tb bf" title="Выше">▲</button><button class="tb bb" title="Ниже">▼</button><button class="tb danger bx" title="Удалить">🗑</button>`;
    const sl = bar.querySelector('.bo');
    sl.oninput = e => { const L = S.layers[S.sel]; if (!L) return; L.alpha = e.target.value / 100; syncLayerUI(); render(); }; sl.onchange = () => pushHist('Прозрачность слоя');
    bar.querySelector('.bm').onchange = e => { const L = S.layers[S.sel]; if (!L) return; L.blend = e.target.value; render(); pushHist('Режим наложения'); };
    bar.querySelector('.bd').onclick = () => { const L = S.layers[S.sel]; if (!L) return; const c = JSON.parse(JSON.stringify(L)); c.id = nextId++; c.x = Math.min(.92, c.x + .05); c.y = Math.min(.92, c.y + .05); S.layers.push(c); S.sel = S.layers.length - 1; syncLayerUI(); render(); pushHist('Дубль слоя'); hap(); };
    bar.querySelector('.bf').onclick = () => { const i = S.sel; if (i < 0 || i >= S.layers.length - 1) return; [S.layers[i], S.layers[i + 1]] = [S.layers[i + 1], S.layers[i]]; S.sel = i + 1; render(); pushHist('Слой выше'); hap(); };
    bar.querySelector('.bb').onclick = () => { const i = S.sel; if (i <= 0) return; [S.layers[i], S.layers[i - 1]] = [S.layers[i - 1], S.layers[i]]; S.sel = i - 1; render(); pushHist('Слой ниже'); hap(); };
    bar.querySelector('.bx').onclick = () => { if (S.sel < 0) return; S.layers.splice(S.sel, 1); S.sel = -1; syncLayerUI(); render(); pushHist('Слой удалён'); hap('light'); };
  });
}
function syncLayerUI() {
  const L = S.layers[S.sel];
  document.querySelectorAll('[data-bar]').forEach(bar => { const sl = bar.querySelector('.bo'); sl.disabled = !L; const a = L ? Math.round((L.alpha == null ? 1 : L.alpha) * 100) : 100; sl.value = a; bar.querySelector('.bv').textContent = L ? a : '—'; fill(sl);
    bar.querySelector('.bm').value = L ? (L.blend || 'source-over') : 'source-over'; bar.querySelectorAll('.tb').forEach(b => b.style.opacity = L ? 1 : .4); });
  syncTextUI(); syncShapeUI();
}
function addLayer(o, label) { const L = Object.assign({ id: nextId++, kind: 'text', text: 'Текст', x: .5, y: .5, size: 10, rot: 0, alpha: 1, blend: 'source-over', font: S.text.font, color: S.text.color, bold: false, italic: false, stroke: false, bg: false, shadow: false, align: 'center', kern: 0 }, o);
  S.layers.push(L); S.sel = S.layers.length - 1; syncLayerUI(); render(); pushHist(label || 'Слой'); return L; }
function buildSwatches(el, get, set) { el.innerHTML = ''; for (const c of COLORS) { const b = document.createElement('button'); b.className = 'sw'; b.style.background = c; b.dataset.c = c; b.onclick = () => { set(c); markSw(el, get()); hap(); }; el.appendChild(b); } markSw(el, get()); }
function markSw(el, cur) { el.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', b.dataset.c === cur)); }
const selText = () => { const L = S.layers[S.sel]; return L && L.kind === 'text' ? L : null; };
function buildText() {
  const fr = $('fontRow'); fr.innerHTML = '';
  for (const [f, n] of FONTS) { const b = mkPill(n, false, () => { S.text.font = f; const L = selText(); if (L) { L.font = f; render(); pushHist('Шрифт'); } syncTextUI(); hap(); }); b.style.fontFamily = f; b.dataset.f = f; fr.appendChild(b); }
  const pr = $('tPre'); pr.innerHTML = ''; TPRE.forEach(([n, st]) => pr.appendChild(mkPill(n, false, () => openTextModal('', 'Введи текст…', v => addLayer({ text: v, ...st }, 'Текст')), 'grp')));
}
function syncTextUI() {
  const L = selText(), on = !!L;
  document.querySelectorAll('#fontRow .pill').forEach(b => b.classList.toggle('on', b.dataset.f === (on ? L.font : S.text.font))); markSw($('colRow'), on ? L.color : S.text.color);
  [['tBold', 'bold'], ['tItal', 'italic'], ['tStroke', 'stroke'], ['tBg', 'bg'], ['tShadow', 'shadow'], ['tNeon', 'neon'], ['tGrad', 'grad']].forEach(([id, k]) => $(id).classList.toggle('on', on && !!L[k]));
  $('tAlign').textContent = on ? ({ left: '⇤', center: '≡', right: '⇥' })[L.align] : '≡'; ['tEdit', 'tBold', 'tItal', 'tAlign', 'tStroke', 'tBg', 'tShadow', 'tNeon', 'tGrad'].forEach(i => $(i).style.opacity = on ? 1 : .4);
  if (on) { $('tSize').value = Math.round(L.size); $('tsV').textContent = Math.round(L.size); fill($('tSize')); $('tKern').value = L.kern || 0; $('tkV').textContent = L.kern || 0; fill($('tKern')); }
}
function openTextModal(initial, title, cb) { $('txTitle').textContent = title; $('txIn').value = initial; $('mText').classList.add('on'); setTimeout(() => $('txIn').focus(), 80);
  $('txOk').onclick = () => { const v = $('txIn').value.trim(); $('mText').classList.remove('on'); if (v) cb(v); }; $('txCancel').onclick = () => $('mText').classList.remove('on'); }
$('tAdd').onclick = () => openTextModal('', 'Введи текст…', v => addLayer({ text: v }, 'Текст'));
$('tEdit').onclick = () => { const L = selText(); if (L) openTextModal(L.text, 'Изменить текст', v => { L.text = v; render(); pushHist('Текст'); }); };
[['tBold', 'bold'], ['tItal', 'italic'], ['tStroke', 'stroke'], ['tBg', 'bg'], ['tShadow', 'shadow'], ['tNeon', 'neon'], ['tGrad', 'grad']].forEach(([id, k]) => $(id).onclick = () => { const L = selText(); if (!L) return; L[k] = !L[k]; syncTextUI(); render(); pushHist('Стиль текста'); hap(); });
$('tAlign').onclick = () => { const L = selText(); if (!L) return; L.align = ({ center: 'left', left: 'right', right: 'center' })[L.align]; syncTextUI(); render(); pushHist('Выравнивание'); hap(); };
$('tSize').oninput = e => { const L = S.layers[S.sel]; $('tsV').textContent = e.target.value; fill(e.target); if (L && L.kind === 'text') { L.size = +e.target.value; render(); } };
$('tSize').onchange = () => pushHist('Размер текста');
$('tKern').oninput = e => { const L = selText(); $('tkV').textContent = e.target.value; fill(e.target); if (L) { L.kern = +e.target.value; render(); } };
$('tKern').onchange = () => pushHist('Интервал');
function buildShapes() {
  const row = $('shpRow'); row.innerHTML = '';
  for (const [name, label, asp] of SHAPES) { const b = document.createElement('button'); b.className = 'shp'; b.title = label; const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d');
    x.translate(24, 24); x.fillStyle = '#f5dea5'; shapePath(x, name, 36, Math.max(36 * Math.min(asp, 1), 4)); x.fill('evenodd'); b.appendChild(c);
    b.onclick = () => { S.shape.name = name; addLayer({ kind: 'shape', shape: name, size: name === 'line' ? 50 : 30, aspect: asp, color: S.shape.color, filled: S.shape.fill, outline: !S.shape.fill }, 'Фигура'); hap('light'); }; row.appendChild(b); }
}
const selShape = () => { const L = S.layers[S.sel]; return L && L.kind === 'shape' ? L : null; };
function syncShapeUI() { const L = selShape(); markSw($('shpCol'), L ? L.color : S.shape.color); $('shFill').classList.toggle('on', L ? L.filled : S.shape.fill); $('shStroke').classList.toggle('on', L ? L.outline : !S.shape.fill);
  const Ls = S.layers[S.sel]; if (Ls && (Ls.kind === 'shape' || Ls.kind === 'redact')) { $('shSize').value = Math.round(Ls.size); $('shV').textContent = Math.round(Ls.size); fill($('shSize')); } }
$('shFill').onclick = () => { const L = selShape(); S.shape.fill = true; if (L) { L.filled = !L.filled || !L.outline ? true : false; if (!L.filled && !L.outline) L.outline = true; render(); pushHist('Заливка'); } syncShapeUI(); };
$('shStroke').onclick = () => { const L = selShape(); S.shape.fill = false; if (L) { L.outline = !L.outline; if (!L.outline && !L.filled) L.filled = true; render(); pushHist('Контур'); } syncShapeUI(); };
$('shSize').oninput = e => { const L = S.layers[S.sel]; $('shV').textContent = e.target.value; fill(e.target); if (L && (L.kind === 'shape' || L.kind === 'redact')) { L.size = +e.target.value; render(); } };
$('shSize').onchange = () => pushHist('Размер фигуры');
[['rdPix', 'pixel', 'Мозаика'], ['rdBlur', 'blur', 'Размытие'], ['rdBlack', 'black', 'Чёрный блок']].forEach(([id, mode, n]) => $(id).onclick = () => { addLayer({ kind: 'redact', mode, size: 34, aspect: .45, color: '#000' }, 'Скрыть: ' + n); hap('light'); });
function buildEmoji() {
  const cr = $('emcat'); cr.innerHTML = ''; EMCATS.forEach(([n], i) => cr.appendChild(mkPill(n, i === S.emcat, () => { S.emcat = i; buildEmoji(); hap(); }, 'grp')));
  const g = $('emg'); g.innerHTML = ''; const re = /\p{Extended_Pictographic}(?:️)?(?:‍\p{Extended_Pictographic}️?)*/gu;
  for (const e of EMCATS[S.emcat][1].match(re)) { const b = document.createElement('button'); b.className = 'em'; b.textContent = e;
    b.onclick = () => { addLayer({ kind: 'emoji', text: e, size: 24, font: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif', color: '#fff' }, 'Стикер'); hap('light'); }; g.appendChild(b); }
}
$('addPhoto').onclick = () => $('file2').click();
$('file2').onchange = e => { const f = e.target.files[0]; if (!f) return; const url = URL.createObjectURL(f), im = new Image();
  im.onload = () => { const id = 'i' + nextId++; imgReg[id] = im; addLayer({ kind: 'img', imgId: id, size: 60, aspect: im.naturalHeight / im.naturalWidth, blend: 'screen', alpha: .8 }, 'Своё фото'); URL.revokeObjectURL(url); toast('Режим «Экран» — двойная экспозиция. Поменяй режим выше'); }; im.src = url; e.target.value = ''; };

/* рисование и рамки */
function syncDraw() { [['dBrush', 'brush'], ['dNeon', 'neon'], ['dMark', 'marker'], ['dEr', 'erase']].forEach(([id, t]) => $(id).classList.toggle('on', S.brush.type === t)); markSw($('dCol'), S.brush.color); }
[['dBrush', 'brush'], ['dNeon', 'neon'], ['dMark', 'marker'], ['dEr', 'erase']].forEach(([id, t]) => $(id).onclick = () => { S.brush.type = t; syncDraw(); hap(); });
$('dClear').onclick = () => { if (!S.strokes.length) return; S.strokes = []; render(); pushHist('Очистка рисунка'); hap('light'); };
$('dSize').oninput = e => { S.brush.size = +e.target.value; $('dwV').textContent = e.target.value; fill(e.target); };
function buildFrames() {
  const row = $('frRow'); row.innerHTML = ''; FRAMES.forEach(([id, n]) => { const b = mkPill(n, id === S.frame.id, () => { S.frame.id = S.frame.id === id && id !== 'none' ? 'none' : id; syncFrame(); render(); pushHist('Рамка: ' + n); hap(); }); b.dataset.k = id; row.appendChild(b); });
  buildSwatches($('frCol'), () => S.frame.color, c => { S.frame.color = c; render(); pushHist('Цвет рамки'); });
}
function syncFrame() { document.querySelectorAll('#frRow .pill').forEach(b => b.classList.toggle('on', b.dataset.k === S.frame.id)); markSw($('frCol'), S.frame.color); $('frSize').value = S.frame.size; $('frV').textContent = S.frame.size; fill($('frSize')); }
$('frSize').oninput = e => { S.frame.size = +e.target.value; $('frV').textContent = e.target.value; fill(e.target); render(); };
$('frSize').onchange = () => pushHist('Толщина рамки');

/* ------------------------------------------------------------------ */
/*  АНАЛИЗ, АВТО, ПОМОЩНИК                                             */
/* ------------------------------------------------------------------ */
function analyze() {
  const c = document.createElement('canvas'), n = 72, k = n / Math.max(S.sw, S.sh); c.width = Math.max(2, Math.round(S.sw * k)); c.height = Math.max(2, Math.round(S.sh * k));
  const x = c.getContext('2d'); x.drawImage(S.src, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height).data, ls = [], N = d.length / 4; let sr = 0, sb = 0, sat = 0, dark = 0, bright = 0;
  for (let i = 0; i < d.length; i += 4) { const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, l = .299 * r + .587 * g + .114 * b; ls.push(l); sr += r; sb += b; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); sat += mx ? (mx - mn) / mx : 0; if (l < .08) dark++; if (l > .94) bright++; }
  ls.sort((a, b) => a - b); const q = p => ls[Math.min(ls.length - 1, Math.floor(p * ls.length))];
  S.stats = { mean: ls.reduce((a, b) => a + b, 0) / N, p5: q(.05), p95: q(.95), sat: sat / N, warm: (sr - sb) / N, dark: dark / N, bright: bright / N };
  const s = S.stats, sg = [], add = (title, desc, fn) => sg.push({ title, desc, fn });
  if (s.mean < .3) add('Фото тёмное', 'Осветлим и вытянем тени.', () => Object.assign(S.p, { exposure: clamp((.46 - s.mean) * 140, 0, 60), shadows: 30, blacks: -10 }));
  if (s.mean > .68) add('Фото пересвечено', 'Приглушим света и яркость.', () => Object.assign(S.p, { exposure: -clamp((s.mean - .5) * 120, 0, 45), highlights: -35, whites: -15 }));
  if (s.p95 - s.p5 < .6) add('Мало контраста', 'Добавим глубину и чёткость.', () => Object.assign(S.p, { contrast: clamp((.8 - (s.p95 - s.p5)) * 90, 10, 40), clarity: 18 }));
  if (s.sat < .24) add('Блеклые цвета', 'Сделаем цвета живее.', () => Object.assign(S.p, { saturation: 14, vibrance: 28 }));
  if (Math.abs(s.warm) > .07) add(s.warm < 0 ? 'Фото холодное (синее)' : 'Фото слишком тёплое', 'Выровняем баланс белого.', () => { S.p.temperature = clamp(-s.warm * 260, -40, 40); });
  if (s.bright > .06) add('Есть пересветы', 'Вернём детали в светлых местах.', () => { S.p.highlights = Math.min(S.p.highlights, -30); });
  if (s.dark > .12) add('Много чёрных провалов', 'Подтянем тени.', () => { S.p.shadows = Math.max(S.p.shadows, 28); });
  add('Добавить «кино»', 'Фильтр «Кино» на 70% — тёплые света, прохладные тени.', () => { S.filter = { id: 'cinema', int: 70 }; });
  S.sugg = sg; $('wandDot').style.display = sg.length > 1 ? 'block' : 'none';
}
function applySugg(i) { const s = S.sugg[i]; if (!s) return; s.fn(); syncUI(); render(); pushHist('Совет: ' + s.title); toast('Применено: ' + s.title); hap('light'); }
function autoApply(kind, silent) {
  const s = S.stats; if (!s) return;
  if (kind === 'light' || kind === 'all') Object.assign(S.p, { exposure: clamp(Math.log2(.46 / Math.max(.05, s.mean)) / 1.4 * 60, -45, 55), shadows: s.mean < .4 ? 26 : 8, highlights: s.p95 > .97 ? -28 : 0, contrast: s.p95 - s.p5 < .7 ? 18 : 6 });
  if (kind === 'color' || kind === 'all') Object.assign(S.p, { temperature: clamp(-s.warm * 240, -35, 35), saturation: s.sat < .3 ? 14 : 4, vibrance: 22 });
  if (kind === 'all') Object.assign(S.p, { clarity: 14, sharpen: 12, denoise: 8, texture: 10 });
  syncUI(); render(); pushHist('Авто: ' + ({ all: 'улучшение', light: 'свет', color: 'цвет' })[kind]); if (!silent) toast('Готово — можно докрутить вручную'); hap('light');
}
$('aAuto').onclick = () => autoApply('all'); $('aLight').onclick = () => autoApply('light'); $('aColor').onclick = () => autoApply('color'); $('aMagic').onclick = () => magic();
$('aAll').onclick = () => { S.p = zeroParams(); S.hsl = Array.from({ length: 8 }, () => [0, 0, 0]); S.filter = { id: 'orig', int: 100 }; S.fx = []; S.frame = NOFRAME(); S.geo.ang = 0; S.curves = NOCURVE(); S.local = NOLOCAL(); S.mineOn = null; updateCurveTex(); syncUI(); render(); pushHist('Сброс всего'); hap('light'); };
function renderSugg(el, withDone) {
  el.innerHTML = ''; if (!S.sugg.length) { el.innerHTML = '<div class="note">Загрузи фото — я его осмотрю.</div>'; return; }
  S.sugg.forEach((s, i) => { const d = document.createElement('div'); d.className = 'sug'; d.innerHTML = `<div><b>${s.title}</b>${s.desc}</div>`; const b = document.createElement('button'); b.textContent = 'Применить'; b.onclick = () => { applySugg(i); if (withDone) $('mWand').classList.remove('on'); }; d.appendChild(b); el.appendChild(d); });
}
const TIPS = { filters: 'Листай фильтры вбок. Нажал фильтр — применился, нажал ещё раз — отключился. Свайп по фото тоже листает.', adjust: 'Выбери группу и настройку, двигай ползунок. Точка рядом — значит, ты её менял(а).',
  curves: 'Кривая яркости: подтяни вверх — светлее, вниз — темнее. Каналы R/G/B дают цветовые сдвиги.', hsl: 'Меняй один цвет отдельно: сделай небо синее, не трогая кожу.',
  local: 'Закрась участок кистью — потом настрой, что с ним сделать. «Лечение» убирает пятна. Два пальца — приблизить.', crop: 'Тяни углы рамки. Пропорции сверху — для Instagram, историй и экрана.',
  fx: 'Эффекты света и осадков ложатся поверх. Нажми ещё раз на эффект — он уберётся.', text: 'Тап по тексту выбирает его. Двумя пальцами — размер и поворот.', shape: 'Фигуры — для рамок и стрелок. «Скрыть» закрывает лица и номера мозаикой.',
  stick: 'Стикеры двигай пальцем. Своё фото + режим «Экран» = двойная экспозиция.', draw: 'Рисуй пальцем. «Неон» светится, «Маркер» полупрозрачный.', frame: 'Нажми рамку ещё раз — отключится. «Скруглить» и «Круг» дадут прозрачные углы в PNG.',
  auto: 'Нажми «Магия» — палочка сама улучшит фото. «История» покажет все шаги.',
  smart: 'Умные функции: поворот по лицам, человек по центру, скрыть лица, горизонт, стиль с другого фото.', erase: 'Закрась объект кистью или тапни по нему — потом «Удалить». Птица в небе, лишний человек, надпись.' };
const setTip = t => { $('tipText').textContent = t; };
$('tipX').onclick = () => { $('tipbar').classList.add('off'); lsSet('studio_notips', '1'); };
$('bWand').onclick = () => { $('wandSay').textContent = S.src ? (S.sugg[0] ? `Я осмотрела фото. ${S.sugg[0].title}: ${S.sugg[0].desc} Вот что можно сделать:` : 'С фото всё хорошо! Можно сразу играть с фильтрами.') : 'Загрузи фото — и я подскажу, что в нём улучшить.'; renderSugg($('wandSug'), true); $('mWand').classList.add('on'); };
$('wandClose').onclick = () => $('mWand').classList.remove('on');
$('wandTour').onclick = () => { $('mWand').classList.remove('on'); startTour(); };
const TOUR = [['Добро пожаловать!', 'Я волшебная палочка. Покажу, как тут всё устроено — это быстро.'], ['Инструменты внизу', 'Листай нижнюю панель вбок: фильтры, правка, кривые, цвета, кисть, кадр, эффекты, текст, фигуры, стикеры, рисунок, рамки.'],
  ['Нажал — применилось, нажал — убралось', 'Фильтры, эффекты и рамки включаются и выключаются повторным нажатием. Ползунок меняет силу.'], ['Жесты', 'Два пальца по фото — приблизить. Двойной тап — быстрый зум. Для сравнения зажми «Оригинал» или потяни шторку ⇔.'],
  ['Магия', 'Кнопка «Магия» слева внизу — палочка сама улучшит фото. А «История» в разделе «Авто» вернёт любой шаг.'], ['Готово — сохраняй', 'Нажми «Готово» справа вверху, выбери формат и сохрани результат.']];
let tourI = 0;
function startTour() { tourI = 0; showTour(); $('tour').classList.add('on'); }
function showTour() { $('tourH').textContent = TOUR[tourI][0]; $('tourP').textContent = TOUR[tourI][1]; $('tourDots').innerHTML = TOUR.map((_, i) => `<i class="${i === tourI ? 'on' : ''}"></i>`).join(''); $('tourNext').textContent = tourI === TOUR.length - 1 ? 'Поехали!' : 'Дальше'; }
$('tourNext').onclick = () => { if (tourI < TOUR.length - 1) { tourI++; showTour(); } else { $('tour').classList.remove('on'); lsSet('studio_tour', '1'); } };

/* ------------------------------------------------------------------ */
/*  ВОЛШЕБНАЯ ПАЛОЧКА: рисунок, искры, полёт при входе и по «Магии»    */
/* ------------------------------------------------------------------ */
function buildWand() {
  const top = x => 74.3 + (x - 26) * .02768, bot = x => 85.7 - (x - 26) * .02768, f = n => +n.toFixed(2); let s = '';
  s += `<defs>
   <linearGradient id="wWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a77544"/><stop offset=".3" stop-color="#6a4120"/><stop offset=".7" stop-color="#3a2210"/><stop offset="1" stop-color="#1a0e06"/></linearGradient>
   <linearGradient id="wGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c8"/><stop offset=".45" stop-color="#d9b062"/><stop offset="1" stop-color="#7a5a22"/></linearGradient>
   <radialGradient id="wBall" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff6d2"/><stop offset=".5" stop-color="#d4af64"/><stop offset="1" stop-color="#6e4f1c"/></radialGradient>
   <radialGradient id="wCry" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#ffe9a8"/><stop offset="1" stop-color="#d89a2c"/></radialGradient>
   <radialGradient id="wHalo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffeeb4" stop-opacity=".75"/><stop offset=".5" stop-color="#ffd878" stop-opacity=".25"/><stop offset="1" stop-color="#ffd878" stop-opacity="0"/></radialGradient>
   <radialGradient id="wRuby" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff8a9a"/><stop offset=".5" stop-color="#c4243b"/><stop offset="1" stop-color="#5a0a18"/></radialGradient></defs>`;
  s += '<g transform="rotate(-45 80 80)">';
  s += '<circle cx="147" cy="80" r="24" fill="url(#wHalo)"/>';
  s += `<path d="M26 ${f(top(26))} L138 ${f(top(138))} L138 ${f(bot(138))} L26 ${f(bot(26))} Z" fill="url(#wWood)" stroke="#140a04" stroke-width="1.1" stroke-linejoin="round"/>`;
  for (const [x0, o, w] of [[32, -3.4, .5], [40, 2.8, .45], [60, -1.2, .4], [88, 1.6, .4], [30, 3.8, .4], [70, -2.6, .35]]) s += `<path d="M${x0} ${f(80 + o)} q18 ${o > 0 ? -.9 : .9} 36 .2 t38 -.3" fill="none" stroke="#25130a" stroke-opacity=".38" stroke-width="${w}"/>`;
  s += `<path d="M30 ${f(top(30) + 1.1)} L136 ${f(top(136) + 1)}" stroke="#e0b27a" stroke-opacity=".5" stroke-width=".9" stroke-linecap="round"/>`;
  for (let x = 54; x < 126; x += 8.5) s += `<path d="M${x} ${f(top(x) + .4)} L${f(x + 6)} ${f(bot(x + 6) - .4)}" stroke="#170c05" stroke-width="1" stroke-linecap="round"/><path d="M${f(x + 1.5)} ${f(top(x) + .5)} L${f(x + 7.5)} ${f(bot(x + 6) - .3)}" stroke="#c8935a" stroke-opacity=".5" stroke-width=".7" stroke-linecap="round"/>`;
  s += `<path d="M26 ${f(top(26))} L52 ${f(top(52))} L52 ${f(bot(52))} L26 ${f(bot(26))} Z" fill="#2a1508" stroke="#100803" stroke-width=".8"/>`;
  for (let x = 28; x < 51; x += 3) s += `<path d="M${x} ${f(top(x) + .2)} L${f(x + 2.4)} ${f(bot(x + 2) - .2)}" stroke="#7a5128" stroke-width=".9" stroke-opacity=".9" stroke-linecap="round"/>`;
  for (const x of [25.5, 32, 38.5, 45, 51.5]) { const hh = bot(x) - top(x) + 2.2; s += `<rect x="${x}" y="${f(80 - hh / 2)}" width="2.3" height="${f(hh)}" rx="1.3" fill="url(#wGold)" stroke="#3a2410" stroke-width=".6"/><path d="M${f(x + .8)} ${f(80 - hh / 2 + 1)} v${f(hh - 2)}" stroke="#fffbe6" stroke-opacity=".55" stroke-width=".5"/>`; }
  s += '<ellipse cx="19" cy="80" rx="8.4" ry="8.8" fill="url(#wBall)" stroke="#3a2410" stroke-width=".9"/><circle cx="19" cy="80" r="3.1" fill="url(#wRuby)" stroke="#3a0a12" stroke-width=".6"/><circle cx="18" cy="78.8" r=".9" fill="#fff" opacity=".9"/>';
  s += '<path d="M12.4 75.6 q-2.6 4.4 0 8.8 M25.6 75.6 q2.6 4.4 0 8.8" fill="none" stroke="#7a5a22" stroke-width=".7"/>';
  for (const x of [121, 126.5]) { const hh = bot(x) - top(x) + 3.4; s += `<rect x="${x}" y="${f(80 - hh / 2)}" width="2.5" height="${f(hh)}" rx="1.1" fill="url(#wGold)" stroke="#3a2410" stroke-width=".55"/>`; }
  s += '<path d="M129.5 78.4 q6 -6.6 12.6 -2.6 M129.5 81.6 q6 6.6 12.6 2.6" fill="none" stroke="url(#wGold)" stroke-width="1" stroke-linecap="round"/><circle cx="124" cy="80" r=".8" fill="#fff3c8"/>';
  const pts = []; for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4, r = k % 2 ? 4.9 : 12.5; pts.push(`${f(147 + r * Math.cos(an))},${f(80 + r * Math.sin(an))}`); }
  s += `<path d="M144.4 76.6 L141 80 L144.4 83.4 Z" fill="#e9b24a" opacity=".6"/><polygon points="${pts.join(' ')}" fill="url(#wCry)" stroke="#8a5a10" stroke-width=".8" stroke-linejoin="round"/>`;
  for (let k = 0; k < 8; k += 2) { const an = k * Math.PI / 4; s += `<path d="M147 80 L${f(147 + 12.5 * Math.cos(an))} ${f(80 + 12.5 * Math.sin(an))}" stroke="#fff6d2" stroke-opacity=".9" stroke-width=".55"/>`; }
  s += '<circle cx="147" cy="80" r="3.3" fill="#fff" opacity=".95"/>';
  for (const [dx, dy, l, o] of [[1, 0, 21, .85], [-1, 0, 8, .5], [0, 1, 15, .55], [0, -1, 15, .55], [.7, .7, 12, .4], [.7, -.7, 12, .4]]) s += `<path d="M${147 + dx * 14} ${80 + dy * 14} L${f(147 + dx * (14 + l))} ${f(80 + dy * (14 + l))}" stroke="#ffeab0" stroke-opacity="${o}" stroke-width=".7" stroke-linecap="round"/>`;
  s += '<path d="M159 66 l1.2 3.1 3.1 1.2 -3.1 1.2 -1.2 3.1 -1.2 -3.1 -3.1 -1.2 3.1 -1.2z M157 94 l.9 2.3 2.3 .9 -2.3 .9 -.9 2.3 -.9 -2.3 -2.3 -.9 2.3 -.9z M136 60 l.8 2 2 .8 -2 .8 -.8 2 -.8 -2 -2 -.8 2 -.8z" fill="#fff3c9"/>';
  s += '</g>'; $('wand').innerHTML = s;
}
buildWand();
const svgURI = s => 'url("data:image/svg+xml;utf8,' + encodeURIComponent(s) + '")';
const SPR = [
  svgURI('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffeaa8"/><stop offset="1" stop-color="#d4a64a"/></radialGradient></defs><path d="M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8Z" fill="url(#g)"/></svg>'),
  svgURI('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 1 L13.1 10.9 L23 12 L13.1 13.1 L12 23 L10.9 13.1 L1 12 L10.9 10.9Z" fill="#fff6d2"/></svg>'),
  svgURI('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#ffe9a8"/><stop offset="1" stop-color="#ffd878" stop-opacity="0"/></radialGradient></defs><circle cx="12" cy="12" r="11" fill="url(#g)"/></svg>'),
  svgURI('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#cfe9ff"/><stop offset="1" stop-color="#8fb8e8"/></radialGradient></defs><path d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4Z" fill="url(#g)"/></svg>')];
function spark(x, y, o = {}) {
  const el = document.createElement('i'); el.className = 'sp'; const r = Math.random(), sp = o.sprite != null ? o.sprite : (r < .38 ? 0 : r < .66 ? 1 : r < .9 ? 2 : 3), size = o.size || (sp === 2 ? 6 + Math.random() * 10 : 9 + Math.random() * 15);
  el.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background-image:${SPR[sp]}`; document.body.appendChild(el);
  const dx = (Math.random() - .5) * (o.spread || 60), dy = (Math.random() - .5) * (o.spread || 60) + (o.fall || 24), rot = (Math.random() - .5) * 200;
  el.animate([{ transform: 'translate(-50%,-50%) scale(.1) rotate(0deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(' + rot * .4 + 'deg)', opacity: 1, offset: .22 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.15) rotate(${rot}deg)`, opacity: 0 }],
    { duration: o.dur || (650 + Math.random() * 550), easing: 'ease-out' }).onfinish = () => el.remove();
}
function burst(x, y, n = 12, o) { for (let i = 0; i < n; i++) setTimeout(() => spark(x, y, o), i * 18); }
function sparkAtEl(el) { if (!el) return; const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 7, { spread: 56 }); }
let flying = false;
function flyWand(pts, dur = 2000, onMid) {
  if (flying) return; flying = true; const w = $('flyWand'), vw = innerWidth, vh = innerHeight, SZ = 120;
  pts = pts || [[vw * .08, vh * .8], [vw * .3, vh * .35], [vw * .55, vh * .62], [vw * .82, vh * .2], [vw * 1.12, vh * .4]];
  const N = 54, catmull = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return [0, 1].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)); };
  const path = []; const per = N / (pts.length - 1); for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < per; s++) path.push(catmull(pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)], s / per)); path.push(pts[pts.length - 1]);
  const frames = [], tips = [], tx = SZ * .205, ty = -SZ * .205;  /* вектор от центра к кончику при повороте 0 */
  path.forEach((p, i) => { const q = path[Math.min(path.length - 1, i + 1)], pr = path[Math.max(0, i - 1)], ang = Math.atan2(q[1] - pr[1], q[0] - pr[0]) * 180 / Math.PI;
    const a = ang * .35 + Math.sin(i / 3.2) * 9 + 8, ra = a * Math.PI / 180, sc = 1 + Math.sin(i / path.length * Math.PI) * .22;
    frames.push({ transform: `translate(${p[0] - SZ / 2}px,${p[1] - SZ / 2}px) rotate(${a}deg) scale(${sc})`, opacity: i < 2 || i > path.length - 3 ? 0 : 1, offset: i / (path.length - 1) });
    tips.push([p[0] + (tx * Math.cos(ra) - ty * Math.sin(ra)) * sc * 1.9, p[1] + (tx * Math.sin(ra) + ty * Math.cos(ra)) * sc * 1.9]); });
  const anim = w.animate(frames, { duration: dur, easing: 'ease-in-out' });
  const tick = setInterval(() => { const ct = anim.currentTime || 0, i = Math.min(tips.length - 1, Math.floor(ct / dur * (tips.length - 1))); if (tips[i]) { spark(tips[i][0], tips[i][1], { spread: 36, fall: 28, dur: 900 }); if (Math.random() < .6) spark(tips[i][0], tips[i][1], { spread: 26, sprite: 2, size: 6 }); } }, 38);
  const mid = setTimeout(() => onMid && onMid(), dur * .45);
  let ended = false; const done = () => { if (ended) return; ended = true; clearInterval(tick); clearTimeout(mid); w.style.opacity = 0; flying = false; try { anim.cancel(); } catch (e) {} };
  anim.onfinish = done; setTimeout(done, dur + 350);
}
function magic() {
  if (!S.src || flying) return; const st = $('stage').getBoundingClientRect(), cx = st.left + st.width / 2, cy = st.top + st.height / 2, R = Math.min(st.width, st.height) * .16;
  const loop = [0, 1, 2, 3, 4, 5].map(i => { const a = -1.2 + i * 1.05; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R * .8]; });
  flyWand([[st.left - 30, st.bottom - 30], [st.left + st.width * .28, st.top + st.height * .75], ...loop, [st.right + 50, st.top + 10]], 2800, () => {
    const sw = $('sweep'); sw.classList.remove('go'); void sw.offsetWidth; sw.classList.add('go'); autoApply('all', true); burst(cx, cy, 24, { spread: 200 }); toast('✨ Готово! Свет, цвет и чёткость подтянуты'); });
  hap('light');
}
$('bMagic').onclick = magic; $('sMagic') && ($('sMagic').onclick = magic);
/* при входе в приложение палочка пролетает один раз */
setTimeout(() => { if (!document.hidden) flyWand(null, 2400); }, 700);
/* ------------------------------------------------------------------ */
/*  ВКЛАДКИ, СРАВНЕНИЕ, ЭКСПОРТ                                        */
/* ------------------------------------------------------------------ */
function setTab(t) {
  const prev = S.tab; S.tab = t; S.pick = false;
  if (!['text', 'shape', 'stick'].includes(t)) S.sel = -1; else if (S.layers[S.sel] && ((t === 'text' && S.layers[S.sel].kind !== 'text') || (t === 'shape' && !['shape', 'redact'].includes(S.layers[S.sel].kind)))) S.sel = -1;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === t)); document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
  if (t === 'crop') setView(1, 0, 0);
  if (t === 'auto') renderSugg($('sugList'), false);
  if (!lsGet('studio_notips')) { $('tipbar').classList.remove('off'); setTip(TIPS[t]); }
  if (S.src) { syncUI(); layout(); render(); if (t === 'curves') drawCurve(); }
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => { setTab(b.dataset.t); hap(); b.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' }); });
function syncUI() { syncFilters(); syncAdjust(); syncHSL(); syncLocal(); syncCrop(); syncFx(); syncLayerUI(); syncDraw(); syncFrame(); updUndo(); if (S.tab === 'curves') drawCurve(); }
function holdCmp(on) { if (S.compare === on) return; S.compare = on; $('hint').classList.toggle('on', on); layout(); render(); }
const cmp = $('bCmp'); cmp.addEventListener('pointerdown', e => { e.preventDefault(); holdCmp(true); hap(); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => cmp.addEventListener(ev, () => holdCmp(false)));
let expFmt = 'jpg', expSize = 4096, expQ = .92, expUrl = null, expBlob = null;
function renderExport(maxSide) {
  const [fw, fh] = frameSize(S.geo.rot), c = S.geo.crop; let w = fw * c.w, h = fh * c.h; const k = Math.min(1, maxSide / Math.max(w, h)); w = Math.max(2, Math.round(w * k)); h = Math.max(2, Math.round(h * k));
  drawGL(S.geo, c, effective(S.p, S.hsl, S.filter, true), w, h);
  const out = document.createElement('canvas'); out.width = w; out.height = h; const x = out.getContext('2d'); if (expFmt === 'jpg') { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); }
  x.drawImage(glc, 0, 0); BASE = out; S.fx.forEach(L => drawFx(x, L, w, h)); drawStrokes(x, w, h); S.layers.forEach(L => drawLayer(x, L, w, h)); drawFrame(x, w, h, S.frame, expFmt === 'jpg'); render(); return out;
}
async function makeExport() {
  $('expNote').textContent = 'Готовлю…'; await wait(30); const cv = renderExport(expSize), type = ({ png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg' })[expFmt];
  expBlob = await new Promise(r => cv.toBlob(r, type, expQ)); if (expUrl) URL.revokeObjectURL(expUrl); expUrl = URL.createObjectURL(expBlob);
  $('expImg').src = expUrl; $('expNote').textContent = `${cv.width}×${cv.height} · ${(expBlob.size / 1048576).toFixed(1)} МБ. Нажми и удерживай картинку, чтобы сохранить в галерею.`;
}
$('bExport').onclick = async () => { $('mExp').classList.add('on'); await makeExport(); hap('light'); };
$('segFmt').onclick = e => { const b = e.target.closest('button'); if (!b) return; expFmt = b.dataset.f; [...$('segFmt').children].forEach(x => x.classList.toggle('on', x === b)); makeExport(); };
$('segSz').onclick = e => { const b = e.target.closest('button'); if (!b) return; expSize = +b.dataset.s; [...$('segSz').children].forEach(x => x.classList.toggle('on', x === b)); makeExport(); };
$('qSl').oninput = e => { expQ = e.target.value / 100; $('qV').textContent = e.target.value; fill(e.target); }; $('qSl').onchange = () => makeExport();
$('expClose').onclick = () => $('mExp').classList.remove('on');
$('expSave').onclick = () => { if (!expBlob) return; const a = document.createElement('a'); a.href = expUrl; a.download = 'studio.' + expFmt; document.body.appendChild(a); a.click(); a.remove(); toast('Файл сохранён'); burst(innerWidth / 2, innerHeight * .6, 16, { spread: 200 }); };
$('expShare').onclick = async () => { if (!expBlob) return; const f = new File([expBlob], 'studio.' + expFmt, { type: expBlob.type }); try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Студия' }); else toast('Удерживай картинку, чтобы сохранить'); } catch (e) {} };

/* ------------------------------------------------------------------ */
/*  ПРОЧЕЕ                                                             */
/* ------------------------------------------------------------------ */
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2300); }
$('bOpen').onclick = () => $('file').click();
$('file').onchange = e => { const f = e.target.files[0]; if (f) loadImage(URL.createObjectURL(f)); e.target.value = ''; };
$('bSample').onclick = () => loadImage(makeSample(), true);
$('bClose').onclick = () => { if (tg) { try { tg.close(); return; } catch (e) {} } if (S.src && !confirm('Закрыть студию? Правки не сохранятся.')) return; location.reload(); };
window.addEventListener('resize', () => { layout(); render(); });
['dragover', 'drop'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' && e.dataTransfer.files[0]) loadImage(URL.createObjectURL(e.dataTransfer.files[0])); }));

$('feats').innerHTML = [[FILTERS.length, 'фильтров'], [PKEYS.length, 'настроек'], [FX.length, 'эффектов света'], [SHAPES.length, 'фигур'], [FONTS.length, 'шрифтов'], [FRAMES.length - 1, 'рамок']].map(([n, t]) => `<div class="feat"><b>${n}</b>${t}</div>`).join('');
try { S.mine = JSON.parse(lsGet('studio_mine') || '[]'); } catch (e) { S.mine = []; }
try { initGL(); } catch (err) { document.querySelector('.room h1').textContent = 'Графика недоступна: ' + err.message; }
buildAdjust(); buildCurves(); buildHSL(); buildLocal(); buildAspects(); buildFx(); buildText(); buildShapes(); buildEmoji(); buildFrames(); makeBars();
buildSwatches($('colRow'), () => selText() ? selText().color : S.text.color, c => { S.text.color = c; const L = selText(); if (L) { L.color = c; render(); pushHist('Цвет текста'); } });
buildSwatches($('shpCol'), () => selShape() ? selShape().color : S.shape.color, c => { S.shape.color = c; const L = selShape(); if (L) { L.color = c; render(); pushHist('Цвет фигуры'); } });
buildSwatches($('dCol'), () => S.brush.color, c => { S.brush.color = c; if (S.brush.type === 'erase') S.brush.type = 'brush'; syncDraw(); });
document.querySelectorAll('input[type=range]').forEach(fill);
if (lsGet('studio_notips')) $('tipbar').classList.add('off');
FONTS.slice(7).forEach(([f]) => { try { document.fonts.load('700 40px ' + f).then(() => S.src && render()); } catch (e) {} });
setTab('filters'); drawCurve();
window.__S = S;

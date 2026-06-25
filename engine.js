// 共通エンジン: index.html(v1) で実証済みの足回りを集約。
// 各デモは shader だけ書けばよい。単パスは singlePass()、多パスは init/draw/resize を自前で。
import { Renderer, Program, Mesh, Triangle, Geometry, RenderTarget, Texture, Vec2 }
  from 'https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm';
export { Renderer, Program, Mesh, Triangle, Geometry, RenderTarget, Texture, Vec2 };

// precision ガード（古い端末で fragment highp が無い場合の保険）
export const PRECISION = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

export const VERT_FULLSCREEN =
  `attribute vec2 position; attribute vec2 uv; varying vec2 vUv;
   void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

const CSS = `
html,body{margin:0;height:100%;background:#0c0e12;overflow:hidden;color:#e8eaf0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif;
  -webkit-tap-highlight-color:transparent}
canvas{display:block;width:100vw;height:100vh;position:fixed;inset:0}
#hud{position:fixed;top:calc(env(safe-area-inset-top) + 10px);left:10px;z-index:10;
  background:rgba(12,14,18,.62);border:1px solid #262b35;border-radius:10px;padding:9px 11px;
  font-size:12px;line-height:1.55;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  min-width:150px;font-variant-numeric:tabular-nums}
#hud b{color:#3fd6c2;font-weight:700}#hud .v{color:#fff;font-weight:700}#hud .warn{color:#ffb454}
#fpsbar{height:4px;border-radius:3px;margin-top:5px;background:#1a1e26;overflow:hidden}
#fpsfill{height:100%;width:0%;background:linear-gradient(90deg,#3fd6c2,#c46bff);transition:width .2s}
#title{position:fixed;top:calc(env(safe-area-inset-top) + 10px);right:10px;z-index:10;text-align:right;
  background:rgba(12,14,18,.5);border:1px solid #262b35;border-radius:10px;padding:7px 11px;font-size:12px;max-width:52vw}
#title b{font-size:13px;color:#fff}#title small{color:#9aa3b2}
#ctrl{position:fixed;bottom:calc(env(safe-area-inset-bottom) + 12px);left:50%;transform:translateX(-50%);
  z-index:10;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:78vw}
.btn{appearance:none;border:1px solid #2d333f;background:rgba(20,23,29,.75);color:#cfd5e0;border-radius:999px;
  padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);white-space:nowrap}
.btn:active{transform:scale(.95)}.btn.on{background:#3fd6c2;color:#06120f;border-color:#3fd6c2}
#mlink{position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:10;
  color:#9aa3b2;font-size:12px;text-decoration:none;border:1px solid #2d333f;border-radius:999px;
  padding:8px 12px;background:rgba(20,23,29,.6)}
#gate{position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:16px;background:radial-gradient(800px 600px at 50% 40%,#16203a 0%,#0c0e12 60%);text-align:center;padding:24px}
#gate h1{font-size:22px;margin:0;font-weight:800}#gate p{margin:0;color:#9aa3b2;font-size:14px;max-width:360px;line-height:1.7}
#start{font-size:16px;padding:14px 30px;border-radius:999px;border:none;font-weight:800;
  background:linear-gradient(135deg,#3fd6c2,#c46bff);color:#06120f;cursor:pointer}
#start:active{transform:scale(.96)}.hint{font-size:12px;color:#6b7382}
#errlog{position:fixed;left:8px;right:8px;bottom:64px;z-index:30;max-height:42vh;overflow:auto;
  background:rgba(45,0,0,.9);border:1px solid #8a3030;border-radius:8px;color:#ff9a9a;
  font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;padding:8px 10px;white-space:pre-wrap;display:none}
#errlog .x{color:#fff;float:right;font-weight:700;cursor:pointer}
#panelBtn{position:fixed;top:calc(env(safe-area-inset-top) + 54px);right:10px;z-index:11}
#panel{position:fixed;top:calc(env(safe-area-inset-top) + 92px);right:10px;z-index:11;width:240px;max-width:74vw;
  max-height:64vh;overflow:auto;background:rgba(12,14,18,.85);border:1px solid #262b35;border-radius:10px;
  padding:10px 12px;display:none;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
#panel .row{margin:9px 0}
#panel label{font-size:11px;color:#9aa3b2;display:flex;justify-content:space-between;margin-bottom:3px}
#panel label span:last-child{color:#fff;font-variant-numeric:tabular-nums}
#panel input[type=range]{width:100%;accent-color:#3fd6c2}
#panel input[type=color]{width:100%;height:28px;border:1px solid #2d333f;border-radius:6px;background:none;padding:0}
#panel .pbtn{width:100%;font-size:12px;padding:7px 10px;margin-top:2px}
`;

export function mount(demo, meta = {}) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  document.body.innerHTML = `
    <div id="hud">
      <div><b>FPS</b> <span class="v" id="fps">–</span> <span id="cap" class="warn"></span></div>
      <div id="fpsbar"><div id="fpsfill"></div></div>
      <div><b>buffer</b> <span class="v" id="res">–</span></div>
      <div><b>scale</b> <span class="v" id="scalev">100%</span> · dpr <span class="v" id="dprv">–</span></div>
      <div><b>tilt</b> <span class="v" id="tiltv">gyro待機</span></div>
    </div>
    <div id="title"><b>${meta.title || ''}</b><br><small>${meta.subtitle || ''}</small></div>
    <a id="mlink" href="../index.html">← 一覧</a>
    <div id="ctrl">
      <button class="btn" id="b-gyro">ジャイロ</button>
      <button class="btn" id="b-cap">30fps</button>
      <button class="btn on" id="b-s100">100%</button>
      <button class="btn" id="b-s75">75%</button>
      <button class="btn" id="b-s50">50%</button>
    </div>
    <div id="gate">
      <h1>${meta.title || 'Shader Demo'}</h1>
      <p>${meta.subtitle || ''}</p>
      <button id="start">タップして開始</button>
      <div class="hint">PCではマウスのドラッグで傾きを擬似入力できます</div>
    </div>
    <div id="errlog"></div>`;

  // ---- エラーを画面表示（モバイルでシェーダのコンパイルエラー等を読むため）----
  // OGL はコンパイルエラーを console.error/warn に出すので、それを拾って画面へ。
  // シェーダのコンパイルは demo.init で起きるため、その前に仕込む。
  (function captureErrors(){
    const box = document.getElementById('errlog');
    const stamp = (tag, args) => {
      box.style.display = 'block';
      if (!box.querySelector('.x')) {
        const x = document.createElement('span'); x.className = 'x'; x.textContent = '×';
        x.onclick = () => box.style.display = 'none'; box.appendChild(x);
      }
      const line = Array.from(args).map(a => (a && a.stack) ? a.stack : String(a)).join(' ');
      box.appendChild(document.createTextNode(tag + line + '\n'));
    };
    const e0 = console.error.bind(console), w0 = console.warn.bind(console);
    console.error = (...a) => { stamp('[error] ', a); e0(...a); };
    console.warn  = (...a) => { stamp('[warn] ',  a); w0(...a); };
    window.addEventListener('error', ev => stamp('[js] ', [ev.message + ' @ ' + (ev.filename||'') + ':' + (ev.lineno||0)]));
    window.addEventListener('unhandledrejection', ev => stamp('[promise] ', [ev.reason]));
  })();

  const DPR_CAP = 1.5; let renderScale = 1.0;
  const renderer = new Renderer({ alpha: false, antialias: false, depth: false, dpr: 1 });
  const gl = renderer.gl;
  gl.clearColor(0.03, 0.035, 0.045, 1);
  document.body.appendChild(gl.canvas);

  const state = demo.init ? demo.init(gl, renderer) : {};

  const $ = id => document.getElementById(id);
  const hud = { fps:$('fps'), res:$('res'), scale:$('scalev'), dpr:$('dprv'), tilt:$('tiltv'), cap:$('cap'), fill:$('fpsfill') };

  function resize() {
    renderer.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP) * renderScale;
    renderer.setSize(window.innerWidth, window.innerHeight);
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    if (demo.resize) demo.resize(state, w, h);
    hud.res.textContent = w + '×' + h;
    hud.dpr.textContent = renderer.dpr.toFixed(2);
  }
  window.addEventListener('resize', resize);

  // ---- 傾き入力（ジャイロ＋マウスフォールバック＋スムージング）----
  const tilt = { x:0, y:0, tx:0, ty:0 };
  let dragging = false;
  function pointer(e){ if(!dragging) return; const p = e.touches ? e.touches[0] : e;
    tilt.tx = p.clientX / window.innerWidth * 2 - 1; tilt.ty = -(p.clientY / window.innerHeight * 2 - 1); }
  addEventListener('pointerdown', e => { dragging = true; pointer(e); });
  addEventListener('pointermove', pointer);
  addEventListener('pointerup', () => dragging = false);

  function onOrient(e){ if(e.gamma == null) return;
    tilt.tx = Math.max(-1, Math.min(1, e.gamma / 45));
    tilt.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 45));
    hud.tilt.textContent = e.gamma.toFixed(0)+'°, '+e.beta.toFixed(0)+'°'; }
  async function enableGyro(){
    try{
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function'){
        const r = await DOE.requestPermission();
        if (r !== 'granted'){ hud.tilt.textContent = '許可されず'; return; }
      }
      window.addEventListener('deviceorientation', onOrient);
      $('b-gyro').classList.add('on'); hud.tilt.textContent = 'gyro ON';
    }catch(err){ hud.tilt.textContent = '非対応'; }
  }

  // ---- ループ ----
  let capped = false, running = false, last = performance.now(), startT = performance.now();
  let frames = 0, fpsTimer = 0; const MIN_DT_30 = 1000/30 - 1;
  function frame(now){
    if(!running) return;
    requestAnimationFrame(frame);
    const dt = now - last;
    if(capped && dt < MIN_DT_30) return;
    last = now;
    tilt.x += (tilt.tx - tilt.x) * 0.08; tilt.y += (tilt.ty - tilt.y) * 0.08;
    const t = (now - startT) / 1000;
    demo.draw(state, { t, tiltX: tilt.x, tiltY: tilt.y,
      width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, gl, renderer });
    frames++; fpsTimer += dt;
    if(fpsTimer >= 500){ const fps = Math.round(frames / (fpsTimer/1000));
      hud.fps.textContent = fps; hud.fill.style.width = Math.min(100, fps/60*100) + '%'; frames = 0; fpsTimer = 0; }
  }
  function run(){ if(running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', () => { if(document.hidden) running = false; else run(); });

  $('b-gyro').addEventListener('click', enableGyro);
  $('b-cap').addEventListener('click', () => { capped = !capped; $('b-cap').classList.toggle('on', capped);
    hud.cap.textContent = capped ? '(30cap)' : ''; });
  function setScale(s, el){ renderScale = s; hud.scale.textContent = Math.round(s*100)+'%';
    ['b-s100','b-s75','b-s50'].forEach(id => $(id).classList.remove('on')); el.classList.add('on'); resize(); }
  $('b-s100').addEventListener('click', e => setScale(1.0, e.target));
  $('b-s75').addEventListener('click',  e => setScale(0.75, e.target));
  $('b-s50').addEventListener('click',  e => setScale(0.5,  e.target));
  $('start').addEventListener('click', () => { $('gate').style.display = 'none'; resize(); run(); enableGyro(); });

  resize();
}

// '#rrggbb' → [r,g,b]（0..1）
export function hexToRGBArr(h){
  h = String(h).replace('#','');
  return [parseInt(h.substr(0,2),16)/255, parseInt(h.substr(2,2),16)/255, parseInt(h.substr(4,2),16)/255];
}

// ---- 単パス（フルスクリーン fragment shader）用ヘルパ ----
// 標準 uniform: uTime(float), uResolution(vec2), uTilt(vec2)
// opts.params を渡すと paramPanel を自動生成し、各 param.uniform に値を流し込む
//   range → そのまま float / color → hexToRGBArr で vec3
export function singlePass(fragment, opts = {}) {
  const params = opts.params || [];
  return {
    init(gl){
      const uniforms = Object.assign(
        { uTime:{value:0}, uResolution:{value:new Vec2(1,1)}, uTilt:{value:new Vec2(0,0)} },
        opts.uniforms || {});
      params.forEach(p => {
        if (p.type === 'button' || !p.uniform) return;
        uniforms[p.uniform] = { value: p.type === 'color' ? hexToRGBArr(p.value) : p.value };
      });
      const program = new Program(gl, { vertex: VERT_FULLSCREEN, fragment: PRECISION + fragment, uniforms });
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
      if (params.length) {
        paramPanel(params, { title: opts.title || '調整', onChange: (k, v) => {
          const p = params.find(pp => pp.key === k); if (!p || !p.uniform) return;
          program.uniforms[p.uniform].value = (p.type === 'color') ? hexToRGBArr(v) : v;
        }});
      }
      return { program, mesh };
    },
    resize(state, w, h){ state.program.uniforms.uResolution.value.set(w, h); },
    draw(state, f){
      state.program.uniforms.uTime.value = f.t;
      state.program.uniforms.uTilt.value.set(f.tiltX, f.tiltY);
      f.renderer.render({ scene: state.mesh });
    },
  };
}

// ---- 調整UI: パラメータ定義の配列から自動でパネルを生成し、値を URL ハッシュに保存 ----
// params: [{ key, label, type:'range', min, max, step, value } | { key, label, type:'color', value:'#rrggbb' }
//          | { type:'button', label, onClick }]
// opts: { title, onChange(key, value) }
// 返り値: { values, get(key), set(key, value) }
export function paramPanel(params, opts = {}) {
  const btn = document.createElement('button');
  btn.id = 'panelBtn'; btn.className = 'btn'; btn.textContent = '⚙ ' + (opts.title || 'パラメータ');
  const panel = document.createElement('div'); panel.id = 'panel';
  document.body.appendChild(btn); document.body.appendChild(panel);
  btn.onclick = () => { panel.style.display = panel.style.display === 'block' ? 'none' : 'block'; };

  // URL ハッシュから初期値を読む（#feed=0.055&kill=0.062 …）
  const fromHash = {};
  location.hash.replace(/^#/, '').split('&').forEach(kv => {
    const i = kv.indexOf('='); if (i > 0) fromHash[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
  });

  const values = {}, controls = {};
  let saveTimer = null;
  function saveHash() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const parts = params.filter(p => p.key).map(p => p.key + '=' + encodeURIComponent(values[p.key]));
      history.replaceState(null, '', '#' + parts.join('&'));
    }, 250);
  }
  function fmt(v, p) {
    const d = (p.step != null && p.step < 0.01) ? 4 : (p.step != null && p.step < 1 ? 3 : 0);
    return Number(v).toFixed(d);
  }

  params.forEach(p => {
    const row = document.createElement('div'); row.className = 'row';
    if (p.type === 'button') {
      const b = document.createElement('button'); b.className = 'btn pbtn'; b.textContent = p.label;
      b.onclick = () => p.onClick(); row.appendChild(b); panel.appendChild(row); return;
    }
    const lab = document.createElement('label');
    const name = document.createElement('span'); name.textContent = p.label;
    const val = document.createElement('span'); lab.appendChild(name); lab.appendChild(val); row.appendChild(lab);

    let init = (p.key in fromHash) ? fromHash[p.key] : p.value;
    const input = document.createElement('input');
    if (p.type === 'color') {
      input.type = 'color';
      input.value = (typeof init === 'string') ? (init[0] === '#' ? init : '#' + init) : p.value;
      values[p.key] = input.value; val.textContent = '';
      input.oninput = () => { values[p.key] = input.value; opts.onChange && opts.onChange(p.key, input.value); saveHash(); };
    } else { // range
      init = parseFloat(init); if (isNaN(init)) init = p.value;
      input.type = 'range'; input.min = p.min; input.max = p.max;
      input.step = (p.step != null) ? p.step : (p.max - p.min) / 100; input.value = init;
      values[p.key] = init; val.textContent = fmt(init, p);
      input.oninput = () => { const v = parseFloat(input.value); values[p.key] = v; val.textContent = fmt(v, p); opts.onChange && opts.onChange(p.key, v); saveHash(); };
    }
    row.appendChild(input); panel.appendChild(row);
    controls[p.key] = { input, val, p };
    opts.onChange && opts.onChange(p.key, values[p.key]);   // 起動時に初期値を適用
  });

  function set(key, value) {
    const c = controls[key]; if (!c) return;
    c.input.value = value; values[key] = (c.p.type === 'color') ? value : parseFloat(value);
    if (c.p.type !== 'color') c.val.textContent = fmt(values[key], c.p);
    opts.onChange && opts.onChange(key, values[key]); saveHash();
  }
  return { values, get: k => values[k], set };
}

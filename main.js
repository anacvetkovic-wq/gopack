/* GOPACK homepage prototype — interactions (v6 — Lenis + GSAP ScrollTrigger) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const desk = matchMedia('(min-width: 901px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- hero entry: runs once the loader has lifted ---------- */
  const hero = $('[data-hero]');
  let charsIn = null, cycleOn = false;
  function heroIntro() { hero.classList.add('is-in'); if (charsIn) charsIn.play(); setTimeout(() => { cycleOn = true; }, 600); }

  /* ---------- smooth scroll (Lenis) driving GSAP ScrollTrigger ---------- */
  const G = window.gsap, ST = window.ScrollTrigger;
  const motion = !!(G && ST) && !reduce.matches;
  let lenis = null;
  if (motion) {
    G.registerPlugin(ST);
    if (window.Lenis) {
      lenis = window.lenis = new Lenis({ lerp: .09 });
      lenis.on('scroll', ST.update);
      G.ticker.add(t => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
      document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]'), id = a && a.getAttribute('href');
        if (!id || id.length < 2 || !$(id)) return;
        e.preventDefault(); lenis.scrollTo($(id)); history.replaceState(null, '', id);
      });
    }
  }

  /* ---------- bag photos are white on black: key the black out into real alpha once ----------
     Each bag becomes a tightly cropped PNG (blob URL) for the headline; the stick-pack also gets a horizontal copy. */
  const KEY = {};
  const BAGS = ['bag-stick', 'bag-pillow', 'bag-flat'].map(n => {
    const o = { ok: false, c: document.createElement('canvas') }, i = new Image();
    i.onload = () => {
      const k = o.c, x = k.getContext('2d', { willReadFrequently: true }), w = k.width = i.naturalWidth, h = k.height = i.naturalHeight;
      x.drawImage(i, 0, 0);
      const d = x.getImageData(0, 0, w, h), p = d.data; let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let j = 0, q = 0; j < p.length; j += 4, q++) {
        const a = Math.min(255, Math.max(0, (Math.max(p[j], p[j + 1], p[j + 2]) - 14) * 2.6)); p[j + 3] = a;
        if (a > 24) { const px = q % w, py = (q / w) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
      }
      x.putImageData(d, 0, 0); o.ok = true;
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
      const out = (rot, key) => { const q = document.createElement('canvas'), qx = q.getContext('2d');
        if (rot) { q.width = ch; q.height = cw; qx.translate(ch, 0); qx.rotate(Math.PI / 2); } else { q.width = cw; q.height = ch; }
        qx.drawImage(k, x0, y0, cw, ch, 0, 0, cw, ch);
        q.toBlob(b => { KEY[key] = URL.createObjectURL(b); $$(`img[data-k="${key}"]`).forEach(im => { im.src = KEY[key]; }); }); };
      out(false, n); if (n === 'bag-stick') out(true, n + '-h');
    };
    i.src = `assets/img/${n}.webp`; return o;
  });
  const STICK = { x: 268, y: 62, w: 151, h: 903 };

  /* ---------- granule pour (loader): a stick-pack tips over and pours sugar that piles up on the floor ---------- */
  function makePour(cv, o) {
    const cx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, cols = [], grains = [], last = 0;
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cols = new Array(Math.ceil(W / 2) + 1).fill(0); grains = []; };
    const geom = now => { const L = H * o.len; return { L, bw: L * STICK.w / STICK.h * 1.3, px: W * o.x, py: H * o.y, a: o.tilt + Math.sin(now / 520) * .06 }; };
    function step(now, stop) {
      const dt = Math.min(32, now - (last || now)) / 16.67; last = now;
      const { L, bw, px, py, a } = geom(now);
      const mx = px + Math.sin(a) * L * .46, my = py - Math.cos(a) * L * .46;
      if (!stop) for (let i = 0; i < o.rate; i++) if (Math.random() < .8)
        grains.push({ x: mx + (Math.random() - .5) * 4, y: my, vx: Math.sin(a) * 1.1 + (Math.random() - .5) * .8, vy: -Math.cos(a) * 1.1, r: o.r * (.6 + Math.random() * .9), s: 0, c: Math.random() < .1 });
      const g = .16 * H / 140;
      for (const p of grains) {
        if (p.s) continue;
        p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .99;
        const ci = Math.max(0, Math.min(cols.length - 1, Math.round(p.x / 2)));
        if (p.y >= H - 2 - cols[ci]) {                       // settle, then let the pile slump sideways
          let k = ci;
          for (let n = 0; n < 10; n++) { const l = cols[k - 1] ?? 1e3, r = cols[k + 1] ?? 1e3; if (l < cols[k] - 1.5 && l <= r) k--; else if (r < cols[k] - 1.5) k++; else break; }
          p.x = k * 2 + (Math.random() - .5); p.y = H - 2 - cols[k]; cols[k] += p.r * .8; p.s = 1;
        }
      }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
      for (const p of grains) { cx.fillStyle = p.c ? '#7FD3F2' : '#E9EEF1'; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill(); }
      const b = BAGS[0];
      if (b.ok && !o.hideBag) { cx.save(); cx.translate(px, py); cx.rotate(a); cx.drawImage(b.c, STICK.x, STICK.y, STICK.w, STICK.h, -bw / 2, -L / 2, bw, L); cx.restore(); }
    }
    size(); return { size, step, geom, o };
  }

  /* ---------- loader → hero: the pouring stick-pack flies into its place in the headline while the loader
     screen contracts into the hero card; the headline letters then grow around it. Once per session. ---------- */
  const loader = $('[data-loader]'), slotB = $('[data-bag-b]');
  (() => {
    let seen = false; try { seen = sessionStorage.getItem('gp-intro') === '1'; sessionStorage.setItem('gp-intro', '1'); } catch (e) {}
    if (!window.gsap || reduce.matches || seen) { loader.remove(); return setTimeout(heroIntro, 60); }
    const G = window.gsap, html = document.documentElement;
    html.classList.add('is-loading'); if (lenis) lenis.stop();
    const lc = $('[data-lpour]', loader), pour = makePour(lc, { len: .62, x: .38, y: .36, tilt: 2.35, rate: 5, r: 2.2 });
    const num = $('[data-lnum]', loader), t0 = performance.now(), MIN = 2200;
    let loaded = document.readyState === 'complete', done = false;
    addEventListener('load', () => { loaded = true; });
    function leave(now) {
      const r = lc.getBoundingClientRect(), g = pour.geom(now), hp = $('.hero__sticky').getBoundingClientRect();
      const s = slotB.getBoundingClientRect(), ar = g.L / g.bw;               // fit the horizontal bag inside the slot (contain)
      const tw = Math.min(s.width, s.height * ar), th = tw / ar;
      const fl = new Image(); fl.className = 'flyer'; fl.alt = ''; fl.src = KEY['bag-stick-h'];
      document.body.append(fl);
      G.set(fl, { left: r.left + g.px - g.L / 2, top: r.top + g.py - g.bw / 2, width: g.L, height: g.bw, rotation: (g.a - Math.PI / 2) * 180 / Math.PI });
      pour.o.hideBag = true;
      G.set(loader, { clipPath: 'inset(0px 0px 0px 0px round 0px)' });
      G.timeline({ onComplete: () => { loader.remove(); fl.remove(); html.classList.remove('is-loading'); if (lenis) lenis.start(); if (window.ScrollTrigger) ScrollTrigger.refresh(); } })
        .to($('.loader__meta', loader), { opacity: 0, y: 16, duration: .4, ease: 'power2.in' }, 0)
        .to(lc, { opacity: 0, duration: .5 }, .1)
        .to(fl, { left: s.left + (s.width - tw) / 2, top: s.top + (s.height - th) / 2, width: tw, height: th, rotation: 0, duration: 1.35, ease: 'expo.inOut' }, .05)
        .to(loader, { clipPath: `inset(${hp.top}px ${innerWidth - hp.right}px ${innerHeight - hp.bottom}px ${hp.left}px round 28px)`, duration: 1.15, ease: 'expo.inOut' }, .12)
        .add(heroIntro, .8)
        .to(loader, { opacity: 0, duration: .3 }, 1.2);
    }
    (function tick(now) {
      if (done) return;
      const k = Math.min(1, (now - t0) / MIN), shown = loaded ? k : Math.min(k, .9);
      num.textContent = String(Math.round(shown * 100)).padStart(2, '0');
      pour.step(now, shown >= 1);
      if (shown >= 1 && KEY['bag-stick-h']) { done = true; return leave(now); }
      requestAnimationFrame(tick);
    })(t0);
  })();

  /* ---------- headline bags: row 1 alternates pillow ↔ flat-bottom; row 2 stick-pack rocks (CSS) ---------- */
  const bagA = $$('[data-bag-a] img');
  let ai = 0;
  setInterval(() => { if (!cycleOn || document.hidden) return; bagA.forEach((im, i) => im.classList.toggle('is-on', i === ai)); ai = (ai + 1) % bagA.length; }, 700);
  if (reduce.matches) bagA[0].classList.add('is-on');

  /* ---------- nav: light/dark surface, hide on scroll down, current section ---------- */
  const nav = $('[data-nav]');
  const lightEls = $$('.proc, .pack__grid, .co');
  const navLinks = $$('.nav__pill a');
  const sections = navLinks.map(a => $(a.getAttribute('href')));
  let lastY = scrollY;
  function onNav() {
    const y = scrollY, probe = 40;
    const light = lightEls.some(el => { const r = el.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; });
    nav.classList.toggle('is-light', light);
    if (menu.hidden) nav.classList.toggle('is-hidden', y > 400 && y > lastY + 4);
    if (y < lastY - 4 || y < 400) nav.classList.remove('is-hidden');
    lastY = y;
    let cur = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = i; });
    navLinks.forEach((a, i) => i === cur ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
  }
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  /* ---------- mobile menu ---------- */
  const burger = $('[data-burger]'), menu = $('[data-menu]');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open);
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) { nav.classList.remove('is-hidden', 'is-light'); $('a', menu).focus(); }
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
  desk.addEventListener('change', () => desk.matches && setMenu(false));

  /* ---------- machines: giant words switch the stage ---------- */
  const MACH = {
    mt: {
      tag: 'Stick-pack', n: '01 / 02', name: 'Multitube',
      desc: 'Pakirni stroji Multitube formirajo, polnijo in zavarijo vrečke cevaste oblike, t. i. »stick-pack«. Zavarjene so z dvema prečnima in enim vzdolžnim varom.',
      spec: [
        ['Število linij', '2–20'],
        ['Mehanska kapaciteta', '15–65<small>ciklov / min (max.)</small>'],
        ['Širina koluta folije', '600–1200<small>mm · Ø 350–400 mm</small>'],
        ['Vrečka (š × d)', '18–60 × 50–210<small>mm</small>'],
      ],
    },
    upa: {
      tag: 'Vertikalni pakirni stroj', n: '02 / 02', name: 'UPA Rapid',
      desc: 'Avtomatski vertikalni pakirni stroji UPA RAPID formirajo, polnijo in zavarijo različne oblike vrečk. Velikost stroja je odvisna od velikosti vrečke in količine posamezne doze.',
      spec: [
        ['Modeli', 'MINI · MIDI · MAX<small>MIDI kontinuiran ali koračni</small>'],
        ['Mehanska kapaciteta', '15–80<small>ciklov / min</small>'],
        ['Širina koluta folije', '600–1200<small>mm · Ø 350–400 mm</small>'],
        ['Vrečka (š × d)', '95–630 × 100–1200<small>mm · odvisno od modela</small>'],
      ],
    },
  };
  const mach = $('[data-mach]'), words = $$('.mw', mach), info = $('[data-info]', mach), panel = $('#mach-panel');
  const MF = k => $(`[data-f="${k}"]`, mach);
  let curM = 'mt', swapT;
  function renderM(d) {
    MF('desc').textContent = d.desc;
    MF('spec').innerHTML = d.spec.map(([t, v]) => `<div><dt>${t}</dt><dd>${v}</dd></div>`).join('');
    const cta = MF('cta'); cta.innerHTML = `Povpraševanje za ${d.name} <span aria-hidden="true">→</span>`; cta.dataset.prefill = d.name;
  }
  function setM(key, focus) {
    if (key === curM && !focus) return;
    curM = key;
    words.forEach(w => { const on = w.dataset.key === key; w.setAttribute('aria-selected', on); w.tabIndex = on ? 0 : -1; if (on) { panel.setAttribute('aria-labelledby', w.id); if (focus) w.focus(); } });
    $$('.mach__stage > img', mach).forEach(i => i.classList.toggle('is-on', i.dataset.img === key));
    clearTimeout(swapT);
    if (reduce.matches) return renderM(MACH[key]);
    info.classList.add('is-swapping'); mach.classList.add('is-swapping');
    swapT = setTimeout(() => { renderM(MACH[key]); info.classList.remove('is-swapping'); mach.classList.remove('is-swapping'); }, 300);
  }
  words.forEach((w, i) => {
    w.addEventListener('click', () => setM(w.dataset.key));
    w.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? words.length - 1 : (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + words.length) % words.length;
      setM(words[j].dataset.key, true);
    });
  });
  renderM(MACH.mt);
  $$('[data-pick]').forEach(a => a.addEventListener('click', () => setM(a.dataset.pick)));

  /* ---------- footer pill cycles the four materials ---------- */
  const cyc = $$('[data-cycle] img');
  let ci = 0; cyc[0].classList.add('is-on');
  setInterval(() => { if (reduce.matches || document.hidden) return; cyc[ci].classList.remove('is-on'); ci = (ci + 1) % cyc.length; cyc[ci].classList.add('is-on'); }, 1800);

  /* ---------- process: scroll-scrubbed schema (no hijack — sticky + native scroll) ---------- */
  const proc = $('[data-proc]');
  const S = {
    roll: $('[data-roll]', proc), rollR: $('[data-rollr]', proc), film: $('[data-film]', proc),
    tube: $('[data-tube]', proc), lseal: $('[data-lseal]', proc), fill: $('[data-fillrect]', proc),
    drops: $('[data-drops]', proc), jl: $('[data-jawl]', proc), jr: $('[data-jawr]', proc),
    bag: $('[data-bag]', proc), calls: $$('[data-c]', proc), steps: $$('[data-steps] li', proc),
    pnum: $('[data-pnum]', proc), pbar: $('[data-pbar]', proc),
  };
  const NS = 'http://www.w3.org/2000/svg';
  const DROPS = 10;
  for (let i = 0; i < DROPS; i++) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', 3 + (i % 3)); c.setAttribute('class', 'sc-drop');
    c.setAttribute('cx', 268 + (i * 7) % 26); c.setAttribute('cy', -20); S.drops.appendChild(c);
  }
  const filmLen = S.film.getTotalLength();
  S.film.style.strokeDasharray = filmLen;

  function drawProc(p) {
    const stage = Math.min(4, Math.floor(p * 5));
    const t = k => clamp((p - k * .2) / .2);
    // 0 roll + film
    S.roll.setAttribute('transform', `rotate(${p * 900} 120 120)`);
    S.rollR.setAttribute('r', lerp(76, 60, p));
    S.film.style.strokeDashoffset = filmLen * (1 - clamp(t(0) * 1.15));
    // 1 tube + longitudinal seal
    S.tube.style.opacity = .15 + .85 * clamp(t(1) * 2);
    S.lseal.style.strokeDashoffset = 330 * (1 - t(1));
    // 2 dose
    const t2 = t(2);
    const h = 140 * t2;
    S.fill.setAttribute('y', 580 - h); S.fill.setAttribute('height', h);
    [...S.drops.children].forEach((c, i) => {
      const on = p > .4 && p < .62;
      const ph = ((t2 * 4 + i / DROPS) % 1);
      c.setAttribute('cy', on ? 196 + ph * (384 - h) : -20);
      c.style.opacity = on ? (1 - ph * .4) : 0;
    });
    // 3 jaws close, 4 jaws open
    const close = t(3) < 1 ? t(3) : 1 - t(4) * 1.6;
    const cj = clamp(close);
    S.jl.setAttribute('x', lerp(140, 184, cj));
    S.jr.setAttribute('x', lerp(324, 280, cj));
    const hot = p > .7 && p < .86;
    S.jl.classList.toggle('is-hot', hot); S.jr.classList.toggle('is-hot', hot);
    // 4 bag out
    const t4 = t(4);
    S.bag.style.opacity = clamp(t4 * 2);
    S.bag.setAttribute('transform', `translate(0 ${lerp(-40, 0, t4)})`);
    S.fill.style.opacity = p > .8 ? 1 - clamp((p - .8) * 10) : .85;
    // ui
    S.calls.forEach((g, i) => g.classList.toggle('is-on', i === stage));
    S.steps.forEach((li, i) => { li.classList.toggle('is-on', i === stage); li.classList.toggle('is-done', i < stage); });
    S.pnum.textContent = String(stage + 1).padStart(2, '0');
    S.pbar.style.transform = `scaleX(${p})`;
  }
  function procProgress() {
    if (!desk.matches || reduce.matches) return .74; // static, informative frame
    const r = proc.getBoundingClientRect();
    const span = proc.offsetHeight - innerHeight;
    return clamp(-r.top / span);
  }

  /* ---------- scroll loop ---------- */
  let ticking = false;
  function frame() { ticking = false; onNav(); drawProc(procProgress()); }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', req, { passive: true });
  // both machines get the same info height, so switching (also while pinned) never shifts the layout
  function lockInfo() { info.style.minHeight = ''; renderM(MACH.upa); const a = info.offsetHeight; renderM(MACH.mt); const b = info.offsetHeight; renderM(MACH[curM]); info.style.minHeight = Math.max(a, b) + 'px'; }
  const relayout = () => { lockInfo(); if (motion) ST.refresh(); req(); };
  addEventListener('resize', relayout);
  addEventListener('load', relayout);
  if (document.fonts) document.fonts.ready.then(relayout);
  reduce.addEventListener('change', relayout); desk.addEventListener('change', relayout);
  frame();

  /* ---------- materials hover list + cursor-follow preview ---------- */
  const mats = $('[data-mats]'), flo = $('[data-float]'), floImg = $('img', flo);
  let mx = 0, my = 0, fx = 0, fy = 0, floOn = false, raf = 0;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  function follow() {
    fx = lerp(fx, mx, .18); fy = lerp(fy, my, .18);
    flo.style.left = fx + 'px'; flo.style.top = fy + 'px';
    raf = floOn ? requestAnimationFrame(follow) : 0;
  }
  function activate(btn, viaPointer) {
    $$('button', mats).forEach(b => b.classList.toggle('is-on', b === btn));
    mats.classList.toggle('is-hover', !!btn);
    if (!btn || !fine.matches || reduce.matches) { flo.classList.remove('is-on'); floOn = false; return; }
    floImg.src = btn.dataset.img;
    if (!viaPointer) { const r = btn.getBoundingClientRect(); mx = fx = r.left + r.width * .55; my = fy = r.top + 10; flo.style.left = fx + 'px'; flo.style.top = fy + 'px'; }
    flo.classList.add('is-on');
    if (!floOn) { floOn = true; raf = requestAnimationFrame(follow); }
  }
  $$('button', mats).forEach(b => {
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { mx = e.clientX + 28; my = b.getBoundingClientRect().top + 10; if (!floOn) { fx = mx; fy = my; } activate(b, true); } });
    b.addEventListener('focus', () => activate(b, false));
    b.addEventListener('blur', () => activate(null));
    b.addEventListener('click', () => activate(b, false));
  });
  mats.addEventListener("pointermove", e => { const b = e.target.closest("button"); mx = e.clientX + 28; if (b) my = b.getBoundingClientRect().top + 10; });
  mats.addEventListener('pointerleave', () => activate(null));
  addEventListener('scroll', () => { if (floOn && !mats.matches(':hover')) activate(null); }, { passive: true });

  /* ---------- reveals: everything below the first screen rises in, siblings in a short stagger ---------- */
  const R = [
    '.sec-idx', '.sec-sub', '.mach__panel', '.proc__note',
    '.mats li', '.scale__legend', '.scale__fig', '.forms__fn', ...(motion ? [] : ['.forms__row li']),
    '.co__p', '.co__facts > div', '.co__img', '.svc__path li:not(.svc__track)',
    '.ftr__eye', '.qf', '.ftr__cols > div', '.ftr__base > div',
    ...(motion ? [] : ['.sec-h', '.mach__words', '.forms__h', '.co__h', '.svc__h', '.ftr__h']),
  ].join(',');
  const revealEls = $$(R).filter(el => el.getBoundingClientRect().top > innerHeight * .9);
  revealEls.forEach(el => {
    el.setAttribute('data-reveal', '');
    const sib = [...el.parentElement.children].filter(n => n.matches(R));
    if (sib.length > 1) el.style.setProperty('--d', (sib.indexOf(el) * .08).toFixed(2) + 's');
  });
  const count = el => { // 1990 and 700+ count up once; the "+" stays
    const n = parseInt(el.textContent, 10), t0 = performance.now();
    const step = now => { const k = clamp((now - t0) / 1400); el.firstChild.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    if (!reduce.matches) { el.firstChild.textContent = '0'; requestAnimationFrame(step); }
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in'); io.unobserve(e.target);
    const big = $('.co__big', e.target); if (big) count(big);
  }), { rootMargin: '0px 0px -8% 0px', threshold: .06 });
  $$('[data-reveal], .forms').forEach(el => io.observe(el));

  /* ---------- GSAP: headings rise word by word behind a mask, Stroji words, image parallax ---------- */
  if (motion) {
    const wrap = node => { const o = document.createElement('span'), n = document.createElement('span'); o.className = 'w'; n.append(node); o.append(n); return o; };
    $$('.sec-h, .co__h, .forms__h, .svc__h, .ftr__h').forEach(h => {
      const out = [];
      [...h.childNodes].forEach(n => {
        if (n.nodeType !== 3) return out.push(n);
        n.textContent.split(/( +)/).forEach(p => { if (p) out.push(/^ +$/.test(p) ? document.createTextNode(' ') : wrap(document.createTextNode(p))); });
      });
      h.replaceChildren(...out);
      G.from($$('.w > span', h), { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: .045, scrollTrigger: { trigger: h, start: 'top 88%' } });
    });
    G.from('.mw', { yPercent: 60, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: '.mach__words', start: 'top 85%' } });
    G.fromTo('.co__img img', { yPercent: -4, scale: 1.1 }, { yPercent: 4, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.co__img', start: 'top bottom', end: 'bottom top', scrub: true } });
    // machines: the section holds while scrolling switches Multitube → UPA Rapid, then releases
    G.matchMedia().add('(min-width: 901px)', () => {
      const pinEl = $('[data-mach-pin]');
      const st = ST.create({ trigger: pinEl, start: () => pinEl.offsetHeight > innerHeight ? 'bottom bottom' : 'center center', end: () => '+=' + Math.round(innerHeight * .9), pin: true, anticipatePin: 1,
        onUpdate: s => setM(s.progress < .5 ? 'mt' : 'upa') });
      return () => st.kill();
    });
    // machines: the stage rises out of the glow as the section scrolls in
    G.fromTo('.mach__stage', { yPercent: 18, scale: .86, opacity: 0, filter: 'blur(14px)' }, { yPercent: 0, scale: 1, opacity: 1, filter: 'blur(0px)', ease: 'power2.out', scrollTrigger: { trigger: '.mach', start: 'top 85%', end: 'top 15%', scrub: .6 } });
    // bags drop in one by one and bounce on the baseline
    G.from('.forms__row li', { y: -180, opacity: 0, duration: 1.15, ease: 'bounce.out', stagger: .17, scrollTrigger: { trigger: '.forms__row', start: 'top 78%' } });
    // service: the track fills with scroll, each step lights up as it is reached
    const svc = $('[data-svc]'), line = $('[data-svcline]'), steps = $$('.svc__path li:not(.svc__track)');
    ST.create({ trigger: svc, start: 'top 75%', end: 'bottom 55%', scrub: .4, onUpdate: s => {
      const p = s.progress, vert = !desk.matches;
      line.style.transform = vert ? `scaleY(${p})` : `scaleX(${p})`;
      steps.forEach((li, i) => li.classList.toggle('is-on', p >= i / steps.length + .02));
    } });
    // hero headline: words → letters that rise out of a blur; letters hop under the pointer
    document.documentElement.classList.add('gs');
    const chars = [];
    $$('.hero__h .ln > span').forEach(ln => {
      const out = [];
      [...ln.childNodes].forEach(n => {
        if (n.nodeType !== 3) return out.push(n);
        n.textContent.split(/( +)/).forEach(p => {
          if (!p) return;
          if (/^ +$/.test(p)) return out.push(document.createTextNode(' '));
          const w = document.createElement('span'); w.style.cssText = 'display:inline-block;white-space:nowrap';
          [...p].forEach(ch => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; w.append(s); chars.push(s); });
          out.push(w);
        });
      });
      ln.replaceChildren(...out);
    });
    charsIn = G.from(chars, { yPercent: 115, rotate: 7, opacity: 0, filter: 'blur(12px)', duration: 1.3, ease: 'expo.out', stagger: .022, clearProps: 'filter', paused: true });
    if (hero.classList.contains('is-in')) charsIn.play();
    chars.forEach(ch => ch.addEventListener('pointerenter', () => { if (!G.isTweening(ch)) G.fromTo(ch, { yPercent: 0 }, { yPercent: -16, color: '#22A8E0', duration: .22, ease: 'power2.out', yoyo: true, repeat: 1 }); }));
    // magnetic buttons
    $$('.btn, .nav__cta, .qf__go').forEach(b => {
      const xt = G.quickTo(b, 'x', { duration: .5, ease: 'power3' }), yt = G.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); xt((e.clientX - r.left - r.width / 2) * .25); yt((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener('pointerleave', () => { xt(0); yt(0); });
    });
    // cursor: dot + lagging ring; grows on links, shows a label over [data-cursor]
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const cur = $('[data-cur]'), dot = $('.cur__dot', cur), ring = $('.cur__ring', cur), lab = $('[data-cur-label]', cur);
      document.documentElement.classList.add('has-cur');
      const dx = G.quickTo(dot, 'x', { duration: .08 }), dy = G.quickTo(dot, 'y', { duration: .08 });
      const rx = G.quickTo(ring, 'x', { duration: .5, ease: 'power3' }), ry = G.quickTo(ring, 'y', { duration: .5, ease: 'power3' });
      addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
      document.addEventListener('pointerover', e => {
        const link = e.target.closest('a, button, input'), zone = e.target.closest('[data-cursor]');
        cur.classList.toggle('is-link', !!link);
        cur.classList.toggle('is-label', !link && !!zone && scrollY < innerHeight * .4);
        if (zone) lab.textContent = zone.dataset.cursor;
      });
      addEventListener('scroll', () => { if (scrollY > innerHeight * .4) cur.classList.remove('is-label'); }, { passive: true });
      document.addEventListener('pointerleave', () => G.set(cur, { opacity: 0 }));
      document.addEventListener('pointerenter', () => G.set(cur, { opacity: 1 }));
    }
    addEventListener('load', () => ST.refresh());
  }

  /* ---------- inquiry form (prototype: prepares an e-mail, never sends) ---------- */
  const form = $('[data-form]'), out = $('[data-out]', form), pre = $('[data-preview]', form);
  const mailA = $('[data-mailto]', form), opis = form.elements.opis, email = form.elements.email;
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-prefill]');
    if (a && !opis.value.trim()) opis.value = `Zanima me stroj ${a.dataset.prefill}.`;
  });
  function mailErr(msg) {
    const row = email.closest('.qf__row');
    let el = $('.err', form);
    row.classList.toggle('is-err', !!msg);
    email.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) { if (!el) { el = document.createElement('p'); el.className = 'err'; el.id = 'err-email'; row.after(el); email.setAttribute('aria-describedby', 'err-email'); } el.textContent = msg; }
    else if (el) el.remove();
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const mail = email.value.trim(), text = opis.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { mailErr('Vpišite veljaven e-naslov, npr. ime@podjetje.si.'); return email.focus(); }
    mailErr('');
    const body = `${text || '(brez opisa)'}\n\n${mail}`;
    pre.textContent = `Za: info@gopack.si\nZadeva: Povpraševanje — pakirni stroj\n\n${body}`;
    mailA.href = `mailto:info@gopack.si?subject=${encodeURIComponent('Povpraševanje — pakirni stroj')}&body=${encodeURIComponent(body)}`;
    out.hidden = false; out.focus();
  });
  email.addEventListener('input', () => mailErr(''));
  $('[data-copy]', form).addEventListener('click', async ev => {
    const b = ev.currentTarget;
    try { await navigator.clipboard.writeText(pre.textContent); b.textContent = 'Kopirano'; }
    catch { const r = document.createRange(); r.selectNodeContents(pre); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = 'Besedilo je označeno'; }
    setTimeout(() => (b.textContent = 'Kopiraj besedilo'), 1800);
  });
  $('[data-edit]', form).addEventListener('click', () => { out.hidden = true; opis.focus(); });
})();

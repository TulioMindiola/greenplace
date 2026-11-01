// Green Place: live opening status (Cúcuta time), the order built from the carta and sent to the
// chosen sede's WhatsApp, the "Mira lo que lleva" plates and the venue frame.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- sedes y horarios (Google Maps, noviembre 2026) ----------
// minutes from midnight; day 0 = domingo
const SEDES = {
  bosch: {
    name: 'Quinta Bosch',
    wa: '573054546754',
    hours: (day) => [705, 1305],
  },
  caobos: {
    name: 'Caobos',
    wa: '573125953500',
    hours: (day) => (day === 0 ? [540, 1300] : [660, 1305]),
  },
};

const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function nowInCucuta() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return { day: DAYS[get('weekday')], minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function clock(minutes) {
  const h24 = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, '0'); // taste-skill-ignore: clock minutes
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${m} ${h24 < 12 ? 'a. m.' : 'p. m.'}`;
}

function sedeStatus(key, t) {
  const [open, close] = SEDES[key].hours(t.day);
  if (t.minutes >= open && t.minutes < close) return { open: true, text: `Abierto ahora · hasta las ${clock(close)}`, close };
  if (t.minutes < open) return { open: false, text: `Cerrado · abre hoy a las ${clock(open)}`, opensAt: open, today: true };
  const next = SEDES[key].hours((t.day + 1) % 7)[0];
  return { open: false, text: `Cerrado · abre mañana a las ${clock(next)}`, opensAt: next, today: false };
}

function paintStatus() {
  const t = nowInCucuta();
  const st = { bosch: sedeStatus('bosch', t), caobos: sedeStatus('caobos', t) };
  for (const key of Object.keys(SEDES)) {
    const el = document.querySelector(`[data-status="${key}"]`);
    if (!el) continue;
    el.classList.toggle('is-open', st[key].open);
    el.querySelector('.status-text').textContent = st[key].text;
  }
  const hero = document.querySelector('[data-status="hero"]');
  if (hero) {
    let text;
    if (st.bosch.open && st.caobos.open) text = `Abierto ahora en las dos sedes · hasta las ${clock(Math.min(st.bosch.close, st.caobos.close))}`;
    else if (st.bosch.open || st.caobos.open) {
      const k = st.bosch.open ? 'bosch' : 'caobos';
      text = `Abierto ahora en ${SEDES[k].name} · hasta las ${clock(st[k].close)}`;
    } else {
      const k = st.bosch.opensAt <= st.caobos.opensAt ? 'bosch' : 'caobos';
      text = `Abrimos ${st[k].today ? 'hoy' : 'mañana'} a las ${clock(st[k].opensAt)} en ${SEDES[k].name}`;
    }
    hero.classList.toggle('is-open', st.bosch.open || st.caobos.open);
    hero.querySelector('.status-text').textContent = text;
  }
  const select = document.querySelector('[data-sede]');
  if (select) {
    for (const opt of select.options) opt.textContent = `Sede ${SEDES[opt.value].name} · ${st[opt.value].open ? 'abierta ahora' : 'cerrada ahora'}`;
    if (!select.dataset.touched && !st.bosch.open && st.caobos.open) select.value = 'caobos';
  }
}
paintStatus();
setInterval(paintStatus, 60 * 1000);

// ---------- carta y pedido ----------
const CARTA = {
  campo: 'Ensalada Del Campo',
  salmon: 'Ensalada de Salmón',
  atun: 'Ensalada de Atún estilo GP',
  camarones: 'Ensalada de Camarones',
  clasica: 'Ensalada Clásica GP',
  champinon: 'Ensalada Champiñón y aguacate',
  coco: 'Limonada de coco',
  mandarina: 'Jugo de mandarina y fresa',
  jugos: 'Jugo natural',
  hatsu: 'Té Hatsu',
};
const order = new Map(); // id -> qty

const bag = document.querySelector('[data-bag]');
const bagCount = document.querySelector('[data-bag-count]');
const list = document.querySelector('[data-order-list]');
const empty = document.querySelector('[data-order-empty]');

function totalItems() { let n = 0; order.forEach((q) => { n += q; }); return n; }

function add(id, delta = 1) {
  const q = Math.max(0, (order.get(id) || 0) + delta);
  if (q) order.set(id, q); else order.delete(id);
  render();
  if (delta > 0 && bag) { bag.classList.remove('bump'); void bag.offsetWidth; bag.classList.add('bump'); }
}

function render() {
  document.querySelectorAll('[data-add]').forEach((btn) => {
    const q = order.get(btn.dataset.add) || 0;
    btn.classList.toggle('has-count', q > 0);
    btn.firstChild.nodeValue = q ? `En tu pedido · ${q}` : 'Agregar';
  });
  const n = totalItems();
  if (bag) { bag.hidden = n === 0; bagCount.textContent = n; }
  if (!list) return;
  empty.hidden = n > 0;
  list.replaceChildren(...[...order].map(([id, q]) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = CARTA[id];
    const qty = document.createElement('span');
    qty.className = 'qty';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', `Quitar una ${CARTA[id]}`);
    minus.addEventListener('click', () => add(id, -1));
    const out = document.createElement('output');
    out.textContent = q;
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', `Agregar otra ${CARTA[id]}`);
    plus.addEventListener('click', () => add(id, 1));
    qty.append(minus, out, plus);
    li.append(name, qty);
    return li;
  }));
}

document.querySelectorAll('[data-add]').forEach((btn) => {
  btn.addEventListener('click', () => {
    add(btn.dataset.add);
    btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
  });
});

const form = document.querySelector('[data-order-form]');
if (form) {
  const sede = form.querySelector('[data-sede]');
  sede.addEventListener('change', () => { sede.dataset.touched = '1'; form.action = `https://wa.me/${SEDES[sede.value].wa}`; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const s = SEDES[sede.value];
    const nombre = form.nombre.value.trim();
    const entrega = form.entrega.options[form.entrega.selectedIndex].text;
    const nota = form.text.value.trim();
    const lines = [`¡Hola, Green Place! Quiero hacer un pedido en la sede ${s.name}:`];
    if (order.size) order.forEach((q, id) => lines.push(`• ${q} × ${CARTA[id]}`));
    else if (!nota) lines.push('• (Quiero que me ayuden a elegir)');
    if (nombre) lines.push(`Nombre: ${nombre}`);
    lines.push(`Entrega: ${entrega}`);
    if (nota) lines.push(`Nota: ${nota}`);
    lines.push('Green, please 💚'); // taste-skill-ignore: lives in the WhatsApp message, not the page
    window.open(`https://wa.me/${s.wa}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });
}

// ---------- mira lo que lleva ----------
const PLATES = {
  campo: {
    name: 'Ensalada Del Campo',
    desc: 'Pollo en fajas, tocineta crocante y nachos sobre lechuga, con aguacate, maíz tierno y huevos de codorniz. La que más recomiendan en Google.',
    alt: 'Ensalada Del Campo vista desde arriba, con sus ingredientes señalados',
    tags: [['Nachos', 25, 17], ['Aguacate', 80, 24, 1], ['Pollo', 50, 45], ['Tocineta', 12, 56], ['Maíz tierno', 78, 62, 1], ['Huevos de codorniz', 38, 84]],
  },
  salmon: {
    name: 'Ensalada de Salmón',
    desc: 'Salmón en cubos con maíz tostado, tomate cherry, palmitos, aguacate y durazno. El aderezo de frutos amarillos llega aparte.',
    alt: 'Ensalada de salmón con maíz tostado y tomate cherry, con sus ingredientes señalados',
    tags: [['Maíz tostado', 35, 30], ['Tomate cherry', 70, 37, 1], ['Salmón', 50, 52], ['Palmitos', 31, 64], ['Aderezo de frutos amarillos', 78, 90, 1]],
  },
  atun: {
    name: 'Ensalada de Atún estilo GP',
    desc: 'Atún con tomate cherry, maíz tierno, queso en cubos, aceitunas y cebolla caramelizada. La otra que más recomiendan en Google.',
    alt: 'Ensalada de atún estilo GP con queso, aceitunas y maíz, con sus ingredientes señalados',
    tags: [['Atún', 30, 36], ['Maíz tierno', 62, 30], ['Aceitunas', 46, 47], ['Tomate cherry', 20, 56], ['Queso', 82, 56, 1], ['Cebolla caramelizada', 38, 70]],
  },
  camarones: {
    name: 'Ensalada de Camarones',
    desc: 'Camarones en su punto sobre lechuga crocante, con mango dulce, aguacate, cebolla roja, pimentón y palmito.',
    alt: 'Ensalada de camarones con mango vista desde arriba, con sus ingredientes señalados',
    tags: [['Camarones', 61, 22], ['Mango', 24, 30], ['Aguacate', 88, 56, 1], ['Palmito', 53, 66], ['Cebolla roja', 18, 66], ['Lechuga crocante', 40, 87]],
  },
};

const plateImg = document.querySelector('[data-plate-img]');
const tagsEl = document.querySelector('[data-tags]');
const plateName = document.querySelector('[data-plate-name]');
const plateDesc = document.querySelector('[data-plate-desc]');
const plateAdd = document.querySelector('[data-plate-add]');
let currentPlate = 'campo';

function paintTags(key) {
  tagsEl.classList.remove('is-in');
  tagsEl.replaceChildren(...PLATES[key].tags.map(([label, x, y, left], i) => {
    const li = document.createElement('li');
    li.className = left ? 'tag tag--l' : 'tag';
    li.style.cssText = `--x:${x}%;--y:${y}%;--i:${i}`;
    const span = document.createElement('span');
    span.textContent = label;
    li.append(span);
    return li;
  }));
  requestAnimationFrame(() => requestAnimationFrame(() => tagsEl.classList.add('is-in')));
}

function showPlate(key) {
  if (key === currentPlate) return;
  currentPlate = key;
  const p = PLATES[key];
  document.querySelectorAll('[data-plate]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.plate === key)));
  plateName.textContent = p.name;
  plateDesc.textContent = p.desc;
  const next = new Image();
  next.src = `assets/platos/${key}.webp`;
  plateImg.classList.add('is-swapping');
  tagsEl.classList.remove('is-in');
  const swap = () => {
    plateImg.srcset = `assets/platos/sm/${key}.webp 640w, assets/platos/${key}.webp 1200w`;
    plateImg.src = `assets/platos/${key}.webp`;
    plateImg.alt = p.alt;
    plateImg.classList.remove('is-swapping');
    paintTags(key);
  };
  setTimeout(() => (next.complete ? swap() : next.addEventListener('load', swap, { once: true })), reduceMotion ? 0 : 260);
}

const tabs = [...document.querySelectorAll('[data-plate]')];
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => showPlate(tab.dataset.plate));
  tab.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    showPlate(next.dataset.plate);
  });
});
if (plateAdd) plateAdd.addEventListener('click', () => {
  add(currentPlate);
  plateAdd.textContent = `Agregada · ${order.get(currentPlate)}`;
  setTimeout(() => { plateAdd.textContent = 'Agregar al pedido'; }, 1600);
});
if (tagsEl) tagsEl.querySelectorAll('.tag').forEach((li, i) => li.style.setProperty('--i', i));

// ---------- el lugar: un marco, las fotos cambian ----------
const frame = document.querySelector('[data-frame]');
if (frame) {
  const imgs = [...frame.querySelectorAll('img')];
  const cap = document.querySelector('[data-frame-cap]');
  let at = 0;
  let timer = null;
  const show = (i) => {
    imgs[at].classList.remove('is-on');
    at = (i + imgs.length) % imgs.length;
    imgs[at].loading = 'eager';
    imgs[at].classList.add('is-on');
    cap.textContent = imgs[at].dataset.cap;
    imgs[(at + 1) % imgs.length].loading = 'eager';
  };
  const start = () => { if (!reduceMotion && !timer) timer = setInterval(() => show(at + 1), 3000); };
  const stop = () => { clearInterval(timer); timer = null; };
  frame.addEventListener('click', () => { stop(); show(at + 1); start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.25 }).observe(frame);
  } else start();
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : null));
}

// ---------- cifras que suben una vez ----------
function roll(el) {
  const to = Number(el.dataset.count);
  const dec = Number(el.dataset.decimals || 0);
  const suffix = el.dataset.suffix || '';
  const fmt = (v) => v.toFixed(dec).replace('.', ',') + suffix;
  const t0 = performance.now();
  const dur = 1400;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = fmt(to * (1 - Math.pow(2, -10 * p)) / (1 - Math.pow(2, -10)));
    if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
  };
  requestAnimationFrame(step);
}

// ---------- entradas ----------
(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  const reveal = (el) => {
    if (el.classList.contains('is-in')) return;
    el.classList.add('is-in');
    if (el.classList.contains('plate')) tagsEl.classList.add('is-in');
    const fig = el.querySelector('[data-count]');
    if (fig && !reduceMotion) roll(fig);
  };
  if (!('IntersectionObserver' in window)) { targets.forEach(reveal); return; }
  const io = new IntersectionObserver((entries) => {
    let k = 0; // things that enter together follow one another
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.style.setProperty('--i', Math.min(k++, 7));
      reveal(entry.target);
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  targets.forEach((el) => io.observe(el));
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) reveal(el); });
  }, 2500));
})();

// ---------- hero ----------
const shutter = document.querySelector('[data-shutter]');
const video = document.querySelector('.hero-video');
if (shutter) requestAnimationFrame(() => requestAnimationFrame(() => shutter.classList.add('is-in')));
if (video && reduceMotion) { video.removeAttribute('autoplay'); video.pause(); }
// without motion the arcs and frame start already bent
if (reduceMotion) document.querySelectorAll('[data-bend] animate').forEach((a) => a.remove());

/* ===========================================================
   My Content Hub — personal dashboard (brutalist pink)
   All data stored locally in the browser (localStorage).
   =========================================================== */

const STORE_KEY = 'contentHub.v2';
const OLD_KEY = 'contentHub.v1';

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDaysISO(iso, n) {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function endOfMonthISO() {
  const d = new Date(); const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return e.getFullYear() + '-' + String(e.getMonth() + 1).padStart(2, '0') + '-' + String(e.getDate()).padStart(2, '0');
}
function startOfMonthISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
}

function defaultState() {
  const t = todayISO();
  return {
    project: { name: 'MY CONTENT HUB', badge: '01' },
    milestones: [
      { label: 'EOY', date: new Date().getFullYear() + '-12-31' },
      { label: 'NEXT MONTH', date: addDaysISO(endOfMonthISO(), 1) }
    ],
    timerTarget: addDaysISO(endOfMonthISO(), 1),
    daily: [],
    weekly: { items: [], start: t, end: addDaysISO(t, 6) },
    monthly: { active: 'MONTHLY',
      MONTHLY: { items: [], start: startOfMonthISO(), end: endOfMonthISO() },
      EOY: { items: [], start: startOfMonthISO(), end: new Date().getFullYear() + '-12-31' } },
    periods: { daily: '', weekly: '', monthly: '' },
    heatmap: {},
    categories: ['Personal Brand', 'Current Campaigns', 'Payments/Sponsors'],
    activeCategory: 'ALL',
    scoped: [],      // { id, text, cat, bucket, done, priority }
    socials: [
      { ic: '🎵', label: 'TikTok', num: '0' },
      { ic: '📸', label: 'Instagram', num: '0' },
      { ic: '▶️', label: 'YouTube', num: '0' },
      { ic: '✖️', label: 'X', num: '0' }
    ],
    brands: [{ name: '', done: 0, owed: 0, rate: 0 }],
    pitchlist: [
      { name: 'Cecred', status: 'To DM', notes: '' },
      { name: 'Moroccanoil', status: 'To DM', notes: '' },
      { name: 'Osea Malibu', status: 'To DM', notes: '' },
      { name: 'Tatcha', status: 'To DM', notes: '' },
      { name: 'Maison Margiela Fragrances', status: 'To DM', notes: '' },
      { name: 'Lancôme', status: 'To DM', notes: '' },
      { name: 'Bano Global', status: 'To DM', notes: '' },
      { name: 'Cremerie Beauty', status: 'To DM', notes: '' },
      { name: 'Glow Recipe', status: 'To DM', notes: '' },
      { name: 'Monday Haircare', status: 'To DM', notes: '' },
      { name: 'Glossies World', status: 'To DM', notes: '' },
      { name: 'Entropy Makeup', status: 'To DM', notes: '' },
      { name: 'Yonka USA', status: 'To DM', notes: '' }
    ],
    tiers: [
      { name: 'Tier 1', items: [{ label: '', amount: 0 }] },
      { name: 'Tier 2', items: [{ label: '', amount: 0 }] },
      { name: 'Tier 3', items: [{ label: '', amount: 0 }] }
    ]
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    // migrate from v1 if it exists
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const o = JSON.parse(old);
      const s = defaultState();
      if (o.brands) s.brands = o.brands;
      if (o.pitchlist) s.pitchlist = o.pitchlist;
      if (o.tiers) s.tiers = o.tiers;
      if (o.heatmap) s.heatmap = o.heatmap;
      if (o.todos && o.todos.daily) s.daily = o.todos.daily;
      if (o.todos && o.todos.weekly) s.weekly.items = o.todos.weekly;
      if (o.todos && o.todos.monthly) s.monthly.MONTHLY.items = o.todos.monthly;
      return s;
    }
    return defaultState();
  } catch (e) { return defaultState(); }
}
let state = load();
ensureCategories();
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

// keep the category set sensible for existing saved data
function ensureCategories() {
  if (!Array.isArray(state.categories)) state.categories = [];
  // rename the old reference-style category to the new one
  if (state.categories.includes('Unlocked') && !state.categories.includes('Current Campaigns')) {
    state.categories = state.categories.map(c => (c === 'Unlocked' ? 'Current Campaigns' : c));
    (state.scoped || []).forEach(t => { if (t.cat === 'Unlocked') t.cat = 'Current Campaigns'; });
  }
  // make sure the three core tabs exist and sit first, in order
  const core = ['Personal Brand', 'Current Campaigns', 'Payments/Sponsors'];
  const extras = state.categories.filter(c => !core.includes(c));
  state.categories = [...core, ...extras];
  if (!state.categories.includes(state.activeCategory) && state.activeCategory !== 'ALL') state.activeCategory = 'ALL';
}

// show only the sections that belong to the active tab (ALL shows everything)
function applyTabVisibility() {
  const active = state.activeCategory;
  document.querySelectorAll('[data-tabs]').forEach(sec => {
    const tabs = sec.dataset.tabs.split(',').map(s => s.trim());
    sec.style.display = (active === 'ALL' || tabs.includes(active)) ? '' : 'none';
  });
}

const $ = sel => document.querySelector(sel);
const money = n => '$' + (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ===========================================================
   PERIOD RESETS
   =========================================================== */
function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return date.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}
function monthKeyOf(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

function runResets() {
  const today = todayISO();
  if (state.periods.daily && state.periods.daily !== today) {
    if (state.daily.length) {
      const ratio = state.daily.filter(i => i.done).length / state.daily.length;
      state.heatmap[state.periods.daily] = ratio;
    }
    state.daily.forEach(i => (i.done = false));
  }
  state.periods.daily = today;

  const wk = weekKey();
  if (state.periods.weekly && state.periods.weekly !== wk) state.weekly.items.forEach(i => (i.done = false));
  state.periods.weekly = wk;

  const mk = monthKeyOf();
  if (state.periods.monthly && state.periods.monthly !== mk) state.monthly.MONTHLY.items.forEach(i => (i.done = false));
  state.periods.monthly = mk;
  save();
}

/* ===========================================================
   HEADER: project, milestones, countdown
   =========================================================== */
function bindEditable(el, getter, setter) {
  el.textContent = getter();
  el.addEventListener('blur', () => { setter(el.textContent.trim()); save(); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
}

function daysUntil(iso) {
  const target = new Date(iso + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

function renderMilestones() {
  const wrap = $('#milestones');
  wrap.innerHTML = '';
  state.milestones.forEach((m, i) => {
    const d = daysUntil(m.date);
    const el = document.createElement('div');
    el.className = 'milestone';
    el.innerHTML = `<b>${d}</b><span class="lbl">d → ${m.label}</span><span class="x" title="Remove">✕</span>`;
    el.querySelector('.x').addEventListener('click', () => { state.milestones.splice(i, 1); save(); renderMilestones(); });
    wrap.appendChild(el);
  });
  const add = document.createElement('div');
  add.className = 'milestone'; add.style.cursor = 'pointer';
  add.innerHTML = `<b>＋</b>`;
  add.addEventListener('click', () => {
    const label = prompt('Milestone name (e.g. LAUNCH):'); if (!label) return;
    const date = prompt('Date (YYYY-MM-DD):', todayISO()); if (!date) return;
    state.milestones.push({ label: label.toUpperCase(), date }); save(); renderMilestones();
  });
  wrap.appendChild(add);
}

function tickCountdown() {
  const target = new Date(state.timerTarget + 'T00:00:00');
  let diff = Math.max(0, target - new Date());
  const d = Math.floor(diff / 86400000); diff -= d * 86400000;
  const h = Math.floor(diff / 3600000); diff -= h * 3600000;
  const m = Math.floor(diff / 60000);
  $('#cd-d').textContent = d; $('#cd-h').textContent = h; $('#cd-m').textContent = m;
}

/* ===========================================================
   CHECKLISTS (daily / weekly / monthly)
   =========================================================== */
function makeCheckItem(item, onToggle, onDelete) {
  const li = document.createElement('li');
  li.className = 'check-item' + (item.done ? ' done' : '');
  li.innerHTML = `<input type="checkbox" class="cb" ${item.done ? 'checked' : ''}/><span class="txt"></span><button class="rm">✕</button>`;
  li.querySelector('.txt').textContent = item.text;
  li.querySelector('.cb').addEventListener('change', e => { item.done = e.target.checked; onToggle(); });
  li.querySelector('.rm').addEventListener('click', onDelete);
  return li;
}

function renderDaily() {
  const ul = $('#daily-list'); ul.innerHTML = '';
  state.daily.forEach((item, i) => {
    ul.appendChild(makeCheckItem(item,
      () => { save(); renderDaily(); updateHeatmapLive(); },
      () => { state.daily.splice(i, 1); save(); renderDaily(); updateHeatmapLive(); }));
  });
  $('#daily-count').textContent = state.daily.filter(i => i.done).length + '/' + state.daily.length;
}

function renderPeriodList(which) {
  const data = which === 'weekly' ? state.weekly : currentMonthly();
  const ul = $('#' + which + '-list'); ul.innerHTML = '';
  data.items.forEach((item, i) => {
    ul.appendChild(makeCheckItem(item,
      () => { save(); renderPeriodList(which); },
      () => { data.items.splice(i, 1); save(); renderPeriodList(which); }));
  });
  $('#' + which + '-count').textContent = data.items.filter(i => i.done).length + '/' + data.items.length;
  renderTimebar(which, data);
}
function currentMonthly() { return state.monthly[state.monthly.active]; }

function renderTimebar(which, data) {
  const bar = $('#' + which + '-bar');
  const left = $('#' + which + '-left');
  const start = new Date(data.start + 'T00:00:00');
  const end = new Date(data.end + 'T00:00:00');
  const now = new Date();
  let pct = 0;
  if (end > start) pct = Math.min(100, Math.max(0, (now - start) / (end - start) * 100));
  bar.style.width = pct + '%';
  const d = daysUntil(data.end);
  left.textContent = d < 0 ? 'OVERDUE' : d + 'D LEFT';
  left.className = 'days-left ' + (d < 0 ? 'late' : d <= 3 ? 'late' : d <= 10 ? 'warn' : 'ok');
}

/* date inputs */
function bindDates(which) {
  const data = which === 'weekly' ? state.weekly : currentMonthly();
  const s = $('#' + which + '-start'), e = $('#' + which + '-end');
  s.value = data.start; e.value = data.end;
  s.onchange = () => { (which === 'weekly' ? state.weekly : currentMonthly()).start = s.value; save(); renderPeriodList(which); };
  e.onchange = () => { (which === 'weekly' ? state.weekly : currentMonthly()).end = e.value; save(); renderPeriodList(which); };
}

/* add forms (daily/weekly/monthly) */
document.querySelectorAll('[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    const form = document.querySelector(`[data-add-form="${btn.dataset.add}"]`);
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) form.querySelector('input').focus();
  });
});
document.querySelectorAll('[data-add-form]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const which = form.dataset.addForm;
    const input = form.querySelector('input');
    const text = input.value.trim(); if (!text) return;
    if (which === 'daily') { state.daily.push({ text, done: false }); renderDaily(); updateHeatmapLive(); }
    else if (which === 'weekly') { state.weekly.items.push({ text, done: false }); renderPeriodList('weekly'); }
    else { currentMonthly().items.push({ text, done: false }); renderPeriodList('monthly'); }
    input.value = ''; save();
  });
});

/* MONTHLY/EOY toggle */
document.querySelectorAll('#monthly-seg .seg-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#monthly-seg .seg-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.monthly.active = b.dataset.sub; save();
    bindDates('monthly'); renderPeriodList('monthly');
  });
});

/* ===========================================================
   CATEGORY TABS + SCOPED TASK BUCKETS
   =========================================================== */
function renderCategories() {
  const wrap = $('#cat-tabs'); wrap.innerHTML = '';
  const all = ['ALL', ...state.categories];
  all.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = 'cat-tab' + (state.activeCategory === cat ? ' active' : '');
    tab.innerHTML = `<span>${cat.toUpperCase()}</span>`;
    tab.addEventListener('click', () => { state.activeCategory = cat; save(); renderCategories(); renderBuckets(); });
    if (cat !== 'ALL' && state.activeCategory === cat) {
      const x = document.createElement('span'); x.className = 'x'; x.textContent = '✕';
      x.title = 'Delete category';
      x.addEventListener('click', ev => {
        ev.stopPropagation();
        if (!confirm(`Delete category "${cat}" and its tasks?`)) return;
        state.scoped = state.scoped.filter(t => t.cat !== cat);
        state.categories = state.categories.filter(c => c !== cat);
        state.activeCategory = 'ALL'; save(); renderCategories(); renderBuckets();
      });
      tab.appendChild(x);
    }
    wrap.appendChild(tab);
  });
  const add = document.createElement('button');
  add.className = 'cat-tab'; add.innerHTML = '<span>＋</span>';
  add.addEventListener('click', () => {
    const name = prompt('New category name:'); if (!name) return;
    state.categories.push(name); state.activeCategory = name; save(); renderCategories(); renderBuckets();
  });
  wrap.appendChild(add);
  $('#scope-name').textContent = state.activeCategory.toUpperCase();
  applyTabVisibility();
}

const PRIOS = ['p-green', 'p-yellow', 'p-red'];
function renderBuckets() {
  ['24h', '48h', '5d'].forEach(bucket => {
    const ul = document.querySelector(`[data-list="${bucket}"]`);
    ul.innerHTML = '';
    const items = state.scoped.filter(t => t.bucket === bucket &&
      (state.activeCategory === 'ALL' || t.cat === state.activeCategory));
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'check-item' + (item.done ? ' done' : '');
      const prio = item.priority || 'p-green';
      const catTag = state.activeCategory === 'ALL' ? ` · ${item.cat}` : '';
      li.innerHTML = `<input type="checkbox" class="cb" ${item.done ? 'checked' : ''}/>
        <span class="txt"></span>
        <span class="dot ${prio}" title="Priority — click to change"></span>
        <button class="rm">✕</button>`;
      li.querySelector('.txt').textContent = item.text + catTag;
      li.querySelector('.cb').addEventListener('change', e => { item.done = e.target.checked; save(); renderBuckets(); });
      li.querySelector('.dot').addEventListener('click', () => {
        const idx = (PRIOS.indexOf(prio) + 1) % PRIOS.length; item.priority = PRIOS[idx]; save(); renderBuckets();
      });
      li.querySelector('.rm').addEventListener('click', () => {
        state.scoped = state.scoped.filter(t => t !== item); save(); renderBuckets();
      });
      ul.appendChild(li);
    });
    document.querySelector(`[data-count="${bucket}"]`).textContent = items.filter(i => !i.done).length;
    const empty = document.querySelector(`[data-empty="${bucket}"]`);
    empty.style.display = items.length ? 'none' : 'block';
  });
}

document.querySelectorAll('[data-add-bucket]').forEach(btn => {
  btn.addEventListener('click', () => {
    const form = document.querySelector(`[data-bucket-form="${btn.dataset.addBucket}"]`);
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) form.querySelector('input').focus();
  });
});
document.querySelectorAll('[data-bucket-form]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bucket = form.dataset.bucketForm;
    const input = form.querySelector('input');
    const text = input.value.trim(); if (!text) return;
    const cat = state.activeCategory === 'ALL' ? (state.categories[0] || 'General') : state.activeCategory;
    state.scoped.push({ id: uid(), text, cat, bucket, done: false, priority: 'p-green' });
    input.value = ''; save(); renderBuckets();
  });
});

/* ===========================================================
   SOCIAL BADGES
   =========================================================== */
function renderSocials() {
  const wrap = $('#socials'); wrap.innerHTML = '';
  state.socials.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'social';
    el.innerHTML = `<span class="ic">${s.ic}</span><span class="num" contenteditable="true" spellcheck="false"></span>`;
    const num = el.querySelector('.num');
    num.textContent = s.num;
    num.addEventListener('blur', () => { state.socials[i].num = num.textContent.trim(); save(); });
    num.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); num.blur(); } });
    wrap.appendChild(el);
  });
}

/* ===========================================================
   HEATMAP
   =========================================================== */
function updateHeatmapLive() {
  if (state.daily.length) state.heatmap[todayISO()] = state.daily.filter(i => i.done).length / state.daily.length;
  else delete state.heatmap[todayISO()];
  save(); renderHeatmap();
}
function level(r) { if (r == null || r <= 0) return 0; if (r < 0.25) return 1; if (r < 0.5) return 2; if (r < 0.85) return 3; return 4; }
function renderHeatmap() {
  const wrap = $('#heatmap'); wrap.innerHTML = '';
  const WEEKS = 26;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7);
  for (let w = 0; w < WEEKS; w++) for (let d = 0; d < 7; d++) {
    const cur = new Date(start); cur.setDate(start.getDate() + w * 7 + d);
    const cell = document.createElement('div');
    const key = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
    if (cur > today) cell.className = 'cell future';
    else {
      const r = state.heatmap[key];
      cell.className = 'cell lvl-' + level(r);
      cell.title = key + ' · ' + (r != null ? Math.round(r * 100) + '% done' : 'no data');
    }
    wrap.appendChild(cell);
  }
  let streak = 0; const cur = new Date(); cur.setHours(0, 0, 0, 0);
  for (;;) {
    const k = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
    if (state.heatmap[k] > 0) { streak++; cur.setDate(cur.getDate() - 1); } else break;
  }
  $('#streak').textContent = streak + ' DAY STREAK';
}
$('#heatmap-btn').addEventListener('click', () => $('#heatmap-section').scrollIntoView({ behavior: 'smooth', block: 'center' }));

/* ===========================================================
   BRAND TRACKER
   =========================================================== */
function brandExpected() { return state.brands.reduce((s, b) => s + ((+b.done || 0) + (+b.owed || 0)) * (+b.rate || 0), 0); }
function brandEarned() { return state.brands.reduce((s, b) => s + (+b.done || 0) * (+b.rate || 0), 0); }
function renderBrands() {
  const body = $('#brand-body'); body.innerHTML = '';
  state.brands.forEach((b, i) => {
    const earned = (+b.done || 0) * (+b.rate || 0);
    const expected = ((+b.done || 0) + (+b.owed || 0)) * (+b.rate || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" data-f="name" placeholder="Brand"/></td>
      <td><input type="number" data-f="done" min="0"/></td>
      <td><input type="number" data-f="owed" min="0"/></td>
      <td><input type="number" data-f="rate" min="0" step="0.01"/></td>
      <td class="calc">${money(earned)}</td>
      <td class="calc">${money(expected)}</td>
      <td><button class="row-del">✕</button></td>`;
    tr.querySelector('[data-f="name"]').value = b.name;
    tr.querySelector('[data-f="done"]').value = b.done;
    tr.querySelector('[data-f="owed"]').value = b.owed;
    tr.querySelector('[data-f="rate"]').value = b.rate;
    tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
      const f = inp.dataset.f; b[f] = f === 'name' ? inp.value : (parseFloat(inp.value) || 0);
      save(); renderBrandTotals();
    }));
    tr.querySelector('.row-del').addEventListener('click', () => { state.brands.splice(i, 1); save(); renderBrands(); });
    body.appendChild(tr);
  });
  renderBrandTotals();
}
function renderBrandTotals() {
  $('#brand-total').textContent = money(brandExpected()) + ' EXPECTED';
  renderTiers();
}
$('#add-brand').addEventListener('click', () => { state.brands.push({ name: '', done: 0, owed: 0, rate: 0 }); save(); renderBrands(); });

/* ===========================================================
   PITCH LIST
   =========================================================== */
const PITCH_STATUSES = ['To DM', 'DMed', 'Replied', 'Booked'];
function renderPitch() {
  const body = $('#pitch-body'); body.innerHTML = '';
  state.pitchlist.forEach((p, i) => {
    const tr = document.createElement('tr');
    const opts = PITCH_STATUSES.map(s => `<option ${s === p.status ? 'selected' : ''}>${s}</option>`).join('');
    tr.innerHTML = `
      <td><input type="text" data-f="name" placeholder="Brand"/></td>
      <td><select data-f="status">${opts}</select></td>
      <td><input type="text" data-f="notes" placeholder="Handle, contact, rate…"/></td>
      <td><button class="row-del">✕</button></td>`;
    tr.querySelector('[data-f="name"]').value = p.name;
    tr.querySelector('[data-f="notes"]').value = p.notes;
    tr.querySelector('[data-f="name"]').addEventListener('input', e => { p.name = e.target.value; save(); });
    tr.querySelector('[data-f="notes"]').addEventListener('input', e => { p.notes = e.target.value; save(); });
    tr.querySelector('[data-f="status"]').addEventListener('change', e => { p.status = e.target.value; save(); renderPitch(); });
    tr.querySelector('.row-del').addEventListener('click', () => { state.pitchlist.splice(i, 1); save(); renderPitch(); });
    body.appendChild(tr);
  });
  $('#pitch-count').textContent = state.pitchlist.filter(p => p.status === 'To DM').length + ' TO DM';
}
$('#add-pitch').addEventListener('click', () => { state.pitchlist.push({ name: '', status: 'To DM', notes: '' }); save(); renderPitch(); });

/* ===========================================================
   INCOME TIERS (accumulating)
   =========================================================== */
function tierSub(t) { return t.items.reduce((s, it) => s + (+it.amount || 0), 0); }
function renderTiers() {
  const wrap = $('#tiers'); wrap.innerHTML = '';
  const earned = brandEarned();
  $('#current-income').textContent = money(earned) + ' SO FAR';
  let cum = 0;
  state.tiers.forEach(tier => {
    cum += tierSub(tier);
    const total = cum;
    const pct = total > 0 ? Math.min(100, Math.round(earned / total * 100)) : 0;
    const div = document.createElement('div'); div.className = 'tier';
    div.innerHTML = `
      <h3>${tier.name}</h3>
      <div class="tier-total">${money(total)}<small>CUMULATIVE GOAL</small></div>
      <div class="tier-bar"><span style="width:${pct}%"></span></div>
      <div class="tier-meta">${pct}% reached · adds ${money(tierSub(tier))}</div>
      <div class="tier-items"></div>
      <button class="tier-add">＋ add line</button>`;
    const itemsWrap = div.querySelector('.tier-items');
    tier.items.forEach((it, ii) => {
      const row = document.createElement('div'); row.className = 'tier-item';
      row.innerHTML = `<input type="text" placeholder="Source"/><input type="number" min="0" step="0.01" placeholder="0"/><button class="row-del">✕</button>`;
      const [txt, amt] = row.querySelectorAll('input');
      txt.value = it.label; amt.value = it.amount;
      txt.addEventListener('input', () => { it.label = txt.value; save(); });
      amt.addEventListener('input', () => { it.amount = parseFloat(amt.value) || 0; save(); renderTiers(); });
      row.querySelector('.row-del').addEventListener('click', () => { tier.items.splice(ii, 1); save(); renderTiers(); });
      itemsWrap.appendChild(row);
    });
    div.querySelector('.tier-add').addEventListener('click', () => { tier.items.push({ label: '', amount: 0 }); save(); renderTiers(); });
    wrap.appendChild(div);
  });
}

/* ===========================================================
   COUNTDOWN target editor + reset all
   =========================================================== */
$('#countdown').addEventListener('click', () => {
  const v = prompt('Countdown target date (YYYY-MM-DD):', state.timerTarget);
  if (v) { state.timerTarget = v; save(); tickCountdown(); }
});
$('#reset-all').addEventListener('click', () => {
  if (confirm('Erase EVERYTHING and start fresh?')) { localStorage.removeItem(STORE_KEY); localStorage.removeItem(OLD_KEY); state = defaultState(); save(); renderAll(); }
});

/* ===========================================================
   BOOT
   =========================================================== */
function renderAll() {
  bindEditable($('#project-name'), () => state.project.name, v => state.project.name = v);
  bindEditable($('#project-badge'), () => state.project.badge, v => state.project.badge = v);
  renderMilestones();
  tickCountdown();
  renderDaily();
  bindDates('weekly'); renderPeriodList('weekly');
  document.querySelectorAll('#monthly-seg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.sub === state.monthly.active));
  bindDates('monthly'); renderPeriodList('monthly');
  renderCategories(); renderBuckets();
  renderSocials();
  renderHeatmap();
  renderBrands();
  renderPitch();
  renderTiers();
}

runResets();
renderAll();
updateHeatmapLive();

setInterval(tickCountdown, 1000);
setInterval(() => { runResets(); renderDaily(); renderMilestones(); renderPeriodList('weekly'); renderPeriodList('monthly'); }, 60 * 1000);

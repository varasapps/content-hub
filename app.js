/* ===========================================================
   My Content Hub — personal dashboard
   All data is stored locally in the browser (localStorage).
   =========================================================== */

const STORE_KEY = 'contentHub.v1';

/* ---------- default / initial state ---------- */
function defaultState() {
  return {
    todos: { daily: [], weekly: [], monthly: [] },
    // markers for the last time each list was reset
    periods: { daily: '', weekly: '', monthly: '' },
    heatmap: {}, // { 'YYYY-MM-DD': 0..1 completion ratio }
    brands: [
      { name: '', done: 0, owed: 0, rate: 0 }
    ],
    // outreach list — pre-filled with UGC brands from saved reels
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

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) {
    return defaultState();
  }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/* ---------- date helpers ---------- */
function ymd(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// Monday-based week key, e.g. "2026-W25"
function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return date.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}
function monthKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

/* ===========================================================
   RESET LOGIC — runs on load and on an interval.
   - Before a daily reset, the day's completion ratio is logged
     into the heatmap, then all daily items are un-checked.
   - Weekly resets each Monday, monthly resets on the 1st.
   =========================================================== */
function runResets() {
  const today = ymd();
  const thisWeek = weekKey();
  const thisMonth = monthKey();

  // DAILY
  if (state.periods.daily && state.periods.daily !== today) {
    // log completion of the day that just ended
    const items = state.todos.daily;
    if (items.length) {
      const ratio = items.filter(i => i.done).length / items.length;
      state.heatmap[state.periods.daily] = ratio;
    }
    state.todos.daily.forEach(i => (i.done = false)); // un-check, keep tasks
  }
  if (state.periods.daily !== today) state.periods.daily = today;

  // WEEKLY
  if (state.periods.weekly && state.periods.weekly !== thisWeek) {
    state.todos.weekly.forEach(i => (i.done = false));
  }
  if (state.periods.weekly !== thisWeek) state.periods.weekly = thisWeek;

  // MONTHLY
  if (state.periods.monthly && state.periods.monthly !== thisMonth) {
    state.todos.monthly.forEach(i => (i.done = false));
  }
  if (state.periods.monthly !== thisMonth) state.periods.monthly = thisMonth;

  save();
}

/* ===========================================================
   TO-DO RENDERING
   =========================================================== */
function renderTodos(list) {
  const ul = document.getElementById(list + '-list');
  ul.innerHTML = '';
  state.todos[list].forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (item.done ? ' done' : '');
    li.innerHTML = `
      <input type="checkbox" class="check" ${item.done ? 'checked' : ''} />
      <span class="todo-text"></span>
      <button class="del" aria-label="Delete">✕</button>`;
    li.querySelector('.todo-text').textContent = item.text;
    li.querySelector('.check').addEventListener('change', e => {
      item.done = e.target.checked;
      save(); renderTodos(list); updateHeatmapLive();
    });
    li.querySelector('.del').addEventListener('click', () => {
      state.todos[list].splice(i, 1); save(); renderTodos(list); updateHeatmapLive();
    });
    ul.appendChild(li);
  });
  updateProgress(list);
}

function updateProgress(list) {
  const items = state.todos[list];
  const pct = items.length ? Math.round(items.filter(i => i.done).length / items.length * 100) : 0;
  document.getElementById(list + '-progress').textContent = pct + '%';
}

document.querySelectorAll('.add-form').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const list = form.dataset.list;
    const input = form.querySelector('input');
    const text = input.value.trim();
    if (!text) return;
    state.todos[list].push({ text, done: false });
    input.value = '';
    save(); renderTodos(list); updateHeatmapLive();
  });
});

/* ===========================================================
   HEATMAP — last ~26 weeks of daily completion
   =========================================================== */
function updateHeatmapLive() {
  // reflect today's in-progress completion immediately
  const items = state.todos.daily;
  if (items.length) state.heatmap[ymd()] = items.filter(i => i.done).length / items.length;
  else delete state.heatmap[ymd()];
  save();
  renderHeatmap();
}

function level(ratio) {
  if (ratio == null) return 0;
  if (ratio <= 0) return 0;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.85) return 3;
  return 4;
}

function renderHeatmap() {
  const wrap = document.getElementById('heatmap');
  wrap.innerHTML = '';
  const WEEKS = 26;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // start on the Monday WEEKS-1 weeks ago
  const start = new Date(today);
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow - (WEEKS - 1) * 7);

  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      const cell = document.createElement('div');
      const key = ymd(cur);
      if (cur > today) {
        cell.className = 'cell future';
      } else {
        const ratio = state.heatmap[key];
        cell.className = 'cell lvl-' + level(ratio);
        const pct = ratio != null ? Math.round(ratio * 100) + '% done' : 'no data';
        cell.title = key + ' · ' + pct;
      }
      wrap.appendChild(cell);
    }
  }
  renderStreak();
}

function renderStreak() {
  let streak = 0;
  const cur = new Date(); cur.setHours(0, 0, 0, 0);
  // count back while a day has >0 completion
  for (;;) {
    const r = state.heatmap[ymd(cur)];
    if (r != null && r > 0) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  document.getElementById('streak-pill').textContent = streak + (streak === 1 ? ' day streak' : ' day streak');
}

/* ===========================================================
   BRAND TRACKER
   =========================================================== */
const money = n => '$' + (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function renderBrands() {
  const body = document.getElementById('brand-body');
  body.innerHTML = '';
  let totalExpected = 0;
  state.brands.forEach((b, i) => {
    const earned = (Number(b.done) || 0) * (Number(b.rate) || 0);
    const expected = ((Number(b.done) || 0) + (Number(b.owed) || 0)) * (Number(b.rate) || 0);
    totalExpected += expected;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" data-f="name" placeholder="Brand name" /></td>
      <td><input type="number" data-f="done" min="0" /></td>
      <td><input type="number" data-f="owed" min="0" /></td>
      <td><input type="number" data-f="rate" min="0" step="0.01" /></td>
      <td class="cell-calc">${money(earned)}</td>
      <td class="cell-calc">${money(expected)}</td>
      <td><button class="row-del" aria-label="Delete">✕</button></td>`;
    tr.querySelector('[data-f="name"]').value = b.name;
    tr.querySelector('[data-f="done"]').value = b.done;
    tr.querySelector('[data-f="owed"]').value = b.owed;
    tr.querySelector('[data-f="rate"]').value = b.rate;
    tr.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => {
        const f = inp.dataset.f;
        b[f] = f === 'name' ? inp.value : (parseFloat(inp.value) || 0);
        save(); renderBrandTotals();
      });
    });
    tr.querySelector('.row-del').addEventListener('click', () => {
      state.brands.splice(i, 1); save(); renderBrands(); renderTiers();
    });
    body.appendChild(tr);
  });
  renderBrandTotals();
}

function brandExpectedTotal() {
  return state.brands.reduce((s, b) =>
    s + ((Number(b.done) || 0) + (Number(b.owed) || 0)) * (Number(b.rate) || 0), 0);
}
function brandEarnedTotal() {
  return state.brands.reduce((s, b) => s + (Number(b.done) || 0) * (Number(b.rate) || 0), 0);
}
function renderBrandTotals() {
  document.getElementById('brand-total').textContent = money(brandExpectedTotal()) + ' expected';
  renderTiers(); // tiers show progress against current earnings
}

document.getElementById('add-brand').addEventListener('click', () => {
  state.brands.push({ name: '', done: 0, owed: 0, rate: 0 });
  save(); renderBrands();
});

/* ===========================================================
   BRANDS TO PITCH / DM
   =========================================================== */
const PITCH_STATUSES = ['To DM', 'DMed', 'Replied', 'Booked'];

function renderPitch() {
  const body = document.getElementById('pitch-body');
  body.innerHTML = '';
  state.pitchlist.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.dataset.status = p.status;
    const options = PITCH_STATUSES.map(s =>
      `<option value="${s}" ${s === p.status ? 'selected' : ''}>${s}</option>`).join('');
    tr.innerHTML = `
      <td><input type="text" data-f="name" placeholder="Brand name" /></td>
      <td><select data-f="status">${options}</select></td>
      <td><input type="text" data-f="notes" placeholder="Handle, contact, rate…" /></td>
      <td><button class="row-del" aria-label="Delete">✕</button></td>`;
    tr.querySelector('[data-f="name"]').value = p.name;
    tr.querySelector('[data-f="notes"]').value = p.notes;
    tr.querySelector('[data-f="name"]').addEventListener('input', e => { p.name = e.target.value; save(); });
    tr.querySelector('[data-f="notes"]').addEventListener('input', e => { p.notes = e.target.value; save(); });
    tr.querySelector('[data-f="status"]').addEventListener('change', e => {
      p.status = e.target.value; save(); renderPitch();
    });
    tr.querySelector('.row-del').addEventListener('click', () => {
      state.pitchlist.splice(i, 1); save(); renderPitch();
    });
    body.appendChild(tr);
  });
  const todo = state.pitchlist.filter(p => p.status === 'To DM').length;
  document.getElementById('pitch-count').textContent = todo + ' to DM';
}

document.getElementById('add-pitch').addEventListener('click', () => {
  state.pitchlist.push({ name: '', status: 'To DM', notes: '' });
  save(); renderPitch();
});

/* ===========================================================
   INCOME TIERS — accumulating
   Tier 1 total = sum(tier1 items)
   Tier 2 total = tier1 total + sum(tier2 items)
   Tier 3 total = tier2 total + sum(tier3 items)
   =========================================================== */
function tierSubtotal(t) {
  return t.items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
}

function renderTiers() {
  const container = document.getElementById('tiers');
  container.innerHTML = '';
  const earned = brandEarnedTotal();
  document.getElementById('current-income').textContent = money(earned) + ' so far';

  let cumulative = 0;
  state.tiers.forEach((tier, ti) => {
    cumulative += tierSubtotal(tier);
    const cumTotal = cumulative;
    const pct = cumTotal > 0 ? Math.min(100, Math.round(earned / cumTotal * 100)) : 0;

    const div = document.createElement('div');
    div.className = 'tier';
    div.innerHTML = `
      <h3>${tier.name}</h3>
      <div class="tier-total">${money(cumTotal)} <small>cumulative goal</small></div>
      <div class="tier-progress"><span style="width:${pct}%"></span></div>
      <div class="tier-meta">${pct}% reached · this tier adds ${money(tierSubtotal(tier))}</div>
      <div class="tier-items"></div>
      <button class="tier-add">＋ add line</button>`;

    const itemsWrap = div.querySelector('.tier-items');
    tier.items.forEach((it, ii) => {
      const row = document.createElement('div');
      row.className = 'tier-item';
      row.innerHTML = `
        <input type="text" placeholder="Source (e.g. Brand deal)" />
        <input type="number" min="0" step="0.01" placeholder="0" />
        <button class="row-del" aria-label="Delete">✕</button>`;
      const [txt, amt] = row.querySelectorAll('input');
      txt.value = it.label; amt.value = it.amount;
      txt.addEventListener('input', () => { it.label = txt.value; save(); });
      amt.addEventListener('input', () => { it.amount = parseFloat(amt.value) || 0; save(); renderTiers(); });
      row.querySelector('.row-del').addEventListener('click', () => {
        tier.items.splice(ii, 1); save(); renderTiers();
      });
      itemsWrap.appendChild(row);
    });

    div.querySelector('.tier-add').addEventListener('click', () => {
      tier.items.push({ label: '', amount: 0 }); save(); renderTiers();
    });
    container.appendChild(div);
  });
}

/* ===========================================================
   HEADER clock + greeting
   =========================================================== */
function renderHeader() {
  const now = new Date();
  const h = now.getHours();
  const greet = h < 12 ? 'Good morning, lovely ♡' : h < 18 ? 'Good afternoon, lovely ♡' : 'Good evening, lovely ♡';
  document.getElementById('greeting').textContent = greet;
  document.getElementById('today-date').textContent =
    now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  document.getElementById('today-clock').textContent =
    now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/* ===========================================================
   RESET EVERYTHING
   =========================================================== */
document.getElementById('reset-all').addEventListener('click', () => {
  if (confirm('This will erase all tasks, brands, heatmap history and targets. Are you sure?')) {
    state = defaultState();
    save(); renderAll();
  }
});

/* ===========================================================
   BOOT
   =========================================================== */
function renderAll() {
  ['daily', 'weekly', 'monthly'].forEach(renderTodos);
  renderHeatmap();
  renderBrands();
  renderPitch();
  renderTiers();
  renderHeader();
}

runResets();
renderAll();
updateHeatmapLive();

// keep clock fresh + catch the midnight rollover while the tab is open
setInterval(renderHeader, 30 * 1000);
setInterval(() => { runResets(); renderAll(); }, 60 * 1000);

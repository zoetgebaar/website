// Agenda: where to find Zoet Gebaar. The team edits a Google Sheet (published as CSV) or data/agenda.json.
// Columns / fields: datum, einddatum (optioneel), uur, wat, waar. Past dates disappear automatically.
(() => {
  const list = document.getElementById('agenda-list');
  const empty = document.getElementById('agenda-empty');
  if (!list || !empty) return;

  function parseDate(value) {
    const text = String(value ?? '').trim();
    let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    return null;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const [head = [], ...body] = rows;
    const keys = head.map(h => h.trim().toLowerCase());
    return body.map(cells => Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? '').trim()])));
  }

  function normalise(raw) {
    const start = parseDate(raw.datum ?? raw.date);
    if (!start) return null;
    const end = parseDate(raw.einddatum ?? raw.end) || start;
    const title = String(raw.wat ?? raw.title ?? '').trim();
    if (!title) return null;
    return {start, end, title, place: String(raw.waar ?? raw.place ?? '').trim(), time: String(raw.uur ?? raw.time ?? '').trim()};
  }

  function render(events) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = events.map(normalise).filter(e => e && e.end >= today).sort((a, b) => a.start - b.start).slice(0, 8);
    list.replaceChildren();
    if (!upcoming.length) { list.hidden = true; empty.hidden = false; return; }
    const day = new Intl.DateTimeFormat('nl-BE', {day: 'numeric'});
    const month = new Intl.DateTimeFormat('nl-BE', {month: 'long'});
    const weekday = new Intl.DateTimeFormat('nl-BE', {weekday: 'long'});
    const full = new Intl.DateTimeFormat('nl-BE', {day: 'numeric', month: 'long'});
    for (const e of upcoming) {
      const li = document.createElement('li'); li.className = 'agenda-item';
      const date = document.createElement('div'); date.className = 'agenda-date';
      const d = document.createElement('span'); d.className = 'agenda-day'; d.textContent = day.format(e.start);
      const m = document.createElement('span'); m.className = 'agenda-month';
      const strong = document.createElement('strong'); strong.textContent = month.format(e.start);
      m.append(strong, document.createTextNode(weekday.format(e.start)));
      date.append(d, m);
      const info = document.createElement('div');
      const h = document.createElement('h3'); h.textContent = e.title;
      info.append(h);
      if (e.place) { const p = document.createElement('p'); p.className = 'agenda-place'; p.textContent = e.place; info.append(p); }
      const time = document.createElement('p'); time.className = 'agenda-time';
      const multi = e.end > e.start;
      time.textContent = [multi ? `Tot en met ${full.format(e.end)}` : '', e.time].filter(Boolean).join(', ');
      li.append(date, info, time);
      list.append(li);
    }
    list.hidden = false; empty.hidden = true;
    window.ZoetMotion?.reveal(list.children);
  }

  fetch('data/agenda.json', {cache: 'no-cache'})
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => {
      const fallback = Array.isArray(data.events) ? data.events : [];
      const sheet = typeof data.googleSheetCsv === 'string' ? data.googleSheetCsv.trim() : '';
      if (!/^https:\/\/docs\.google\.com\//.test(sheet)) return render(fallback);
      return fetch(sheet, {cache: 'no-cache'})
        .then(r => { if (!r.ok) throw new Error(); return r.text(); })
        .then(text => render(parseCsv(text)))
        .catch(() => render(fallback));
    })
    .catch(() => render([]));
})();

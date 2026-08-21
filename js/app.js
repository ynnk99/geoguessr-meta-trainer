/* ============================================================
   Meta Atlas — GeoGuessr Meta Trainer
   Vanilla JS, no build step. Data comes from a CSV (Papa Parse).
   Progress is stored per (Land, Meta) pair in localStorage.
   ============================================================ */

const ANSWER_COLUMN = "Land";
// Spalten, die nie als Quiz-Frage benutzt werden, egal was in den Einstellungen steht.
const NON_QUIZ_COLUMNS = ["Kontinent"];
const LS_PROGRESS   = "meta-atlas-progress-v1";
const LS_COLUMNS    = "meta-atlas-enabled-columns-v1";
const LS_MODE       = "meta-atlas-answer-mode-v1";
const LS_CATEGORY   = "meta-atlas-category-v1";
const LS_SHEET_URL  = "meta-atlas-sheet-url-v1";
const ALL_CATEGORIES = "__all__";

let rows = [];          // parsed CSV rows (array of objects)
let columns = [];        // quiz-able column names (all headers except ANSWER_COLUMN)
let enabledColumns = []; // subset of `columns` currently used for quizzing
let countries = [];      // unique list of country names
let progress = {};       // { "Land||Column": {attempts, correct, streak} }
let answerMode = "type"; // "type" | "choice"
let category = ALL_CATEGORIES; // ALL_CATEGORIES or a single column name — which meta(s) to drill

let currentItem = null;  // { country, column, value }
let lastItemKey = null;
let session = { correct: 0, total: 0, streak: 0 };

/* ---------------- Utilities ---------------- */

function normalize(str) {
  return (str || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]/g, "");
}

function itemKey(country, column) {
  return `${country}||${column}`;
}

function isImageValue(val) {
  return typeof val === "string" && /^https?:\/\//i.test(val.trim());
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

/* ---------------- Data loading ---------------- */

function ingestParsedData(parsedRows) {
  rows = parsedRows.filter(r => r[ANSWER_COLUMN] && r[ANSWER_COLUMN].trim());
  const headers = Object.keys(rows[0] || {});
  columns = headers.filter(h => h !== ANSWER_COLUMN && !NON_QUIZ_COLUMNS.includes(h));
  countries = [...new Set(rows.map(r => r[ANSWER_COLUMN].trim()))].sort();

  const savedCols = loadJSON(LS_COLUMNS, null);
  enabledColumns = savedCols
    ? savedCols.filter(c => columns.includes(c))
    : [...columns];
  if (enabledColumns.length === 0) enabledColumns = [...columns];

  buildColumnToggles();
  buildCategorySelect();
  buildCountryDatalist();
  progress = loadJSON(LS_PROGRESS, {});
  updateScoreboard();
  nextQuestion();
}

function sheetLinkToCsvUrl(link) {
  const idMatch = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const id = idMatch[1];
  const gidMatch = link.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

function loadFromURL(url, onStatus) {
  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    })
    .then(text => {
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (!parsed.data.length || !parsed.data[0][ANSWER_COLUMN]) {
        throw new Error(`Keine gültigen Daten gefunden (Spalte „${ANSWER_COLUMN}“ fehlt).`);
      }
      ingestParsedData(parsed.data);
      onStatus(`Geladen: ${rows.length} Länder.`, false);
    })
    .catch(err => {
      onStatus(
        `Konnte nicht laden (${err.message}). Prüfe, ob das Sheet auf „Jeder mit dem Link kann es ansehen“ freigegeben ist.`,
        true
      );
    });
}

function loadDefaultCSV() {
  const savedSheet = localStorage.getItem(LS_SHEET_URL);
  if (savedSheet) {
    document.getElementById("sheet-url").value = savedSheet;
    loadFromURL(savedSheet, (msg, isError) => {
      const el = document.getElementById("csv-status");
      el.textContent = msg;
      el.style.color = isError ? "var(--rust)" : "";
      if (isError) loadFallbackCSV();
    });
    return;
  }
  loadFallbackCSV();
}

function loadFallbackCSV() {
  fetch("data/data.csv")
    .then(r => {
      if (!r.ok) throw new Error("CSV nicht gefunden");
      return r.text();
    })
    .then(text => {
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      ingestParsedData(parsed.data);
      document.getElementById("csv-status").textContent = `Geladen: data/data.csv (${rows.length} Länder)`;
    })
    .catch(err => {
      document.getElementById("clue-body").innerHTML =
        `<p class="empty-msg">Konnte data/data.csv nicht laden.<br>
         Lade sie manuell unter „Einstellungen“ hoch, oder starte einen lokalen Server
         (z.&nbsp;B. <code>npx serve</code>) statt die Datei direkt zu öffnen.</p>`;
    });
}

function handleCSVUpload(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const parsed = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
    ingestParsedData(parsed.data);
    localStorage.removeItem(LS_SHEET_URL);
    document.getElementById("sheet-url").value = "";
    document.getElementById("csv-status").textContent = `Geladen: ${file.name} (${rows.length} Länder)`;
    document.getElementById("csv-status").style.color = "";
    // uploading new data invalidates old column selection defaults
    saveJSON(LS_COLUMNS, enabledColumns);
  };
  reader.readAsText(file);
}

/* ---------------- Column settings ---------------- */

function buildColumnToggles() {
  const container = document.getElementById("column-toggles");
  container.innerHTML = "";
  columns.forEach(col => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "col-toggle" + (enabledColumns.includes(col) ? " on" : "");
    btn.textContent = col;
    btn.addEventListener("click", () => {
      if (enabledColumns.includes(col)) {
        if (enabledColumns.length === 1) return; // keep at least one
        enabledColumns = enabledColumns.filter(c => c !== col);
      } else {
        enabledColumns.push(col);
      }
      saveJSON(LS_COLUMNS, enabledColumns);
      btn.classList.toggle("on");
    });
    container.appendChild(btn);
  });
}

function buildCategorySelect() {
  const savedCategory = loadJSON(LS_CATEGORY, ALL_CATEGORIES);
  category = (savedCategory === ALL_CATEGORIES || columns.includes(savedCategory))
    ? savedCategory : ALL_CATEGORIES;

  const select = document.getElementById("category-select");
  select.innerHTML =
    `<option value="${ALL_CATEGORIES}">Alle Kategorien (Mix)</option>` +
    columns.map(c => `<option value="${c}">${c}</option>`).join("");
  select.value = category;
}

function buildCountryDatalist() {
  const dl = document.getElementById("country-list");
  dl.innerHTML = countries.map(c => `<option value="${c}">`).join("");
}

/* ---------------- Quiz engine ---------------- */

function buildPool() {
  const pool = [];
  const activeColumns = category === ALL_CATEGORIES ? enabledColumns : [category];
  rows.forEach(r => {
    const country = r[ANSWER_COLUMN].trim();
    activeColumns.forEach(col => {
      const val = (r[col] || "").trim();
      if (!val || val === "-") return;
      pool.push({ country, column: col, value: val });
    });
  });
  return pool;
}

function weightFor(item) {
  const p = progress[itemKey(item.country, item.column)];
  if (!p || p.attempts === 0) return 6;
  const streak = p.streak || 0;
  if (streak === 0) return 5;   // last answer was wrong
  if (streak === 1) return 3;
  if (streak === 2) return 2;
  return 1;                     // mastered-ish
}

function pickItem(pool) {
  const candidates = pool.length > 1
    ? pool.filter(i => itemKey(i.country, i.column) !== lastItemKey)
    : pool;
  const weights = candidates.map(weightFor);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function nextQuestion() {
  const pool = buildPool();
  const clueBody = document.getElementById("clue-body");
  const feedback = document.getElementById("feedback");
  feedback.classList.add("hidden");
  feedback.classList.remove("correct", "wrong");
  document.getElementById("type-input").value = "";
  document.getElementById("type-form").classList.toggle("hidden", answerMode !== "type");
  document.getElementById("choice-form").classList.toggle("hidden", answerMode !== "choice");

  if (pool.length === 0) {
    const msg = category === ALL_CATEGORIES
      ? `Keine Metas ausgewählt. Geh zu „Einstellungen“ und aktiviere mindestens eine Spalte.`
      : `Für „${category}“ gibt es keine Daten in deiner CSV.`;
    clueBody.innerHTML = `<p class="empty-msg">${msg}</p>`;
    currentItem = null;
    return;
  }

  currentItem = pickItem(pool);
  lastItemKey = itemKey(currentItem.country, currentItem.column);

  document.getElementById("clue-label").textContent = currentItem.column;
  if (isImageValue(currentItem.value)) {
    clueBody.innerHTML = "";
    const img = document.createElement("img");
    img.src = currentItem.value;
    img.alt = currentItem.column;
    img.onerror = () => {
      clueBody.innerHTML = `<p>${currentItem.value}</p>`;
    };
    clueBody.appendChild(img);
  } else {
    clueBody.innerHTML = `<p>${currentItem.value}</p>`;
  }

  renderConfidenceDots();
  if (answerMode === "choice") renderChoiceForm();
  document.getElementById("type-input").focus();
}

function renderConfidenceDots() {
  const wrap = document.getElementById("confidence-dots");
  const p = progress[lastItemKey];
  const streak = p ? (p.streak || 0) : 0;
  const wasWrong = p && p.attempts > 0 && streak === 0;
  wrap.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const d = document.createElement("span");
    d.className = "dot" + (i < streak ? " filled" : (i === 0 && wasWrong ? " wrong" : ""));
    wrap.appendChild(d);
  }
}

function renderChoiceForm() {
  const form = document.getElementById("choice-form");
  form.innerHTML = "";
  const distractors = countries.filter(c => c !== currentItem.country);
  shuffle(distractors);
  const options = shuffle([currentItem.country, ...distractors.slice(0, 3)]);

  options.forEach(country => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-option";
    btn.textContent = country;
    btn.addEventListener("click", () => submitAnswer(country, btn, options));
    form.appendChild(btn);
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function submitAnswer(rawGuess, choiceBtn, allChoiceOptions) {
  if (!currentItem) return;
  const correct = normalize(rawGuess) === normalize(currentItem.country);

  // update progress
  const key = itemKey(currentItem.country, currentItem.column);
  const p = progress[key] || { attempts: 0, correct: 0, streak: 0 };
  p.attempts += 1;
  if (correct) { p.correct += 1; p.streak = Math.min(3, p.streak + 1); }
  else { p.streak = 0; }
  progress[key] = p;
  saveJSON(LS_PROGRESS, progress);

  // update session
  session.total += 1;
  if (correct) { session.correct += 1; session.streak += 1; }
  else { session.streak = 0; }
  updateScoreboard();

  // lock choice buttons if in choice mode
  if (allChoiceOptions) {
    const buttons = [...document.getElementById("choice-form").children];
    buttons.forEach(b => {
      b.disabled = true;
      if (b.textContent === currentItem.country) b.classList.add("correct");
      else if (b === choiceBtn) b.classList.add("wrong");
    });
  } else {
    document.getElementById("type-form").classList.add("hidden");
  }

  const feedback = document.getElementById("feedback");
  feedback.classList.remove("hidden");
  feedback.classList.toggle("correct", correct);
  feedback.classList.toggle("wrong", !correct);
  document.getElementById("feedback-text").textContent = correct
    ? `Richtig — ${currentItem.country}`
    : `Falsch — richtig war ${currentItem.country}`;

  renderConfidenceDots();
}

/* ---------------- Scoreboard / stats ---------------- */

function updateScoreboard() {
  document.getElementById("score-streak").textContent = session.streak;
  document.getElementById("score-session").textContent = `${session.correct}/${session.total}`;
  const allAttempts = Object.values(progress).reduce((a, p) => a + p.attempts, 0);
  const allCorrect = Object.values(progress).reduce((a, p) => a + p.correct, 0);
  document.getElementById("score-total").textContent =
    allAttempts ? `${Math.round((allCorrect / allAttempts) * 100)}%` : "—";
}

function renderStatsView() {
  const summary = document.getElementById("stats-summary");
  const body = document.getElementById("stats-body");
  const entries = Object.entries(progress).filter(([, p]) => p.attempts > 0);

  const totalAttempts = entries.reduce((a, [, p]) => a + p.attempts, 0);
  const totalCorrect = entries.reduce((a, [, p]) => a + p.correct, 0);
  summary.innerHTML = `
    <span>Fragen beantwortet: <strong>${totalAttempts}</strong></span>
    <span>Richtig: <strong>${totalCorrect}</strong></span>
    <span>Quote: <strong>${totalAttempts ? Math.round(totalCorrect/totalAttempts*100) : 0}%</strong></span>
  `;

  entries.sort((a, b) => (a[1].correct / a[1].attempts) - (b[1].correct / b[1].attempts));
  body.innerHTML = entries.map(([key, p]) => {
    const [country, column] = key.split("||");
    const pct = Math.round((p.correct / p.attempts) * 100);
    const dots = [0, 1, 2].map(i =>
      `<span class="dot${i < p.streak ? ' filled' : ''}"></span>`).join("");
    return `<tr>
      <td>${country}</td>
      <td>${column}</td>
      <td>${p.attempts}</td>
      <td>${p.correct}</td>
      <td>${pct}%</td>
      <td><div style="display:flex;gap:4px">${dots}</div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" class="muted">Noch keine Antworten.</td></tr>`;
}

/* ---------------- View switching ---------------- */

function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  if (id === "view-stats") renderStatsView();
}

/* ---------------- Wiring ---------------- */

function setMode(mode) {
  answerMode = mode;
  saveJSON(LS_MODE, mode);
  document.getElementById("mode-type").classList.toggle("active", mode === "type");
  document.getElementById("mode-choice").classList.toggle("active", mode === "choice");
  document.getElementById("type-form").classList.toggle("hidden", mode !== "type");
  document.getElementById("choice-form").classList.toggle("hidden", mode !== "choice");
  if (mode === "choice" && currentItem) renderChoiceForm();
}

document.addEventListener("DOMContentLoaded", () => {
  answerMode = loadJSON(LS_MODE, "type");

  document.getElementById("btn-settings").addEventListener("click", () => showView("view-settings"));
  document.getElementById("btn-stats").addEventListener("click", () => showView("view-stats"));

  document.getElementById("mode-type").addEventListener("click", () => setMode("type"));
  document.getElementById("mode-choice").addEventListener("click", () => setMode("choice"));

  document.getElementById("category-select").addEventListener("change", (e) => {
    category = e.target.value;
    saveJSON(LS_CATEGORY, category);
    nextQuestion();
  });

  document.getElementById("type-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("type-input").value;
    if (!val.trim() || !currentItem) return;
    submitAnswer(val, null, null);
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    showView("view-quiz");
    nextQuestion();
  });

  document.getElementById("csv-upload").addEventListener("change", (e) => {
    if (e.target.files[0]) handleCSVUpload(e.target.files[0]);
  });

  document.getElementById("btn-sheet-load").addEventListener("click", () => {
    const raw = document.getElementById("sheet-url").value.trim();
    const statusEl = document.getElementById("csv-status");
    if (!raw) { statusEl.textContent = "Bitte einen Link einfügen."; statusEl.style.color = "var(--rust)"; return; }
    const csvUrl = sheetLinkToCsvUrl(raw);
    if (!csvUrl) { statusEl.textContent = "Kein gültiger Google-Sheet-Link erkannt."; statusEl.style.color = "var(--rust)"; return; }
    statusEl.textContent = "Lade…"; statusEl.style.color = "";
    loadFromURL(csvUrl, (msg, isError) => {
      statusEl.textContent = msg;
      statusEl.style.color = isError ? "var(--rust)" : "";
      if (!isError) localStorage.setItem(LS_SHEET_URL, csvUrl);
    });
  });

  document.getElementById("btn-sheet-clear").addEventListener("click", () => {
    localStorage.removeItem(LS_SHEET_URL);
    document.getElementById("sheet-url").value = "";
    document.getElementById("csv-status").textContent = "Sheet-Anbindung entfernt — nutze wieder data/data.csv.";
    document.getElementById("csv-status").style.color = "";
    loadFallbackCSV();
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm("Wirklich den gesamten Fortschritt löschen?")) return;
    progress = {};
    saveJSON(LS_PROGRESS, progress);
    updateScoreboard();
    renderStatsView();
  });

  // clicking the brand returns to the quiz
  document.querySelector(".brand").addEventListener("click", () => showView("view-quiz"));

  setMode(answerMode);
  loadDefaultCSV();
});

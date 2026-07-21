const DATA = window.COMETS_DATA;
const SHEET = "https://docs.google.com/spreadsheets/d/1sG31dZoLYUNhUNntRkz9Qfbzh6aleKdKUHYZkxN5puQ/edit";
const names = DATA.players.map((player) => player[0]);
const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

const views = [...document.querySelectorAll("[data-view]")];
const tabs = [...document.querySelectorAll("[data-tab]")];
function showView() {
  const requested = location.hash.slice(1);
  const current = views.some((view) => view.dataset.view === requested) ? requested : "home";
  views.forEach((view) => view.classList.toggle("active", view.dataset.view === current));
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === current;
    tab.classList.toggle("active", active);
    active ? tab.setAttribute("aria-current", "page") : tab.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "instant" });
  const activeView = views.find((view) => view.dataset.view === current);
  document.title = current === "home" ? "Comets Coaching HQ" : `${activeView.dataset.title} · Comets Coaching HQ`;
}
window.addEventListener("hashchange", showView);
showView();

const toast = document.getElementById("toast");
let toastTimer;
function showToast(message) {
  toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}
async function shareText(title, text, url = "") {
  try {
    if (navigator.share) await navigator.share({ title, text, ...(url ? { url } : {}) });
    else { await navigator.clipboard.writeText([text, url].filter(Boolean).join("\n")); showToast("Copied to clipboard"); }
  } catch (error) { if (error.name !== "AbortError") showToast("Could not open sharing"); }
}
document.getElementById("shareButton").addEventListener("click", () => shareText("Comets Coaching HQ", "Comets coaching plans, rotations, and game-day tools.", location.href));

document.getElementById("playerGrid").innerHTML = DATA.players.map(([name, foot, anchors, emphasis]) => `
  <article class="player-card"><span>${name.slice(0,1)}</span><div><h2>${name}</h2><p>${emphasis}</p></div><dl><div><dt>Role anchors</dt><dd>${anchors}</dd></div><div><dt>Preferred foot</dt><dd>${foot}</dd></div></dl></article>`).join("");

document.getElementById("roleGrid").innerHTML = DATA.roles.map(([position, job, cue, mistake]) => `
  <article class="role-card"><span>${position}</span><h2>${job}</h2><div><small>Coaching cue</small><p>${cue}</p></div><div class="avoid"><small>Avoid</small><p>${mistake}</p></div></article>`).join("");

document.getElementById("coverageList").innerHTML = DATA.coverage.map((row) => {
  const [name, ...values] = row; const quarters = values.pop();
  return `<article class="coverage-card"><div class="coverage-name"><h2>${name}</h2><span>${quarters} playing quarters</span></div><div class="coverage-positions">${DATA.positions.map((position, index) => `<div><span>${position}</span><strong>${values[index]}</strong></div>`).join("")}</div></article>`;
}).join("");

let rotationGame = 0;
const rotationPicker = document.getElementById("rotationGamePicker");
rotationPicker.innerHTML = DATA.games.map((_, index) => `<button type="button" data-game="${index}">Game ${index + 1}</button>`).join("");
function renderRotation() {
  rotationPicker.querySelectorAll("button").forEach((button) => button.classList.toggle("active", Number(button.dataset.game) === rotationGame));
  document.getElementById("rotationGrid").innerHTML = DATA.games[rotationGame].map((quarter, qIndex) => `
    <article class="rotation-card"><header><span>Q${qIndex + 1}</span><strong>Planned lineup</strong></header><div class="mini-lineup">${DATA.positions.map((position, index) => `<div><small>${position}</small><b>${quarter[index]}</b></div>`).join("")}</div><div class="mini-bench"><small>Bench</small><p>${quarter.slice(7).join(" · ")}</p></div></article>`).join("");
}
rotationPicker.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; rotationGame = Number(button.dataset.game); renderRotation(); });
renderRotation();

const STORAGE_KEY = "comets-gameday-v2";
const defaultGameState = () => ({ game: 0, quarter: 0, absent: [], custom: {}, log: [], seconds: 720 });
let gameState;
try { gameState = { ...defaultGameState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { gameState = defaultGameState(); }
let selectedPosition = null;
let clockTimer = null;
let clockRunning = false;
let wakeLock = null;
const gameSelect = document.getElementById("gameSelect");
gameSelect.innerHTML = DATA.games.map((_, index) => `<option value="${index}">Game ${index + 1}</option>`).join("");
document.getElementById("quarterPicker").innerHTML = [0,1,2,3].map((index) => `<button type="button" data-quarter="${index}">Q${index + 1}</button>`).join("");
document.getElementById("attendanceGrid").innerHTML = names.map((name) => `<button type="button" data-player="${name}">${name}</button>`).join("");
function stateKey() { return `${gameState.game}-${gameState.quarter}`; }
function planned() { return DATA.games[gameState.game][gameState.quarter]; }
function currentLineup() {
  const saved = gameState.custom[stateKey()];
  const lineup = saved ? [...saved.lineup] : planned().slice(0,7);
  return lineup.map((name) => gameState.absent.includes(name) ? "" : name);
}
function currentBench() {
  const saved = gameState.custom[stateKey()];
  const bench = saved ? [...saved.bench] : planned().slice(7);
  return bench.filter((name) => !gameState.absent.includes(name));
}
function saveGame() { localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); }
function renderClock() {
  const minutes = Math.floor(gameState.seconds / 60); const seconds = gameState.seconds % 60;
  document.getElementById("clockDisplay").textContent = `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  document.getElementById("clockButton").textContent = clockRunning ? "Pause" : gameState.seconds === 0 ? "Reset clock" : "Start";
}
function renderGame() {
  gameSelect.value = gameState.game;
  document.querySelectorAll("[data-quarter]").forEach((button) => button.classList.toggle("active", Number(button.dataset.quarter) === gameState.quarter));
  document.querySelectorAll("[data-player]").forEach((button) => button.classList.toggle("absent", gameState.absent.includes(button.dataset.player)));
  const lineup = currentLineup(); const bench = currentBench();
  document.getElementById("formation").innerHTML = DATA.positions.map((position, index) => `<button type="button" data-position="${index}" class="field-player ${selectedPosition === index ? "selected" : ""} ${!lineup[index] ? "open" : ""}"><small>${position}</small><strong>${lineup[index] || "OPEN"}</strong></button>`).join("");
  document.getElementById("benchGrid").innerHTML = bench.map((name) => `<button type="button" data-bench="${name}">${name}</button>`).join("") || `<p class="empty-state">No available bench players.</p>`;
  document.getElementById("benchCount").textContent = `${bench.length} available`;
  document.getElementById("swapInstruction").textContent = selectedPosition === null ? "Tap a player on the field, then tap a bench player to swap." : `${DATA.positions[selectedPosition]} selected. Choose a bench player to send in.`;
  document.getElementById("subLog").innerHTML = gameState.log.length ? gameState.log.map((item) => `<li><span>${item.time}</span>${item.text}</li>`).join("") : `<li class="empty-state">No changes yet.</li>`;
  renderClock(); saveGame();
}
gameSelect.addEventListener("change", () => { gameState.game = Number(gameSelect.value); gameState.quarter = 0; gameState.seconds = 720; selectedPosition = null; renderGame(); });
document.getElementById("quarterPicker").addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; gameState.quarter = Number(button.dataset.quarter); gameState.seconds = 720; selectedPosition = null; renderGame(); });
document.getElementById("formation").addEventListener("click", (event) => { const button = event.target.closest("[data-position]"); if (!button) return; selectedPosition = Number(button.dataset.position); renderGame(); });
document.getElementById("benchGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-bench]"); if (!button || selectedPosition === null) return;
  const lineup = currentLineup(); const bench = currentBench(); const incoming = button.dataset.bench; const outgoing = lineup[selectedPosition];
  lineup[selectedPosition] = incoming; const nextBench = bench.filter((name) => name !== incoming); if (outgoing) nextBench.push(outgoing);
  gameState.custom[stateKey()] = { lineup, bench: nextBench };
  const clock = document.getElementById("clockDisplay").textContent;
  gameState.log.unshift({ time: `Q${gameState.quarter + 1} · ${clock}`, text: outgoing ? `${incoming} in for ${outgoing} at ${DATA.positions[selectedPosition]}` : `${incoming} filled the open ${DATA.positions[selectedPosition]} spot` });
  selectedPosition = null; renderGame();
});
document.getElementById("attendanceGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-player]"); if (!button) return; const name = button.dataset.player; gameState.absent = gameState.absent.includes(name) ? gameState.absent.filter((item) => item !== name) : [...gameState.absent, name]; selectedPosition = null; renderGame(); });
document.getElementById("clockButton").addEventListener("click", () => {
  if (gameState.seconds === 0) { gameState.seconds = 720; renderClock(); saveGame(); return; }
  clockRunning = !clockRunning;
  if (clockRunning) {
    navigator.wakeLock?.request("screen").then((lock) => { wakeLock = lock; }).catch(() => {});
    clockTimer = setInterval(() => { gameState.seconds = Math.max(0, gameState.seconds - 1); renderClock(); if (gameState.seconds % 10 === 0) saveGame(); if (gameState.seconds === 0) { clearInterval(clockTimer); clockRunning = false; wakeLock?.release().catch(() => {}); wakeLock = null; navigator.vibrate?.([200,100,200]); renderClock(); saveGame(); } }, 1000);
  } else { clearInterval(clockTimer); wakeLock?.release().catch(() => {}); wakeLock = null; }
  renderClock();
});
document.getElementById("clearLog").addEventListener("click", () => { gameState.log = []; renderGame(); });
document.getElementById("resetGame").addEventListener("click", () => { if (!confirm("Reset this game, attendance, clock, and substitution log?")) return; clearInterval(clockTimer); clockRunning = false; gameState = defaultGameState(); selectedPosition = null; renderGame(); });
renderGame();

const NOTES_KEY = "comets-coach-notes-v1";
let notes;
try { notes = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]"); } catch { notes = []; }
function draftText() {
  const coach = document.getElementById("coachName").value.trim(); const type = document.getElementById("noteType").value; const subject = document.getElementById("noteSubject").value.trim(); const note = document.getElementById("noteText").value.trim();
  if (!coach || !note) return "";
  return `COMETS COACH NOTE\nFrom: ${coach}\nType: ${type}${subject ? `\nPlayer/topic: ${subject}` : ""}\n\n${note}`;
}
function renderNotes() {
  document.getElementById("savedCount").textContent = `${notes.length} saved`;
  document.getElementById("savedNotes").innerHTML = notes.length ? notes.map((note, index) => `<article><div><small>${escapeHTML(note.created)}</small><strong>${escapeHTML(note.type)}${note.subject ? ` · ${escapeHTML(note.subject)}` : ""}</strong><p>${escapeHTML(note.note)}</p></div><div><button type="button" data-share-note="${index}">Share</button><button type="button" data-delete-note="${index}">Delete</button></div></article>`).join("") : `<p class="empty-state">No saved notes yet.</p>`;
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
document.getElementById("feedbackForm").addEventListener("submit", (event) => { event.preventDefault(); const text = draftText(); if (!text) return; const coach = document.getElementById("coachName"); const type = document.getElementById("noteType"); const subject = document.getElementById("noteSubject"); const note = document.getElementById("noteText"); notes.unshift({ coach: coach.value.trim(), type: type.value, subject: subject.value.trim(), note: note.value.trim(), created: new Date().toLocaleString() }); subject.value = ""; note.value = ""; renderNotes(); showToast("Note saved on this device"); });
document.getElementById("shareDraft").addEventListener("click", () => { const text = draftText(); if (!text) { showToast("Add your name and note first"); return; } shareText("Comets coach note", text); });
document.getElementById("savedNotes").addEventListener("click", (event) => { const share = event.target.closest("[data-share-note]"); const remove = event.target.closest("[data-delete-note]"); if (share) { const note = notes[Number(share.dataset.shareNote)]; shareText("Comets coach note", `COMETS COACH NOTE\nFrom: ${note.coach}\nType: ${note.type}${note.subject ? `\nPlayer/topic: ${note.subject}` : ""}\n\n${note.note}`); } if (remove) { notes.splice(Number(remove.dataset.deleteNote), 1); renderNotes(); } });
renderNotes();

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

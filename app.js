const DATA = window.COMETS_DATA;
const SHEET = "https://docs.google.com/spreadsheets/d/1sG31dZoLYUNhUNntRkz9Qfbzh6aleKdKUHYZkxN5puQ/edit";
const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ROSTER_KEY = "comets-roster-v1";
const seedPlayers = DATA.players.map(([name, foot, anchors, emphasis]) => ({ id: `seed-${slug(name)}`, name, foot, anchors, emphasis, custom: false }));
let customPlayers;
try { customPlayers = JSON.parse(localStorage.getItem(ROSTER_KEY) || "[]"); } catch { customPlayers = []; }
const allPlayers = () => [...seedPlayers, ...customPlayers.filter((player) => !player.archived)];
const playerById = (id) => allPlayers().find((player) => player.id === id);
const idForName = (name) => allPlayers().find((player) => player.name === name)?.id;
const playerName = (id) => playerById(id)?.name || "Unknown";

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

function renderRoster() {
  document.getElementById("playerGrid").innerHTML = allPlayers().map((player) => `
    <article class="player-card ${player.custom ? "custom-player" : ""}"><span>${escapeHTML(player.name.slice(0,1))}</span><div><h2>${escapeHTML(player.name)}</h2><p>${escapeHTML(player.emphasis || "New player · ready to add to today’s rotation")}</p></div><dl><div><dt>Role anchors</dt><dd>${escapeHTML(player.anchors || "Flexible")}</dd></div><div><dt>Preferred foot</dt><dd>${escapeHTML(player.foot || "Not noted")}</dd></div></dl>${player.custom ? `<button class="remove-player" type="button" data-remove-player="${player.id}">Remove</button>` : ""}</article>`).join("");
}
renderRoster();

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

const STORAGE_KEY = "comets-gameday-v3";
const defaultGameState = () => ({ version: 3, sessionId: crypto.randomUUID?.() || String(Date.now()), game: 0, quarter: 0, present: [], live: false, plan: null, current: null, log: [], seconds: 720 });
let gameState;
try { gameState = { ...defaultGameState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { gameState = defaultGameState(); }
let selectedPosition = null;
let clockTimer = null;
let clockRunning = false;
let wakeLock = null;
const gameSelect = document.getElementById("gameSelect");
const setupScreen = document.getElementById("gamedaySetup");
const liveScreen = document.getElementById("liveGame");
gameSelect.innerHTML = DATA.games.map((_, index) => `<option value="${index}">Game ${index + 1}</option>`).join("");
document.getElementById("quarterPicker").innerHTML = [0,1,2,3].map((index) => `<button type="button" data-quarter="${index}">Q${index + 1}</button>`).join("");

function saveGame() { localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); }
function presentPlayers() { return gameState.present.map(playerById).filter(Boolean); }
function buildPlan() {
  const presentIds = presentPlayers().map((player) => player.id);
  const totalStarts = Object.fromEntries(presentIds.map((id) => [id, 0]));
  return DATA.games[gameState.game].map((plannedQuarter) => {
    const used = new Set();
    const lineup = plannedQuarter.slice(0, 7).map((name) => {
      const id = idForName(name);
      if (!id || !presentIds.includes(id) || used.has(id)) return null;
      used.add(id); return id;
    });
    DATA.positions.forEach((position, index) => {
      if (lineup[index]) return;
      const candidate = presentIds.filter((id) => !used.has(id)).sort((a, b) => {
        const roleA = playerById(a)?.anchors?.split("/").map((v) => v.trim()).includes(position) ? -1 : 0;
        const roleB = playerById(b)?.anchors?.split("/").map((v) => v.trim()).includes(position) ? -1 : 0;
        return (totalStarts[a] - totalStarts[b]) || (roleA - roleB) || playerName(a).localeCompare(playerName(b));
      })[0];
      if (candidate) { lineup[index] = candidate; used.add(candidate); }
    });
    lineup.filter(Boolean).forEach((id) => { totalStarts[id] += 1; });
    const bench = presentIds.filter((id) => !used.has(id)).sort((a, b) => (totalStarts[a] - totalStarts[b]) || playerName(a).localeCompare(playerName(b)));
    return { lineup, bench };
  });
}
function renderAttendance() {
  const players = allPlayers();
  document.getElementById("attendanceGrid").innerHTML = players.map((player) => `<button type="button" data-player-id="${player.id}" class="${gameState.present.includes(player.id) ? "present" : ""}" aria-pressed="${gameState.present.includes(player.id)}"><span>${gameState.present.includes(player.id) ? "✓" : ""}</span>${escapeHTML(player.name)}</button>`).join("");
  document.getElementById("attendanceCount").textContent = `${gameState.present.length} of ${players.length} selected`;
  document.getElementById("selectAllPlayers").textContent = gameState.present.length === players.length ? "Clear all" : "Select all";
  const preview = buildPlan()[0];
  document.getElementById("starterPreview").innerHTML = DATA.positions.map((position, index) => `<div class="${preview.lineup[index] ? "" : "open"}"><small>${position}</small><strong>${preview.lineup[index] ? escapeHTML(playerName(preview.lineup[index])) : "OPEN"}</strong></div>`).join("");
  const warning = document.getElementById("setupWarning");
  warning.textContent = gameState.present.length < 7 ? `You can start, but the lineup will have ${7 - gameState.present.length} open spot${7 - gameState.present.length === 1 ? "" : "s"}.` : "";
  document.getElementById("startGame").disabled = gameState.present.length === 0;
  gameSelect.value = gameState.game;
  saveGame();
}
function currentLineup() { return gameState.current?.lineup ? [...gameState.current.lineup] : Array(7).fill(null); }
function currentBench() { return gameState.current?.bench ? [...gameState.current.bench] : []; }
function renderClock() {
  const minutes = Math.floor(gameState.seconds / 60); const seconds = gameState.seconds % 60;
  document.getElementById("clockDisplay").textContent = `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  document.getElementById("clockButton").textContent = clockRunning ? "Pause" : gameState.seconds === 0 ? "Reset clock" : "Start";
}
function renderLive() {
  const lineup = currentLineup(); const bench = currentBench();
  document.getElementById("liveGameLabel").textContent = `Game ${gameState.game + 1} · Quarter ${gameState.quarter + 1}`;
  document.querySelectorAll("[data-quarter]").forEach((button) => button.classList.toggle("active", Number(button.dataset.quarter) === gameState.quarter));
  document.getElementById("formation").innerHTML = DATA.positions.map((position, index) => `<button type="button" data-position="${index}" class="field-player ${selectedPosition === index ? "selected" : ""} ${!lineup[index] ? "open" : ""}" aria-pressed="${selectedPosition === index}"><small>${position}</small><strong>${lineup[index] ? escapeHTML(playerName(lineup[index])) : "OPEN"}</strong></button>`).join("");
  document.getElementById("benchGrid").innerHTML = bench.map((id) => `<button type="button" data-bench-id="${id}">${escapeHTML(playerName(id))}</button>`).join("") || `<p class="empty-state">No available bench players.</p>`;
  document.getElementById("benchCount").textContent = `${bench.length} available`;
  document.getElementById("fieldCount").textContent = `${lineup.filter(Boolean).length} on field`;
  document.getElementById("swapInstruction").textContent = selectedPosition === null ? "Tap a player on the field, then tap a bench player to swap." : `${DATA.positions[selectedPosition]} selected. Choose who goes in, or tap again to cancel.`;
  document.getElementById("subLog").innerHTML = gameState.log.length ? gameState.log.map((item) => `<li><span>${escapeHTML(item.time)}</span>${escapeHTML(item.text)}</li>`).join("") : `<li class="empty-state">No changes yet.</li>`;
  const next = document.getElementById("nextRotation");
  next.disabled = gameState.quarter === 3;
  next.querySelector("span").textContent = gameState.quarter === 3 ? "Final rotation" : "Load next rotation";
  next.querySelector("strong").textContent = gameState.quarter === 3 ? "Game complete" : `Quarter ${gameState.quarter + 2} →`;
  renderClock(); saveGame();
}
function renderGame() {
  setupScreen.hidden = gameState.live;
  liveScreen.hidden = !gameState.live;
  if (gameState.live) renderLive(); else renderAttendance();
}
function stopClock() { clearInterval(clockTimer); clockRunning = false; wakeLock?.release().catch(() => {}); wakeLock = null; }
function loadQuarter(index, logChange = true) {
  stopClock(); gameState.quarter = index; gameState.seconds = 720; selectedPosition = null;
  gameState.current = { lineup: [...gameState.plan[index].lineup], bench: [...gameState.plan[index].bench] };
  if (logChange) gameState.log.unshift({ type: "rotation", quarter: index, time: `Q${index + 1} · 12:00`, text: `Loaded Quarter ${index + 1} rotation` });
  renderGame();
}

gameSelect.addEventListener("change", () => { gameState.game = Number(gameSelect.value); gameState.quarter = 0; gameState.plan = null; gameState.current = null; renderGame(); });
document.getElementById("attendanceGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-player-id]"); if (!button) return; const id = button.dataset.playerId; gameState.present = gameState.present.includes(id) ? gameState.present.filter((item) => item !== id) : [...gameState.present, id]; renderAttendance(); });
document.getElementById("selectAllPlayers").addEventListener("click", () => { gameState.present = gameState.present.length === allPlayers().length ? [] : allPlayers().map((player) => player.id); renderAttendance(); });
document.getElementById("startGame").addEventListener("click", () => { gameState.plan = buildPlan(); gameState.live = true; gameState.log.unshift({ type: gameState.log.length ? "attendance" : "start", quarter: gameState.quarter, time: `Q${gameState.quarter + 1} · 12:00`, text: gameState.log.length ? `Attendance updated · ${gameState.present.length} players` : `Game started with ${gameState.present.length} players` }); loadQuarter(gameState.quarter, false); });
document.getElementById("editAttendance").addEventListener("click", () => { stopClock(); gameState.live = false; renderGame(); });
document.getElementById("quarterPicker").addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button || Number(button.dataset.quarter) === gameState.quarter) return; loadQuarter(Number(button.dataset.quarter)); });
document.getElementById("nextRotation").addEventListener("click", () => { if (gameState.quarter < 3) loadQuarter(gameState.quarter + 1); });
document.getElementById("formation").addEventListener("click", (event) => { const button = event.target.closest("[data-position]"); if (!button) return; const position = Number(button.dataset.position); selectedPosition = selectedPosition === position ? null : position; renderLive(); });
document.getElementById("benchGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-bench-id]"); if (!button || selectedPosition === null) return;
  const lineup = currentLineup(); const bench = currentBench(); const incoming = button.dataset.benchId; const outgoing = lineup[selectedPosition];
  lineup[selectedPosition] = incoming; const nextBench = bench.filter((id) => id !== incoming); if (outgoing) nextBench.push(outgoing);
  gameState.current = { lineup, bench: nextBench };
  const clock = document.getElementById("clockDisplay").textContent;
  gameState.log.unshift({ type: "substitution", quarter: gameState.quarter, clock, position: DATA.positions[selectedPosition], incoming, outgoing, time: `Q${gameState.quarter + 1} · ${clock}`, text: outgoing ? `${playerName(incoming)} in for ${playerName(outgoing)} at ${DATA.positions[selectedPosition]}` : `${playerName(incoming)} filled the open ${DATA.positions[selectedPosition]} spot` });
  selectedPosition = null; renderLive();
});
document.getElementById("clockButton").addEventListener("click", () => {
  if (gameState.seconds === 0) { gameState.seconds = 720; renderClock(); saveGame(); return; }
  clockRunning = !clockRunning;
  if (clockRunning) {
    navigator.wakeLock?.request("screen").then((lock) => { wakeLock = lock; }).catch(() => {});
    clockTimer = setInterval(() => { gameState.seconds = Math.max(0, gameState.seconds - 1); renderClock(); if (gameState.seconds % 10 === 0) saveGame(); if (gameState.seconds === 0) { stopClock(); navigator.vibrate?.([200,100,200]); renderClock(); saveGame(); } }, 1000);
  } else stopClock();
  renderClock();
});
document.getElementById("clearLog").addEventListener("click", () => { gameState.log = []; renderLive(); });
document.getElementById("resetGame").addEventListener("click", () => { if (!confirm("Start a completely new game? This clears attendance, clock, lineups, and the game log on this device.")) return; stopClock(); gameState = defaultGameState(); selectedPosition = null; renderGame(); });

const playerDialog = document.getElementById("playerDialog");
document.querySelectorAll(".add-player-trigger").forEach((button) => button.addEventListener("click", () => { document.getElementById("newPlayerName").value = ""; document.getElementById("newPlayerRole").value = ""; playerDialog.showModal(); setTimeout(() => document.getElementById("newPlayerName").focus(), 50); }));
document.getElementById("closePlayerDialog").addEventListener("click", () => playerDialog.close());
document.getElementById("playerForm").addEventListener("submit", (event) => {
  event.preventDefault(); const name = document.getElementById("newPlayerName").value.trim(); const role = document.getElementById("newPlayerRole").value;
  if (!name) return;
  if (allPlayers().some((player) => player.name.toLowerCase() === name.toLowerCase())) { showToast("That player is already on the roster"); return; }
  const id = `custom-${crypto.randomUUID?.() || `${Date.now()}-${slug(name)}`}`;
  customPlayers.push({ id, name, anchors: role || "Flexible", foot: "Not noted", emphasis: "Added on this device", custom: true });
  localStorage.setItem(ROSTER_KEY, JSON.stringify(customPlayers)); gameState.present.push(id); playerDialog.close(); renderRoster(); renderGame(); showToast(`${name} added to the roster`);
});
document.getElementById("playerGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-remove-player]"); if (!button) return; const player = playerById(button.dataset.removePlayer); if (!player || !confirm(`Remove ${player.name} from this device?`)) return; customPlayers = customPlayers.map((item) => item.id === player.id ? { ...item, archived: true } : item); localStorage.setItem(ROSTER_KEY, JSON.stringify(customPlayers)); gameState.present = gameState.present.filter((id) => id !== player.id); renderRoster(); renderGame(); });
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

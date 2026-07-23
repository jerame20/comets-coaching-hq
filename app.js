const DATA = window.COMETS_DATA;
const APP = window.COMETS_APP || { version: "Unversioned", releases: [] };
const SHEET = "https://docs.google.com/spreadsheets/d/1sG31dZoLYUNhUNntRkz9Qfbzh6aleKdKUHYZkxN5puQ/edit";
const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ROSTER_KEY = "comets-roster-v1";
const PLAYER_OVERRIDES_KEY = "comets-player-overrides-v1";
const PLAYER_PROFILE_SOURCE = "https://raw.githubusercontent.com/jerame20/comets-coaching-hq/main/player-profiles.json";
const LEGACY_SEED_IDS = { Avyaan: "seed-atar" };
const seedPlayers = DATA.players.map(([name, foot, anchors, emphasis]) => ({ id: LEGACY_SEED_IDS[name] || `seed-${slug(name)}`, sourceName: name, name, foot, anchors, emphasis, custom: false }));
let customPlayers;
let playerOverrides;
try { customPlayers = JSON.parse(localStorage.getItem(ROSTER_KEY) || "[]"); } catch { customPlayers = []; }
try { playerOverrides = JSON.parse(localStorage.getItem(PLAYER_OVERRIDES_KEY) || "{}"); } catch { playerOverrides = {}; }
if (playerOverrides["seed-atar"]?.name === "Atar") {
  playerOverrides["seed-atar"] = { ...playerOverrides["seed-atar"], name: "Avyaan" };
  localStorage.setItem(PLAYER_OVERRIDES_KEY, JSON.stringify(playerOverrides));
}
const allPlayers = () => [...seedPlayers.map((player) => ({ ...player, ...(playerOverrides[player.id] || {}) })), ...customPlayers].filter((player) => !player.archived);
const playerById = (id) => allPlayers().find((player) => player.id === id);
const idForName = (name) => allPlayers().find((player) => player.name === name || player.sourceName === name)?.id;
const playerName = (id) => playerById(id)?.name || "Unknown";

const views = [...document.querySelectorAll("[data-view]")];
const tabs = [...document.querySelectorAll("[data-tab]")];
function showView() {
  const requestedHash = location.hash.slice(1);
  const requested = requestedHash === "feedback" ? "board" : requestedHash;
  const current = views.some((view) => view.dataset.view === requested) ? requested : "gameday";
  views.forEach((view) => view.classList.toggle("active", view.dataset.view === current));
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === current;
    tab.classList.toggle("active", active);
    active ? tab.setAttribute("aria-current", "page") : tab.removeAttribute("aria-current");
  });
  const activeView = views.find((view) => view.dataset.view === current);
  document.title = current === "home" ? "Comets Coaching HQ" : `${activeView.dataset.title} · Comets Coaching HQ`;
  document.body.classList.toggle("gameday-view", current === "gameday");
  document.body.classList.toggle("live-gameday", current === "gameday" && !document.getElementById("liveGame")?.hidden);
  if (current === "board") window.onBoardViewed?.();
  requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" })));
}
window.addEventListener("hashchange", showView);
window.addEventListener("load", () => setTimeout(() => window.scrollTo({ top: 0, behavior: "instant" }), 0));
showView();

function renderChangelog() {
  document.getElementById("currentVersion").textContent = `v${APP.version}`;
  document.getElementById("footerVersion").textContent = `v${APP.version}`;
  document.getElementById("releaseList").innerHTML = APP.releases.map((release, index) => `
    <article class="release-card ${index === 0 ? "latest" : ""}">
      <header><div><span>v${escapeHTML(release.version)}</span><time>${escapeHTML(release.date)}</time></div>${index === 0 ? "<b>Current</b>" : ""}</header>
      <h2>${escapeHTML(release.title)}</h2>
      <p>${escapeHTML(release.summary)}</p>
      <ul>${release.changes.map((change) => `<li>${escapeHTML(change)}</li>`).join("")}</ul>
    </article>`).join("");
}
renderChangelog();

const themeButton = document.getElementById("themeButton");
function renderThemeButton() {
  const night = document.documentElement.dataset.theme === "night";
  themeButton.innerHTML = `<span aria-hidden="true">${night ? "☀" : "☾"}</span><b>${night ? "Day" : "Night"}</b>`;
  themeButton.setAttribute("aria-label", `Switch to ${night ? "day" : "night"} mode`);
  document.querySelector('meta[name="theme-color"]').content = night ? "#080b12" : "#1557c0";
}
themeButton.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "night" ? "day" : "night";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("comets-theme", next);
  renderThemeButton();
});
renderThemeButton();

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
    <article class="player-card ${player.custom ? "custom-player" : ""}"><span>${escapeHTML(player.name.slice(0,1))}</span><div><h2>${escapeHTML(player.name)}</h2><p>${escapeHTML(player.emphasis || "No development focus noted yet")}</p></div><div class="player-actions"><button type="button" data-edit-player="${player.id}">Edit</button>${player.custom ? `<button class="remove-player" type="button" data-remove-player="${player.id}">Remove</button>` : ""}</div><dl><div><dt>Preferred positions</dt><dd>${escapeHTML(player.anchors || "Flexible")}</dd></div><div><dt>Preferred foot</dt><dd>${escapeHTML(player.foot || "Not noted")}</dd></div></dl></article>`).join("");
}
renderRoster();

document.getElementById("roleGrid").innerHTML = DATA.roles.map(([position, job, cue, mistake]) => `
  <article class="role-card"><span>${position}</span><h2>${job}</h2><div><small>Coaching cue</small><p>${cue}</p></div><div class="avoid"><small>Avoid</small><p>${mistake}</p></div></article>`).join("");

function renderCoverage() {
  document.getElementById("coverageList").innerHTML = DATA.coverage.map((row) => {
    const [sourceName, ...values] = row; const quarters = values.pop(); const name = playerName(idForName(sourceName));
    return `<article class="coverage-card"><div class="coverage-name"><h2>${escapeHTML(name)}</h2><span>${quarters} playing quarters</span></div><div class="coverage-positions">${DATA.positions.map((position, index) => `<div><span>${position}</span><strong>${values[index]}</strong></div>`).join("")}</div></article>`;
  }).join("");
}
renderCoverage();

let rotationGame = 0;
const rotationPicker = document.getElementById("rotationGamePicker");
rotationPicker.innerHTML = DATA.games.map((_, index) => `<button type="button" data-game="${index}">Game ${index + 1}</button>`).join("");
function renderRotation() {
  rotationPicker.querySelectorAll("button").forEach((button) => button.classList.toggle("active", Number(button.dataset.game) === rotationGame));
  document.getElementById("rotationGrid").innerHTML = DATA.games[rotationGame].map((quarter, qIndex) => `
    <article class="rotation-card"><header><span>Q${qIndex + 1}</span><strong>Planned lineup</strong></header><div class="mini-lineup">${DATA.positions.map((position, index) => `<div><small>${position}</small><b>${escapeHTML(playerName(idForName(quarter[index])))}</b></div>`).join("")}</div><div class="mini-bench"><small>Bench</small><p>${quarter.slice(7).map((name) => escapeHTML(playerName(idForName(name)))).join(" · ")}</p></div></article>`).join("");
}
rotationPicker.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; rotationGame = Number(button.dataset.game); renderRotation(); });
renderRotation();

const makeFormation = (id, name, lines) => ({ id, name, positions: lines.flatMap((labels, row) => labels.map((label, index) => ({ label, row: row + 1, col: Math.floor(index * (12 / labels.length)) + 1, span: Math.ceil(12 / labels.length) }))) });
const FORMATIONS = {
  5: [makeFormation("5-121", "1-2-1", [["ST"],["LM","RM"],["CB"],["GK"]]), makeFormation("5-211", "2-1-1", [["ST"],["CM"],["LD","RD"],["GK"]])],
  6: [makeFormation("6-221", "2-2-1", [["ST"],["LM","RM"],["LD","RD"],["GK"]]), makeFormation("6-131", "1-3-1", [["ST"],["LM","CM","RM"],["CB"],["GK"]])],
  7: [
    makeFormation("7-231", "2-3-1", [["ST"],["LM","CM","RM"],["LD","RD"],["GK"]]),
    makeFormation("7-321", "3-2-1", [["ST"],["LM","RM"],["LD","CB","RD"],["GK"]]),
    makeFormation("7-132", "1-3-2", [["LF","RF"],["LM","CM","RM"],["CB"],["GK"]]),
    makeFormation("7-123", "1-2-3", [["LF","ST","RF"],["LM","RM"],["CB"],["GK"]])
  ],
  9: [makeFormation("9-332", "3-3-2", [["LF","RF"],["LM","CM","RM"],["LD","CB","RD"],["GK"]]), makeFormation("9-323", "3-2-3", [["LF","ST","RF"],["LM","RM"],["LD","CB","RD"],["GK"]])],
  11: [makeFormation("11-433", "4-3-3", [["LF","ST","RF"],["LM","CM","RM"],["LB","LCB","RCB","RB"],["GK"]]), makeFormation("11-442", "4-4-2", [["LF","RF"],["LM","LCM","RCM","RM"],["LB","LCB","RCB","RB"],["GK"]])]
};
const FORMAT_SIZES = { indoor: [9], outdoor: [7] };
const TIMING_PRESETS = {
  "psa-indoor-2": { periodCount: 2, periodMinutes: 20 },
  "psa-k1": { periodCount: 4, periodMinutes: 10 },
  "psa-2": { periodCount: 4, periodMinutes: 12 },
  "psa-34": { periodCount: 2, periodMinutes: 25 },
  "psa-56": { periodCount: 2, periodMinutes: 30 },
  "psa-710": { periodCount: 2, periodMinutes: 35 }
};
const PERIOD_MINUTES = [8,10,12,15,20,25,30,35,40,45];
const STORAGE_KEY = "comets-gameday-v3";
const defaultGameState = () => ({ version: 8, sessionId: crypto.randomUUID?.() || String(Date.now()), game: 0, quarter: 0, format: "outdoor", teamSize: 7, formation: "7-231", timingPreset: "psa-2", periodCount: 4, periodMinutes: 12, present: [], starterLineup: null, live: false, editingSession: false, plan: null, current: null, log: [], playingSeconds: {}, periodPlayingSeconds: {}, runningSince: null, seconds: 720 });
let gameState;
try { gameState = { ...defaultGameState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { gameState = defaultGameState(); }
if (!FORMAT_SIZES[gameState.format]?.includes(Number(gameState.teamSize))) { gameState.format = "outdoor"; gameState.teamSize = 7; }
if (!FORMATIONS[gameState.teamSize]?.some((formation) => formation.id === gameState.formation)) gameState.formation = FORMATIONS[gameState.teamSize][0].id;
if (![2,4].includes(Number(gameState.periodCount))) gameState.periodCount = 4;
if (!PERIOD_MINUTES.includes(Number(gameState.periodMinutes))) gameState.periodMinutes = 12;
gameState.version = 8;
gameState.playingSeconds ||= {};
gameState.periodPlayingSeconds ||= gameState.quarterPlayingSeconds || {};
gameState.runningSince ||= null;
let selectedPosition = null;
let selectedBenchId = null;
let selectedStarterPosition = null;
let clockTimer = null;
let clockRunning = Boolean(gameState.runningSince);
let wakeLock = null;
const gameSelect = document.getElementById("gameSelect");
const setupScreen = document.getElementById("gamedaySetup");
const liveScreen = document.getElementById("liveGame");
gameSelect.innerHTML = DATA.games.map((_, index) => `<option value="${index}">Game ${index + 1}</option>`).join("");

function saveGame() { localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); }
function presentPlayers() { return gameState.present.map(playerById).filter(Boolean); }
function activeFormation() { return FORMATIONS[gameState.teamSize].find((formation) => formation.id === gameState.formation) || FORMATIONS[gameState.teamSize][0]; }
function periodDurationSeconds() { return Number(gameState.periodMinutes) * 60; }
function totalGameSeconds() { return Number(gameState.periodCount) * periodDurationSeconds(); }
function rotationTargetSeconds() { return totalGameSeconds() / 4; }
function periodWord(index = gameState.quarter) { return `${gameState.periodCount === 2 ? "Half" : "Quarter"} ${index + 1}`; }
function periodShort(index = gameState.quarter) { return `${gameState.periodCount === 2 ? "H" : "Q"}${index + 1}`; }
function renderPeriodPicker() {
  document.getElementById("quarterPicker").innerHTML = Array.from({ length: gameState.periodCount }, (_, index) => `<button type="button" data-quarter="${index}" class="${index === gameState.quarter ? "active" : ""}">${periodShort(index)}</button>`).join("");
}
function roleMatches(player, position) {
  const roles = player?.anchors?.split("/").map((value) => value.trim()) || [];
  const aliases = { CB: ["LD","RD"], LB: ["LD"], LCB: ["LD","RD"], RCB: ["LD","RD"], RB: ["RD"], LF: ["LM","ST"], RF: ["RM","ST"], LCM: ["CM","LM"], RCM: ["CM","RM"] };
  return [position, ...(aliases[position] || [])].some((role) => roles.includes(role));
}
function buildPlan() {
  const presentIds = presentPlayers().map((player) => player.id);
  const totalStarts = Object.fromEntries(presentIds.map((id) => [id, 0]));
  const positions = activeFormation().positions;
  const sourceRotations = DATA.games[gameState.game];
  const plannedPeriods = gameState.periodCount === 2 ? [sourceRotations[0], sourceRotations[2]] : sourceRotations;
  return plannedPeriods.map((plannedPeriod) => {
    const used = new Set();
    const lineup = positions.map((position) => {
      const plannedIndex = DATA.positions.indexOf(position.label);
      const name = plannedIndex >= 0 ? plannedPeriod[plannedIndex] : null;
      const id = idForName(name);
      if (!id || !presentIds.includes(id) || used.has(id)) return null;
      used.add(id); return id;
    });
    positions.forEach((position, index) => {
      if (lineup[index]) return;
      const candidate = presentIds.filter((id) => !used.has(id)).sort((a, b) => {
        const roleA = roleMatches(playerById(a), position.label) ? -1 : 0;
        const roleB = roleMatches(playerById(b), position.label) ? -1 : 0;
        return (totalStarts[a] - totalStarts[b]) || (roleA - roleB) || playerName(a).localeCompare(playerName(b));
      })[0];
      if (candidate) { lineup[index] = candidate; used.add(candidate); }
    });
    lineup.filter(Boolean).forEach((id) => { totalStarts[id] += 1; });
    const bench = presentIds.filter((id) => !used.has(id)).sort((a, b) => (totalStarts[a] - totalStarts[b]) || playerName(a).localeCompare(playerName(b)));
    return { lineup, bench };
  });
}
function resolvedStarterLineup(plan = buildPlan()) {
  const fallback = plan[0]?.lineup || [];
  if (!Array.isArray(gameState.starterLineup)) return [...fallback];
  const used = new Set();
  return Array.from({ length: gameState.teamSize }, (_, index) => {
    const saved = gameState.starterLineup[index];
    const fallbackId = fallback[index];
    const id = [saved, fallbackId, ...gameState.present].find((candidate) => candidate && gameState.present.includes(candidate) && !used.has(candidate));
    if (id) used.add(id);
    return id || null;
  });
}
function planWithEditedStarters() {
  const plan = buildPlan();
  if (!plan[0]) return plan;
  const lineup = resolvedStarterLineup(plan);
  plan[0] = { lineup, bench: gameState.present.filter((id) => !lineup.includes(id)) };
  return plan;
}
function renderAttendance() {
  const players = allPlayers();
  const formation = activeFormation();
  document.querySelectorAll("[data-format]").forEach((button) => button.classList.toggle("active", button.dataset.format === gameState.format));
  document.getElementById("teamSizePicker").innerHTML = FORMAT_SIZES[gameState.format].map((size) => `<button type="button" data-team-size="${size}" class="${Number(gameState.teamSize) === size ? "active" : ""}">${size}v${size}</button>`).join("");
  document.getElementById("teamSizeFieldset").hidden = FORMAT_SIZES[gameState.format].length === 1;
  document.getElementById("formationSelect").innerHTML = FORMATIONS[gameState.teamSize].map((item) => `<option value="${item.id}" ${item.id === gameState.formation ? "selected" : ""}>${item.name}</option>`).join("");
  document.getElementById("timingPreset").value = TIMING_PRESETS[gameState.timingPreset] ? gameState.timingPreset : "custom";
  document.querySelectorAll("[data-period-count]").forEach((button) => button.classList.toggle("active", Number(button.dataset.periodCount) === gameState.periodCount));
  document.getElementById("periodMinutes").innerHTML = PERIOD_MINUTES.map((minutes) => `<option value="${minutes}" ${minutes === gameState.periodMinutes ? "selected" : ""}>${minutes} minutes</option>`).join("");
  document.getElementById("attendanceGrid").classList.toggle("choosing-starter", selectedStarterPosition !== null);
  document.getElementById("attendanceGrid").innerHTML = players.map((player) => {
    const present = gameState.present.includes(player.id);
    return `<button type="button" data-player-id="${player.id}" class="${present ? "present" : ""} ${selectedStarterPosition !== null && present ? "replacement-option" : ""}" aria-pressed="${present}" ${selectedStarterPosition !== null && !present ? "disabled" : ""}><span>${present ? (selectedStarterPosition !== null ? "↔" : "✓") : ""}</span>${escapeHTML(player.name)}</button>`;
  }).join("");
  document.getElementById("attendanceCount").textContent = `${gameState.present.length} of ${players.length} selected`;
  document.getElementById("selectAllPlayers").textContent = gameState.present.length === players.length ? "Clear all" : "Select all";
  const previewLineup = resolvedStarterLineup();
  document.getElementById("starterPreview").innerHTML = formation.positions.map((position, index) => `<button type="button" data-starter-position="${index}" class="${previewLineup[index] ? "" : "open"} ${selectedStarterPosition === index ? "selected" : ""}" aria-pressed="${selectedStarterPosition === index}"><small>${position.label}</small><strong>${previewLineup[index] ? escapeHTML(playerName(previewLineup[index])) : "OPEN"}</strong></button>`).join("");
  document.getElementById("starterHelp").textContent = selectedStarterPosition === null ? "Tap any starter to change them." : `Choose an available player for ${formation.positions[selectedStarterPosition].label}.`;
  const warning = document.getElementById("setupWarning");
  warning.textContent = gameState.present.length < gameState.teamSize ? `You can start, but the lineup will have ${gameState.teamSize - gameState.present.length} open spot${gameState.teamSize - gameState.present.length === 1 ? "" : "s"}.` : "";
  document.getElementById("startGame").disabled = gameState.present.length === 0;
  gameSelect.value = gameState.game;
  saveGame();
}
function currentLineup() { return gameState.current?.lineup ? [...gameState.current.lineup] : Array(gameState.teamSize).fill(null); }
function currentBench() { return gameState.current?.bench ? [...gameState.current.bench] : []; }
function formatDuration(totalSeconds) { const value = Math.max(0, Math.floor(totalSeconds || 0)); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2,"0")}`; }
function clockText() { return `${String(Math.floor(gameState.seconds / 60)).padStart(2,"0")}:${String(gameState.seconds % 60).padStart(2,"0")}`; }
function renderClock() {
  document.getElementById("clockDisplay").textContent = clockText();
  document.getElementById("clockButton").textContent = clockRunning ? "Pause" : gameState.seconds === 0 ? "Reset clock" : "Start";
}
function renderPlayingTime() {
  const onField = new Set(currentLineup().filter(Boolean));
  const trackedIds = new Set([...gameState.present, ...Object.entries(gameState.playingSeconds).filter(([, seconds]) => seconds > 0).map(([id]) => id)]);
  const players = [...trackedIds].map(playerById).filter(Boolean).sort((a, b) => Number(onField.has(b.id)) - Number(onField.has(a.id)) || (gameState.playingSeconds[b.id] || 0) - (gameState.playingSeconds[a.id] || 0) || a.name.localeCompare(b.name));
  document.getElementById("playingTimeGrid").innerHTML = players.map((player) => `<article class="time-card ${onField.has(player.id) ? "on-field" : ""}"><div><strong>${escapeHTML(player.name)}</strong><span>${onField.has(player.id) ? "On field" : "Bench"}</span></div><b>${formatDuration(gameState.playingSeconds[player.id])}</b></article>`).join("");
  document.getElementById("teamTimeStatus").textContent = clockRunning ? `Live · ${onField.size} playing` : "Clock paused";
}
function currentPeriodPlayingSeconds(id) {
  return gameState.periodPlayingSeconds?.[gameState.quarter]?.[id] || 0;
}
function playingTimeColor(seconds) {
  const stops = [
    { at: 0, color: [24,164,75], stage: "Fresh" },
    { at: .33, color: [214,197,28], stage: "Building" },
    { at: .66, color: [241,143,28], stage: "Watch" },
    { at: 1, color: [226,61,61], stage: "Sub due" },
    { at: 2, color: [139,76,199], stage: "Overdue" },
    { at: 3, color: [240,79,154], stage: "75% game" }
  ];
  const progress = Math.min(3, Math.max(0, seconds / Math.max(1, rotationTargetSeconds())));
  const upperIndex = Math.min(stops.length - 1, Math.max(1, stops.findIndex((stop) => progress <= stop.at)));
  const lower = stops[upperIndex - 1]; const upper = stops[upperIndex];
  const mix = upper.at === lower.at ? 0 : (progress - lower.at) / (upper.at - lower.at);
  const rgb = lower.color.map((channel, index) => Math.round(channel + (upper.color[index] - channel) * mix));
  const linear = rgb.map((value) => value / 255).map((value) => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const luminance = linear.reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const darkContrast = (luminance + .05) / .055;
  const lightContrast = 1.05 / (luminance + .05);
  const stage = [...stops].reverse().find((stop) => progress >= stop.at)?.stage || stops[0].stage;
  return { color: `rgb(${rgb.join(",")})`, text: darkContrast > lightContrast ? "#07101e" : "#ffffff", stage };
}
function rankedBench(bench = currentBench()) {
  const selectedRole = selectedPosition === null ? null : activeFormation().positions[selectedPosition]?.label;
  return [...bench].sort((a, b) => {
    if (selectedRole) {
      const roleDifference = Number(roleMatches(playerById(b), selectedRole)) - Number(roleMatches(playerById(a), selectedRole));
      if (roleDifference) return roleDifference;
    }
    return (gameState.playingSeconds[a] || 0) - (gameState.playingSeconds[b] || 0)
      || currentPeriodPlayingSeconds(a) - currentPeriodPlayingSeconds(b)
      || playerName(a).localeCompare(playerName(b));
  });
}
function recommendedOutgoingPosition(incoming) {
  if (!incoming) return null;
  const lineup = currentLineup();
  return lineup.map((id, index) => ({ id, index, position: activeFormation().positions[index]?.label }))
    .sort((a, b) => Number(Boolean(a.id)) - Number(Boolean(b.id))
      || Number(roleMatches(playerById(incoming), b.position)) - Number(roleMatches(playerById(incoming), a.position))
      || currentPeriodPlayingSeconds(b.id) - currentPeriodPlayingSeconds(a.id)
      || (gameState.playingSeconds[b.id] || 0) - (gameState.playingSeconds[a.id] || 0))[0]?.index ?? null;
}
function renderFormation() {
  const lineup = currentLineup();
  const formation = activeFormation();
  const recommendedPosition = selectedBenchId ? recommendedOutgoingPosition(selectedBenchId) : null;
  document.getElementById("formation").innerHTML = formation.positions.map((position, index) => {
    const id = lineup[index];
    const gameSeconds = id ? gameState.playingSeconds[id] || 0 : 0;
    const heat = playingTimeColor(gameSeconds);
    const label = id ? `${position.label}, ${playerName(id)}, ${formatDuration(gameSeconds)} played this game, ${heat.stage}` : `${position.label}, open position`;
    return `<button type="button" data-position="${index}" style="grid-column:${position.col} / span ${position.span};grid-row:${position.row};--player-color:${heat.color};--player-text:${heat.text}" class="field-player ${selectedPosition === index ? "selected" : ""} ${recommendedPosition === index ? "recommended-out" : ""} ${!id ? "open" : ""}" aria-label="${escapeHTML(label)}" aria-pressed="${selectedPosition === index}">${recommendedPosition === index ? `<b class="swap-hint">SUGGESTED</b>` : ""}<small class="field-position">${position.label}</small><strong class="field-name">${id ? escapeHTML(playerName(id)) : "OPEN"}</strong>${id ? `<span class="field-time">${formatDuration(gameSeconds)}</span>` : ""}</button>`;
  }).join("");
}
function renderLive() {
  const lineup = currentLineup(); const bench = currentBench();
  const recommendedBench = rankedBench(bench);
  const formation = activeFormation();
  renderPeriodPicker();
  document.getElementById("liveGameLabel").textContent = `Game ${gameState.game + 1} · ${periodWord()}`;
  document.getElementById("liveFormationLabel").textContent = `${gameState.format === "indoor" ? "Indoor" : "Outdoor"} · ${gameState.teamSize}v${gameState.teamSize} · ${formation.name} · ${gameState.periodCount} × ${gameState.periodMinutes} min`;
  document.getElementById("liveFormationSelect").innerHTML = FORMATIONS[gameState.teamSize].map((item) => `<option value="${item.id}" ${item.id === gameState.formation ? "selected" : ""}>${item.name}</option>`).join("");
  document.getElementById("clockLabel").textContent = `${gameState.periodCount === 2 ? "Half" : "Quarter"} clock`;
  renderFormation();
  document.getElementById("benchGrid").innerHTML = recommendedBench.map((id, index) => `<button type="button" data-bench-id="${id}" class="${selectedBenchId === id ? "selected" : ""}"><span class="bench-rank">${index === 0 ? "NEXT" : `#${index + 1}`}</span><strong>${escapeHTML(playerName(id))}</strong><small>${formatDuration(gameState.playingSeconds[id])} played</small></button>`).join("") || `<p class="empty-state">No available bench players.</p>`;
  document.getElementById("benchCount").textContent = `${bench.length} available`;
  document.getElementById("fieldCount").textContent = `${lineup.filter(Boolean).length} on field`;
  const suggestedPosition = selectedBenchId ? recommendedOutgoingPosition(selectedBenchId) : null;
  document.getElementById("swapInstruction").textContent = selectedBenchId
    ? `${playerName(selectedBenchId)} selected. Tap the field player to replace${suggestedPosition === null ? "." : ` — suggested: ${lineup[suggestedPosition] ? playerName(lineup[suggestedPosition]) : "open spot"} at ${formation.positions[suggestedPosition].label}.`}`
    : selectedPosition === null
      ? "Choose either direction: tap a field player or a ranked bench player first."
      : `${formation.positions[selectedPosition].label} selected. Choose who goes in, or tap again to cancel.`;
  renderPlayingTime();
  document.getElementById("subLog").innerHTML = gameState.log.length ? gameState.log.map((item) => `<li><span>${escapeHTML(item.time)}</span>${escapeHTML(item.text)}</li>`).join("") : `<li class="empty-state">No changes yet.</li>`;
  const next = document.getElementById("nextRotation");
  const isFinalPeriod = gameState.quarter === gameState.periodCount - 1;
  next.disabled = isFinalPeriod;
  next.querySelector("span").textContent = isFinalPeriod ? "Final period" : "Load next rotation";
  next.querySelector("strong").textContent = isFinalPeriod ? "Game complete" : `${periodWord(gameState.quarter + 1)} →`;
  renderClock(); saveGame();
}
function renderGame() {
  setupScreen.hidden = gameState.live;
  liveScreen.hidden = !gameState.live;
  document.body.classList.toggle("live-gameday", location.hash.slice(1) === "gameday" && gameState.live);
  if (gameState.live) renderLive(); else renderAttendance();
}
function releaseWakeLock() { wakeLock?.release().catch(() => {}); wakeLock = null; }
function endClock(vibrate = false) { clearInterval(clockTimer); clockTimer = null; clockRunning = false; gameState.runningSince = null; releaseWakeLock(); if (vibrate) navigator.vibrate?.([200,100,200]); }
function settleClock(now = Date.now()) {
  if (!gameState.runningSince || !clockRunning) return 0;
  const elapsed = Math.min(gameState.seconds, Math.max(0, Math.floor((now - gameState.runningSince) / 1000)));
  if (elapsed <= 0) return 0;
  gameState.periodPlayingSeconds[gameState.quarter] ||= {};
  [...new Set(currentLineup().filter(Boolean))].forEach((id) => {
    gameState.playingSeconds[id] = (gameState.playingSeconds[id] || 0) + elapsed;
    gameState.periodPlayingSeconds[gameState.quarter][id] = (gameState.periodPlayingSeconds[gameState.quarter][id] || 0) + elapsed;
  });
  gameState.seconds = Math.max(0, gameState.seconds - elapsed);
  gameState.runningSince += elapsed * 1000;
  if (gameState.seconds === 0) endClock(true);
  saveGame(); return elapsed;
}
function tickClock() { const elapsed = settleClock(); renderClock(); if (elapsed) { renderPlayingTime(); renderFormation(); } }
function startClock() {
  if (gameState.seconds <= 0 || clockRunning) return;
  clockRunning = true; gameState.runningSince = Date.now(); saveGame();
  navigator.wakeLock?.request("screen").then((lock) => { wakeLock = lock; }).catch(() => {});
  clockTimer = setInterval(tickClock, 250); renderClock(); renderPlayingTime();
}
function stopClock() { settleClock(); endClock(false); saveGame(); renderClock(); renderPlayingTime(); }
function loadQuarter(index, logChange = true) {
  stopClock(); gameState.quarter = index; gameState.seconds = periodDurationSeconds(); selectedPosition = null; selectedBenchId = null;
  gameState.periodPlayingSeconds[index] ||= {};
  gameState.current = { lineup: [...gameState.plan[index].lineup], bench: [...gameState.plan[index].bench] };
  if (logChange) gameState.log.unshift({ type: "rotation", quarter: index, time: `${periodShort(index)} · ${formatDuration(periodDurationSeconds())}`, text: `Loaded ${periodWord(index)} rotation` });
  renderGame();
}

function resetTimingProgress() {
  stopClock(); gameState.quarter = 0; gameState.editingSession = false; gameState.plan = null; gameState.current = null; gameState.log = []; gameState.playingSeconds = {}; gameState.periodPlayingSeconds = {}; gameState.seconds = periodDurationSeconds();
}
function setMatchTiming(periodCount, periodMinutes, preset = "custom") {
  gameState.periodCount = periodCount; gameState.periodMinutes = periodMinutes; gameState.timingPreset = preset;
  resetTimingProgress(); renderGame();
}

gameSelect.addEventListener("change", () => { stopClock(); gameState.game = Number(gameSelect.value); gameState.quarter = 0; gameState.editingSession = false; gameState.starterLineup = null; selectedStarterPosition = null; gameState.plan = null; gameState.current = null; gameState.log = []; gameState.playingSeconds = {}; gameState.periodPlayingSeconds = {}; gameState.seconds = periodDurationSeconds(); renderGame(); });
document.getElementById("formatPicker").addEventListener("click", (event) => { const button = event.target.closest("[data-format]"); if (!button || button.dataset.format === gameState.format) return; gameState.format = button.dataset.format; gameState.teamSize = FORMAT_SIZES[gameState.format][0]; gameState.formation = FORMATIONS[gameState.teamSize][0].id; gameState.starterLineup = null; selectedStarterPosition = null; const presetId = gameState.format === "indoor" ? "psa-indoor-2" : "psa-2"; const timing = TIMING_PRESETS[presetId]; setMatchTiming(timing.periodCount, timing.periodMinutes, presetId); showToast(`${gameState.format === "indoor" ? "Indoor 9v9" : "Outdoor 7v7"} rules loaded`); });
document.getElementById("teamSizePicker").addEventListener("click", (event) => { const button = event.target.closest("[data-team-size]"); if (!button) return; gameState.teamSize = Number(button.dataset.teamSize); gameState.formation = FORMATIONS[gameState.teamSize][0].id; gameState.starterLineup = null; selectedStarterPosition = null; gameState.plan = null; gameState.current = null; renderAttendance(); });
document.getElementById("formationSelect").addEventListener("change", (event) => { gameState.formation = event.target.value; gameState.starterLineup = null; selectedStarterPosition = null; gameState.plan = null; gameState.current = null; renderAttendance(); });
document.getElementById("timingPreset").addEventListener("change", (event) => { const preset = TIMING_PRESETS[event.target.value]; if (!preset) { gameState.timingPreset = "custom"; saveGame(); return; } setMatchTiming(preset.periodCount, preset.periodMinutes, event.target.value); showToast(`${preset.periodCount === 2 ? "Halves" : "Quarters"} set to ${preset.periodMinutes} minutes`); });
document.getElementById("periodCountPicker").addEventListener("click", (event) => { const button = event.target.closest("[data-period-count]"); if (!button || Number(button.dataset.periodCount) === gameState.periodCount) return; setMatchTiming(Number(button.dataset.periodCount), gameState.periodMinutes); showToast("Custom match timing saved"); });
document.getElementById("periodMinutes").addEventListener("change", (event) => { setMatchTiming(gameState.periodCount, Number(event.target.value)); showToast("Custom match timing saved"); });
document.getElementById("attendanceGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-player-id]"); if (!button) return;
  const id = button.dataset.playerId;
  if (selectedStarterPosition !== null) {
    if (!gameState.present.includes(id)) return;
    const lineup = resolvedStarterLineup();
    const otherPosition = lineup.indexOf(id);
    const outgoing = lineup[selectedStarterPosition];
    lineup[selectedStarterPosition] = id;
    if (otherPosition >= 0 && otherPosition !== selectedStarterPosition) lineup[otherPosition] = outgoing;
    gameState.starterLineup = lineup;
    selectedStarterPosition = null;
    showToast(`${playerName(id)} added to the starting lineup`);
    renderAttendance(); return;
  }
  gameState.present = gameState.present.includes(id) ? gameState.present.filter((item) => item !== id) : [...gameState.present, id];
  renderAttendance();
});
document.getElementById("starterPreview").addEventListener("click", (event) => {
  const button = event.target.closest("[data-starter-position]"); if (!button) return;
  const position = Number(button.dataset.starterPosition);
  selectedStarterPosition = selectedStarterPosition === position ? null : position;
  renderAttendance();
});
document.getElementById("selectAllPlayers").addEventListener("click", () => { selectedStarterPosition = null; gameState.present = gameState.present.length === allPlayers().length ? [] : allPlayers().map((player) => player.id); renderAttendance(); });
document.getElementById("startGame").addEventListener("click", () => {
  const resumeCurrentPeriod = Boolean(gameState.editingSession && gameState.current);
  const previousLineup = resumeCurrentPeriod ? currentLineup() : [];
  gameState.plan = planWithEditedStarters(); gameState.present.forEach((id) => { gameState.playingSeconds[id] ||= 0; }); gameState.live = true;
  const setup = `${gameState.format === "indoor" ? "Indoor" : "Outdoor"} ${gameState.teamSize}v${gameState.teamSize} · ${activeFormation().name} · ${gameState.periodCount} × ${gameState.periodMinutes} min`;
  gameState.log.unshift({ id: crypto.randomUUID?.() || String(Date.now()), type: gameState.log.length ? "attendance" : "start", at: Date.now(), quarter: gameState.quarter, remainingSeconds: gameState.seconds, time: `${periodShort()} · ${clockText()}`, text: gameState.log.length ? `Attendance updated · ${gameState.present.length} players · ${setup}` : `Game started · ${setup} · ${gameState.present.length} players` });
  if (resumeCurrentPeriod) {
    const lineup = Array.from({ length: gameState.teamSize }, (_, index) => gameState.present.includes(previousLineup[index]) ? previousLineup[index] : null);
    const bench = gameState.present.filter((id) => !lineup.includes(id));
    gameState.current = { lineup, bench }; gameState.editingSession = false; selectedPosition = null; selectedBenchId = null; renderGame();
  } else { gameState.editingSession = false; loadQuarter(gameState.quarter, false); }
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
});
document.getElementById("editAttendance").addEventListener("click", () => { stopClock(); gameState.live = false; gameState.editingSession = true; renderGame(); });
function remapLineup(lineup, oldFormation, newFormation) {
  const remaining = lineup.map((id, index) => ({ id, oldLabel: oldFormation.positions[index]?.label })).filter((item) => item.id);
  const mapped = Array(newFormation.positions.length).fill(null);
  newFormation.positions.forEach((position, index) => {
    const exact = remaining.findIndex((item) => item.oldLabel === position.label);
    if (exact >= 0) mapped[index] = remaining.splice(exact, 1)[0].id;
  });
  newFormation.positions.forEach((position, index) => {
    if (mapped[index] || !remaining.length) return;
    const roleFit = remaining.findIndex((item) => roleMatches(playerById(item.id), position.label));
    mapped[index] = remaining.splice(roleFit >= 0 ? roleFit : 0, 1)[0].id;
  });
  return mapped;
}
document.getElementById("liveFormationSelect").addEventListener("change", (event) => {
  const nextFormation = FORMATIONS[gameState.teamSize].find((item) => item.id === event.target.value);
  const previousFormation = activeFormation();
  if (!nextFormation || nextFormation.id === previousFormation.id) return;
  settleClock();
  if (gameState.current) gameState.current.lineup = remapLineup(currentLineup(), previousFormation, nextFormation);
  if (Array.isArray(gameState.plan)) gameState.plan = gameState.plan.map((period) => ({ ...period, lineup: remapLineup(period.lineup || [], previousFormation, nextFormation) }));
  gameState.formation = nextFormation.id;
  selectedPosition = null; selectedBenchId = null;
  gameState.log.unshift({ id: crypto.randomUUID?.() || String(Date.now()), type: "formation", at: Date.now(), quarter: gameState.quarter, remainingSeconds: gameState.seconds, time: `${periodShort()} · ${clockText()}`, text: `Formation changed from ${previousFormation.name} to ${nextFormation.name}` });
  renderLive(); showToast(`Switched to ${nextFormation.name}`);
});
document.getElementById("quarterPicker").addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button || Number(button.dataset.quarter) === gameState.quarter) return; loadQuarter(Number(button.dataset.quarter)); });
document.getElementById("nextRotation").addEventListener("click", () => { if (gameState.quarter < gameState.periodCount - 1) loadQuarter(gameState.quarter + 1); });
function makeSubstitution(positionIndex, incoming) {
  settleClock(); renderClock();
  const lineup = currentLineup(); const bench = currentBench(); const outgoing = lineup[positionIndex];
  lineup[positionIndex] = incoming; const nextBench = bench.filter((id) => id !== incoming); if (outgoing) nextBench.push(outgoing);
  gameState.current = { lineup, bench: nextBench };
  const clock = clockText();
  const position = activeFormation().positions[positionIndex].label;
  const outgoingTotalSeconds = outgoing ? gameState.playingSeconds[outgoing] || 0 : null;
  gameState.log.unshift({ id: crypto.randomUUID?.() || `${Date.now()}-${incoming}`, type: "substitution", at: Date.now(), quarter: gameState.quarter, elapsedPeriodSeconds: periodDurationSeconds() - gameState.seconds, remainingSeconds: gameState.seconds, clock, position, incoming, outgoing, outgoingTotalSeconds, time: `${periodShort()} · ${clock}`, text: outgoing ? `${playerName(incoming)} in for ${playerName(outgoing)} at ${position} · ${playerName(outgoing)} total ${formatDuration(outgoingTotalSeconds)}` : `${playerName(incoming)} filled the open ${position} spot` });
  selectedPosition = null; selectedBenchId = null; renderLive();
}
document.getElementById("formation").addEventListener("click", (event) => {
  const button = event.target.closest("[data-position]"); if (!button) return;
  const position = Number(button.dataset.position);
  if (selectedBenchId) { makeSubstitution(position, selectedBenchId); return; }
  selectedPosition = selectedPosition === position ? null : position; renderLive();
});
document.getElementById("benchGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-bench-id]"); if (!button) return;
  const incoming = button.dataset.benchId;
  if (selectedPosition !== null) { makeSubstitution(selectedPosition, incoming); return; }
  selectedBenchId = selectedBenchId === incoming ? null : incoming; renderLive();
});
document.getElementById("clockButton").addEventListener("click", () => {
  if (gameState.seconds === 0) { gameState.seconds = periodDurationSeconds(); renderClock(); saveGame(); return; }
  if (clockRunning) stopClock(); else startClock();
});
document.getElementById("clearLog").addEventListener("click", () => { gameState.log = []; renderLive(); });
document.getElementById("resetGame").addEventListener("click", () => { if (!confirm("Start a completely new game? This clears attendance, clock, lineups, playing-time totals, and the game log on this device.")) return; stopClock(); gameState = defaultGameState(); selectedPosition = null; selectedBenchId = null; renderGame(); });

const playerDialog = document.getElementById("playerDialog");
let editingPlayerId = null;
function openPlayerDialog(player = null) {
  editingPlayerId = player?.id || null;
  document.getElementById("playerDialogTitle").textContent = player ? "Edit player" : "Add a player";
  document.getElementById("savePlayerButton").textContent = player ? "Save changes" : "Add to roster";
  document.getElementById("newPlayerName").value = player?.name || "";
  document.getElementById("newPlayerPositions").value = player?.anchors === "Flexible" ? "" : player?.anchors || "";
  document.getElementById("newPlayerFoot").value = ["Right","Left","Both"].includes(player?.foot) ? player.foot : "Not noted";
  document.getElementById("newPlayerFocus").value = player?.emphasis || "";
  playerDialog.showModal(); setTimeout(() => document.getElementById("newPlayerName").focus(), 50);
}
document.querySelectorAll(".add-player-trigger").forEach((button) => button.addEventListener("click", () => openPlayerDialog()));
document.getElementById("closePlayerDialog").addEventListener("click", () => playerDialog.close());
function playerProfilePayload(player) {
  return { id: player.id, name: player.name, anchors: player.anchors, foot: player.foot, emphasis: player.emphasis, custom: Boolean(player.custom), archived: Boolean(player.archived), updatedAt: player.updatedAt || new Date().toISOString() };
}
async function syncPlayerProfile(player) {
  const profile = playerProfilePayload(player);
  const author = localStorage.getItem("comets-coach-identity-v1") || "Coach";
  const body = new URLSearchParams({ [NOTE_FORM_FIELDS.coach]: author, [NOTE_FORM_FIELDS.subject]: `PLAYER_PROFILE|${profile.id}`, [NOTE_FORM_FIELDS.type]: "Other", [NOTE_FORM_FIELDS.note]: JSON.stringify(profile), submit: "Submit" });
  await fetch(NOTE_FORM_ENDPOINT, { method: "POST", mode: "no-cors", body });
}
function newerProfile(incoming, local) {
  if (!local?.updatedAt) return true;
  return String(incoming.updatedAt || "") >= String(local.updatedAt);
}
async function loadSharedPlayerProfiles() {
  try {
    const response = await fetch(`${PLAYER_PROFILE_SOURCE}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    Object.entries(payload.profiles || {}).forEach(([id, profile]) => {
      const normalizedProfile = id === "seed-atar" && profile.name === "Atar" ? { ...profile, name: "Avyaan" } : profile;
      if (id.startsWith("seed-") && newerProfile(normalizedProfile, playerOverrides[id])) playerOverrides[id] = normalizedProfile;
      if (id.startsWith("custom-")) {
        const index = customPlayers.findIndex((player) => player.id === id);
        if (index < 0) customPlayers.push(normalizedProfile);
        else if (newerProfile(normalizedProfile, customPlayers[index])) customPlayers[index] = { ...customPlayers[index], ...normalizedProfile };
      }
    });
    localStorage.setItem(PLAYER_OVERRIDES_KEY, JSON.stringify(playerOverrides));
    localStorage.setItem(ROSTER_KEY, JSON.stringify(customPlayers));
    renderRoster(); renderRotation(); renderCoverage(); renderGame();
  } catch {}
}
document.getElementById("playerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("newPlayerName").value.trim();
  const anchors = document.getElementById("newPlayerPositions").value.trim().toUpperCase().replace(/\s*[,/]\s*/g, " / ") || "Flexible";
  const foot = document.getElementById("newPlayerFoot").value;
  const emphasis = document.getElementById("newPlayerFocus").value.trim() || "No development focus noted yet";
  if (!name) return;
  if (allPlayers().some((player) => player.id !== editingPlayerId && player.name.toLowerCase() === name.toLowerCase())) { showToast("That player is already on the roster"); return; }
  if (editingPlayerId) {
    const player = playerById(editingPlayerId);
    const updatedAt = new Date().toISOString();
    let savedPlayer;
    if (player?.custom) {
      customPlayers = customPlayers.map((item) => item.id === editingPlayerId ? { ...item, name, anchors, foot, emphasis, archived: false, updatedAt } : item);
      localStorage.setItem(ROSTER_KEY, JSON.stringify(customPlayers));
      savedPlayer = customPlayers.find((item) => item.id === editingPlayerId);
    } else {
      playerOverrides[editingPlayerId] = { ...(playerOverrides[editingPlayerId] || {}), id: editingPlayerId, name, anchors, foot, emphasis, custom: false, archived: false, updatedAt };
      localStorage.setItem(PLAYER_OVERRIDES_KEY, JSON.stringify(playerOverrides));
      savedPlayer = playerOverrides[editingPlayerId];
    }
    playerDialog.close(); renderRoster(); renderRotation(); renderCoverage(); renderGame(); showToast(`${name} saved and syncing`); syncPlayerProfile(savedPlayer).catch(() => showToast(`${name} saved here; shared sync will retry next edit`));
    return;
  }
  const id = `custom-${crypto.randomUUID?.() || `${Date.now()}-${slug(name)}`}`;
  const savedPlayer = { id, name, anchors, foot, emphasis, custom: true, archived: false, updatedAt: new Date().toISOString() };
  customPlayers.push(savedPlayer);
  localStorage.setItem(ROSTER_KEY, JSON.stringify(customPlayers)); gameState.present.push(id); playerDialog.close(); renderRoster(); renderRotation(); renderCoverage(); renderGame(); showToast(`${name} added and syncing`); syncPlayerProfile(savedPlayer).catch(() => showToast(`${name} saved here; shared sync will retry next edit`));
});
document.getElementById("playerGrid").addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit-player]"); const remove = event.target.closest("[data-remove-player]");
  if (edit) { const player = playerById(edit.dataset.editPlayer); if (player) openPlayerDialog(player); return; }
  if (!remove) return; const player = playerById(remove.dataset.removePlayer);
  if (!player || !confirm(`Remove ${player.name} from the shared roster?`)) return;
  customPlayers = customPlayers.map((item) => item.id === player.id ? { ...item, archived: true, updatedAt: new Date().toISOString() } : item); localStorage.setItem(ROSTER_KEY, JSON.stringify(customPlayers)); gameState.present = gameState.present.filter((id) => id !== player.id); renderRoster(); renderRotation(); renderCoverage(); renderGame(); const archivedPlayer = customPlayers.find((item) => item.id === player.id); syncPlayerProfile(archivedPlayer).catch(() => showToast("Removed here; shared sync will retry next edit"));
});
renderGame();
loadSharedPlayerProfiles();
if (gameState.runningSince && gameState.live && gameState.current) {
  clockRunning = true; settleClock();
  if (clockRunning) clockTimer = setInterval(tickClock, 250);
  renderLive();
} else if (gameState.runningSince) { endClock(false); saveGame(); }
document.addEventListener("visibilitychange", () => { if (!gameState.runningSince) return; settleClock(); if (gameState.live) { renderClock(); renderPlayingTime(); } });
window.addEventListener("pagehide", () => { settleClock(); saveGame(); });

const BOARD_IDENTITY_KEY = "comets-coach-identity-v1";
const BOARD_PENDING_KEY = "comets-board-pending-v1";
const BOARD_SEEN_KEY = "comets-board-seen-v1";
const BOARD_SOURCE = "https://raw.githubusercontent.com/jerame20/comets-coaching-hq/main/board.json";
const NOTE_FORM_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLSdDXZhL0hgNDblnGi5sHtIT3m2wK_J2MSaViMvOoPjGjJURWw/formResponse";
const NOTE_FORM_FIELDS = { coach: "entry.1308740030", subject: "entry.600358723", type: "entry.818830017", note: "entry.641937199" };
const VALID_COACHES = ["Jeremy", "Bryan", "Dante"];
let boardData = { posts: [] };
let pendingBoardItems;
let seenBoardIds;
try { pendingBoardItems = JSON.parse(localStorage.getItem(BOARD_PENDING_KEY) || "[]"); } catch { pendingBoardItems = []; }
try { seenBoardIds = JSON.parse(localStorage.getItem(BOARD_SEEN_KEY) || "null"); } catch { seenBoardIds = null; }
const coachIdentity = document.getElementById("coachIdentity");
const savedCoachRaw = localStorage.getItem(BOARD_IDENTITY_KEY) || "";
const savedCoach = savedCoachRaw === "Brian" ? "Bryan" : savedCoachRaw;
if (VALID_COACHES.includes(savedCoach)) coachIdentity.value = savedCoach;
if (savedCoachRaw === "Brian") localStorage.setItem(BOARD_IDENTITY_KEY, "Bryan");
function currentCoach() { return VALID_COACHES.includes(coachIdentity.value) ? coachIdentity.value : ""; }
function displayCoachName(name) { return name === "Brian" ? "Bryan" : name; }
function renderIdentity() { document.getElementById("coachIdentityLabel").textContent = currentCoach() || "Choose your name"; }
coachIdentity.addEventListener("change", () => { if (currentCoach()) localStorage.setItem(BOARD_IDENTITY_KEY, currentCoach()); else localStorage.removeItem(BOARD_IDENTITY_KEY); renderIdentity(); });
renderIdentity();

function newBoardId(prefix) { return `${prefix}-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`; }
function displayBoardTime(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? escapeHTML(value || "Just now") : parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function linkifyBoardText(value) {
  return escapeHTML(value).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, "<br>");
}
function allBoardIds(data = boardData) { return data.posts.flatMap((post) => [post.id, ...(post.comments || []).map((comment) => comment.id)]); }
function setBoardBadge(count) {
  const badge = document.getElementById("boardBadge");
  badge.hidden = count < 1; badge.textContent = count > 9 ? "9+" : String(count);
  if (count > 0) navigator.setAppBadge?.(count).catch(() => {}); else navigator.clearAppBadge?.().catch(() => {});
}
function markBoardSeen() {
  if (!boardData.posts.length) return;
  seenBoardIds = allBoardIds(); localStorage.setItem(BOARD_SEEN_KEY, JSON.stringify(seenBoardIds)); setBoardBadge(0);
}
window.onBoardViewed = markBoardSeen;
function updateBoardBadge() {
  const ids = allBoardIds();
  if (seenBoardIds === null) { seenBoardIds = ids; localStorage.setItem(BOARD_SEEN_KEY, JSON.stringify(ids)); }
  if (location.hash === "#board" || location.hash === "#feedback") { markBoardSeen(); return; }
  const seen = new Set(seenBoardIds); setBoardBadge(ids.filter((id) => !seen.has(id)).length);
}
function mergedBoard() {
  const merged = JSON.parse(JSON.stringify(boardData));
  pendingBoardItems.forEach((item) => {
    if (item.kind === "post" && !merged.posts.some((post) => post.id === item.id)) merged.posts.unshift({ ...item, comments: [], pending: true });
    if (item.kind === "comment") {
      const parent = merged.posts.find((post) => post.id === item.parentId);
      if (parent && !(parent.comments || []).some((comment) => comment.id === item.id)) { parent.comments ||= []; parent.comments.push({ ...item, pending: true }); }
    }
  });
  return merged;
}
function renderBoard() {
  const posts = mergedBoard().posts;
  document.getElementById("boardFeed").innerHTML = posts.length ? posts.map((post) => `
    <article class="board-post ${post.pending ? "pending" : ""}">
      <header><div class="coach-avatar">${escapeHTML(displayCoachName(post.author).slice(0,1))}</div><div><strong>${escapeHTML(post.title)}</strong><small>${escapeHTML(displayCoachName(post.author))} · ${displayBoardTime(post.createdAt || post.created)}${post.pending ? " · Syncing…" : ""}</small></div><span class="board-category">${escapeHTML(post.category)}</span></header>
      <div class="board-message">${linkifyBoardText(post.body)}</div>
      <section class="board-comments">${(post.comments || []).map((comment) => `<div class="board-comment ${comment.pending ? "pending" : ""}"><b>${escapeHTML(displayCoachName(comment.author))}</b><p>${linkifyBoardText(comment.body)}</p><small>${displayBoardTime(comment.createdAt || comment.created)}${comment.pending ? " · Syncing…" : ""}</small></div>`).join("")}</section>
      <form class="comment-form" data-parent-id="${escapeHTML(post.id)}"><textarea rows="2" maxlength="1500" required placeholder="Reply as ${escapeHTML(currentCoach() || "a coach")}…"></textarea><button type="submit">Reply</button></form>
    </article>`).join("") : `<div class="board-empty"><strong>No posts yet.</strong><span>Start with a practice idea, useful video, or question for the other coaches.</span></div>`;
  window.installDictationFields?.(document.getElementById("boardFeed"));
}
async function sendBoardItem(item) {
  const encodedTitle = encodeURIComponent(item.title || "");
  const encodedCategory = encodeURIComponent(item.category || "Other");
  const subject = item.kind === "post" ? `BOARD_POST|${item.id}|${encodedTitle}|${encodedCategory}` : `BOARD_COMMENT|${item.parentId}|${item.id}`;
  const acceptedType = ["Practice idea", "Game note", "Scheduling", "Other"].includes(item.category) ? item.category : "Other";
  const body = new URLSearchParams({ [NOTE_FORM_FIELDS.coach]: item.author, [NOTE_FORM_FIELDS.subject]: subject, [NOTE_FORM_FIELDS.type]: acceptedType, [NOTE_FORM_FIELDS.note]: item.body, submit: "Submit" });
  await fetch(NOTE_FORM_ENDPOINT, { method: "POST", mode: "no-cors", body });
}
function savePendingBoardItems() { localStorage.setItem(BOARD_PENDING_KEY, JSON.stringify(pendingBoardItems)); }
async function queueBoardItem(item, button) {
  pendingBoardItems.push(item); savePendingBoardItems(); renderBoard();
  button.disabled = true; const original = button.textContent; button.textContent = "Posting…";
  try { await sendBoardItem(item); showToast("Posted — it will finish syncing shortly"); }
  catch { showToast("Could not post. Your draft is saved on this device."); }
  finally { button.disabled = false; button.textContent = original; }
}
document.getElementById("boardForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (document.getElementById("boardWebsite").value) return;
  const author = currentCoach(); if (!author) { coachIdentity.focus(); showToast("Choose Jeremy, Bryan, or Dante first"); return; }
  const title = document.getElementById("boardTitle"); const category = document.getElementById("boardCategory"); const body = document.getElementById("boardBody");
  const item = { kind: "post", id: newBoardId("post"), author, title: title.value.trim(), category: category.value, body: body.value.trim(), createdAt: new Date().toISOString() };
  if (!item.title || !item.body) return;
  title.value = ""; body.value = ""; await queueBoardItem(item, document.getElementById("publishPostButton"));
});
document.getElementById("boardFeed").addEventListener("submit", async (event) => {
  const form = event.target.closest(".comment-form"); if (!form) return; event.preventDefault();
  const author = currentCoach(); if (!author) { coachIdentity.focus(); showToast("Choose your name before replying"); return; }
  const field = form.querySelector("textarea"); const body = field.value.trim(); if (!body) return;
  const item = { kind: "comment", id: newBoardId("comment"), parentId: form.dataset.parentId, author, category: "Other", body, createdAt: new Date().toISOString() };
  field.value = ""; await queueBoardItem(item, form.querySelector("button"));
});
async function loadBoard(showLoading = false) {
  const status = document.getElementById("boardStatus"); if (showLoading) status.textContent = "Refreshing…";
  try {
    const response = await fetch(`${BOARD_SOURCE}?v=${Date.now()}`, { cache: "no-store" }); if (!response.ok) throw new Error("Board unavailable");
    boardData = await response.json();
    const remoteIds = new Set(allBoardIds(boardData)); pendingBoardItems = pendingBoardItems.filter((item) => !remoteIds.has(item.id)); savePendingBoardItems();
    status.textContent = boardData.updatedAt ? `Updated ${displayBoardTime(boardData.updatedAt)}` : "Up to date"; renderBoard(); updateBoardBadge();
  } catch { status.textContent = "Offline — showing posts saved on this device"; renderBoard(); }
}
document.getElementById("refreshBoard").addEventListener("click", () => loadBoard(true));
renderBoard(); loadBoard(); setInterval(() => { if (!document.hidden) loadBoard(); }, 60000);

function markdownCell(value) { return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>"); }
function appDataMarkdown() {
  const formation = activeFormation();
  const lineup = currentLineup();
  const boardPosts = [...mergedBoard().posts].reverse();
  const lines = [
    "# Comets Coaching HQ export", "", `App version: v${APP.version}`, `Exported: ${new Date().toLocaleString()}`, "",
    "## Roster", "", "| Player | Preferred positions | Preferred foot | Development focus |", "|---|---|---|---|",
    ...allPlayers().map((player) => `| ${markdownCell(player.name)} | ${markdownCell(player.anchors || "Flexible")} | ${markdownCell(player.foot || "Not noted")} | ${markdownCell(player.emphasis || "")} |`),
    "", "## Role guide", "", "| Position | Job | Coaching cue | Avoid |", "|---|---|---|---|",
    ...DATA.roles.map(([position, job, cue, mistake]) => `| ${markdownCell(position)} | ${markdownCell(job)} | ${markdownCell(cue)} | ${markdownCell(mistake)} |`),
    "", "## Season coverage", "", `| Player | ${DATA.positions.join(" | ")} | Playing periods |`, `|---|${DATA.positions.map(() => "---").join("|")}|---|`,
    ...DATA.coverage.map((row) => { const [sourceName, ...values] = row; const periods = values.pop(); return `| ${markdownCell(playerName(idForName(sourceName)))} | ${values.join(" | ")} | ${periods} |`; }),
    "", "## Available formations", "",
    ...Object.entries(FORMATIONS).map(([size, formations]) => `- ${size}v${size}: ${formations.map((item) => item.name).join(", ")}`),
    "", "## Planned rotations", ""
  ];
  DATA.games.forEach((game, gameIndex) => {
    lines.push(`### Game ${gameIndex + 1}`, "");
    game.forEach((period, periodIndex) => {
      const assignments = DATA.positions.map((position, index) => `${position}: ${playerName(idForName(period[index]))}`).join("; ");
      const bench = period.slice(DATA.positions.length).map((name) => playerName(idForName(name))).join(", ");
      lines.push(`- Quarter ${periodIndex + 1}: ${assignments}. Bench: ${bench}.`);
    });
    lines.push("");
  });
  lines.push(
    "## Current game state", "",
    `- Status: ${gameState.live ? "Live" : "Setup"}`,
    `- Game: ${gameState.game + 1}`,
    `- Format: ${gameState.format} ${gameState.teamSize}v${gameState.teamSize}`,
    `- Formation: ${formation.name}`,
    `- Period: ${periodWord()}`,
    `- Clock: ${clockText()}`,
    `- Present: ${gameState.present.map(playerName).join(", ") || "None selected"}`,
    `- On field: ${formation.positions.map((position, index) => `${position.label}: ${lineup[index] ? playerName(lineup[index]) : "Open"}`).join("; ")}`,
    `- Bench: ${currentBench().map(playerName).join(", ") || "None"}`,
    "", "### Playing time", "",
    ...(gameState.present.length ? gameState.present.map((id) => `- ${playerName(id)}: ${formatDuration(gameState.playingSeconds[id] || 0)}`) : ["- No players selected."]),
    "", "### Game log", "",
    ...(gameState.log.length ? gameState.log.map((item) => `- ${item.time}: ${item.text}`) : ["- No changes logged."]),
    "", "## Coach board", ""
  );
  if (!boardPosts.length) lines.push("No board posts.");
  boardPosts.forEach((post) => {
    lines.push(`### ${post.title}`, "", `- Author: ${displayCoachName(post.author)}`, `- Category: ${post.category}`, `- Posted: ${post.created || post.createdAt || ""}`, "", post.body || "", "");
    (post.comments || []).forEach((comment) => lines.push(`> **${displayCoachName(comment.author)}:** ${String(comment.body || "").replace(/\r?\n/g, " ")}`, ""));
  });
  lines.push("", "## Changelog", "");
  APP.releases.forEach((release) => {
    lines.push(`### v${release.version} — ${release.title}`, "", `Released: ${release.date}`, "", release.summary, "", ...release.changes.map((change) => `- ${change}`), "");
  });
  return lines.join("\n").trim();
}
const exportDialog = document.getElementById("exportDialog");
document.getElementById("exportButton").addEventListener("click", () => {
  document.getElementById("exportMarkdown").value = appDataMarkdown();
  exportDialog.showModal();
});
document.getElementById("closeExportDialog").addEventListener("click", () => exportDialog.close());
document.getElementById("copyExportButton").addEventListener("click", async () => {
  const field = document.getElementById("exportMarkdown");
  try { await navigator.clipboard.writeText(field.value); showToast("All app data copied as Markdown"); }
  catch { field.focus(); field.select(); document.execCommand("copy"); showToast("Markdown copied"); }
});

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let activeRecognition = null;
let activeDictationButton = null;
function dictationLabel(field) {
  const label = field.closest("label")?.childNodes[0]?.textContent?.trim();
  return label || field.getAttribute("aria-label") || field.placeholder || "field";
}
function stopDictation() {
  activeRecognition?.stop();
}
function finishDictation() {
  activeDictationButton?.classList.remove("listening");
  activeDictationButton?.setAttribute("aria-pressed", "false");
  if (activeDictationButton) activeDictationButton.title = `Dictate ${activeDictationButton.dataset.label}`;
  activeRecognition = null; activeDictationButton = null;
}
function startDictation(field, button) {
  if (!SpeechRecognitionAPI) { showToast("Voice dictation is not supported here. Try Safari or Chrome."); return; }
  if (activeRecognition) {
    if (activeDictationButton === button) { stopDictation(); return; }
    activeRecognition.abort(); finishDictation();
  }
  const recognition = new SpeechRecognitionAPI();
  const baseValue = field.value.trim();
  let finalTranscript = "";
  recognition.lang = navigator.language || "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onstart = () => { button.classList.add("listening"); button.setAttribute("aria-pressed", "true"); button.title = "Stop dictation"; field.focus(); showToast("Listening… tap the mic to stop"); };
  recognition.onresult = (event) => {
    let interimTranscript = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;
      if (event.results[index].isFinal) finalTranscript += transcript;
      else interimTranscript += transcript;
    }
    field.value = [baseValue, `${finalTranscript}${interimTranscript}`.trim()].filter(Boolean).join(field.tagName === "TEXTAREA" ? " " : " ");
    field.dispatchEvent(new Event("input", { bubbles: true }));
  };
  recognition.onerror = (event) => {
    const messages = { "not-allowed": "Microphone permission is off", "audio-capture": "No microphone was found", "no-speech": "No speech heard — try again", network: "Voice dictation lost its connection" };
    if (event.error !== "aborted") showToast(messages[event.error] || "Voice dictation stopped");
  };
  recognition.onend = finishDictation;
  activeRecognition = recognition; activeDictationButton = button;
  try { recognition.start(); } catch { finishDictation(); showToast("Could not start voice dictation"); }
}
function installDictationFields(root = document) {
  root.querySelectorAll('input:not([type]):not([data-no-dictation]), input[type="text"]:not([data-no-dictation]), textarea:not([data-no-dictation])').forEach((field) => {
    if (field.closest(".dictation-field")) return;
    const wrapper = document.createElement("div"); wrapper.className = `dictation-field ${field.tagName === "TEXTAREA" ? "dictation-area" : ""}`;
    field.parentNode.insertBefore(wrapper, field); wrapper.appendChild(field);
    const label = dictationLabel(field);
    const button = document.createElement("button"); button.type = "button"; button.className = "dictation-button"; button.dataset.label = label; button.title = `Dictate ${label}`; button.setAttribute("aria-label", `Dictate ${label}`); button.setAttribute("aria-pressed", "false");
    button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Zm-1.5-8.5a1.5 1.5 0 1 1 3 0v5a1.5 1.5 0 1 1-3 0v-5Zm7 4.5v.5a5.5 5.5 0 0 1-11 0V11h-2v.5a7.5 7.5 0 0 0 6.5 7.43V22h2v-3.07a7.5 7.5 0 0 0 6.5-7.43V11h-2Z"/></svg>';
    button.addEventListener("click", () => startDictation(field, button)); wrapper.appendChild(button);
  });
}
window.installDictationFields = installDictationFields;
installDictationFields();

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

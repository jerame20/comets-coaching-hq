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
  requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" })));
}
window.addEventListener("hashchange", showView);
window.addEventListener("load", () => setTimeout(() => window.scrollTo({ top: 0, behavior: "instant" }), 0));
showView();

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

const TEAM_PHOTO_KEY = "comets-team-reference-v1";
const DEFAULT_TEAM_PHOTO = "./assets/comets-team-reference.png";
const teamPhoto = document.getElementById("teamPhoto");
const teamPhotoInput = document.getElementById("teamPhotoInput");
const teamPhotoPlaceholder = document.getElementById("teamPhotoPlaceholder");
const chooseTeamPhoto = document.getElementById("chooseTeamPhoto");
const removeTeamPhoto = document.getElementById("removeTeamPhoto");
function renderTeamPhoto(source = localStorage.getItem(TEAM_PHOTO_KEY)) {
  const customSource = source?.startsWith("data:image/") ? source : null;
  teamPhoto.hidden = false;
  teamPhotoPlaceholder.hidden = true;
  removeTeamPhoto.hidden = !customSource;
  chooseTeamPhoto.textContent = customSource ? "Change photo" : "Use different photo";
  teamPhoto.src = customSource || DEFAULT_TEAM_PHOTO;
}
function compressTeamPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("image"));
      image.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#080b12";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", .82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
chooseTeamPhoto.addEventListener("click", () => teamPhotoInput.click());
teamPhotoInput.addEventListener("change", async () => {
  const file = teamPhotoInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { showToast("Choose an image file"); return; }
  if (file.size > 25 * 1024 * 1024) { showToast("That photo is too large — choose one under 25 MB"); return; }
  chooseTeamPhoto.disabled = true;
  chooseTeamPhoto.textContent = "Preparing photo…";
  try {
    const source = await compressTeamPhoto(file);
    localStorage.setItem(TEAM_PHOTO_KEY, source);
    renderTeamPhoto(source);
    showToast("Reference photo saved on this device");
  } catch {
    renderTeamPhoto();
    showToast("Could not save that photo");
  } finally {
    chooseTeamPhoto.disabled = false;
    teamPhotoInput.value = "";
  }
});
removeTeamPhoto.addEventListener("click", () => {
  if (!confirm("Restore the shared Comets team photo on this device?")) return;
  localStorage.removeItem(TEAM_PHOTO_KEY);
  renderTeamPhoto(null);
  showToast("Shared Comets photo restored");
});
renderTeamPhoto();

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

const makeFormation = (id, name, lines) => ({ id, name, positions: lines.flatMap((labels, row) => labels.map((label, index) => ({ label, row: row + 1, col: Math.floor(index * (12 / labels.length)) + 1, span: Math.ceil(12 / labels.length) }))) });
const FORMATIONS = {
  5: [makeFormation("5-121", "1-2-1", [["ST"],["LM","RM"],["CB"],["GK"]]), makeFormation("5-211", "2-1-1", [["ST"],["CM"],["LD","RD"],["GK"]])],
  6: [makeFormation("6-221", "2-2-1", [["ST"],["LM","RM"],["LD","RD"],["GK"]]), makeFormation("6-131", "1-3-1", [["ST"],["LM","CM","RM"],["CB"],["GK"]])],
  7: [makeFormation("7-231", "2-3-1", [["ST"],["LM","CM","RM"],["LD","RD"],["GK"]]), makeFormation("7-321", "3-2-1", [["ST"],["LM","RM"],["LD","CB","RD"],["GK"]])],
  9: [makeFormation("9-332", "3-3-2", [["LF","RF"],["LM","CM","RM"],["LD","CB","RD"],["GK"]]), makeFormation("9-323", "3-2-3", [["LF","ST","RF"],["LM","RM"],["LD","CB","RD"],["GK"]])],
  11: [makeFormation("11-433", "4-3-3", [["LF","ST","RF"],["LM","CM","RM"],["LB","LCB","RCB","RB"],["GK"]]), makeFormation("11-442", "4-4-2", [["LF","RF"],["LM","LCM","RCM","RM"],["LB","LCB","RCB","RB"],["GK"]])]
};
const FORMAT_SIZES = { indoor: [5,6,7], outdoor: [7,9,11] };
const STORAGE_KEY = "comets-gameday-v3";
const defaultGameState = () => ({ version: 6, sessionId: crypto.randomUUID?.() || String(Date.now()), game: 0, quarter: 0, format: "outdoor", teamSize: 7, formation: "7-231", present: [], live: false, editingSession: false, plan: null, current: null, log: [], playingSeconds: {}, quarterPlayingSeconds: {}, runningSince: null, seconds: 720 });
let gameState;
try { gameState = { ...defaultGameState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { gameState = defaultGameState(); }
if (!FORMAT_SIZES[gameState.format]?.includes(Number(gameState.teamSize))) { gameState.format = "outdoor"; gameState.teamSize = 7; }
if (!FORMATIONS[gameState.teamSize]?.some((formation) => formation.id === gameState.formation)) gameState.formation = FORMATIONS[gameState.teamSize][0].id;
gameState.version = 6;
gameState.playingSeconds ||= {};
gameState.quarterPlayingSeconds ||= {};
gameState.runningSince ||= null;
let selectedPosition = null;
let selectedBenchId = null;
let clockTimer = null;
let clockRunning = Boolean(gameState.runningSince);
let wakeLock = null;
const gameSelect = document.getElementById("gameSelect");
const setupScreen = document.getElementById("gamedaySetup");
const liveScreen = document.getElementById("liveGame");
gameSelect.innerHTML = DATA.games.map((_, index) => `<option value="${index}">Game ${index + 1}</option>`).join("");
document.getElementById("quarterPicker").innerHTML = [0,1,2,3].map((index) => `<button type="button" data-quarter="${index}">Q${index + 1}</button>`).join("");

function saveGame() { localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); }
function presentPlayers() { return gameState.present.map(playerById).filter(Boolean); }
function activeFormation() { return FORMATIONS[gameState.teamSize].find((formation) => formation.id === gameState.formation) || FORMATIONS[gameState.teamSize][0]; }
function roleMatches(player, position) {
  const roles = player?.anchors?.split("/").map((value) => value.trim()) || [];
  const aliases = { CB: ["LD","RD"], LB: ["LD"], LCB: ["LD","RD"], RCB: ["LD","RD"], RB: ["RD"], LF: ["LM","ST"], RF: ["RM","ST"], LCM: ["CM","LM"], RCM: ["CM","RM"] };
  return [position, ...(aliases[position] || [])].some((role) => roles.includes(role));
}
function buildPlan() {
  const presentIds = presentPlayers().map((player) => player.id);
  const totalStarts = Object.fromEntries(presentIds.map((id) => [id, 0]));
  const positions = activeFormation().positions;
  return DATA.games[gameState.game].map((plannedQuarter) => {
    const used = new Set();
    const lineup = positions.map((position) => {
      const plannedIndex = DATA.positions.indexOf(position.label);
      const name = plannedIndex >= 0 ? plannedQuarter[plannedIndex] : null;
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
function renderAttendance() {
  const players = allPlayers();
  const formation = activeFormation();
  document.querySelectorAll("[data-format]").forEach((button) => button.classList.toggle("active", button.dataset.format === gameState.format));
  document.getElementById("teamSizePicker").innerHTML = FORMAT_SIZES[gameState.format].map((size) => `<button type="button" data-team-size="${size}" class="${Number(gameState.teamSize) === size ? "active" : ""}">${size}v${size}</button>`).join("");
  document.getElementById("formationSelect").innerHTML = FORMATIONS[gameState.teamSize].map((item) => `<option value="${item.id}" ${item.id === gameState.formation ? "selected" : ""}>${item.name}</option>`).join("");
  document.getElementById("attendanceGrid").innerHTML = players.map((player) => `<button type="button" data-player-id="${player.id}" class="${gameState.present.includes(player.id) ? "present" : ""}" aria-pressed="${gameState.present.includes(player.id)}"><span>${gameState.present.includes(player.id) ? "✓" : ""}</span>${escapeHTML(player.name)}</button>`).join("");
  document.getElementById("attendanceCount").textContent = `${gameState.present.length} of ${players.length} selected`;
  document.getElementById("selectAllPlayers").textContent = gameState.present.length === players.length ? "Clear all" : "Select all";
  const preview = buildPlan()[0];
  document.getElementById("starterPreview").innerHTML = formation.positions.map((position, index) => `<div class="${preview.lineup[index] ? "" : "open"}"><small>${position.label}</small><strong>${preview.lineup[index] ? escapeHTML(playerName(preview.lineup[index])) : "OPEN"}</strong></div>`).join("");
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
function currentQuarterPlayingSeconds(id) {
  return gameState.quarterPlayingSeconds?.[gameState.quarter]?.[id] || 0;
}
function playingTimeColor(seconds) {
  const progress = Math.min(1, Math.max(0, seconds / 720));
  const hue = Math.round(120 * (1 - progress));
  const lightness = progress < .35 ? 36 : progress < .72 ? 43 : 47;
  return { color: `hsl(${hue} 78% ${lightness}%)`, text: progress >= .34 && progress <= .66 ? "#11151d" : "#ffffff" };
}
function rankedBench(bench = currentBench()) {
  const selectedRole = selectedPosition === null ? null : activeFormation().positions[selectedPosition]?.label;
  return [...bench].sort((a, b) => {
    if (selectedRole) {
      const roleDifference = Number(roleMatches(playerById(b), selectedRole)) - Number(roleMatches(playerById(a), selectedRole));
      if (roleDifference) return roleDifference;
    }
    return (gameState.playingSeconds[a] || 0) - (gameState.playingSeconds[b] || 0)
      || currentQuarterPlayingSeconds(a) - currentQuarterPlayingSeconds(b)
      || playerName(a).localeCompare(playerName(b));
  });
}
function recommendedOutgoingPosition(incoming) {
  if (!incoming) return null;
  const lineup = currentLineup();
  return lineup.map((id, index) => ({ id, index, position: activeFormation().positions[index]?.label }))
    .sort((a, b) => Number(Boolean(a.id)) - Number(Boolean(b.id))
      || Number(roleMatches(playerById(incoming), b.position)) - Number(roleMatches(playerById(incoming), a.position))
      || currentQuarterPlayingSeconds(b.id) - currentQuarterPlayingSeconds(a.id)
      || (gameState.playingSeconds[b.id] || 0) - (gameState.playingSeconds[a.id] || 0))[0]?.index ?? null;
}
function renderFormation() {
  const lineup = currentLineup();
  const formation = activeFormation();
  const recommendedPosition = selectedBenchId ? recommendedOutgoingPosition(selectedBenchId) : null;
  document.getElementById("formation").innerHTML = formation.positions.map((position, index) => {
    const id = lineup[index];
    const quarterSeconds = id ? currentQuarterPlayingSeconds(id) : 0;
    const heat = playingTimeColor(quarterSeconds);
    const label = id ? `${position.label}, ${playerName(id)}, ${formatDuration(quarterSeconds)} played this quarter` : `${position.label}, open position`;
    return `<button type="button" data-position="${index}" style="grid-column:${position.col} / span ${position.span};grid-row:${position.row};--player-color:${heat.color};--player-text:${heat.text}" class="field-player ${selectedPosition === index ? "selected" : ""} ${recommendedPosition === index ? "recommended-out" : ""} ${!id ? "open" : ""}" aria-label="${escapeHTML(label)}" aria-pressed="${selectedPosition === index}">${recommendedPosition === index ? `<b class="swap-hint">SUGGESTED</b>` : ""}<small class="field-position">${position.label}</small><strong class="field-name">${id ? escapeHTML(playerName(id)) : "OPEN"}</strong>${id ? `<span class="field-time">${formatDuration(quarterSeconds)}</span>` : ""}</button>`;
  }).join("");
}
function renderLive() {
  const lineup = currentLineup(); const bench = currentBench();
  const recommendedBench = rankedBench(bench);
  const formation = activeFormation();
  document.getElementById("liveGameLabel").textContent = `Game ${gameState.game + 1} · Quarter ${gameState.quarter + 1}`;
  document.getElementById("liveFormationLabel").textContent = `${gameState.format === "indoor" ? "Indoor" : "Outdoor"} · ${gameState.teamSize}v${gameState.teamSize} · ${formation.name}`;
  document.querySelectorAll("[data-quarter]").forEach((button) => button.classList.toggle("active", Number(button.dataset.quarter) === gameState.quarter));
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
  next.disabled = gameState.quarter === 3;
  next.querySelector("span").textContent = gameState.quarter === 3 ? "Final rotation" : "Load next rotation";
  next.querySelector("strong").textContent = gameState.quarter === 3 ? "Game complete" : `Quarter ${gameState.quarter + 2} →`;
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
  gameState.quarterPlayingSeconds[gameState.quarter] ||= {};
  [...new Set(currentLineup().filter(Boolean))].forEach((id) => {
    gameState.playingSeconds[id] = (gameState.playingSeconds[id] || 0) + elapsed;
    gameState.quarterPlayingSeconds[gameState.quarter][id] = (gameState.quarterPlayingSeconds[gameState.quarter][id] || 0) + elapsed;
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
  stopClock(); gameState.quarter = index; gameState.seconds = 720; selectedPosition = null; selectedBenchId = null;
  gameState.quarterPlayingSeconds[index] ||= {};
  gameState.current = { lineup: [...gameState.plan[index].lineup], bench: [...gameState.plan[index].bench] };
  if (logChange) gameState.log.unshift({ type: "rotation", quarter: index, time: `Q${index + 1} · 12:00`, text: `Loaded Quarter ${index + 1} rotation` });
  renderGame();
}

gameSelect.addEventListener("change", () => { stopClock(); gameState.game = Number(gameSelect.value); gameState.quarter = 0; gameState.editingSession = false; gameState.plan = null; gameState.current = null; gameState.log = []; gameState.playingSeconds = {}; gameState.quarterPlayingSeconds = {}; gameState.seconds = 720; renderGame(); });
document.getElementById("formatPicker").addEventListener("click", (event) => { const button = event.target.closest("[data-format]"); if (!button) return; gameState.format = button.dataset.format; gameState.teamSize = FORMAT_SIZES[gameState.format][0]; gameState.formation = FORMATIONS[gameState.teamSize][0].id; gameState.plan = null; gameState.current = null; renderAttendance(); });
document.getElementById("teamSizePicker").addEventListener("click", (event) => { const button = event.target.closest("[data-team-size]"); if (!button) return; gameState.teamSize = Number(button.dataset.teamSize); gameState.formation = FORMATIONS[gameState.teamSize][0].id; gameState.plan = null; gameState.current = null; renderAttendance(); });
document.getElementById("formationSelect").addEventListener("change", (event) => { gameState.formation = event.target.value; gameState.plan = null; gameState.current = null; renderAttendance(); });
document.getElementById("attendanceGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-player-id]"); if (!button) return; const id = button.dataset.playerId; gameState.present = gameState.present.includes(id) ? gameState.present.filter((item) => item !== id) : [...gameState.present, id]; renderAttendance(); });
document.getElementById("selectAllPlayers").addEventListener("click", () => { gameState.present = gameState.present.length === allPlayers().length ? [] : allPlayers().map((player) => player.id); renderAttendance(); });
document.getElementById("startGame").addEventListener("click", () => {
  const resumeCurrentQuarter = Boolean(gameState.editingSession && gameState.current);
  const previousLineup = resumeCurrentQuarter ? currentLineup() : [];
  gameState.plan = buildPlan(); gameState.present.forEach((id) => { gameState.playingSeconds[id] ||= 0; }); gameState.live = true;
  const setup = `${gameState.format === "indoor" ? "Indoor" : "Outdoor"} ${gameState.teamSize}v${gameState.teamSize} · ${activeFormation().name}`;
  gameState.log.unshift({ id: crypto.randomUUID?.() || String(Date.now()), type: gameState.log.length ? "attendance" : "start", at: Date.now(), quarter: gameState.quarter, remainingSeconds: gameState.seconds, time: `Q${gameState.quarter + 1} · ${clockText()}`, text: gameState.log.length ? `Attendance updated · ${gameState.present.length} players · ${setup}` : `Game started · ${setup} · ${gameState.present.length} players` });
  if (resumeCurrentQuarter) {
    const lineup = Array.from({ length: gameState.teamSize }, (_, index) => gameState.present.includes(previousLineup[index]) ? previousLineup[index] : null);
    const bench = gameState.present.filter((id) => !lineup.includes(id));
    gameState.current = { lineup, bench }; gameState.editingSession = false; selectedPosition = null; selectedBenchId = null; renderGame();
  } else { gameState.editingSession = false; loadQuarter(gameState.quarter, false); }
});
document.getElementById("editAttendance").addEventListener("click", () => { stopClock(); gameState.live = false; gameState.editingSession = true; renderGame(); });
document.getElementById("quarterPicker").addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button || Number(button.dataset.quarter) === gameState.quarter) return; loadQuarter(Number(button.dataset.quarter)); });
document.getElementById("nextRotation").addEventListener("click", () => { if (gameState.quarter < 3) loadQuarter(gameState.quarter + 1); });
function makeSubstitution(positionIndex, incoming) {
  settleClock(); renderClock();
  const lineup = currentLineup(); const bench = currentBench(); const outgoing = lineup[positionIndex];
  lineup[positionIndex] = incoming; const nextBench = bench.filter((id) => id !== incoming); if (outgoing) nextBench.push(outgoing);
  gameState.current = { lineup, bench: nextBench };
  const clock = clockText();
  const position = activeFormation().positions[positionIndex].label;
  const outgoingTotalSeconds = outgoing ? gameState.playingSeconds[outgoing] || 0 : null;
  gameState.log.unshift({ id: crypto.randomUUID?.() || `${Date.now()}-${incoming}`, type: "substitution", at: Date.now(), quarter: gameState.quarter, elapsedQuarterSeconds: 720 - gameState.seconds, remainingSeconds: gameState.seconds, clock, position, incoming, outgoing, outgoingTotalSeconds, time: `Q${gameState.quarter + 1} · ${clock}`, text: outgoing ? `${playerName(incoming)} in for ${playerName(outgoing)} at ${position} · ${playerName(outgoing)} total ${formatDuration(outgoingTotalSeconds)}` : `${playerName(incoming)} filled the open ${position} spot` });
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
  if (gameState.seconds === 0) { gameState.seconds = 720; renderClock(); saveGame(); return; }
  if (clockRunning) stopClock(); else startClock();
});
document.getElementById("clearLog").addEventListener("click", () => { gameState.log = []; renderLive(); });
document.getElementById("resetGame").addEventListener("click", () => { if (!confirm("Start a completely new game? This clears attendance, clock, lineups, playing-time totals, and the game log on this device.")) return; stopClock(); gameState = defaultGameState(); selectedPosition = null; selectedBenchId = null; renderGame(); });

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
if (gameState.runningSince && gameState.live && gameState.current) {
  clockRunning = true; settleClock();
  if (clockRunning) clockTimer = setInterval(tickClock, 250);
  renderLive();
} else if (gameState.runningSince) { endClock(false); saveGame(); }
document.addEventListener("visibilitychange", () => { if (!gameState.runningSince) return; settleClock(); if (gameState.live) { renderClock(); renderPlayingTime(); } });
window.addEventListener("pagehide", () => { settleClock(); saveGame(); });

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
document.querySelectorAll('input:not([type]), input[type="text"], textarea').forEach((field) => {
  if (field.closest(".dictation-field")) return;
  const wrapper = document.createElement("div"); wrapper.className = `dictation-field ${field.tagName === "TEXTAREA" ? "dictation-area" : ""}`;
  field.parentNode.insertBefore(wrapper, field); wrapper.appendChild(field);
  const label = dictationLabel(field);
  const button = document.createElement("button"); button.type = "button"; button.className = "dictation-button"; button.dataset.label = label; button.title = `Dictate ${label}`; button.setAttribute("aria-label", `Dictate ${label}`); button.setAttribute("aria-pressed", "false");
  button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Zm-1.5-8.5a1.5 1.5 0 1 1 3 0v5a1.5 1.5 0 1 1-3 0v-5Zm7 4.5v.5a5.5 5.5 0 0 1-11 0V11h-2v.5a7.5 7.5 0 0 0 6.5 7.43V22h2v-3.07a7.5 7.5 0 0 0 6.5-7.43V11h-2Z"/></svg>';
  button.addEventListener("click", () => startDictation(field, button)); wrapper.appendChild(button);
});

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

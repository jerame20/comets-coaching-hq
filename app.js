const SHEET = "https://docs.google.com/spreadsheets/d/1sG31dZoLYUNhUNntRkz9Qfbzh6aleKdKUHYZkxN5puQ/edit";

document.querySelectorAll(".sheet-view").forEach((section) => {
  const { gid, title, description } = section.dataset;
  const link = `${SHEET}#gid=${gid}`;
  section.innerHTML = `
    <div class="sheet-head">
      <div>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      <div class="sheet-actions">
        <a class="button primary" href="${link}" target="_blank" rel="noopener">Open in Google Sheets</a>
      </div>
    </div>
    <div class="sheet-frame-wrap">
      <iframe class="sheet-frame" title="${title} spreadsheet" loading="lazy" src="${SHEET}?rm=minimal&gid=${gid}#gid=${gid}"></iframe>
      <div class="mobile-sheet-note">
        <strong>Sheets works better full-screen on a phone.</strong>
        <span>Open this tab in the Google Sheets app or your browser. Access still follows the sheet's private sharing settings.</span>
        <a class="button primary" href="${link}" target="_blank" rel="noopener">Open ${title}</a>
      </div>
    </div>`;
});

const views = [...document.querySelectorAll("[data-view]")];
const tabs = [...document.querySelectorAll("[data-tab]")];

function showView() {
  const requested = location.hash.slice(1);
  const current = views.some((view) => view.dataset.view === requested) ? requested : "home";
  views.forEach((view) => view.classList.toggle("active", view.dataset.view === current));
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === current;
    tab.classList.toggle("active", active);
    if (active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "instant" });
  document.title = current === "home" ? "Comets Coaching HQ" : `${views.find((v) => v.dataset.view === current).dataset.title} · Comets Coaching HQ`;
}

window.addEventListener("hashchange", showView);
showView();

const toast = document.getElementById("toast");
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

document.getElementById("shareButton").addEventListener("click", async () => {
  const shareData = { title: "Comets Coaching HQ", text: "Comets coaching plans, rotations, and game-day tools.", url: location.href };
  try {
    if (navigator.share) await navigator.share(shareData);
    else {
      await navigator.clipboard.writeText(location.href);
      showToast("Hub link copied");
    }
  } catch (error) {
    if (error.name !== "AbortError") showToast("Copy the URL from your browser");
  }
});

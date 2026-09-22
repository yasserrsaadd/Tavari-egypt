/* Tavari Egypt — Admin portal (admin.html)
   Password-protected via Supabase Auth; writes are gated by RLS policies
   (see "4b) ADMIN (AUTHENTICATED) POLICIES" in db_setup.sql). */

const SUPABASE_URL = "https://hpwgnmtlfbmaisdxezrc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwd2dubXRsZmJtYWlzZHhlenJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjU1MTYsImV4cCI6MjA5OTM0MTUxNn0.0k6lSxDX4J2Qz-163fDnRsTQieQ-H2i5IFfeKx-59hY";

let sb = null;
try { sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }
catch (e) { console.error("Supabase init failed:", e); }

/* ---------- helpers ---------- */
function esc(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
/* Only http(s)/relative URLs may reach a src/href attribute — blocks javascript:/data: */
function safeUrl(u) {
  const s = (u == null ? "" : String(u)).trim();
  if (!s) return "";
  if (/^[a-z][a-z0-9+.\-]*:/i.test(s) && !/^https?:/i.test(s)) return "";
  try {
    const p = new URL(s, window.location.href);
    if (p.protocol === "http:" || p.protocol === "https:") return p.href;
  } catch (e) { /* fall through */ }
  return "";
}
const toastStack = document.getElementById("toastStack");
function showToast(message, type = "info", duration = 4200) {
  const el = document.createElement("div");
  el.className = `tv-toast ${type}`;
  const icons = { success: "bi-check-circle-fill", error: "bi-exclamation-circle-fill", info: "bi-info-circle-fill" };
  el.innerHTML = `<span class="ic"><i class="bi ${icons[type] || icons.info}"></i></span><span class="msg">${esc(message)}</span><span class="close-x"><i class="bi bi-x"></i></span>`;
  toastStack.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  const remove = () => { el.classList.remove("show"); setTimeout(() => el.remove(), 500); };
  el.querySelector(".close-x").addEventListener("click", remove);
  setTimeout(remove, duration);
}
function fmtMoney(n) { return "EGP " + Number(n || 0).toLocaleString(); }
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function lines(id) {
  return document.getElementById(id).value.split("\n").map(s => s.trim()).filter(Boolean);
}
function setLines(id, arr) {
  document.getElementById(id).value = Array.isArray(arr) ? arr.join("\n") : "";
}
function val(id) { return document.getElementById(id).value.trim(); }
function setVal(id, v) { document.getElementById(id).value = (v == null ? "" : v); }
function setButtonLoading(btn, loading, label) {
  if (loading) { btn.disabled = true; btn.innerHTML = `<span class="spinner-gold"></span>&nbsp; ${esc(label)}`; }
  else { btn.disabled = false; btn.innerHTML = `<span class="btn-label">${esc(label)}</span>`; }
}
function openModal(id) { document.getElementById(id).classList.add("show"); document.body.style.overflow = "hidden"; }
function closeModal(id) { document.getElementById(id).classList.remove("show"); document.body.style.overflow = ""; }

/* ---------- auth ---------- */
const loginScreen = document.getElementById("loginScreen");
const adminShell = document.getElementById("adminShell");

function showApp(session) {
  const signedIn = !!(session && session.user);
  loginScreen.hidden = signedIn;
  adminShell.hidden = !signedIn;
  if (signedIn) {
    document.getElementById("adminEmail").textContent = session.user.email || "";
    loadTrips();
  }
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("loginBtn");
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";
  setButtonLoading(btn, true, "Signing in…");
  try {
    const { error } = await sb.auth.signInWithPassword({ email: val("loginEmail"), password: val("loginPassword") });
    if (error) throw error;
    document.getElementById("loginPassword").value = "";
  } catch (err) {
    errEl.textContent = err.message || "Sign in failed.";
  } finally {
    setButtonLoading(btn, false, "Sign in");
  }
});

document.getElementById("signOutBtn").addEventListener("click", async () => {
  await sb.auth.signOut();
  showToast("Signed out.", "info", 2400);
});

if (sb) {
  sb.auth.getSession().then(({ data }) => showApp(data.session));
  sb.auth.onAuthStateChange((_event, session) => showApp(session));
} else {
  document.getElementById("loginError").textContent = "Supabase client failed to initialise.";
}

document.querySelectorAll(".adm-modal-scrim").forEach(scrim => {
  scrim.addEventListener("click", (e) => { if (e.target === scrim) closeModal(scrim.id); });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".adm-modal-scrim.show").forEach(m => closeModal(m.id));
});

/* ---------- trips ---------- */
let TRIPS = [];
let editingTripId = null;

function thumbOf(t) {
  const arr = Array.isArray(t.image_urls) ? t.image_urls : [];
  return arr.length ? arr[0] : "";
}
function isVisible(t) { return t.is_visible === false ? false : true; }

async function toggleTripVisible(id) {
  const trip = TRIPS.find(t => String(t.id) === String(id));
  if (!trip) return;
  const next = !isVisible(trip);
  try {
    const { error } = await sb.from("trips").update({ is_visible: next }).eq("id", id);
    if (error) throw error;
    showToast(next ? "Trip is now visible on the site." : "Trip hidden from the site.", "success");
    await loadTrips();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not update visibility.", "error");
  }
}
function renderTrips() {
  const q = val("tripSearch").toLowerCase();
  const list = TRIPS.filter(t => !q || [t.id, t.title, t.dates_label, t.duration].filter(Boolean).join(" ").toLowerCase().includes(q));
  const grid = document.getElementById("tripsList");
  if (!list.length) { grid.innerHTML = `<div class="adm-empty">No trips found.</div>`; return; }
  grid.innerHTML = list.map(t => `
    <div class="adm-card adm-trip-card${isVisible(t) ? "" : " adm-trip-card--hidden"}">
      ${t.is_best_seller ? `<span class="adm-badge"><i class="bi bi-fire"></i> Best seller</span>` : ""}
      <div class="adm-trip-thumb">${safeUrl(thumbOf(t)) ? `<img src="${esc(safeUrl(thumbOf(t)))}" alt="" loading="lazy">` : ""}</div>
      <div class="adm-trip-body">
        <h3>${esc(t.title)}</h3>
        <div class="adm-trip-meta">
          <span><i class="bi bi-calendar3"></i> ${esc(t.dates_label || fmtDate(t.start_date) || "Dates TBC")}</span>
          <span><i class="bi bi-clock"></i> ${esc(t.duration || "—")}</span>
          <span><i class="bi bi-cash"></i> ${esc(fmtMoney(t.base_price))} / person</span>
          <span class="adm-muted">slug: ${esc(t.id)} · ${(Array.isArray(t.image_urls) ? t.image_urls.length : 0)} photos</span>
          ${isVisible(t) ? "" : `<span class="adm-hidden-tag"><i class="bi bi-eye-slash"></i> Hidden from site</span>`}
        </div>
        <div class="adm-trip-actions">
          <button class="btn-trip-secondary" type="button" data-edit="${esc(t.id)}"><i class="bi bi-pencil"></i> Edit</button>
          <button class="btn-trip-secondary" type="button" data-toggle="${esc(t.id)}">${isVisible(t) ? `<i class="bi bi-eye-slash"></i> Hide` : `<i class="bi bi-eye"></i> Show`}</button>
          <button class="btn-trip-secondary" type="button" data-delete="${esc(t.id)}"><i class="bi bi-trash"></i> Delete</button>
        </div>
      </div>
    </div>`).join("");
  grid.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => {
    const trip = TRIPS.find(x => String(x.id) === b.dataset.edit);
    if (trip) openTripModal(trip);
  }));
  grid.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => toggleTripVisible(b.dataset.toggle)));
  grid.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteTrip(b.dataset.delete)));
}

async function loadTrips() {
  try {
    const { data, error } = await sb.from("trips").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    TRIPS = data || [];
    renderTrips();
  } catch (err) {
    console.error(err);
    showToast("Could not load trips: " + (err.message || err), "error");
  }
}

/* url list editor (preview + reorder + remove) */
function readUrlList(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} .adm-url-input`))
    .map(i => i.value.trim()).filter(Boolean);
}
function renderUrlList(containerId, urls) {
  const box = document.getElementById(containerId);
  box.innerHTML = "";
  (urls || []).forEach((url, i) => box.appendChild(urlRow(containerId, url, i, (urls || []).length)));
}
function urlRow(containerId, url, i, total) {
  const row = document.createElement("div");
  row.className = "adm-url-item";
  const imgUrl = safeUrl(url);
  row.innerHTML = `
    ${imgUrl ? `<img src="${esc(imgUrl)}" alt="" loading="lazy">` : ""}
    <input class="tv-input adm-url-input" value="${esc(url)}">
    <div class="adm-url-actions">
      <button class="adm-icon-btn" type="button" data-act="up" aria-label="Move up" ${i === 0 ? "disabled" : ""}><i class="bi bi-arrow-up"></i></button>
      <button class="adm-icon-btn" type="button" data-act="down" aria-label="Move down" ${i === total - 1 ? "disabled" : ""}><i class="bi bi-arrow-down"></i></button>
      <button class="adm-icon-btn danger" type="button" data-act="del" aria-label="Remove"><i class="bi bi-x-lg"></i></button>
    </div>`;
  const input = row.querySelector(".adm-url-input");
  input.addEventListener("change", () => {
    const img = row.querySelector("img");
    if (!img) return;
    const next = safeUrl(input.value.trim());
    if (next) img.src = next;
  });
  row.querySelectorAll("[data-act]").forEach(btn => btn.addEventListener("click", () => {
    const items = readUrlList(containerId);
    const act = btn.dataset.act;
    if (act === "del") items.splice(i, 1);
    else if (act === "up" && i > 0) { const tmp = items[i - 1]; items[i - 1] = items[i]; items[i] = tmp; }
    else if (act === "down" && i < items.length - 1) { const tmp = items[i + 1]; items[i + 1] = items[i]; items[i] = tmp; }
    renderUrlList(containerId, items);
  }));
  return row;
}
document.querySelectorAll("[data-url-add]").forEach(btn => {
  btn.addEventListener("click", () => {
    const containerId = btn.dataset.urlAdd;
    const input = document.getElementById(containerId + "Input");
    const urls = readUrlList(containerId);
    const url = input.value.trim();
    if (!url) { showToast("Paste a link first.", "error", 2400); return; }
    urls.push(url);
    input.value = "";
    renderUrlList(containerId, urls);
  });
});

/* itinerary builder */
function readItinerary() {
  return Array.from(document.querySelectorAll("#f_itinerary .adm-itn-day")).map(day => {
    const obj = {
      day: day.querySelector(".adm-itn-daynum").value.trim(),
      title: day.querySelector(".adm-itn-title").value.trim(),
      points: day.querySelectorAll(".tv-textarea")[0].value.split("\n").map(s => s.trim()).filter(Boolean),
      details: day.querySelectorAll(".tv-textarea")[1].value.trim()
    };
    return obj;
  }).filter(d => d.day || d.title || d.points.length || d.details);
}
function renderItinerary(days) {
  const box = document.getElementById("f_itinerary");
  box.innerHTML = "";
  (Array.isArray(days) ? days : []).forEach(d => box.appendChild(dayRow(d)));
}
function dayRow(d) {
  d = d || {};
  const row = document.createElement("div");
  row.className = "adm-itn-day";
  row.innerHTML = `
    <div class="adm-itn-row">
      <input class="tv-input adm-itn-daynum" placeholder="Day 1" value="${esc(d.day || "")}">
      <input class="tv-input adm-itn-title" placeholder="Day title" value="${esc(d.title || "")}">
      <button class="adm-icon-btn danger" type="button" aria-label="Remove day"><i class="bi bi-trash"></i></button>
    </div>
    <textarea class="tv-textarea" placeholder="Points — one per line">${esc((Array.isArray(d.points) ? d.points : []).join("\n"))}</textarea>
    <textarea class="tv-textarea" placeholder="Details (used when the day has no points)">${esc(d.details || "")}</textarea>`;
  row.querySelector(".adm-icon-btn").addEventListener("click", () => row.remove());
  return row;
}
document.getElementById("addDayBtn").addEventListener("click", () => {
  document.getElementById("f_itinerary").appendChild(dayRow({ day: "Day " + (document.querySelectorAll("#f_itinerary .adm-itn-day").length + 1) }));
});

/* open / save / delete */
function openTripModal(trip) {
  editingTripId = trip ? String(trip.id) : null;
  document.getElementById("tripModalTitle").textContent = trip ? "Edit trip — " + trip.title : "New trip";
  const idEl = document.getElementById("f_id");
  idEl.value = trip ? trip.id : "";
  idEl.readOnly = !!trip;
  setVal("f_title", trip && trip.title);
  setVal("f_basePrice", trip && trip.base_price != null ? trip.base_price : "");
  setVal("f_duration", trip && trip.duration);
  setVal("f_startDate", trip && trip.start_date);
  setVal("f_endDate", trip && trip.end_date);
  setVal("f_datesLabel", trip && trip.dates_label);
  setVal("f_description", trip && trip.description);
  setVal("f_accommodation", trip && trip.accommodation);
  setVal("f_soloMessage", trip && trip.solo_message);
  setVal("f_pdfUrl", trip && trip.pdf_url);
  setVal("f_refundPolicy", trip && trip.refund_policy);
  document.getElementById("f_visible").checked = !trip || isVisible(trip);
  document.getElementById("f_bestSeller").checked = !!(trip && trip.is_best_seller);
  setLines("f_included", trip && trip.included);
  setLines("f_excluded", trip && trip.excluded);
  setLines("f_priceOptions", trip && trip.price_options);
  setLines("f_guidelines", trip && trip.guidelines);
  renderUrlList("f_imageUrls", trip ? trip.image_urls : []);
  renderUrlList("f_accommodationPhotos", trip ? trip.accommodation_photos : []);
  renderItinerary(trip && trip.itinerary);
  openModal("tripModal");
}
function collectTrip() {
  const payload = {
    title: val("f_title"),
    base_price: Number(val("f_basePrice")) || 0,
    duration: val("f_duration") || null,
    start_date: val("f_startDate") || null,
    end_date: val("f_endDate") || null,
    dates_label: val("f_datesLabel") || null,
    description: val("f_description") || null,
    accommodation: val("f_accommodation") || null,
    accommodation_photos: readUrlList("f_accommodationPhotos").map(safeUrl).filter(Boolean),
    solo_message: val("f_soloMessage") || null,
    included: lines("f_included"),
    excluded: lines("f_excluded"),
    price_options: lines("f_priceOptions"),
    guidelines: lines("f_guidelines"),
    refund_policy: val("f_refundPolicy") || null,
    pdf_url: safeUrl(val("f_pdfUrl")) || null,
    is_visible: document.getElementById("f_visible").checked,
    is_best_seller: document.getElementById("f_bestSeller").checked,
    image_urls: readUrlList("f_imageUrls").map(safeUrl).filter(Boolean),
    itinerary: readItinerary()
  };
  return payload;
}
document.getElementById("newTripBtn").addEventListener("click", () => openTripModal(null));
document.getElementById("refreshTripsBtn").addEventListener("click", loadTrips);
document.getElementById("tripSearch").addEventListener("input", renderTrips);
document.getElementById("tripModalClose").addEventListener("click", () => closeModal("tripModal"));
document.getElementById("tripModalCancel").addEventListener("click", () => closeModal("tripModal"));

document.getElementById("tripSaveBtn").addEventListener("click", async () => {
  const btn = document.getElementById("tripSaveBtn");
  const payload = collectTrip();
  if (!payload.title) { showToast("Title is required.", "error"); return; }
  if (payload.base_price < 0) { showToast("Base price cannot be negative.", "error"); return; }
  setButtonLoading(btn, true, "Saving…");
  try {
    if (editingTripId) {
      const { error } = await sb.from("trips").update(payload).eq("id", editingTripId);
      if (error) throw error;
      showToast("Trip updated.", "success");
    } else {
      const id = val("f_id");
      if (!id) { showToast("Slug ID is required (e.g. marsa-allam).", "error"); setButtonLoading(btn, false, "Save trip"); return; }
      if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) { showToast("Slug ID may only contain letters, numbers and dashes.", "error"); setButtonLoading(btn, false, "Save trip"); return; }
      if (TRIPS.some(t => String(t.id) === id)) { showToast("That slug ID already exists.", "error"); setButtonLoading(btn, false, "Save trip"); return; }
      const { error } = await sb.from("trips").insert(Object.assign({ id: id }, payload));
      if (error) throw error;
      showToast("Trip created.", "success");
    }
    closeModal("tripModal");
    await loadTrips();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not save the trip.", "error");
  } finally {
    setButtonLoading(btn, false, "Save trip");
  }
});

async function deleteTrip(id) {
  const trip = TRIPS.find(t => String(t.id) === String(id));
  if (!trip) return;
  if (!window.confirm(`Delete "${trip.title}"? This cannot be undone.`)) return;
  try {
    const { error } = await sb.from("trips").delete().eq("id", id);
    if (error) throw error;
    showToast("Trip deleted.", "success");
    await loadTrips();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not delete the trip.", "error");
  }
}

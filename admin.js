/* Tavari Egypt — Admin portal (admin.html)
   Password-protected via Supabase Auth; writes are gated by RLS policies
   (see "4b) ADMIN (AUTHENTICATED) POLICIES" in db_setup.sql). */

const SUPABASE_URL = "https://hpwgnmtlfbmaisdxezrc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwd2dubXRsZmJtYWlzZHhlenJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjU1MTYsImV4cCI6MjA5OTM0MTUxNn0.0k6lSxDX4J2Qz-163fDnRsTQieQ-H2i5IFfeKx-59hY";
const DEPOSIT_RATE = 0.5;

let sb = null;
try { sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }
catch (e) { console.error("Supabase init failed:", e); }

/* ---------- helpers ---------- */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
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
function fmtDateTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
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
    loadTrips(); loadBookings(); loadInquiries();
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

document.querySelectorAll(".adm-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".adm-tab").forEach(t => t.classList.toggle("active", t === tab));
    const name = tab.dataset.tab;
    document.querySelectorAll(".adm-panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + name));
  });
});
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
      <div class="adm-trip-thumb">${thumbOf(t) ? `<img src="${esc(thumbOf(t))}" alt="" loading="lazy">` : ""}</div>
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
    fillBookingTripOptions();
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
  row.innerHTML = `
    <img src="${esc(url)}" alt="" loading="lazy">
    <input class="tv-input adm-url-input" value="${esc(url)}">
    <div class="adm-url-actions">
      <button class="adm-icon-btn" type="button" data-act="up" aria-label="Move up" ${i === 0 ? "disabled" : ""}><i class="bi bi-arrow-up"></i></button>
      <button class="adm-icon-btn" type="button" data-act="down" aria-label="Move down" ${i === total - 1 ? "disabled" : ""}><i class="bi bi-arrow-down"></i></button>
      <button class="adm-icon-btn danger" type="button" data-act="del" aria-label="Remove"><i class="bi bi-x-lg"></i></button>
    </div>`;
  const input = row.querySelector(".adm-url-input");
  input.addEventListener("change", () => { const img = row.querySelector("img"); if (img) img.src = input.value.trim(); });
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
    accommodation_photos: readUrlList("f_accommodationPhotos"),
    solo_message: val("f_soloMessage") || null,
    included: lines("f_included"),
    excluded: lines("f_excluded"),
    price_options: lines("f_priceOptions"),
    guidelines: lines("f_guidelines"),
    refund_policy: val("f_refundPolicy") || null,
    pdf_url: val("f_pdfUrl") || null,
    is_visible: document.getElementById("f_visible").checked,
    is_best_seller: document.getElementById("f_bestSeller").checked,
    image_urls: readUrlList("f_imageUrls"),
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

/* ---------- bookings ---------- */
let BOOKINGS = [];

function fillBookingTripOptions() {
  const sel = document.getElementById("b_trip");
  const keep = sel.value;
  sel.innerHTML = TRIPS.map(t => `<option value="${esc(t.id)}">${esc(t.title)} — ${esc(fmtMoney(t.base_price))} / person</option>`).join("");
  if (keep && TRIPS.some(t => String(t.id) === keep)) sel.value = keep;
  updateBookingAmounts();
}
function clampPersons(v) { let n = parseInt(v, 10); if (isNaN(n) || n < 1) n = 1; if (n > 20) n = 20; return n; }
function bookingAmounts() {
  const trip = TRIPS.find(t => String(t.id) === document.getElementById("b_trip").value);
  const persons = clampPersons(document.getElementById("b_persons").value);
  document.getElementById("b_persons").value = persons;
  const base = trip ? Number(trip.base_price || 0) : 0;
  const fullTotal = Math.round(base * persons);
  const deposit = Math.round(fullTotal * DEPOSIT_RATE);
  const balance = fullTotal - deposit;
  document.getElementById("b_total").textContent = fmtMoney(fullTotal);
  document.getElementById("b_deposit").textContent = fmtMoney(deposit);
  document.getElementById("b_balance").textContent = fmtMoney(balance);
  return { trip, persons, fullTotal, deposit, balance };
}
function updateBookingAmounts() { bookingAmounts(); }
document.getElementById("b_trip").addEventListener("change", updateBookingAmounts);
document.getElementById("b_persons").addEventListener("input", updateBookingAmounts);

function renderBookings() {
  const box = document.getElementById("bookingsList");
  document.getElementById("bookingsCount").textContent = BOOKINGS.length ? `${BOOKINGS.length} booking${BOOKINGS.length === 1 ? "" : "s"}` : "";
  if (!BOOKINGS.length) { box.innerHTML = `<div class="adm-empty">No bookings yet.</div>`; return; }
  box.innerHTML = `<table class="adm-table">
    <thead><tr>
      <th>Client</th><th>Trip</th><th class="num">Persons</th><th class="num">Total</th>
      <th class="num">Deposit (50%)</th><th>Status</th><th>Created</th><th>Receipt</th><th></th>
    </tr></thead>
    <tbody>${BOOKINGS.map(b => `
      <tr>
        <td><strong>${esc(b.customer_name)}</strong><div class="adm-muted">${esc(b.customer_phone || "")}</div><div class="adm-muted">${esc(b.customer_email || "")}</div></td>
        <td>${esc(b.trip_title || b.trip_id || "—")}</td>
        <td class="num">${esc(b.num_persons)}</td>
        <td class="num">${esc(fmtMoney(b.total_price))}</td>
        <td class="num">${esc(fmtMoney(b.deposit_amount))}</td>
        <td><span class="adm-status">${esc(b.status || "")}</span></td>
        <td class="adm-muted">${esc(fmtDateTime(b.created_at))}</td>
        <td>${b.receipt_url ? `<a class="adm-link" href="${esc(b.receipt_url)}" target="_blank" rel="noopener">View</a>` : "—"}</td>
        <td><button class="adm-btn-ghost" type="button" data-invoice="${esc(b.id)}"><i class="bi bi-receipt"></i> Invoice</button></td>
      </tr>`).join("")}</tbody></table>`;
  box.querySelectorAll("[data-invoice]").forEach(btn => btn.addEventListener("click", () => {
    const b = BOOKINGS.find(x => String(x.id) === btn.dataset.invoice);
    if (b) openInvoice(b);
  }));
}

async function loadBookings() {
  try {
    const { data, error } = await sb.from("bookings").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    BOOKINGS = data || [];
    renderBookings();
  } catch (err) {
    console.error(err);
    showToast("Could not load bookings: " + (err.message || err), "error");
  }
}

document.getElementById("newBookingBtn").addEventListener("click", () => {
  if (!TRIPS.length) { showToast("Create a trip first.", "error"); return; }
  ["b_name", "b_phone", "b_email", "b_receipt"].forEach(id => { document.getElementById(id).value = ""; });
  document.getElementById("b_persons").value = 1;
  document.getElementById("b_status").value = "pending_verification";
  fillBookingTripOptions();
  openModal("bookingModal");
});
document.getElementById("refreshBookingsBtn").addEventListener("click", loadBookings);
document.getElementById("bookingModalClose").addEventListener("click", () => closeModal("bookingModal"));
document.getElementById("bookingModalCancel").addEventListener("click", () => closeModal("bookingModal"));

document.getElementById("bookingSaveBtn").addEventListener("click", async () => {
  const btn = document.getElementById("bookingSaveBtn");
  const a = bookingAmounts();
  const name = val("b_name"), phone = val("b_phone"), email = val("b_email");
  if (!a.trip) { showToast("Pick a trip.", "error"); return; }
  if (!name) { showToast("Customer name is required.", "error"); return; }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) { showToast("That email address doesn't look right.", "error"); return; }
  setButtonLoading(btn, true, "Creating…");
  try {
    const payload = {
      trip_id: a.trip.id,
      trip_title: a.trip.title,
      customer_name: name,
      customer_phone: phone || null,
      customer_email: email || null,
      num_persons: a.persons,
      total_price: a.fullTotal,
      deposit_amount: a.deposit,
      receipt_url: val("b_receipt") || null,
      status: val("b_status") || "pending_verification"
    };
    const { data, error } = await sb.from("bookings").insert(payload).select().single();
    if (error) throw error;
    closeModal("bookingModal");
    showToast("Booking created.", "success");
    await loadBookings();
    openInvoice(data);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not create the booking.", "error");
  } finally {
    setButtonLoading(btn, false, "Create booking");
  }
});

/* ---------- invoice ---------- */
let CURRENT_INVOICE = null;

function invoiceNumber(b) {
  const raw = String((b && b.id) || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return "INV-" + (raw ? raw.slice(0, 8) : "DRAFT");
}
function invoiceData(b) {
  const total = Number(b.total_price || 0);
  const deposit = Number(b.deposit_amount || 0);
  const persons = Number(b.num_persons || 0);
  return {
    number: invoiceNumber(b),
    date: fmtDateTime(b.created_at || new Date()),
    client: b.customer_name || "",
    phone: b.customer_phone || "",
    email: b.customer_email || "",
    trip: b.trip_title || b.trip_id || "",
    persons: persons,
    unit: persons ? Math.round(total / persons) : total,
    total: total,
    deposit: deposit,
    balance: total - deposit,
    status: b.status || ""
  };
}
function renderInvoicePreview(inv) {
  document.getElementById("invoicePreview").innerHTML = `
    <div class="adm-inv-head">
      <div class="adm-inv-brand">TAVARI<span>EGYPT · BESPOKE TRAVEL</span></div>
      <div class="adm-inv-title">
        <h3>Invoice</h3>
        <div>${esc(inv.number)}</div>
        <div>${esc(inv.date)}</div>
      </div>
    </div>
    <div class="adm-inv-grid">
      <div class="adm-inv-block">
        <span class="eyebrow">Billed to</span>
        <p><strong>${esc(inv.client)}</strong><br>${esc(inv.phone)}<br>${esc(inv.email)}</p>
      </div>
      <div class="adm-inv-block">
        <span class="eyebrow">Trip</span>
        <p><strong>${esc(inv.trip)}</strong><br>${esc(inv.persons)} traveller${inv.persons === 1 ? "" : "s"}<br>Status: ${esc(inv.status)}</p>
      </div>
    </div>
    <table class="adm-inv-table">
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead>
      <tbody>
        <tr><td>${esc(inv.trip)} — per person</td><td class="num">${esc(inv.persons)}</td><td class="num">${esc(fmtMoney(inv.unit))}</td><td class="num">${esc(fmtMoney(inv.total))}</td></tr>
      </tbody>
    </table>
    <div class="adm-inv-totals">
      <div><span>Total</span><span>${esc(fmtMoney(inv.total))}</span></div>
      <div><span>Deposit paid (50%)</span><span>${esc(fmtMoney(inv.deposit))}</span></div>
      <div class="grand"><span>Balance due</span><span>${esc(fmtMoney(inv.balance))}</span></div>
    </div>
    <div class="adm-inv-foot">Thank you for travelling with Tavari Egypt. The balance is settled before departure; our payment desk confirms every booking by phone or WhatsApp.</div>`;
}
function openInvoice(b) {
  CURRENT_INVOICE = invoiceData(b);
  renderInvoicePreview(CURRENT_INVOICE);
  openModal("invoiceModal");
}
document.getElementById("invoiceModalClose").addEventListener("click", () => closeModal("invoiceModal"));
document.getElementById("invoiceDownloadBtn").addEventListener("click", () => {
  if (!CURRENT_INVOICE) return;
  if (typeof pdfMake === "undefined") { showToast("PDF library not loaded — check your connection.", "error"); return; }
  const inv = CURRENT_INVOICE;
  const doc = {
    content: [
      { text: "TAVARI EGYPT", style: "brand" },
      { text: "BESPOKE TRAVEL · CAIRO", style: "brandSub", margin: [0, 0, 0, 14] },
      {
        columns: [
          { width: "*", text: [
            { text: "INVOICE\n", style: "docTitle" },
            { text: inv.number + "\n" + inv.date, style: "small" }
          ] },
          { width: "auto", text: [
            { text: "Billed to\n", style: "label" },
            { text: inv.client + "\n", bold: true },
            { text: (inv.phone ? inv.phone + "\n" : "") + (inv.email || ""), style: "small" }
          ], alignment: "right" }
        ]
      },
      { text: "Trip", style: "label", margin: [0, 16, 0, 2] },
      { text: inv.trip + "  ·  " + inv.persons + " traveller" + (inv.persons === 1 ? "" : "s") + "  ·  " + inv.status, margin: [0, 0, 0, 14] },
      {
        table: {
          widths: ["*", "auto", "auto", "auto"],
          body: [
            [
              { text: "Description", style: "th" },
              { text: "Qty", style: "th", alignment: "right" },
              { text: "Unit", style: "th", alignment: "right" },
              { text: "Amount", style: "th", alignment: "right" }
            ],
            [inv.trip + " — per person", String(inv.persons), fmtMoney(inv.unit), fmtMoney(inv.total)]
          ]
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14]
      },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            [{ text: "Total", alignment: "right" }, { text: fmtMoney(inv.total), alignment: "right" }],
            [{ text: "Deposit paid (50%)", alignment: "right" }, { text: fmtMoney(inv.deposit), alignment: "right" }],
            [{ text: "Balance due", alignment: "right", bold: true }, { text: fmtMoney(inv.balance), alignment: "right", bold: true }]
          ]
        },
        layout: "noBorders",
        margin: [0, 0, 0, 18]
      },
      { text: "Thank you for travelling with Tavari Egypt. The balance is settled before departure; our payment desk confirms every booking by phone or WhatsApp.", style: "small" }
    ],
    styles: {
      brand: { fontSize: 22, bold: true, color: "#B33025" },
      brandSub: { fontSize: 8, color: "#8a6a66", characterSpacing: 1.5 },
      docTitle: { fontSize: 14, bold: true, color: "#3A1714" },
      label: { fontSize: 8, bold: true, color: "#8a6a66" },
      small: { fontSize: 9, color: "#6b4f4c" },
      th: { fontSize: 8, bold: true, color: "#8a6a66" }
    },
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#3A1714" }
  };
  pdfMake.createPdf(doc).download("Tavari-" + inv.number + ".pdf");
});

/* ---------- inquiries ---------- */
async function loadInquiries() {
  try {
    const { data, error } = await sb.from("inquiries").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data || [];
    const box = document.getElementById("inquiriesList");
    document.getElementById("inquiriesCount").textContent = rows.length ? `${rows.length} submission${rows.length === 1 ? "" : "s"}` : "";
    if (!rows.length) { box.innerHTML = `<div class="adm-empty">No inquiries yet.</div>`; return; }
    box.innerHTML = `<table class="adm-table">
      <thead><tr><th>Name</th><th>Contact</th><th>Interest</th><th class="num">Persons</th><th>Notes</th><th>Status</th><th>Submitted</th></tr></thead>
      <tbody>${rows.map(r => `
        <tr>
          <td><strong>${esc(r.customer_name)}</strong></td>
          <td><div>${esc(r.customer_phone || "")}</div><div class="adm-muted">${esc(r.customer_email || "")}</div></td>
          <td>${esc(r.interested_trip || r.trip_interest || "—")}<div class="adm-muted">${esc(r.trip_type || "")}</div></td>
          <td class="num">${esc(r.num_persons)}</td>
          <td>${esc(r.notes || "—")}</td>
          <td><span class="adm-status">${esc(r.status || "")}</span></td>
          <td class="adm-muted">${esc(fmtDateTime(r.created_at))}</td>
        </tr>`).join("")}</tbody></table>`;
  } catch (err) {
    console.error(err);
    showToast("Could not load inquiries: " + (err.message || err), "error");
  }
}
document.getElementById("refreshInquiriesBtn").addEventListener("click", loadInquiries);

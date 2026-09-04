const useLiveBackend = true;
const SUPABASE_URL = "https://hpwgnmtlfbmaisdxezrc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwd2dubXRsZmJtYWlzZHhlenJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjU1MTYsImV4cCI6MjA5OTM0MTUxNn0.0k6lSxDX4J2Qz-163fDnRsTQieQ-H2i5IFfeKx-59hY";
// ─── Direct client-side writes (Supabase anon client) ───
const RECEIPTS_BUCKET = "payment-receipts";

// Escape user-controlled strings before inserting into innerHTML (prevents DOM XSS)
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

let supabaseClient = null;
if (typeof supabase !== "undefined" && SUPABASE_URL.indexOf("YOUR-PROJECT-REF") === -1) {
  try { supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch (e) { console.warn("Supabase init failed:", e); }
}

const toastStack = document.getElementById("toastStack");
function showToast(message, type = "info", duration = 4200) {
  const el = document.createElement("div");
  el.className = `tv-toast ${type}`;
  const iconMap = { success: "bi-check-circle-fill", error: "bi-exclamation-circle-fill", info: "bi-info-circle-fill" };
  el.innerHTML = `<span class="ic"><i class="bi ${iconMap[type]||iconMap.info}"></i></span><span class="msg">${message}</span><span class="close-x"><i class="bi bi-x"></i></span>`;
  toastStack.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  const remove = () => { el.classList.remove("show"); setTimeout(() => el.remove(), 500); };
  el.querySelector(".close-x").addEventListener("click", remove);
  setTimeout(remove, duration);
}

const tvNav = document.getElementById("tvNav");
const tvLinks = document.getElementById("tvLinks");
const tvBurger = document.getElementById("tvBurger");
const tvScrim = document.getElementById("tvScrim");
const burgerIcon = document.getElementById("burgerIcon");

window.addEventListener("scroll", () => { tvNav.classList.toggle("scrolled", window.scrollY > 50); }, { passive: true });

function closeMobileMenu() {
  tvLinks.classList.remove("open");
  tvScrim.classList.remove("show");
  tvScrim.style.pointerEvents = "none";
  tvBurger.setAttribute("aria-expanded", "false");
  burgerIcon.className = "bi bi-list";
}
tvBurger.addEventListener("click", () => {
  const isOpen = tvLinks.classList.toggle("open");
  tvScrim.classList.toggle("show", isOpen);
  tvScrim.style.pointerEvents = isOpen ? "auto" : "none";
  tvBurger.setAttribute("aria-expanded", String(isOpen));
  burgerIcon.className = isOpen ? "bi bi-x-lg" : "bi bi-list";
});
tvScrim.addEventListener("click", closeMobileMenu);
document.querySelectorAll(".tv-link-item").forEach(a => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    const isAnchor = href && href.startsWith("#") && href.length > 1;
    if (isAnchor && tvLinks.classList.contains("open")) {
      e.preventDefault();
      closeMobileMenu();
      setTimeout(() => {
        const target = document.querySelector(href);
        if (target) {
          const navHeight = tvNav.getBoundingClientRect().height;
          const y = target.getBoundingClientRect().top + window.scrollY - navHeight - 12;
          window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        }
      }, 600);
    } else {
      closeMobileMenu();
    }
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add("in"); revealObserver.unobserve(entry.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

/* METRICS COUNT-UP */
const metricEls = document.querySelectorAll(".metric-num");
const aboveFoldMetrics = [], belowFoldMetrics = [];
metricEls.forEach(el => {
  const rect = el.getBoundingClientRect();
  (rect.top < window.innerHeight && rect.bottom > 0 ? aboveFoldMetrics : belowFoldMetrics).push(el);
});
function animateMetric(el) {
  if (el.dataset.counted === "1") return;
  el.dataset.counted = "1";
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || "";
  const totalSteps = 50, stepMs = 36;
  let step = 0;
  el.textContent = "0" + suffix;
  const timer = setInterval(() => {
    step++;
    const p = Math.min(step / totalSteps, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target).toLocaleString() + suffix;
    if (step >= totalSteps) { clearInterval(timer); el.textContent = target.toLocaleString() + suffix; }
  }, stepMs);
}
setTimeout(() => { aboveFoldMetrics.forEach(animateMetric); }, 1300);
if (belowFoldMetrics.length) {
  const metricsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (!entry.isIntersecting) return; animateMetric(entry.target); metricsObserver.unobserve(entry.target); });
  }, { threshold: 0.4 });
  belowFoldMetrics.forEach(el => metricsObserver.observe(el));
}

document.getElementById("yearNow").textContent = new Date().getFullYear();

/* HERO HEADLINE */
(function buildHeroHeadline(){
  const el = document.getElementById("heroHeadline");
  if (!el) return;
  const parts = [
    { text: "We don't just take you places we change the way you", em: true },
    { text: "experience", em: true },
    { text: "Them.", em: true },
  ];
  let delay = 0.05, html = "";
  parts.forEach((p) => {
    p.text.split(" ").forEach((w) => {
      const tag = p.em ? "em" : "span";
      html += `<${tag} class="word" style="animation-delay:${delay.toFixed(2)}s">${w}</${tag}>&nbsp;`;
      delay += 0.09;
    });
  });
  el.innerHTML = html;
})();

/* HERO INTERACTIVITY */
  (function heroInteractivity(){
    const hero = document.getElementById("tvHero");
    const videoLayer = document.getElementById("heroVideoLayer");
    const glow = document.getElementById("heroGlow");
    if (!hero || !videoLayer) return;

    /* Hero background video: always autoplay */
    const bgVideo = document.getElementById("heroBgVideo");

    if (bgVideo) {
      /* Force muted + inline so every browser permits gesture-free autoplay */
      bgVideo.muted = true;
      bgVideo.defaultMuted = true;
      bgVideo.setAttribute("muted", "");
      bgVideo.playsInline = true;
      bgVideo.setAttribute("playsinline", "");
      bgVideo.preload = "auto";

      const tryPlay = () => {
        const p = bgVideo.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      };

      /* Play the instant the browser is ready, and keep retrying */
      tryPlay();
      bgVideo.addEventListener("loadeddata", tryPlay);
      bgVideo.addEventListener("canplay", tryPlay);
      bgVideo.addEventListener("playing", () => {});
      window.addEventListener("load", tryPlay);
      setTimeout(tryPlay, 300);
      setTimeout(tryPlay, 1000);
      setTimeout(tryPlay, 3000);

      /* Pause only on a *confirmed* scroll-out or hidden tab (saves CPU/GPU/battery).
         Never pause on the observer's first callback, so load-time autoplay is safe. */
      let confirmedInView = true;
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              confirmedInView = true;
              if (!document.hidden) tryPlay();
            } else {
              confirmedInView = false;
              bgVideo.pause();
            }
          });
        }, { threshold: 0.1 });
        io.observe(hero);
      }
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && confirmedInView) tryPlay();
        else bgVideo.pause();
      });
    }

    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch) {
      hero.addEventListener("mousemove", (e) => {
        const rect = hero.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        videoLayer.style.transform = `translate(${(px-0.5)*22}px, ${(py-0.5)*14}px)`;
        glow.style.setProperty("--mx", (px*100)+"%");
        glow.style.setProperty("--my", (py*100)+"%");
      });
      hero.addEventListener("mouseleave", () => { videoLayer.style.transform = "translate(0,0)"; });
    }
  })();

/* PARALLAX */
(function setupParallax(){
  const els = Array.from(document.querySelectorAll(".parallax"));
  if (!els.length || window.matchMedia("(pointer: coarse)").matches) return;
  let ticking = false;
  function update() {
    const vh = window.innerHeight;
    els.forEach(el => {
      const speed = parseFloat(el.dataset.parallaxSpeed || "0.08");
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height/2 - vh/2;
      el.style.transform = `translateY(${(-center*speed).toFixed(1)}px)`;
    });
    ticking = false;
  }
  function onScroll(){ if (!ticking){ ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

/* TILT */
(function setupTilt(){
  if (window.matchMedia("(pointer: coarse)").matches) return;
  function bindTilt(el) {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX-rect.left)/rect.width-0.5;
      const py = (e.clientY-rect.top)/rect.height-0.5;
      el.style.transform = `perspective(900px) rotateX(${(-py*6).toFixed(2)}deg) rotateY(${(px*6).toFixed(2)}deg) translateY(-4px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  }
  new MutationObserver(() => {
    document.querySelectorAll(".trip-card:not([data-tilt-bound])").forEach(el => {
      el.setAttribute("data-tilt-bound","1"); el.classList.add("tilt-card"); bindTilt(el);
    });
  }).observe(document.body, { childList: true, subtree: true });
})();

const FALLBACK_TRIPS = [
  { id:"fallback-siwa", title:"Siwa Oasis Wilderness Expedition", base_price:8200, pdf_url:"#",
    image_urls:["https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?q=80&w=1200&auto=format&fit=crop","https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop","https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200&auto=format&fit=crop"],
    start_date:"2026-07-14", end_date:"2026-07-17", is_best_seller:true,
    description:"Journey deep into Egypt's most remote oasis for salt lakes, golden dunes, and star-filled skies — a soul-resetting escape far from the crowds.",
    itinerary:[
      { day:1, title:"Arrival in Siwa", details:"Your driver meets you at Marsa Matruh for the scenic drive into the oasis. After check-in at the eco-lodge we head to Fatnas Island for a golden-hour swim and sunset over the salt lakes. The evening opens with a welcome dinner of traditional Siwi dishes — tagine, stuffed dates, and bread baked in the sand." },
      { day:2, title:"Desert & Springs", details:"A 4x4 convoy carries us deep into the Great Sand Sea for dune boarding and endless photo stops. Midday we cool off in the mineral-rich Cleopatra Spring, then share a slow lunch of mezze and grilled meats in a shaded palm grove. The afternoon is yours — explore the olive and date cooperatives or rest by the pool." },
      { day:3, title:"Mountain of the Dead", details:"We climb to the Mountain of the Dead to explore Pharaonic and Greco-Roman tombs carved into the cliffs, then wander the crumbling mud-brick lanes of Shali Fortress. As night falls we gather around the campfire for mint tea, music, and a final stargazing session before your transfer back." }
    ],
    accommodation:"Boutique eco-lodge with private desert-view rooms, a palm-shaded pool, and half-board meals of local Siwi cuisine.",
    accommodation_photos:["https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=800&auto=format&fit=crop","https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800&auto=format&fit=crop","https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop"],
    solo_message:"Traveling solo? No problem — over 80% of our Siwa travellers journey on their own and leave with lifelong friends.",
    included:["Private 4x4 desert tours","All breakfasts & dinners","Boutique eco-lodge stay","Expert local guide","Airport transfers"],
    excluded:["Flights to Marsa Matruh","Personal expenses","Travel insurance","Optional spa treatments"],
    guidelines:["Pack light, breathable clothing and a refillable water bottle.","Respect local Siwi customs — cover shoulders when visiting the village.","Drones are not permitted near the salt lakes."],
    price_options:["Single occupancy — EGP 9,800","Double occupancy (per person) — EGP 7,200","Triple occupancy (per person) — EGP 6,400"],
    payment_methods:["Instapay — 01223744537","Vodafone Cash — 01061336882"],
    refund_policy:"Free cancellation up to 14 days before departure. 50% refund between 7–13 days. No refund within 6 days."
  },
  { id:"fallback-dahab", title:"Dahab Reef & Blue Hole Retreat", base_price:6450, pdf_url:"#",
    image_urls:["https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?q=80&w=1200&auto=format&fit=crop","https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=1200&auto=format&fit=crop","https://images.unsplash.com/photo-1583212292454-1fe6229603b7?q=80&w=1200&auto=format&fit=crop"],
    start_date:"2026-07-19", end_date:"2026-07-22", is_best_seller:true,
    description:"A laid-back Red Sea escape built around world-class diving, Bedouin hospitality, and the famous Blue Hole.",
    itinerary:[
      { day:1, title:"Arrival & Lagoon", details:"Check in to your sea-view stay and drop your bags before a barefoot sunset walk along the Lagoon. We ease in with a seafood welcome dinner on the waterfront and a first taste of Dahab's relaxed pace." },
      { day:2, title:"Blue Hole Dive", details:"A guided dive or snorkel at the legendary Blue Hole and the Canyon, with all equipment and an instructor on hand. The afternoon is free to lounge on the beach, try kitesurfing, or browse the seaside cafés." },
      { day:3, title:"Sinai Highlands", details:"A Bedouin-led hike into the coloured canyons with shaded breaks and sweet tea, ending in a starlit beach barbecue. We roll back into town under the stars, with transfers arranged the next morning." }
    ],
    accommodation:"Sea-view boutique hotel with daily breakfast, a rooftop lounge, and secure dive lockers.",
    accommodation_photos:["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800&auto=format&fit=crop","https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop","https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=800&auto=format&fit=crop"],
    solo_message:"Traveling solo? No problem — over 80% of our Dahab travellers come alone and pair up with buddies on day one.",
    included:["Daily guided dives/snorkelling","Sea-view hotel stay","Bedouin canyon hike","All breakfasts","Equipment rental"],
    excluded:["Flights to Sharm El Sheikh","Personal diving certification fees","Lunches & dinners","Tips"],
    guidelines:["Bring reef-safe sunscreen only — regular sunscreen damages the coral.","Beginners must complete a short briefing before any dive.","Alcohol is not served in the Old Town; purchase responsibly outside."],
    price_options:["Single occupancy — EGP 7,400","Double occupancy (per person) — EGP 5,900","Triple occupancy (per person) — EGP 5,200"],
    payment_methods:["Instapay — 01223744537","Vodafone Cash — 01061336882"],
    refund_policy:"Free cancellation up to 14 days before departure. 50% refund between 7–13 days. No refund within 6 days."
  },
  { id:"fallback-whitedesert", title:"White Desert Stargazer Camp", base_price:7100, pdf_url:"#",
    image_urls:["https://images.unsplash.com/photo-1547234935-80c7145ec969?q=80&w=1200&auto=format&fit=crop","https://images.unsplash.com/photo-1418985991508-e47386d96a71?q=80&w=1200&auto=format&fit=crop","https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop"],
    start_date:"2026-07-24", end_date:"2026-07-26",
    description:"Camp among the surreal chalk formations of the White Desert and fall asleep beneath one of the clearest night skies on Earth.",
    itinerary:[
      { day:1, title:"Drive to the Desert", details:"A scenic drive from Cairo with a stop at the Black Desert's volcanic hills, then a hot-spring sunset at the Valley of El Haize. We reach base camp as the light turns gold and dinner is served under open sky." },
      { day:2, title:"White Desert Camp", details:"Morning at the chalk sculptures of the White Desert, followed by a baked-in-sand lunch. As temperatures drop we light the fire for a Bedouin dinner and a long night of astrophotography among the formations." },
      { day:3, title:"Sunrise & Return", details:"We wake for golden-hour photos among the ice-cream rocks, share breakfast, and begin the relaxed drive back to Cairo with a final stop at the crystal mountain." }
    ],
    accommodation:"Private furnished dome tent with mattress, bedding, ambient lighting, and shared wash facilities.",
    solo_message:"Traveling solo? No problem — over 80% of our desert travellers go solo and love the communal campfire nights.",
    included:["Private 4x4 transfers","Full-board desert camping","Professional guide","All camping gear","National park fees"],
    excluded:["Flights to Cairo","Personal expenses","Travel insurance","Alcoholic drinks"],
    guidelines:["No smoking inside the tents or near the chalk formations.","Stay on marked paths to protect the fragile desert ecosystem.","Warm layers are essential — desert nights drop near freezing."],
    price_options:["Single occupancy — EGP 8,100","Double occupancy (per person) — EGP 6,500","Triple occupancy (per person) — EGP 5,900"],
    payment_methods:["Instapay — 01223744537","Vodafone Cash — 01061336882"],
    refund_policy:"Free cancellation up to 14 days before departure. 50% refund between 7–13 days. No refund within 6 days."
  }
];
const FALLBACK_GALLERY = [
  { media_url:"https://images.unsplash.com/photo-1583212292454-1fe6229603b7?q=80&w=1200&auto=format&fit=crop", destination:"Hurghada", title:"Red Sea Escape" },
  { media_url:"Videos/hero.mp4", is_video:true, destination:"Tavari", title:"On The Road" },
  { media_url:"https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?q=80&w=1200&auto=format&fit=crop", destination:"Siwa", title:"Oasis of Silence" },
  { media_url:"https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?q=80&w=1200&auto=format&fit=crop", destination:"Sinai", title:"Mountain & Reef" },
  { media_url:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop", destination:"Desert", title:"Desert Dunes" },
  { media_url:"https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200&auto=format&fit=crop", destination:"Coast", title:"Coastal Roads" },
  { media_url:"https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop", destination:"Mountains", title:"Mountain Horizons" },
  { media_url:"https://images.unsplash.com/photo-1418985991508-e47386d96a71?q=80&w=1200&auto=format&fit=crop", destination:"Forest", title:"Forest Trails" }
];
const FALLBACK_REVIEWS = [
  { customer_name:"Mariam K.", trip_title:"Ras Sedr", rating:5, quote:"I joined Tavari on a trip to Dahab without knowing anyone, and it turned out to be one of the best weekends I've ever had. Everything was perfectly organized, the accommodations were great, and the team made everyone feel welcome. I'll definitely travel with them again." },
  { customer_name:"Yasser S.", trip_title:"Ras Mohamed", rating:5, quote:"I've traveled with several agencies before, but Tavari really stands out. They pay attention to the small details, stick to the schedule, and make sure everyone enjoys the experience. It felt more like traveling with friends than with a tour company." },
  { customer_name:"Laila H.", trip_title:"Island Hopping", rating:5, quote:"From booking to the end of the trip, everything was smooth and stress-free. The guides were professional, friendly, and always available to help. The destinations were beautiful, and the itinerary was well planned. Highly recommended!" },
];

let TRIPS_CACHE = [];
function monogram(name) { return name.split(" ").filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join(""); }
function starString(rating) { const r=Math.max(1,Math.min(5,rating||5)); return "★★★★★".slice(0,r)+"☆☆☆☆☆".slice(0,5-r); }
function fmtMoney(n) { return "EGP "+Number(n||0).toLocaleString(); }
function fmtTripDateRange(t) {
  if (t.start_date) {
    const sd = parseLocalDate(t.start_date);
    if (!sd) return t.dates_label||"Dates on request";
    const ed = t.end_date ? parseLocalDate(t.end_date) : null;
    const optMD = { month:"long", day:"numeric" };
    const optY = { year:"numeric" };
    if (ed && !isNaN(ed)) {
      const sameY = sd.getFullYear()===ed.getFullYear();
      const sameM = sameY && sd.getMonth()===ed.getMonth();
      const start = sd.toLocaleDateString("en-US", optMD);
      const end = (sameM? ed.toLocaleDateString("en-US",{day:"numeric"}) : ed.toLocaleDateString("en-US", optMD)) + ", " + ed.getFullYear();
      return sameY ? `${start} – ${end}` : `${start}, ${sd.getFullYear()} – ${end}`;
    }
    return sd.toLocaleDateString("en-US", { ...optMD, ...optY });
  }
  return t.dates_label||"Dates on request";
}
function fmtDuration(t) {
  if (t.duration && String(t.duration).trim()) return String(t.duration).trim();
  const sd = parseLocalDate(t.start_date), ed = parseLocalDate(t.end_date);
  if (sd && ed && !isNaN(ed) && ed >= sd) {
    const days = Math.round((ed - sd) / 86400000) + 1;
    return days + (days === 1 ? " day" : " days");
  }
  return "";
}
function parseLocalDate(s) {
  if (typeof s!=="string"||!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

async function loadTrips() {
  let trips = FALLBACK_TRIPS;
  if (useLiveBackend && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("trips").select("*").order("created_at",{ascending:false});
      if (error) throw error;
      if (data && data.length) trips = data;
    } catch(e) { console.warn("Falling back to curated trips:", e); showToast("Showing sample trips — live data unavailable.", "info"); }
  }
  TRIPS_CACHE = trips;
  renderTrips(trips);
  populateInquiryTripOptions(trips);
}

function renderTrips(trips) {
  const grid = document.getElementById("tripsGrid");
  if (!trips.length) { grid.innerHTML = `<div class="col-12"><div class="trips-empty">No trips listed yet — check back shortly.</div></div>`; return; }
  grid.innerHTML = trips.map((t,i) => {
    const imgs = (t.image_urls && t.image_urls.length) ? t.image_urls : ["https://images.unsplash.com/photo-1539768942893-daf53e448371?q=80&w=1200&auto=format&fit=crop"];
    const dates = fmtTripDateRange(t);
    const duration = fmtDuration(t);
    return `<div class="col-md-6 col-lg-4 reveal reveal-d${Math.min((i%3)+1,5)}">
      <div class="trip-card">
        <div class="trip-thumb-wrap ${imgs.length<=1?'trip-thumb-wrap--single':''}">
          <div class="trip-thumb-track">
            ${imgs.map((src,k)=>`<div class="trip-thumb-slide"><img src="${src}" alt="${tvEsc(t.title)} photo ${k+1}" ${k?'loading="lazy"':''}></div>`).join("")}
          </div>
          <button class="trip-thumb-nav trip-thumb-prev" type="button" aria-label="Previous photo"><i class="bi bi-chevron-left"></i></button>
          <button class="trip-thumb-nav trip-thumb-next" type="button" aria-label="Next photo"><i class="bi bi-chevron-right"></i></button>
          <div class="trip-thumb-dots">${imgs.map((_,k)=>`<button class="trip-thumb-dot${k===0?' active':''}" type="button" data-i="${k}" aria-label="Photo ${k+1}"></button>`).join("")}</div>
          <span class="trip-price-chip">${fmtMoney(t.base_price)} / person</span>
          ${t.is_best_seller ? `<span class="best-seller-badge"><i class="bi bi-fire"></i> Best Seller</span>` : ""}
        </div>
        <div class="trip-body">
          <h3>${t.title}</h3>
          <div class="trip-dates"><i class="bi bi-calendar3"></i> ${dates}</div>
          ${duration?`<div class="trip-duration"><i class="bi bi-clock"></i> ${duration}</div>`:""}
          <div class="trip-actions">
            <button class="btn-trip-secondary" type="button" data-action="details" data-trip="${t.id}"><i class="bi bi-info-circle"></i> Show Details</button>
            <button class="btn-trip-primary" type="button" data-action="book" data-trip="${t.id}">Book now</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");
  grid.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
  initCardSliders();
}

function initCardSliders(){
  document.querySelectorAll(".trip-thumb-wrap").forEach(wrap => {
    const track = wrap.querySelector(".trip-thumb-track");
    if (!track) return;
    bindSlider(track, wrap.querySelector(".trip-thumb-prev"), wrap.querySelector(".trip-thumb-next"), wrap.querySelector(".trip-thumb-dots"));
  });
}

function populateInquiryTripOptions(trips) {
  const select = document.getElementById("inqTrip");
  select.innerHTML = `<option selected>Not sure yet</option>`;
  trips.forEach(t => { const opt=document.createElement("option"); opt.value=t.title; opt.textContent=t.title; select.appendChild(opt); });
}

async function loadGalleryStrip() {
  let items = FALLBACK_GALLERY;
  if (useLiveBackend && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("gallery").select("*").order("position", { ascending: true });
      if (error) throw error;
      if (data && data.length) items = data;
    } catch(e) { console.warn("Gallery fallback:", e); }
  }
  const norm = (p) => ({
    url: p.media_url || p.image_url || (p.image_urls && p.image_urls[0]) || "",
      cap: p.caption || p.destination || p.title || "",
    isVideo: !!(p.is_video)
  });
  const photos = items.map(norm).filter(p => p.url);
  const grid = document.getElementById("galleryTrack");
  const tile = (p) => {
    const media = p.isVideo
      ? `<video src="${p.url}" autoplay muted loop playsinline preload="metadata"></video><span class="gal-play-badge" aria-hidden="true"><i class="bi bi-play-fill"></i></span>`
      : `<img src="${p.url}" alt="${tvEsc(p.cap)}" loading="lazy">`;
    return `<div class="gal-frame"><div class="gal-photo">${media}<div class="gal-caption"><div class="gal-title">${tvEsc(p.cap)}</div></div></div></div>`;
  };
  grid.innerHTML = photos.map(tile).join("");
  startGalleryMarquee(grid.parentElement, grid);
}

function startGalleryMarquee(wrap, track){
  if (!track || track.children.length < 2) return;
  if (track.scrollWidth <= wrap.clientWidth) return;
  const speed = 60;
  let offset = 0, last = performance.now(), paused = false, rafId = null, running = false;
  if (!wrap.dataset.bound){
    wrap.addEventListener("mouseenter", () => paused = true);
    wrap.addEventListener("mouseleave", () => paused = false);
    wrap.dataset.bound = "1";
  }
  function frame(now){
    const dt = (now - last) / 1000; last = now;
    if (!paused) offset -= speed * dt;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    const first = track.children[0];
    const firstW = first.getBoundingClientRect().width + gap;
    if (-offset >= firstW){ offset += firstW; track.appendChild(first); }
    track.style.transform = `translateX(${offset}px)`;
    rafId = requestAnimationFrame(frame);
  }
  function start(){ if (running) return; running = true; last = performance.now(); rafId = requestAnimationFrame(frame); }
  function stop(){ running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  start();
  const ctrl = { pause(){ paused = true; }, resume(){ paused = false; last = performance.now(); } };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) start(); else stop(); });
    }, { threshold: 0 });
    io.observe(wrap);
  }
  wrap._marqueeCtrl = ctrl;
  return ctrl;
}

/* ─── Gallery lightbox (mobile + tablet only) ───────── */
function bindGalleryLightbox(){
  const grid = document.getElementById("galleryGrid");
  const lb = document.getElementById("galLightbox");
  const lbMedia = document.getElementById("galLightboxMedia");
  const lbCap = document.getElementById("galLightboxCap");
  const lbClose = document.getElementById("galLightboxClose");
  if (!grid || !lb) return;

  const isMobile = () => window.matchMedia("(max-width: 991px)").matches;

  function open(mediaEl, caption){
    const ctrl = grid._marqueeCtrl;
    if (ctrl) ctrl.pause();
    lbMedia.innerHTML = "";
    if (mediaEl.tagName === "VIDEO"){
      const v = document.createElement("video");
      v.src = mediaEl.currentSrc || mediaEl.src;
      v.controls = true; v.autoplay = true; v.playsInline = true; v.loop = true;
      v.setAttribute("playsinline", "");
      lbMedia.appendChild(v);
    } else {
      const img = document.createElement("img");
      img.src = mediaEl.currentSrc || mediaEl.src;
      img.alt = mediaEl.alt || "";
      lbMedia.appendChild(img);
    }
    lbCap.textContent = caption || "";
    lb.classList.add("show");
    lb.setAttribute("aria-hidden", "false");
    document.body.classList.add("gal-lb-open");
  }

  function close(){
    lb.classList.remove("show");
    lb.setAttribute("aria-hidden", "true");
    document.body.classList.remove("gal-lb-open");
    const v = lbMedia.querySelector("video");
    if (v) { try { v.pause(); } catch(e){} }
    lbMedia.innerHTML = "";
    const ctrl = grid._marqueeCtrl;
    if (ctrl) ctrl.resume();
  }

  grid.addEventListener("click", (e) => {
    if (!isMobile()) return;
    const frame = e.target.closest(".gal-frame");
    if (!frame) return;
    const mediaEl = frame.querySelector("img, video");
    if (!mediaEl) return;
    const cap = frame.querySelector(".gal-title");
    open(mediaEl, cap ? cap.textContent : "");
  });

  lbClose.addEventListener("click", close);
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lb.classList.contains("show")) close();
  });
}

async function loadReviews() {
  let reviews = FALLBACK_REVIEWS;
  if (useLiveBackend && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("reviews").select("*").order("created_at",{ascending:false}).limit(10);
      if (error) throw error;
      if (data&&data.length) reviews = data;
    } catch(e) { console.warn("Reviews fallback:", e); }
  }
  const grid = document.getElementById("reviewsGrid");
  grid.innerHTML = reviews.slice(0,10).map((r) => `
    <div class="tv-review-slide">
      <div class="review-card">
        <div class="review-mono">${monogram(r.customer_name)}</div>
        <div class="review-stars">${starString(r.rating)}</div>
        <p class="review-quote">&ldquo;${r.quote}&rdquo;</p>
        <div class="review-name">${r.customer_name}</div>
        <div class="review-trip">${r.trip_title}</div>
      </div>
    </div>`).join("");

  const dotsWrap = document.getElementById("reviewsDots");
  if (dotsWrap) {
    dotsWrap.innerHTML = reviews.slice(0,10).map((_,i) => `<button class="tv-reviews-dot${i===0?" active":""}" data-i="${i}" aria-label="Go to review ${i+1}"></button>`).join("");
  }
  bindReviewsSlider();
}

loadTrips();
loadGalleryStrip();
loadReviews();
bindGalleryLightbox();

/* TRIP DETAIL MODAL */
const tripDetailScrim = document.getElementById("tripDetailScrim");
const tripDetailModal = tripDetailScrim.querySelector(".tv-trip-detail-modal");
function tvEsc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function closeTripDetails(){ closeAccLightbox(); closeHeroLightbox(); tripDetailScrim.classList.remove("show"); document.body.style.overflow=""; }
document.getElementById("tripDetailClose").addEventListener("click", closeTripDetails);
tripDetailScrim.addEventListener("click", (e) => { if (e.target===tripDetailScrim) closeTripDetails(); });
document.addEventListener("keydown", (e) => { if (e.key==="Escape" && tripDetailScrim.classList.contains("show")) closeTripDetails(); });

function bindReviewsSlider(){
  const track = document.getElementById("reviewsGrid");
  const prev = document.getElementById("reviewsPrev");
  const next = document.getElementById("reviewsNext");
  const dotsWrap = document.getElementById("reviewsDots");
  if (!track || !track.children.length) return;

  const slides = Array.from(track.children);
  const dots = dotsWrap ? Array.from(dotsWrap.children) : [];
  const viewport = track.parentElement;
  let idx = 0;

  function slideStep(){
    if (slides.length < 2) return slides[0] ? slides[0].offsetWidth : 0;
    return slides[1].offsetLeft - slides[0].offsetLeft;
  }
  function maxIdx(){
    const step = slideStep();
    if (step <= 0) return 0;
    const overflow = track.scrollWidth - viewport.clientWidth;
    return Math.max(0, Math.round(overflow / step));
  }
  function goTo(i){
    idx = Math.max(0, Math.min(i, maxIdx()));
    const step = slideStep();
    track.style.transform = `translateX(-${idx*step}px)`;
    dots.forEach((d,k) => d.classList.toggle("active", k===idx));
    if (prev) prev.disabled = (idx === 0);
    if (next) next.disabled = (idx === maxIdx());
  }
  if (prev) prev.addEventListener("click", () => goTo(idx-1));
  if (next) next.addEventListener("click", () => goTo(idx+1));
  dots.forEach(d => d.addEventListener("click", () => goTo(parseInt(d.dataset.i,10))));

  let startX=null, startY=null, dragging=false, axisLocked=null, startT=0;
  const SWIPE=25, FLICK=0.25;
  track.addEventListener("touchstart", (e)=>{
    if(!e.touches||!e.touches.length) return;
    startX=e.touches[0].clientX; startY=e.touches[0].clientY; startT=e.timeStamp||Date.now();
    dragging=true; axisLocked=null;
  }, {passive:true});
  track.addEventListener("touchmove",(e)=>{
    if(!dragging||startX===null||!e.touches||!e.touches.length) return;
    const dx=e.touches[0].clientX-startX, dy=e.touches[0].clientY-startY;
    if(axisLocked===null){
      if(Math.abs(dx)<6&&Math.abs(dy)<6) return;
      axisLocked = Math.abs(dy) > Math.abs(dx)*1.6 ? "y" : "x";
    }
    if(axisLocked!=="x") return;
    if(e.cancelable) e.preventDefault();
  }, {passive:false});
  function endTouch(e){
    if(!dragging||startX===null) return;
    const t=(e.changedTouches&&e.changedTouches[0])?e.changedTouches[0]:null;
    const endX=t?t.clientX:startX;
    const dx=endX-startX; const dt=((e.timeStamp||Date.now())-startT)||1;
    const velocity=Math.abs(dx)/dt;
    dragging=false; axisLocked=null; startX=null; startY=null;
    if(axisLocked===null && Math.abs(dx)<6) return;
    if(Math.abs(dx)>SWIPE || velocity>FLICK){ goTo(idx + (dx<0?1:-1)); }
  }
  track.addEventListener("touchend", endTouch);
  track.addEventListener("touchcancel", endTouch);
  window.addEventListener("resize", () => goTo(idx));
  goTo(0);
}

function bindSlider(track, prev, next, dotsWrap, onChange){
  if (!track) return null;
  const slides = track.children.length;
  if (slides <= 1) return null;
  let idx = 0;
  const dots = dotsWrap ? Array.from(dotsWrap.children) : [];
  function goTo(i){
    idx = (i + slides) % slides;
    track.style.transform = `translateX(-${idx*100}%)`;
    dots.forEach((d,k) => d.classList.toggle("active", k===idx));
    if (onChange) onChange(idx);
  }
  if (prev) prev.addEventListener("click", () => goTo(idx-1));
  if (next) next.addEventListener("click", () => goTo(idx+1));
  dots.forEach(d => d.addEventListener("click", () => goTo(parseInt(d.dataset.i,10))));

  /* Touch swipe (mobile) — flick/scroll-snap style. We do NOT follow the finger live;
     instead we detect direction + velocity on release and let the CSS transition do the
     smooth slide change. This is the most fluid approach and avoids per-frame jitter.
     Mouse/trackpad never fires touch events, so desktop stays click-only. */
  let startX = null, startY = null, startT = 0, dragging = false, axisLocked = null;
  const SWIPE_THRESHOLD = 25, FLICK_VELOCITY = 0.25; /* px per ms for a quick flick */
  track.addEventListener("touchstart", (e) => {
    if (!e.touches || !e.touches.length) return;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    startT = e.timeStamp || Date.now();
    dragging = true; axisLocked = null;
  }, { passive: true });
  track.addEventListener("touchmove", (e) => {
    if (!dragging || startX === null || !e.touches || !e.touches.length) return;
    const dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY;
    if (axisLocked === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      /* Bias toward horizontal: a swipe counts as horizontal unless vertical clearly dominates,
         so a slightly diagonal finger movement still swipes the slider. */
      axisLocked = Math.abs(dy) > Math.abs(dx) * 1.6 ? "y" : "x";
    }
    if (axisLocked !== "x") return;
    if (e.cancelable) e.preventDefault();   /* swallow horizontal scroll only for a clearly horizontal swipe */
  }, { passive: false });
  function endTouch(e){
    if (!dragging || startX === null) return;
    const t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
    const endX = t ? t.clientX : startX;
    const dx = endX - startX;
    const dt = (e.timeStamp || Date.now()) - startT || 1;
    const velocity = Math.abs(dx) / dt;   /* px per ms */
    dragging = false; axisLocked = null; startX = null; startY = null;
    /* Advance on a clear distance OR a quick flick (even with a small move) */
    if (axisLocked === null && Math.abs(dx) < 6) return;
    if (Math.abs(dx) > SWIPE_THRESHOLD || velocity > FLICK_VELOCITY) {
      goTo(idx + (dx < 0 ? 1 : -1));
    }
    /* else: do nothing — track is already on the correct slide, so it just stays put smoothly */
  }
  track.addEventListener("touchend", endTouch);
  track.addEventListener("touchcancel", endTouch);
  return goTo;
}

function initTripHeroSlider(){
  const track = document.getElementById("tdHeroTrack");
  if (!track) return;
  const slider = document.querySelector(".tv-td-hero");
  const prev = document.getElementById("tdHeroPrev");
  const next = document.getElementById("tdHeroNext");
  const dots = document.getElementById("tdHeroDots");
  let heroIdx = 0;
  function syncHeroHeight(){
    const slide = track.children[heroIdx];
    const img = slide && slide.querySelector("img");
    if (img && slider) {
      slider.style.height = img.clientHeight + "px";
    } else if (slider) {
      slider.style.height = "";
    }
  }
  window.__heroSliderGo = bindSlider(track, prev, next, dots, (i) => { heroIdx = i; syncHeroHeight(); });
  Array.from(track.querySelectorAll("img")).forEach(img => { if (!img.complete) img.addEventListener("load", syncHeroHeight); });
  syncHeroHeight();

  /* Collect hero photo URLs for the full-view lightbox */
  __heroLbImgs = Array.from(track.querySelectorAll("img")).map(img => img.src);

  track.addEventListener("click", (e) => {
    const img = e.target.closest("img");
    if (!img) return;
    const idx = __heroLbImgs.indexOf(img.src || img.dataset.full || "");
    openHeroLightbox(idx >= 0 ? idx : 0);
  });
}

/* ─── Accommodation slider + lightbox ──────────────── */
let __accLbImgs = [], __accLbIdx = 0;
let __heroLbImgs = [], __heroLbIdx = 0;

function openHeroLightbox(idx){
  if (!__heroLbImgs.length) return;
  __heroLbIdx = idx;
  const lb = document.getElementById("tdHeroLightbox");
  const lbImg = document.getElementById("tdHeroLbImg");
  const lbCounter = document.getElementById("tdHeroLbCounter");
  lbImg.src = __heroLbImgs[__heroLbIdx];
  lbCounter.textContent = `${__heroLbIdx+1} / ${__heroLbImgs.length}`;
  lb.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeHeroLightbox(){
  const lb = document.getElementById("tdHeroLightbox");
  lb.classList.remove("show");
  document.body.style.overflow = "";
}

function stepHeroLb(dir){
  if (!__heroLbImgs.length) return;
  __heroLbIdx = (__heroLbIdx + dir + __heroLbImgs.length) % __heroLbImgs.length;
  const lbImg = document.getElementById("tdHeroLbImg");
  const lbCounter = document.getElementById("tdHeroLbCounter");
  lbImg.src = __heroLbImgs[__heroLbIdx];
  lbCounter.textContent = `${__heroLbIdx+1} / ${__heroLbImgs.length}`;
}

function initAccSlider(){
  const track = document.getElementById("tdAccTrack");
  if (!track) return;
  const slider = document.getElementById("tdAccSlider");
  const prev = document.getElementById("tdAccPrev");
  const next = document.getElementById("tdAccNext");
  const dots = document.getElementById("tdAccDots");
  let accIdx = 0;
  function syncAccHeight(){
    const slide = track.children[accIdx];
    const img = slide && slide.querySelector("img");
    if (img && slider) slider.style.height = img.clientHeight + "px";
  }
  bindSlider(track, prev, next, dots, (i) => { accIdx = i; syncAccHeight(); });
  Array.from(track.querySelectorAll("img")).forEach(img => {
    if (!img.complete) img.addEventListener("load", syncAccHeight);
  });
  syncAccHeight();

  /* Collect photo URLs for lightbox */
  __accLbImgs = Array.from(track.querySelectorAll("img"))?.map(img => img.dataset.full || img.src) || [];

  track.addEventListener("click", (e) => {
    const img = e.target.closest("img");
    if (!img) return;
    const idx = __accLbImgs.indexOf(img.dataset.full || img.src);
    openAccLightbox(idx >= 0 ? idx : 0);
  });
}

function openAccLightbox(idx){
  if (!__accLbImgs.length) return;
  __accLbIdx = idx;
  const lb = document.getElementById("tdAccLightbox");
  const lbImg = document.getElementById("tdAccLbImg");
  const lbCounter = document.getElementById("tdAccLbCounter");
  lbImg.src = __accLbImgs[__accLbIdx];
  lbCounter.textContent = `${__accLbIdx+1} / ${__accLbImgs.length}`;
  lb.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeAccLightbox(){
  const lb = document.getElementById("tdAccLightbox");
  lb.classList.remove("show");
  document.body.style.overflow = "";
}

function stepAccLbRb(dir){
  if (!__accLbImgs.length) return;
  __accLbIdx = (__accLbIdx + dir + __accLbImgs.length) % __accLbImgs.length;
  const lbImg = document.getElementById("tdAccLbImg");
  const lbCounter = document.getElementById("tdAccLbCounter");
  lbImg.src = __accLbImgs[__accLbIdx];
  lbCounter.textContent = `${__accLbIdx+1} / ${__accLbImgs.length}`;
}

document.addEventListener("click", (e) => {
  if (e.target.closest("#tdAccLbClose")) closeAccLightbox();
  if (e.target.closest("#tdAccLbPrev")) stepAccLbRb(-1);
  if (e.target.closest("#tdAccLbNext")) stepAccLbRb(1);
  if (e.target.closest("#tdHeroLbClose")) closeHeroLightbox();
  if (e.target.closest("#tdHeroLbPrev")) stepHeroLb(-1);
  if (e.target.closest("#tdHeroLbNext")) stepHeroLb(1);
});

document.addEventListener("keydown", (e) => {
  const accLb = document.getElementById("tdAccLightbox");
  if (accLb && accLb.classList.contains("show")){
    if (e.key === "Escape") closeAccLightbox();
    if (e.key === "ArrowLeft") stepAccLbRb(-1);
    if (e.key === "ArrowRight") stepAccLbRb(1);
    return;
  }
  const heroLb = document.getElementById("tdHeroLightbox");
  if (heroLb && heroLb.classList.contains("show")){
    if (e.key === "Escape") closeHeroLightbox();
    if (e.key === "ArrowLeft") stepHeroLb(-1);
    if (e.key === "ArrowRight") stepHeroLb(1);
    return;
  }
  if (!tripDetailScrim.classList.contains("show")) return;
  if (e.key==="ArrowLeft" && window.__heroSliderGo) window.__heroSliderGo(-1);
  if (e.key==="ArrowRight" && window.__heroSliderGo) window.__heroSliderGo(1);
});

function openTripDetails(tripId){
  const t = TRIPS_CACHE.find(x => String(x.id)===String(tripId));
  if (!t) { showToast("Trip details are unavailable right now.","error"); return; }
  const imgs = (t.image_urls && t.image_urls.length) ? t.image_urls : [];
  const dates = fmtTripDateRange(t);
  const duration = fmtDuration(t);
  const price = fmtMoney(t.base_price) + " / person";
  const solo = t.solo_message || "Traveling solo? No problem — over 80% of our travellers journey on their own. You'll be in great company.";
  const itin = (t.itinerary && Array.isArray(t.itinerary)) ? t.itinerary : [];
  const included = (t.included && t.included.length) ? t.included : [];
  const excluded = (t.excluded && t.excluded.length) ? t.excluded : [];
  const prices = (t.price_options && t.price_options.length) ? t.price_options : [];
  const refund = t.refund_policy || "";
  const pdf = (t.pdf_url && t.pdf_url!=="#") ? t.pdf_url : null;

  const itinHtml = itin.length ? itin.map(d => {
    const pts = (d.points && Array.isArray(d.points)) ? d.points.filter(Boolean) : [];
    const body = pts.length
      ? `<ul class="tv-td-bullets day-points">` + pts.map(p=>`<li><i class="bi bi-dot"></i><span>${tvEsc(p)}</span></li>`).join("") + `</ul>`
      : (d.details ? `<div class="d-details">${tvEsc(d.details)}</div>` : "");
    return `
    <div class="tv-td-day">
      <div class="d-head"><span class="d-day">Day ${tvEsc(d.day)}</span><span class="d-title">${tvEsc(d.title||"")}</span></div>
      ${body}
    </div>`;
  }).join("") : `<p>Full day-by-day itinerary coming soon.</p>`;

  const bullets = (arr, cls) => arr.length
    ? `<ul class="tv-td-bullets ${cls}">` + arr.map(x => `<li><i class="bi ${cls==="included"?"bi-check-circle-fill":"bi-x-circle-fill"}"></i><span>${tvEsc(x)}</span></li>`).join("") + `</ul>`
    : `<p>—</p>`;

  document.getElementById("tripDetailBody").innerHTML = `
    <div class="tv-td-hero ${imgs.length<=1?'tv-td-hero--single':''}">
      <div class="tv-td-hero-track" id="tdHeroTrack">
        ${imgs.map((src,i)=>`<div class="tv-td-hero-slide"><img src="${src}" alt="${tvEsc(t.title)} photo ${i+1}" ${i?'loading="lazy"':''}></div>`).join("")}
      </div>
      <button class="tv-td-hero-nav tv-td-hero-prev" id="tdHeroPrev" type="button" aria-label="Previous photo"><i class="bi bi-chevron-left"></i></button>
      <button class="tv-td-hero-nav tv-td-hero-next" id="tdHeroNext" type="button" aria-label="Next photo"><i class="bi bi-chevron-right"></i></button>
      <div class="tv-td-hero-dots" id="tdHeroDots">${imgs.map((_,i)=>`<button class="tv-td-hero-dot${i===0?' active':''}" type="button" data-i="${i}" aria-label="Photo ${i+1}"></button>`).join("")}</div>
    </div>
    <div class="tv-td-body">
      <div class="tv-td-head">
        <h2>${tvEsc(t.title)}</h2>
        <div class="tv-td-meta">
          <span class="tv-td-dates"><i class="bi bi-calendar3"></i> ${tvEsc(dates)}</span>
          ${duration?`<span class="tv-td-duration"><i class="bi bi-clock"></i> ${tvEsc(duration)}</span>`:""}
        </div>
        <span class="tv-td-price">${tvEsc(price)}</span>
      </div>
      ${t.description?`<div class="tv-td-section"><h3><i class="bi bi-info-circle"></i> About this trip</h3><p>${tvEsc(t.description)}</p></div>`:""}
      ${itin.length?`<div class="tv-td-section"><h3><i class="bi bi-map"></i> Day by day</h3><div class="tv-td-timeline">${itinHtml}</div></div>`:""}
      ${t.accommodation?(()=>{const accImgs=(t.accommodation_photos&&t.accommodation_photos.length)?t.accommodation_photos:[];return`<div class="tv-td-section"><h3><i class="bi bi-house-heart"></i> Accommodation</h3><p>${tvEsc(t.accommodation)}</p>${accImgs.length?`<div class="tv-td-acc-photos"><div class="tv-td-acc-slider${accImgs.length<=1?' tv-td-acc-slider--single':''}" id="tdAccSlider"><div class="tv-td-acc-track" id="tdAccTrack">${accImgs.map((src,i)=>`<div class="tv-td-acc-slide"><img src="${src}" alt="Accommodation photo ${i+1}" ${i?'loading="lazy"':''} data-full="${src}"></div>`).join("")}</div><button class="tv-td-acc-nav tv-td-acc-prev" id="tdAccPrev" type="button" aria-label="Previous photo"><i class="bi bi-chevron-left"></i></button><button class="tv-td-acc-nav tv-td-acc-next" id="tdAccNext" type="button" aria-label="Next photo"><i class="bi bi-chevron-right"></i></button><div class="tv-td-acc-dots" id="tdAccDots">${accImgs.map((_,i)=>`<button class="tv-td-acc-dot${i===0?' active':''}" type="button" data-i="${i}" aria-label="Photo ${i+1}"></button>`).join("")}</div></div></div>`:""}</div>`;})():""}
       <div class="tv-td-section"><h3><i class="bi bi-clipboard-check"></i> What's included &amp; excluded</h3>
        <div class="tv-td-cols">
          <div><div class="eyebrow mb-2">Included</div>${bullets(included,"included")}</div>
          <div><div class="eyebrow mb-2">Excluded</div>${bullets(excluded,"excluded")}</div>
        </div>
      </div>
      <div class="tv-td-section"><div class="tv-td-solo"><i class="bi bi-emoji-smile"></i><p>${tvEsc(solo)}</p></div></div>
       ${prices.length?`<div class="tv-td-section"><h3><i class="bi bi-cash-stack"></i> Prices</h3><ul class="tv-td-bullets prices">${prices.map(p=>`<li><i class="bi bi-dot"></i><span>${tvEsc(p)}</span></li>`).join("")}</ul></div>`:""}
       ${refund?`<div class="tv-td-section"><h3><i class="bi bi-shield-check"></i> Refund policy</h3><p>${tvEsc(refund)}</p></div>`:""}
        ${(()=>{const g=t.guidelines; const items = Array.isArray(g)?g:(g?String(g).split(/\n|\u2022|\./).map(s=>s.trim()).filter(Boolean):[]); return items.length?`<div class="tv-td-section"><h3><i class="bi bi-list-check"></i> Guidelines</h3><ul class="tv-td-bullets guidelines">${items.map(x=>`<li><i class="bi bi-dot"></i><span>${tvEsc(x)}</span></li>`).join("")}</ul></div>`:"";})()}
       <div class="tv-td-cta">
        <button class="btn-trip-primary" type="button" data-action="book-close" data-trip="${t.id}"><i class="bi bi-calendar-check"></i> Book now</button>
        ${pdf?`<a class="btn-trip-secondary" href="${pdf}" target="_blank" rel="noopener"><i class="bi bi-file-earmark-pdf"></i> Itinerary PDF</a>`:""}
      </div>
    </div>
  `;
  document.querySelectorAll("#tripDetailBody p").forEach(p => p.style.fontFamily = "'DM Sans', sans-serif");
  tripDetailScrim.classList.add("show");
    document.body.style.overflow = "hidden";
    tripDetailModal.scrollTop = 0;
    initTripHeroSlider();
    initAccSlider();
}

/* BOOKING DRAWER */
const drawer = document.getElementById("bookingDrawer");
const drawerScrim = document.getElementById("drawerScrim");
let currentTrip = null, receiptFile = null, receiptDataUrl = null;

function openBookingDrawer(tripId) {
  const trip = TRIPS_CACHE.find(t => String(t.id)===String(tripId));
  if (!trip) { showToast("That trip could not be found.", "error"); return; }
  currentTrip = trip;
  document.getElementById("drawerTripTitle").textContent = trip.title;
  document.getElementById("drawerTripDates").textContent = fmtTripDateRange(trip);
  goToStage(1);
  ["bkName","bkPhone","bkEmail"].forEach(id => document.getElementById(id).value="");
  const bkConsent = document.getElementById("bkConsent"); if (bkConsent) bkConsent.checked = false;
  document.getElementById("bkPersons").value = 1;
  resetReceiptZone(); updatePriceEngine();
  drawer.classList.add("show"); drawerScrim.classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeBookingDrawer() { drawer.classList.remove("show"); drawerScrim.classList.remove("show"); document.body.style.overflow = ""; }
document.getElementById("drawerCloseBtn").addEventListener("click", closeBookingDrawer);
drawerScrim.addEventListener("click", closeBookingDrawer);
function goToStage(n) {
  document.getElementById("stage1").classList.toggle("active",n===1);
  document.getElementById("stage2").classList.toggle("active",n===2);
  document.getElementById("pip1").classList.toggle("active",n===1);
  document.getElementById("pip2").classList.toggle("active",n===2);
}
const bkPersonsInput = document.getElementById("bkPersons");
function clampPersons(val) { let n=parseInt(val,10); if(isNaN(n)||n<1)n=1; if(n>20)n=20; return n; }
function updatePriceEngine() {
  if (!currentTrip) return;
  const persons = clampPersons(bkPersonsInput.value);
  bkPersonsInput.value = persons;
  const total = (currentTrip.base_price||0)*persons;
  document.getElementById("stage1Price").textContent = fmtMoney(total);
  document.getElementById("stage1PriceBreakdown").textContent = `${fmtMoney(currentTrip.base_price)} × ${persons}`;
  document.getElementById("stage2Price").textContent = fmtMoney(total);
}
bkPersonsInput.addEventListener("input", updatePriceEngine);
document.getElementById("bkPersonsMinus").addEventListener("click", () => { bkPersonsInput.value=clampPersons(bkPersonsInput.value)-1; updatePriceEngine(); });
document.getElementById("bkPersonsPlus").addEventListener("click", () => { bkPersonsInput.value=clampPersons(bkPersonsInput.value)+1; updatePriceEngine(); });
document.getElementById("toStage2Btn").addEventListener("click", () => {
  const name=document.getElementById("bkName").value.trim();
  const phone=document.getElementById("bkPhone").value.trim();
  const email=document.getElementById("bkEmail").value.trim();
  if (!name||!phone||!email) { showToast("Please fill in your name, mobile number, and email.","error"); return; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { showToast("That email address doesn't look quite right.","error"); return; }
  updatePriceEngine(); goToStage(2);
});
document.getElementById("backToStage1Btn").addEventListener("click", () => goToStage(1));

const dropzone = document.getElementById("receiptDropzone");
const receiptInput = document.getElementById("receiptInput");
const completeBtn = document.getElementById("completeBookingBtn");
function resetReceiptZone() {
  receiptFile=null; receiptDataUrl=null; receiptInput.value="";
  document.getElementById("dropzoneHint").textContent="Tap to upload, or drag a screenshot here";
  document.getElementById("dropzoneFilename").textContent="";
  const preview=document.getElementById("dropzonePreview"); preview.style.display="none"; preview.src="";
  completeBtn.disabled=true; completeBtn.classList.add("btn-tv-disabled");
}
dropzone.addEventListener("click", () => receiptInput.click());
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
dropzone.addEventListener("drop", (e) => { e.preventDefault(); dropzone.classList.remove("drag"); if(e.dataTransfer.files&&e.dataTransfer.files[0]) handleReceiptFile(e.dataTransfer.files[0]); });
receiptInput.addEventListener("change", (e) => { if(e.target.files&&e.target.files[0]) handleReceiptFile(e.target.files[0]); });
function handleReceiptFile(file) {
  if (!file.type.startsWith("image/")) { showToast("Please upload an image file.","error"); return; }
  receiptFile=file;
  document.getElementById("dropzoneHint").textContent="Receipt loaded — tap to replace";
  document.getElementById("dropzoneFilename").textContent=file.name;
  const reader=new FileReader();
  reader.onload=(e)=>{ receiptDataUrl=e.target.result; const p=document.getElementById("dropzonePreview"); p.src=receiptDataUrl; p.style.display="block"; };
  reader.readAsDataURL(file);
  completeBtn.disabled=false; completeBtn.classList.remove("btn-tv-disabled");
  showToast("Receipt screenshot loaded.","success",2400);
}
document.getElementById("completeBookingBtn").addEventListener("click", async () => {
  if (!receiptFile||!currentTrip) return;
  if (!document.getElementById("bkConsent").checked) { showToast("Please accept the data consent to continue.","error"); return; }
  const name=document.getElementById("bkName").value.trim();
  const phone=document.getElementById("bkPhone").value.trim();
  const email=document.getElementById("bkEmail").value.trim();
  const persons=clampPersons(bkPersonsInput.value);
  const total=(currentTrip.base_price||0)*persons;
  const btn=completeBtn;
  const originalLabel=btn.querySelector(".btn-label").textContent;
  setButtonLoading(btn,true,"Processing…");
  try {
    let receiptUrl=receiptDataUrl;
    if (useLiveBackend&&supabaseClient) {
      const path=`receipts/${currentTrip.id}_${Date.now()}_proof.png`;
      const { error:uploadError } = await supabaseClient.storage.from(RECEIPTS_BUCKET).upload(path,receiptFile);
      if (uploadError) throw uploadError;
      const { data:urlData } = supabaseClient.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
      receiptUrl=urlData.publicUrl;
      const { error:insertError } = await supabaseClient.from("bookings").insert({ trip_id:currentTrip.id, customer_name:name, customer_phone:phone, customer_email:email, num_persons:persons, total_price:total, receipt_url:receiptUrl, status:"pending_verification" });
      if (insertError) throw insertError;
    } else {
      const bookings=JSON.parse(localStorage.getItem("tavari_bookings")||"[]");
      bookings.push({ id:"local-"+Date.now(), trip_id:currentTrip.id, trip_title:currentTrip.title, customer_name:name, customer_phone:phone, customer_email:email, num_persons:persons, total_price:total, receipt_url:receiptUrl, status:"pending_verification", created_at:new Date().toISOString() });
      localStorage.setItem("tavari_bookings",JSON.stringify(bookings));
    }
    try { await sendBookingEmails({ name, phone, email, trip: currentTrip.title, persons, total }); }
    catch (mailErr) { console.warn("Booking email failed:", mailErr); }
    closeBookingDrawer();
    showSuccessModal(esc(`Thank you, ${name}.`), `Your receipt for the <strong>${esc(currentTrip.title)}</strong> has been received. Our payment desk will reach out on <strong>${esc(phone)}</strong> via WhatsApp shortly to deliver your tickets.`);
    resetReceiptZone();
  } catch(err) {
    console.error(err); showToast(err.message||"Something went wrong. Please try again.","error");
  } finally {
    setButtonLoading(btn,false,originalLabel);
  }
});
function setButtonLoading(btn,loading,label) {
  if (loading) { btn.disabled=true; btn.innerHTML=`<span class="spinner-gold"></span>&nbsp; ${label}`; }
  else { btn.disabled=!receiptFile; btn.classList.toggle("btn-tv-disabled",!receiptFile); btn.innerHTML=`<span class="btn-label">${label}</span>`; }
}

const inqTravelersInput = document.getElementById("inqTravelers");
function clampInqTravelers(val) { let n=parseInt(val,10); if(isNaN(n)||n<1)n=1; if(n>20)n=20; return n; }
document.getElementById("inqTravelersMinus").addEventListener("click", () => { inqTravelersInput.value=clampInqTravelers(inqTravelersInput.value)-1; });
document.getElementById("inqTravelersPlus").addEventListener("click", () => { inqTravelersInput.value=clampInqTravelers(inqTravelersInput.value)+1; });
inqTravelersInput.addEventListener("input", () => { inqTravelersInput.value=clampInqTravelers(inqTravelersInput.value); });

document.getElementById("inquiryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name=document.getElementById("inqName").value.trim();
  const phone=document.getElementById("inqPhone").value.trim();
  const email=document.getElementById("inqEmail").value.trim();
  const trip=document.getElementById("inqTrip").value;
  const tripType=document.getElementById("inqType").value;
  const persons=clampInqTravelers(inqTravelersInput.value);
  const notes=document.getElementById("inqNotes").value.trim();
  if (!name||!phone||!email) { showToast("Please fill in your name, phone, and email.","error"); return; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { showToast("That email address doesn't look quite right.","error"); return; }
  if (!document.getElementById("inqConsent").checked) { showToast("Please accept the data consent to continue.","error"); return; }
  const btn=document.getElementById("inquirySubmitBtn");
  setButtonLoading(btn,true,"Sending…");
  try {
    if (useLiveBackend&&supabaseClient) {
      const { error } = await supabaseClient.from("inquiries").insert({ customer_name:name, customer_phone:phone, customer_email:email, interested_trip:trip, trip_type:tripType, num_persons:persons, notes:notes, status:"pending_contact" });
      if (error) throw error;
    } else {
      const inquiries=JSON.parse(localStorage.getItem("tavari_inquiries")||"[]");
      inquiries.push({ id:"local-"+Date.now(), customer_name:name, customer_phone:phone, customer_email:email, interested_trip:trip, trip_type:tripType, num_persons:persons, notes, status:"pending_contact", created_at:new Date().toISOString() });
      localStorage.setItem("tavari_inquiries",JSON.stringify(inquiries));
    }
    try { await sendInquiryEmails({ name, phone, email, trip, tripType, persons, notes }); }
    catch (mailErr) { console.warn("Inquiry email failed:", mailErr); }
    document.getElementById("inquiryForm").reset();
    inqTravelersInput.value=2;
    showSuccessModal(esc(`Thank you, ${name}.`), `Your custom inquiry has been received. A booking manager will reply by WhatsApp or call within a few hours.`);
  } catch(err) {
    console.error(err); showToast(err.message||"Something went wrong. Please try again.","error");
  } finally {
    setButtonLoading(btn,false,"Send Request");
    if (!btn.querySelector(".btn-label")) btn.innerHTML=`<span class="btn-label">Send Request</span>&nbsp; <i class="bi bi-send-fill ms-1"></i>`;
  }
});

const successScrim = document.getElementById("successScrim");
function showSuccessModal(title,messageHtml) {
  document.getElementById("successTitle").textContent=title;
  document.getElementById("successMessage").innerHTML=messageHtml;
  successScrim.classList.add("show");
  document.body.style.overflow="hidden";
}
document.getElementById("successCloseBtn").addEventListener("click", () => { successScrim.classList.remove("show"); document.body.style.overflow=""; });
successScrim.addEventListener("click", (e) => { if(e.target===successScrim){successScrim.classList.remove("show");document.body.style.overflow="";} });

// Delegated click handler for trip cards / detail modal buttons.
// Using data-attributes instead of inline onclick keeps the CSP strict (no 'unsafe-inline').
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.getAttribute("data-trip");
  const action = btn.getAttribute("data-action");
  if (action === "details") openTripDetails(id);
  else if (action === "book") openBookingDrawer(id);
  else if (action === "book-close") { openBookingDrawer(id); closeTripDetails(); }
});

/* FAQ ACCORDION */
(function setupFaq(){
  const items = Array.from(document.querySelectorAll(".faq-item"));
  if (!items.length) return;
  items.forEach(item => {
    const btn = item.querySelector(".faq-q");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      items.forEach(other => {
        other.classList.remove("open");
        const ob = other.querySelector(".faq-q");
        if (ob) ob.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });
})();

/* SCROLL-PROGRESS ROAD TRIP CAR (independent, failsafe) */
(function () {
  try {
    const car = document.getElementById("tvRoadCar");
    const img = car ? car.querySelector(".tv-road-car-img") : null;
    const fill = document.getElementById("tvRoadFill");
    const road = document.getElementById("tvRoad");
    if (!car || !img || !fill || !road) return;

    let ticking = false;
    let hasArrived = false;
    let lastY = window.scrollY || 0;
    let roadW = 0, carW = 48;
    let scrollEndTimer = null;

    /* measure once; recompute only on resize to avoid per-frame reflow */
    function measure() {
      roadW = road.clientWidth;
      carW = car.offsetWidth || 48;
    }

    function writeVar(name, value, cache) {
      if (cache.ref !== value) {
        cache.ref = value;
        img.style.setProperty(name, value);
      }
    }
    const tiltCache = { ref: null }, bobCache = { ref: null };

    function update() {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

      const x = progress * Math.max(0, roadW - carW);
      car.style.transform = "translateX(" + x + "px)";
      fill.style.width = (progress * 100) + "%";

      /* direction-aware lean from scroll delta */
      const delta = window.scrollY - lastY;
      lastY = window.scrollY;
      const lean = Math.max(-7, Math.min(7, delta * 0.6));
      const targetTilt = progress > 0.995 || progress < 0.005 ? 0 : lean;
      writeVar("--tilt", targetTilt.toFixed(2) + "deg", tiltCache);
      writeVar("--bob", (2 + Math.min(6, Math.abs(delta) * 0.4)).toFixed(2) + "px", bobCache);

      if (progress > 0.995 && !hasArrived) {
        hasArrived = true;
        car.classList.add("arrived");
      } else if (progress <= 0.995 && hasArrived) {
        hasArrived = false;
        car.classList.remove("arrived");
      }
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
      car.classList.add("scrolling");
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(function () { car.classList.remove("scrolling"); }, 200);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { measure(); onScroll(); });
    /* fade the road in shortly after load */
    requestAnimationFrame(function () { road.classList.add("in"); });
    measure();
    update();
  } catch (err) {
    /* never let the car logic break the rest of the page */
    if (window.console) console.warn("Scroll car disabled:", err);
  }
})();

/* ─── Copy payment numbers to clipboard ───────────── */
(function () {
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through to legacy path */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  document.querySelectorAll(".tv-copy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy") || "";
      const ok = await copyText(text);
      const icon = btn.querySelector("i");
      if (ok) {
        const prevClass = icon.className;
        btn.classList.add("copied");
        icon.className = "bi bi-check-lg";
        showToast("Number copied to clipboard", "success", 2000);
        setTimeout(() => { btn.classList.remove("copied"); icon.className = prevClass; }, 1800);
      } else {
        showToast("Could not copy number", "error");
      }
    });
  });
})();

# Tavari — Implementation Prompts

Two self-contained prompts. Run on **staging first**, verify, then apply to production.

---

## PROMPT 1 — Cloudinary photo migration (Supabase Storage -> Cloudinary)

### Context
Supabase cached egress is nearly exhausted. Move marketing photos served from
`trips.image_urls`, `trips.accommodation_photos`, and `gallery.media_url` to
Cloudinary. The booking-form deposit receipts (`payment-receipts` bucket) STAY on
Supabase — do not touch the bucket, its policies, or the upload code in app.js.

### Steps
1. Backup (off-Supabase only): export current values of `trips.image_urls`,
   `trips.accommodation_photos`, `gallery.media_url` to a local CSV/JSON for rollback.
2. Help the user upload every photo in `trip-media` + `gallery-media` buckets to a
   Cloudinary account (user does this in the Cloudinary dashboard; support as needed).
   Use secure HTTPS delivery; note Cloudinary auto-optimization (f_auto/q_auto) is
   appended by tvThumb, not baked into stored URLs.
3. Produce an old-URL -> new-URL mapping and generate the exact SQL UPDATE statements
   (no schema or RLS changes) and run them in the Supabase SQL Editor:
   - `trips.image_urls` (text[] literals per trip)
   - `trips.accommodation_photos` (text[] literals per trip)
   - `gallery.media_url` (per row)
4. Apply the `tvThumb()` tweak in app.js:655 so Cloudinary URLs get
   `f_auto,q_auto,w_600` for trip-card/gallery tiles and stay full-size for the
   trip-detail hero slider (guard against double-appending `w_`).
5. Verify in Incognito (bypass service-worker cache): trip cards + slider thumbs,
   trip-detail modal hero + accommodation sliders, gallery strip + lightbox.
6. Only after verification: empty `trip-media` + `gallery-media` buckets and drop
   those buckets in Supabase (user action in dashboard). Remove their creation +
   policy blocks from db_setup.sql. Confirm `payment-receipts` blocks remain.
7. Confirm Supabase Storage request/egress metrics drop to ~0.

### Do not
- Touch bookings/receipt code, RLS on tables, or the `payment-receipts` bucket.

---

## PROMPT 2 — Admin portal (admin.html + admin.js, same Vercel site)

### Context
Static site on Vercel + Supabase. Build a password-protected admin portal to manage
trips, view/create bookings (with client invoice PDF), and view inquiries. Uses the
client-side Supabase JS (anon key) elevated by Supabase Auth sign-in; RLS gates writes.

### Auth
- Supabase Auth email/password, single admin user (user creates it in Dashboard).
- Public email signups are DISABLED so `authenticated` = admin only.
- admin.html: login screen, session persistence (onAuthStateChange), sign out.
- Add to db_setup.sql + run in SQL editor (idempotent, drop+create):
  - trips, gallery, reviews: `for all to authenticated`
  - bookings: `for all to authenticated` (enables admin read + admin-created bookings)
  - inquiries: `for all to authenticated`
  - Leave all anon read/insert policies untouched.

### UI (tabs)
1. **Trips**: searchable list w/ thumbnails + best-seller badge; create/edit form for
   every field rendered by the site (title, slug id, base_price, dates + dates_label,
   duration, description, accommodation + accommodation_photos, solo_message,
   included/excluded, payment_methods, price_options, refund_policy, guidelines,
   pdf_url, itinerary builder day/title/points/details, image_urls list editor with
   preview/reorder/remove). Paste Cloudinary links only — no upload widget. Delete
   with confirm.
2. **Bookings**: view all (newest first, show status) + **Create Booking**:
   trip dropdown from live trips, customer name/phone/email, persons,
   auto-calculated total + 50% deposit (mirror app.js `bookingAmounts()`/`DEPOSIT_RATE`),
   optional receipt URL, status default `pending_verification`. After insert, open an
   **Invoice modal**: branded Tavari Egypt invoice (invoice number from booking id,
   date, client details, trip, persons, total, deposit paid, balance, status) rendered
   as preview + a single **Download PDF** button using pdfmake from cdn.jsdelivr.net
   (allowed by .htaccess CSP). No print button.
3. **Inquiries**: view all submissions, newest first.
4. i need a toggle in each trip to make it visible or not visible on the website whenever i need

### Files
- New: `admin.html`, `admin.js`
- Edit: `db_setup.sql` (RLS only), `app.js` (NOT in this prompt's scope unless PROMPT 1
  already did the tvThumb work)

### Verify
- Login/logout, CRUD a trip end-to-end, create a booking and download its invoice,
  confirm public site reflects changes on reload and remains unaffected.
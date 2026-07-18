// Tavari Egypt — EmailJS notification helper
// Sends a confirmation to the customer AND a notification to the owner
// on every booking and every inquiry. Email failures are non-blocking.

const EMAILJS_PUBLIC_KEY = "ixW7kdElaUqa3nKeg";
const EMAILJS_SERVICE_ID  = "service_xinz7va";
const EMAILJS_TEMPLATE_ID_USER  = "template_3fpf6hw"; // customer confirmation
const EMAILJS_TEMPLATE_ID_OWNER = "template_duyddyt"; // owner notification

if (typeof emailjs !== "undefined") {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

function tvStamp() {
  return new Date().toLocaleString("en-GB", { timeZone: "Africa/Cairo" });
}

async function sendBookingEmails(d) {
  const base = {
    name: d.name,
    email: d.email,
    phone: d.phone,
    trip: d.trip,
    trip_type: "",
    persons: d.persons,
    total: d.total ? "EGP " + d.total : "",
    notes: "",
    request_type: "Booking",
    submitted_at: tvStamp()
  };
  await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_USER, base);
  await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_OWNER, base);
}

async function sendInquiryEmails(d) {
  const base = {
    name: d.name,
    email: d.email,
    phone: d.phone,
    trip: d.trip,
    trip_type: d.tripType || "",
    persons: d.persons,
    total: "",
    notes: d.notes || "",
    request_type: "Inquiry",
    submitted_at: tvStamp()
  };
  await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_USER, base);
  await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_OWNER, base);
}

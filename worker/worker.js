/* DotCom by Arshees — clinic helper (Cloudflare Worker), PRO package.
 *
 * One helper per clinic (one or more doctors). Keeps every key secret and powers doctor.html:
 *   POST /login            {pin}                       -> {token, role, name, doctors}
 *   GET  /bookings         ?doctor=<id>                -> {pending, upcoming, past}
 *   POST /confirm          {uid, doctor}               -> {ok, wa}
 *   POST /decline          {uid, doctor, reason}       -> {ok, wa}
 *   POST /followup         {uid, doctor, weeks}        -> {ok, wa}
 *   POST /noshow           {uid, doctor}
 *   POST /host-token       {doctor}                    -> {token, roomUrl}
 *   GET  /leave            ?doctor=<id>                -> {items}
 *   POST /leave            {doctor, start, end}
 *   POST /leave-delete     {doctor, id}
 *   GET  /report           ?month=YYYY-MM&doctor=all|<id>
 *   GET  /vapid, POST /subscribe {subscription}
 *   POST /cal-webhook?d=<doctorId>   (Cal.com, signed)
 *   GET  /last-event, GET /health
 *   cron (every 15 min): WhatsApp reminders 24 h + 1 h before, review request after the consultation
 *
 * Roles: each doctor (sees only their own bookings) and "desk" (front desk / owner: all doctors + reports).
 *
 * Variables (wrangler.toml): DOCTORS_JSON, CLINIC_NAME, CLINIC_WHATSAPP, DESK_WHATSAPP, REVIEW_URL, SITE_URL,
 *   ALLOWED_ORIGINS, VAPID_SUBJECT, WA_PHONE_ID, WA_LANG, WA_ENABLED
 * Secrets: CAL_KEYS {id:key}, DAILY_KEYS {id:key}, PINS {id:hash, desk:hash}, SESSION_SECRET,
 *   CAL_WEBHOOK_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_JWK, WA_TOKEN
 * KV binding: PUSH
 *
 * No patient data is stored. Bookings are read live from Cal.com; WhatsApp messages are passed straight to Meta.
 * KV keeps only: phone push subscriptions (doctors/desk), last event type, PIN-failure counters,
 * and booking ids already reminded (auto-expire).
 */

const CAL = "https://api.cal.com/v2";
const CAL_VERSION = "2024-08-13";
const TZ = "Asia/Kolkata";
const enc = new TextEncoder();

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    let r;
    try { r = await route(req, env, url, !!cors); }
    catch (e) { r = json({ error: e.publicMessage || "Something went wrong. Please try again." }, e.status || 500); }
    if (cors) for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
    return r;
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(runReminders(env)); }
};

/* ---------------- config ---------------- */
function doctors(env) { try { return JSON.parse(env.DOCTORS_JSON || "[]"); } catch (e) { return []; } }
function doctorById(env, id) { const d = doctors(env).find(x => x.id === id); if (!d) throw err(400, "Unknown doctor."); return d; }
function secretMap(env, name) { try { return JSON.parse(env[name] || "{}"); } catch (e) { return {}; } }
const calKey = (env, id) => secretMap(env, "CAL_KEYS")[id] || "";
const dailyKey = (env, id) => secretMap(env, "DAILY_KEYS")[id] || "";

/* ---------------- routes ---------------- */
async function route(req, env, url, fromSite) {
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const M = req.method;
  if (p === "/health") return json({ ok: true });
  if (p === "/cal-webhook" && M === "POST") return calWebhook(req, env, url.searchParams.get("d") || "");
  if (p === "/vapid" && M === "GET") return json({ key: env.VAPID_PUBLIC_KEY || "" });
  if (p === "/last-event" && M === "GET") return json((await env.PUSH.get("lastEvent", "json")) || {});

  if (!fromSite) throw err(403, "Not allowed.");
  if (p === "/arrived" && M === "POST") return arrived(req, env);
  if (p === "/login" && M === "POST") return login(req, env);

  const role = await requireSession(req, env);
  const q = url.searchParams;
  const canDo = id => { if (role !== "desk" && role !== id) throw err(403, "Not allowed."); return doctorById(env, id); };

  if (p === "/bookings" && M === "GET") {
    const ids = role === "desk" ? (q.get("doctor") && q.get("doctor") !== "all" ? [q.get("doctor")] : doctors(env).map(d => d.id)) : [role];
    return json(await bookingsFor(env, ids.map(id => canDo(id))));
  }
  if (p === "/confirm" && M === "POST") {
    const b = await body(req); const d = canDo(b.doctor);
    await cal(env, d.id, `/bookings/${uidOk(b.uid)}/confirm`, { method: "POST" });
    const bk = await getBooking(env, d, b.uid);
    return json({ ok: true, wa: await waPatient(env, bk, "booking_confirmed", [bk.name, d.name, env.CLINIC_NAME, when(bk.start), joinLink(env, d)]) });
  }
  if (p === "/decline" && M === "POST") {
    const b = await body(req); const d = canDo(b.doctor);
    const bk = await getBooking(env, d, b.uid);
    await cal(env, d.id, `/bookings/${uidOk(b.uid)}/decline`, { method: "POST", body: JSON.stringify({ reason: String(b.reason || "The doctor is not available at this time.").slice(0, 300) }) });
    return json({ ok: true, wa: await waPatient(env, bk, "booking_declined", [bk.name, d.name, env.CLINIC_NAME, when(bk.start), "+" + digits(env.CLINIC_WHATSAPP)]) });
  }
  if (p === "/followup" && M === "POST") {
    const b = await body(req); const d = canDo(b.doctor);
    const weeks = Math.min(52, Math.max(1, parseInt(b.weeks, 10) || 2));
    const bk = await getBooking(env, d, b.uid);
    const due = new Date(Date.now() + weeks * 7 * 864e5).toLocaleDateString("en-IN", { timeZone: TZ, day: "numeric", month: "short" });
    return json({ ok: true, wa: await waPatient(env, bk, "followup_reminder", [bk.name, d.name, due, bookLink(env, d)]) });
  }
  if (p === "/noshow" && M === "POST") {
    const b = await body(req); const d = canDo(b.doctor);
    const bk = await getBooking(env, d, b.uid);
    await cal(env, d.id, `/bookings/${uidOk(b.uid)}/mark-absent`, { method: "POST", body: JSON.stringify({ host: false, attendees: bk.email ? [{ email: bk.email, absent: true }] : [] }) });
    return json({ ok: true });
  }
  if (p === "/host-token" && M === "POST") {
    const b = await body(req).catch(() => ({})); const d = canDo(b.doctor || role);
    return hostToken(env, d);
  }
  if (p === "/leave" && M === "GET") {
    const d = canDo(q.get("doctor") || role);
    const r = await cal(env, d.id, "/me/ooo?take=50", {}, "2024-06-11");
    const now = Date.now();
    return json({ items: (r.data || []).filter(x => new Date(x.end).getTime() > now).map(x => ({ id: x.id, start: x.start, end: x.end })) });
  }
  if (p === "/leave" && M === "POST") {
    const b = await body(req); const d = canDo(b.doctor || role);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.start || "") || !/^\d{4}-\d{2}-\d{2}$/.test(b.end || "") || b.end < b.start) throw err(400, "Choose a start and end date.");
    await cal(env, d.id, "/me/ooo", { method: "POST", body: JSON.stringify({ start: istDayStart(b.start), end: istDayEnd(b.end), reason: "vacation", notes: "Leave (from DotCom dashboard)" }) }, "2024-06-11");
    return json({ ok: true });
  }
  if (p === "/leave-delete" && M === "POST") {
    const b = await body(req); const d = canDo(b.doctor || role);
    await cal(env, d.id, `/me/ooo/${parseInt(b.id, 10)}`, { method: "DELETE" }, "2024-06-11");
    return json({ ok: true });
  }
  if (p === "/report" && M === "GET") {
    const month = /^\d{4}-\d{2}$/.test(q.get("month") || "") ? q.get("month") : new Date().toISOString().slice(0, 7);
    const ids = role === "desk" ? (q.get("doctor") && q.get("doctor") !== "all" ? [q.get("doctor")] : doctors(env).map(d => d.id)) : [role];
    return json(await report(env, ids.map(id => canDo(id)), month));
  }
  if (p === "/subscribe" && M === "POST") {
    const { subscription } = await body(req);
    if (!subscription || !/^https:\/\//.test(subscription.endpoint || "")) throw err(400, "Invalid subscription.");
    const key = "subs:" + role;
    const subs = ((await env.PUSH.get(key, "json")) || []).filter(s => s.endpoint !== subscription.endpoint);
    subs.push({ endpoint: subscription.endpoint, at: Date.now() });
    await env.PUSH.put(key, JSON.stringify(subs.slice(-10)));
    return json({ ok: true });
  }
  throw err(404, "Not found.");
}

/* ---------------- auth ---------------- */
async function login(req, env) {
  const ip = req.headers.get("cf-connecting-ip") || "x";
  const fk = "fail:" + ip;
  const fails = +((await env.PUSH.get(fk)) || 0);
  if (fails >= 8) throw err(429, "Too many wrong attempts. Try again in 15 minutes.");
  const { pin } = await body(req);
  let role = "";
  if (/^\d{4,8}$/.test(String(pin || ""))) {
    const h = await sha256hex("dotcom-pin:" + pin);
    for (const [r, hash] of Object.entries(secretMap(env, "PINS"))) if (safeEq(h, String(hash).toLowerCase())) role = r;
  }
  if (!role || (role !== "desk" && !doctors(env).some(d => d.id === role))) {
    await env.PUSH.put(fk, String(fails + 1), { expirationTtl: 900 });
    throw err(401, "Wrong PIN.");
  }
  const exp = Date.now() + 30 * 864e5;
  const payload = b64url(enc.encode(JSON.stringify({ exp, role })));
  const docs = doctors(env).map(d => ({ id: d.id, name: d.name }));
  return json({ token: payload + "." + await hmacB64(env.SESSION_SECRET, payload), exp, role,
    name: role === "desk" ? "Front desk" : (docs.find(d => d.id === role) || {}).name, doctors: role === "desk" ? docs : docs.filter(d => d.id === role) });
}
async function requireSession(req, env) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [payload, sig] = t.split(".");
  if (!payload || !sig || !safeEq(sig, await hmacB64(env.SESSION_SECRET, payload))) throw err(401, "Please log in again.");
  let o = {}; try { o = JSON.parse(new TextDecoder().decode(unb64url(payload))); } catch (e) {}
  if (!(o.exp > Date.now()) || !o.role) throw err(401, "Please log in again.");
  return o.role;
}

/* ---------------- Cal.com ---------------- */
async function cal(env, docId, path, init = {}, version = CAL_VERSION) {
  const key = calKey(env, docId);
  if (!key) throw err(502, "This doctor's booking calendar is not connected. Please contact DotCom support (support@arshees.com).");
  const r = await fetch(CAL + path, { ...init, headers: { "Authorization": `Bearer ${key}`, "cal-api-version": version, "Content-Type": "application/json" } });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403) throw err(502, "This doctor's booking calendar is not connected. Please contact DotCom support (support@arshees.com).");
  if (!r.ok) throw err(502, (data && data.error && data.error.message) || "Cal.com did not accept the request. Please try again.");
  return data;
}
async function bookingsFor(env, docs) {
  const out = { pending: [], upcoming: [], past: [] };
  await Promise.all(docs.map(async d => {
    const [pend, up, past] = await Promise.all([
      cal(env, d.id, "/bookings?status=unconfirmed&sortStart=asc&take=50"),
      cal(env, d.id, "/bookings?status=upcoming&sortStart=asc&take=50"),
      cal(env, d.id, "/bookings?status=past&sortStart=desc&take=30")
    ]);
    const L = x => (Array.isArray(x.data) ? x.data : []).map(b => slim(b, d));
    const p = L(pend); const pu = new Set(p.map(b => b.uid));
    out.pending.push(...p);
    out.upcoming.push(...L(up).filter(b => !pu.has(b.uid) && b.status !== "pending"));
    const weekAgo = Date.now() - 7 * 864e5;
    out.past.push(...L(past).filter(b => b.status === "accepted" && new Date(b.start).getTime() > weekAgo));
  }));
  const asc = (a, b) => new Date(a.start) - new Date(b.start);
  out.pending.sort(asc); out.upcoming.sort(asc); out.past.sort((a, b) => -asc(a, b));
  return out;
}
async function getBooking(env, d, uid) {
  const r = await cal(env, d.id, `/bookings/${uidOk(uid)}`);
  const b = Array.isArray(r.data) ? r.data[0] : r.data;
  if (!b) throw err(404, "Booking not found.");
  return slim(b, d);
}
function val(v) { return v && typeof v === "object" ? (v.value ?? "") : (v ?? ""); }
function slim(b, d) {
  const a = (b.attendees && b.attendees[0]) || {};
  const f = b.bookingFieldsResponses || b.responses || {};
  const phone = val(f.whatsapp) || val(f.WhatsApp) || val(f.phone) || val(f.attendeePhoneNumber) || a.phoneNumber || "";
  const notes = val(f.notes) || b.description || "";
  const slug = (b.eventType && b.eventType.slug) || b.type || "";
  const t = (d.types || {})[slug] || {};
  return {
    uid: b.uid, doctor: d.id, doctorName: d.name,
    status: String(b.status || "").toLowerCase(),
    slug, title: t.name || (b.eventType && b.eventType.title) || slug || b.title || "Consultation",
    start: b.start || b.startTime, end: b.end || b.endTime,
    name: a.name || val(f.name) || "Patient", email: a.email || val(f.email) || "",
    phone: String(phone), notes: String(notes).slice(0, 500), absent: !!a.absent
  };
}

/* ---------------- Daily ---------------- */
async function hostToken(env, d) {
  const room = String(d.roomUrl || "").split("/").filter(Boolean).pop();
  if (!room) throw err(500, "Video room is not set up yet.");
  const r = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST",
    headers: { "Authorization": `Bearer ${dailyKey(env, d.id)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { room_name: room, is_owner: true, user_name: d.name, exp: Math.floor(Date.now() / 1000) + 6 * 3600 } })
  });
  const x = await r.json().catch(() => ({}));
  if (!r.ok || !x.token) throw err(502, "Could not open the video room. Please try again.");
  return json({ token: x.token, roomUrl: d.roomUrl });
}

/* ---------------- WhatsApp (Meta Cloud API) ---------------- */
// Fallback texts mirror the approved templates (worker/whatsapp-templates.md) for "tap to send".
const TEXT = {
  booking_received: p => `Hello ${p[0]}, we have received your booking request with ${p[1]} at ${p[2]} for ${p[3]}. You will get a confirmation once the clinic verifies your payment. For questions, WhatsApp the clinic at ${p[4]}. Thank you.`,
  booking_confirmed: p => `Hello ${p[0]}, your consultation with ${p[1]} at ${p[2]} is confirmed for ${p[3]} (IST). Join on time here: ${p[4]} Thank you.`,
  booking_declined: p => `Hello ${p[0]}, sorry, ${p[1]} at ${p[2]} cannot take your booking for ${p[3]}. Please book another time or WhatsApp the clinic at ${p[4]}. If you paid, the clinic will refund you.`,
  reminder_24h: p => `Reminder: Hello ${p[0]}, your consultation with ${p[1]} is tomorrow, ${p[2]} (IST). Join here: ${p[3]} Thank you.`,
  reminder_1h: p => `Reminder: Hello ${p[0]}, your consultation with ${p[1]} starts at ${p[2]} (IST), in about an hour. Join here: ${p[3]} Thank you.`,
  review_request: p => `Hello ${p[0]}, thank you for consulting ${p[1]}. If you were happy with your care, please leave a short Google review: ${p[2]} Thank you.`,
  followup_reminder: p => `Hello ${p[0]}, ${p[1]} would like to see you for a review around ${p[2]}. Book your review here: ${p[3]} Thank you.`,
  doctor_new_booking: p => `New booking for ${p[0]}: ${p[1]}, ${p[2]}, ${p[3]} (IST). Open your dashboard to confirm.`
};
function digits(s) { let d = String(s || "").replace(/\D/g, ""); if (d.length === 10) d = "91" + d; if (d.startsWith("0")) d = d.replace(/^0+/, ""); return d; }
async function waSend(env, to, template, params) {
  const num = digits(to);
  const text = TEXT[template](params);
  if (!num) return { sent: false, to: "", text, error: "No WhatsApp number." };
  if (env.WA_ENABLED !== "1" || !env.WA_TOKEN || !env.WA_PHONE_ID) return { sent: false, to: num, text, error: "WhatsApp is not connected." };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${env.WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: num, type: "template",
        template: { name: template, language: { code: env.WA_LANG || "en" }, components: [{ type: "body", parameters: params.map(t => ({ type: "text", text: String(t).slice(0, 900) })) }] } })
    });
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return { sent: false, to: num, text, error: (x.error && x.error.message) || "WhatsApp did not accept the message." };
    return { sent: true, to: num };
  } catch (e) { return { sent: false, to: num, text, error: "WhatsApp could not be reached." }; }
}
const waPatient = (env, bk, template, params) => waSend(env, bk.phone, template, params);
const when = iso => new Date(iso).toLocaleString("en-IN", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const timeOnly = iso => new Date(iso).toLocaleTimeString("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const site = env => String(env.SITE_URL || "").replace(/\/$/, "");
const joinLink = (env, d) => `${site(env)}/consult.html?d=${encodeURIComponent(d.id)}`;
const bookLink = (env, d) => `${site(env)}/?doctor=${encodeURIComponent(d.id)}#book`;

/* ---------------- Cal.com webhook -> app + WhatsApp alerts ---------------- */
async function calWebhook(req, env, docId) {
  const raw = await req.text();
  const sig = (req.headers.get("x-cal-signature-256") || "").toLowerCase();
  if (!env.CAL_WEBHOOK_SECRET || !safeEq(sig, await hmacHex(env.CAL_WEBHOOK_SECRET, raw))) return json({ error: "bad signature" }, 401);
  let ev = {}; try { ev = JSON.parse(raw); } catch (e) {}
  const type = String(ev.triggerEvent || "");
  if (type === "PING") return json({ ok: true });
  const known = { BOOKING_REQUESTED: "request", BOOKING_CREATED: "created", BOOKING_CANCELLED: "cancelled", BOOKING_RESCHEDULED: "rescheduled" };
  if (!known[type]) return json({ ok: true, ignored: type });
  const d = doctors(env).find(x => x.id === docId);
  if (!d) return json({ error: "unknown doctor" }, 400);
  await env.PUSH.put("lastEvent", JSON.stringify({ type: known[type], doctor: d.id, at: Date.now() }));
  const pushed = (await pushAll(env, "subs:" + d.id)) + (await pushAll(env, "subs:desk"));
  const wa = [];
  if (type === "BOOKING_REQUESTED" || type === "BOOKING_CREATED") {
    const bk = slim({ ...(ev.payload || {}), start: ev.payload && ev.payload.startTime, end: ev.payload && ev.payload.endTime }, d);
    const doctorMsg = [d.name, bk.name, bk.title, when(bk.start)];
    if (d.whatsapp) wa.push(await waSend(env, d.whatsapp, "doctor_new_booking", doctorMsg));
    if (env.DESK_WHATSAPP && digits(env.DESK_WHATSAPP) !== digits(d.whatsapp)) wa.push(await waSend(env, env.DESK_WHATSAPP, "doctor_new_booking", doctorMsg));
    if (type === "BOOKING_REQUESTED") wa.push(await waSend(env, bk.phone, "booking_received", [bk.name, d.name, env.CLINIC_NAME, when(bk.start), "+" + digits(env.CLINIC_WHATSAPP)]));
  }
  return json({ ok: true, pushed, whatsapp: wa.map(w => w.sent) });
}

/* ---------------- reminders + review requests (cron) ---------------- */
async function runReminders(env) {
  const now = Date.now();
  for (const d of doctors(env)) {
    if (!calKey(env, d.id)) continue;
    try {
      const up = await cal(env, d.id, "/bookings?status=upcoming&sortStart=asc&take=100");
      for (const raw of up.data || []) {
        const b = slim(raw, d);
        if (b.status !== "accepted") continue;
        const diff = new Date(b.start).getTime() - now;
        if (diff <= 24 * 3600e3 && diff > 2 * 3600e3 && !(await env.PUSH.get("r24:" + b.uid))) {
          await waSend(env, b.phone, "reminder_24h", [b.name, d.name, when(b.start), joinLink(env, d)]);
          await env.PUSH.put("r24:" + b.uid, "1", { expirationTtl: 2 * 86400 });
        }
        if (diff <= 62 * 60e3 && diff > 20 * 60e3 && !(await env.PUSH.get("d60:" + b.uid))) {
          await env.PUSH.put("d60:" + b.uid, "1", { expirationTtl: 2 * 86400 });
          await doctorAlert(env, d, "r60", { time: timeOnly(b.start), title: b.title });
        }
        if (diff <= 17 * 60e3 && diff > -5 * 60e3 && !(await env.PUSH.get("d15:" + b.uid))) {
          await env.PUSH.put("d15:" + b.uid, "1", { expirationTtl: 2 * 86400 });
          await doctorAlert(env, d, "r15", { time: timeOnly(b.start), title: b.title });
        }
        if (diff <= 70 * 60e3 && diff > 0 && !(await env.PUSH.get("r1:" + b.uid))) {
          await waSend(env, b.phone, "reminder_1h", [b.name, d.name, timeOnly(b.start), joinLink(env, d)]);
          await env.PUSH.put("r1:" + b.uid, "1", { expirationTtl: 2 * 86400 });
        }
      }
      if (env.REVIEW_URL) {
        const past = await cal(env, d.id, "/bookings?status=past&sortStart=desc&take=30");
        for (const raw of past.data || []) {
          const b = slim(raw, d);
          const ended = now - new Date(b.end).getTime();
          if (b.status !== "accepted" || b.absent || ended < 30 * 60e3 || ended > 6 * 3600e3) continue;
          if (await env.PUSH.get("rv:" + b.uid)) continue;
          await waSend(env, b.phone, "review_request", [b.name, d.name, env.REVIEW_URL]);
          await env.PUSH.put("rv:" + b.uid, "1", { expirationTtl: 7 * 86400 });
        }
      }
    } catch (e) { /* one doctor failing must not stop the others */ }
  }
}

/* ---------------- monthly report ---------------- */
async function report(env, docs, month) {
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1) - 5.5 * 3600e3).toISOString();
  const to = new Date(Date.UTC(y, m, 1) - 5.5 * 3600e3).toISOString();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const blank = () => ({ done: 0, cancelled: 0, declined: 0, noShow: 0, upcoming: 0, income: 0, newP: 0, reviewP: 0, byType: {}, byDay: Object.fromEntries(days.map(x => [x, 0])), byHour: {} });
  const total = blank(); const per = [];
  const now = Date.now();
  for (const d of docs) {
    const r = blank(); let skip = 0;
    for (let page = 0; page < 10; page++) {
      const x = await cal(env, d.id, `/bookings?afterStart=${encodeURIComponent(from)}&beforeEnd=${encodeURIComponent(to)}&take=100&skip=${skip}&sortStart=asc`);
      const list = Array.isArray(x.data) ? x.data : [];
      for (const raw of list) {
        const b = slim(raw, d); const t = (d.types || {})[b.slug] || {};
        const add = (o) => {
          if (b.status === "cancelled") o.cancelled++;
          else if (b.status === "rejected") o.declined++;
          else if (b.status === "accepted" && new Date(b.end).getTime() < now) {
            if (b.absent) { o.noShow++; return; }
            o.done++; o.income += +t.fee || 0;
            if (t.kind === "review") o.reviewP++; else o.newP++;
            o.byType[b.title] = (o.byType[b.title] || 0) + 1;
            const s = new Date(new Date(b.start).getTime() + 5.5 * 3600e3);
            o.byDay[days[s.getUTCDay()]]++;
            const h = s.getUTCHours(); o.byHour[h] = (o.byHour[h] || 0) + 1;
          } else if (b.status === "accepted" || b.status === "pending") o.upcoming++;
        };
        add(r); add(total);
      }
      if (list.length < 100) break; skip += 100;
    }
    per.push({ id: d.id, name: d.name, ...r });
  }
  return { month, clinic: env.CLINIC_NAME || "", generatedAt: new Date().toISOString(), total, doctors: per };
}

/* ---------------- doctor alerts: reminders and "patient waiting" ---------------- */
// The phone fetches /last-event to show the text, so no patient details are put there.
async function doctorAlert(env, d, type, extra) {
  await env.PUSH.put("lastEvent", JSON.stringify({ type, doctor: d.id, doctorName: d.name, ...(extra || {}), at: Date.now() }));
  return (await pushAll(env, "subs:" + d.id)) + (await pushAll(env, "subs:desk"));
}
async function arrived(req, env) {
  const { doctor } = await body(req);
  const d = doctors(env).find(x => x.id === doctor);
  if (!d) throw err(400, "Unknown doctor.");
  const k = "arr:" + d.id;
  if (await env.PUSH.get(k)) return json({ ok: true, skipped: true });   // at most one alert a minute per room
  await env.PUSH.put(k, "1", { expirationTtl: 60 });
  return json({ ok: true, pushed: await doctorAlert(env, d, "arrived", {}) });
}

/* ---------------- web push (doctor/desk phones only) ---------------- */
async function pushAll(env, key) {
  const subs = (await env.PUSH.get(key, "json")) || [];
  if (!subs.length || !env.VAPID_PRIVATE_JWK) return 0;
  const keep = []; let sent = 0;
  for (const s of subs) {
    try {
      const r = await sendPush(env, s.endpoint);
      if (r.status === 404 || r.status === 410) continue;
      if (r.ok) sent++;
      keep.push(s);
    } catch (e) { keep.push(s); }
  }
  await env.PUSH.put(key, JSON.stringify(keep));
  return sent;
}
async function sendPush(env, endpoint) {
  const jwt = await vapidJWT(env, new URL(endpoint).origin);
  return fetch(endpoint, { method: "POST", headers: { "TTL": "86400", "Urgency": "high", "Content-Length": "0", "Authorization": `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}` } });
}
async function vapidJWT(env, aud) {
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const key = await crypto.subtle.importKey("jwk", { ...jwk, ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const h = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || "mailto:support@arshees.com" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(h + "." + p));
  return h + "." + p + "." + b64url(new Uint8Array(sig));
}

/* ---------------- helpers ---------------- */
function istDayStart(d) { return new Date(new Date(d + "T00:00:00Z").getTime() - 5.5 * 3600e3).toISOString(); }
function istDayEnd(d) { return new Date(new Date(d + "T23:59:59.999Z").getTime() - 5.5 * 3600e3).toISOString(); }
function corsHeaders(req, env) {
  const o = req.headers.get("origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!o || !allowed.includes(o)) return null;
  return { "Access-Control-Allow-Origin": o, "Vary": "Origin", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization", "Access-Control-Max-Age": "86400" };
}
function json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
function err(status, msg) { const e = new Error(msg); e.status = status; e.publicMessage = msg; return e; }
async function body(req) { try { return await req.json(); } catch (e) { throw err(400, "Bad request."); } }
function uidOk(u) { if (!/^[A-Za-z0-9_-]{3,100}$/.test(String(u || ""))) throw err(400, "Bad booking id."); return encodeURIComponent(u); }
function safeEq(a, b) { a = String(a); b = String(b); if (a.length !== b.length || !a.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
function b64url(u8) { let s = ""; for (const c of u8) s += String.fromCharCode(c); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function unb64url(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
async function sha256hex(s) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))); }
function hex(u8) { return [...u8].map(b => b.toString(16).padStart(2, "0")).join(""); }
async function hmacKey(secret) { return crypto.subtle.importKey("raw", enc.encode(String(secret || "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); }
async function hmacB64(secret, msg) { return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(msg)))); }
async function hmacHex(secret, msg) { return hex(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(msg)))); }

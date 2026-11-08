// Donation progress API (Cloudflare Pages Function).
//
//   GET  /api/campaign         public: current { raised, goal }
//   POST /api/admin/login      { password } -> sets a session cookie
//   POST /api/admin/logout     clears the session cookie
//   GET  /api/admin/campaign   signed in: current values (also a session check)
//   PUT  /api/admin/campaign   signed in: { raised, goal } -> saves them
//
// Configuration (Cloudflare dashboard -> Pages project -> Settings):
//   ADMIN_PASSWORD  encrypted secret, the admin password. Never commit it.
//   CAMPAIGN_KV     KV namespace binding where the numbers are stored.

const KV_KEY = "campaign";
const COOKIE = "toss_admin";
const SESSION_SECONDS = 4 * 60 * 60; // sign-in lasts 4 hours
const MAX_FAILS = 5; // failed passwords allowed per IP...
const LOCKOUT_SECONDS = 15 * 60; // ...per 15 minutes
const MAX_AMOUNT = 10_000_000;

export async function onRequest({ request, env, params }) {
  const route = (params.path || []).join("/");
  const method = request.method;

  try {
    if (route === "campaign" && method === "GET") return getPublicCampaign(env);

    if (route.startsWith("admin/")) {
      if (!env.ADMIN_PASSWORD || !env.CAMPAIGN_KV) {
        return json({ error: "Admin is not configured on the server." }, 503);
      }
      if (method !== "GET" && !sameOrigin(request)) {
        return json({ error: "Bad origin." }, 403);
      }

      if (route === "admin/login" && method === "POST") return login(request, env);
      if (route === "admin/logout" && method === "POST") return logout();

      if (route === "admin/campaign") {
        if (!(await isSignedIn(request, env))) return json({ error: "Not signed in." }, 401);
        if (method === "GET") return json((await readCampaign(env)) || {});
        if (method === "PUT") return saveCampaign(request, env);
      }
    }

    return json({ error: "Not found." }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: "Something went wrong." }, 500);
  }
}

// ---- Public ----------------------------------------------------------------

async function getPublicCampaign(env) {
  const campaign = env.CAMPAIGN_KV ? await readCampaign(env) : null;
  if (!campaign) return json({ error: "Not set." }, 404);
  return json({ raised: campaign.raised, goal: campaign.goal });
}

async function readCampaign(env) {
  return env.CAMPAIGN_KV.get(KV_KEY, "json");
}

// ---- Sign in / out ---------------------------------------------------------

async function login(request, env) {
  const body = await readJson(request);
  if (!body || typeof body.password !== "string") {
    return json({ error: "Enter the password." }, 400);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const failKey = `login-fail:${ip}`;
  const fails = Number(await env.CAMPAIGN_KV.get(failKey)) || 0;
  if (fails >= MAX_FAILS) {
    return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  }

  if (!(await passwordMatches(body.password, env.ADMIN_PASSWORD))) {
    await env.CAMPAIGN_KV.put(failKey, String(fails + 1), { expirationTtl: LOCKOUT_SECONDS });
    return json({ error: "Wrong password." }, 401);
  }

  if (fails) await env.CAMPAIGN_KV.delete(failKey);
  const token = await makeToken(env.ADMIN_PASSWORD);
  return json({ ok: true }, 200, {
    "Set-Cookie": cookie(token, SESSION_SECONDS),
  });
}

function logout() {
  return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
}

function cookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/api/admin; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

// ---- Save ------------------------------------------------------------------

async function saveCampaign(request, env) {
  const body = await readJson(request);
  const raised = toAmount(body && body.raised);
  const goal = toAmount(body && body.goal);

  if (raised === null || goal === null) {
    return json({ error: `Amounts must be numbers between 0 and ${MAX_AMOUNT.toLocaleString("en-US")}.` }, 400);
  }
  if (goal <= 0) return json({ error: "The goal must be more than $0." }, 400);

  const campaign = { raised, goal, updatedAt: new Date().toISOString() };
  await env.CAMPAIGN_KV.put(KV_KEY, JSON.stringify(campaign));
  return json(campaign);
}

function toAmount(value) {
  const n = typeof value === "string" ? Number(value.replace(/[$,\s]/g, "")) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return null;
  return Math.round(n * 100) / 100; // whole cents
}

// ---- Security helpers ------------------------------------------------------

const encoder = new TextEncoder();

async function sha256(text) {
  return crypto.subtle.digest("SHA-256", encoder.encode(text));
}

// Hash both sides first so the constant-time compare always sees equal lengths.
async function passwordMatches(given, actual) {
  const [a, b] = await Promise.all([sha256(given), sha256(actual)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

// The session is "<expiry>.<signature>", signed with a key derived from the
// admin password, so changing the password signs everyone out.
async function hmacKey(password) {
  return crypto.subtle.importKey(
    "raw",
    await sha256("toss-admin-session:" + password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function makeToken(password) {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(password), encoder.encode(exp));
  return `${exp}.${toBase64Url(sig)}`;
}

async function isSignedIn(request, env) {
  const token = readCookie(request, COOKIE);
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!/^\d+$/.test(exp || "") || Number(exp) < Date.now() / 1000) return false;
  const sigBytes = fromBase64Url(sig || "");
  if (!sigBytes) return false;
  return crypto.subtle.verify("HMAC", await hmacKey(env.ADMIN_PASSWORD), sigBytes, encoder.encode(exp));
}

// State-changing requests must come from this site's own pages.
function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return origin === new URL(request.url).origin;
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function toBase64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(text) {
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function readJson(request) {
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) return null;
  const text = await request.text();
  if (text.length > 2000) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

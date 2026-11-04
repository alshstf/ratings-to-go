// The user's own server (Argoose or anything that speaks the same): items
// go to POST <server>/api/ratings/import as {"items": [...]}, with the
// token as a Bearer header. Nothing is sent anywhere else.

// checkServer says what is wrong with the address, or "" when it is fine:
// HTTPS, except for the user's own machine.
export function checkServer(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return "errServerAddress";
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) return "errServerHttps";
  return "";
}

const base = (server) => server.replace(/\/+$/, "");

async function call(settings, path, init) {
  const res = await fetch(base(settings.server) + path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${settings.token}` },
    credentials: "omit",
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

// whoami checks the address and the token: the token's name on the server.
export const whoami = (settings) => call(settings, "/api/access/whoami", { method: "GET" });

export const send = (settings, items) =>
  call(settings, "/api/ratings/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

// 8004scan proxy so the browser can read live agent index without CORS issues.
// Used when the site is deployed on Vercel. GitHub Pages falls back to live-snapshot.json.

const BASE = "https://api.8004scan.io/api/v1";

function sendJson(res, status, body) {
  return res
    .status(status)
    .setHeader("Cache-Control", "public, max-age=60")
    .setHeader("Access-Control-Allow-Origin", "*")
    .json(body);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return sendJson(res, 405, { ok: false, error: "GET only." });
  }

  const q = req.query || {};
  const search = q.q ? String(q.q) : "";
  const chainId = q.chain_id || "56";
  const limit = q.limit || "8";

  const url = search
    ? `${BASE}/agents/search/semantic?q=${encodeURIComponent(search)}`
    : `${BASE}/agents?chain_id=${encodeURIComponent(chainId)}&limit=${encodeURIComponent(limit)}`;

  try {
    const upstream = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "Stivium/1.0" },
    });
    const data = await upstream.json();
    return sendJson(res, upstream.ok ? 200 : upstream.status, data);
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      error: "8004scan proxy failed.",
      detail: error.message,
    });
  }
};

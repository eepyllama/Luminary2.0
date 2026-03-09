const HN_TOP = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM = (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

const REDDIT_PROGRAMMING = "https://www.reddit.com/r/programming/top.json?limit=5";
const REDDIT_ML = "https://www.reddit.com/r/MachineLearning/top.json?limit=5";

async function safeJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status}`);
  return await res.json();
}

function compressTitles(titles, limit = 5) {
  const out = [];
  const seen = new Set();
  for (const t of titles) {
    const s = String(t || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s.length > 90 ? `${s.slice(0, 87)}…` : s);
    if (out.length >= limit) break;
  }
  return out;
}

export async function runTrendAgent() {
  const titles = [];

  // HackerNews: get IDs then fetch first 5 items.
  try {
    const ids = await safeJson(HN_TOP);
    const top5 = Array.isArray(ids) ? ids.slice(0, 5) : [];
    const items = await Promise.all(top5.map((id) => safeJson(HN_ITEM(id))));
    for (const it of items) {
      if (it?.title) titles.push(it.title);
    }
  } catch {
    // ignore and continue with other sources
  }

  // Reddit: titles only. (May fail in some environments due to CORS; pipeline tolerates that.)
  try {
    const r = await safeJson(REDDIT_PROGRAMMING);
    const kids = r?.data?.children || [];
    for (const k of kids) if (k?.data?.title) titles.push(k.data.title);
  } catch {}

  try {
    const r = await safeJson(REDDIT_ML);
    const kids = r?.data?.children || [];
    for (const k of kids) if (k?.data?.title) titles.push(k.data.title);
  } catch {}

  return compressTitles(titles, 5);
}


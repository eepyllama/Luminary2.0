import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function parseJSON(text: string): any {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!match) throw new Error("No JSON found in response");
  return JSON.parse(match[0]);
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Accept": "application/json",
      "User-Agent": "LuminaryNodeAgent/1.0",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

function normQuery(q: string) {
  return String(q || "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function isoDate(d: unknown): string | null {
  try {
    const dt = new Date(String(d));
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  } catch {
    return null;
  }
}

async function scrapeWebContent(url: string): Promise<{ text: string | null; scraper: string; error?: string }> {
  const u = String(url || "").trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    return { text: null, scraper: "none", error: "invalid_url" };
  }

  // Prefer jina.ai (fast, no CORS hassle), fallback to allorigins.
  try {
    const jinaUrl = `https://r.jina.ai/http://${u.replace(/^https?:\/\//, "")}`;
    const r = await fetch(jinaUrl, { headers: { "User-Agent": "LuminaryNodeAgent/1.0" } });
    if (r.ok) {
      const txt = (await r.text()).replace(/\s+/g, " ").trim();
      return { text: txt.slice(0, 3000) || null, scraper: "jina.ai" };
    }
  } catch {
    // ignore
  }

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`;
    const data = await fetchJson(proxyUrl);
    const html = String(data?.contents || "");
    if (!html) return { text: null, scraper: "allorigins", error: "empty" };
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { text: textContent.substring(0, 3000) || null, scraper: "allorigins" };
  } catch (error) {
    return { text: null, scraper: "allorigins", error: error instanceof Error ? error.message : "scrape_failed" };
  }
}

async function searchHackerNews(query: string) {
  const q = normQuery(query);
  if (!q) return [];
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=8`;
  const json = await fetchJson(url);
  const hits = Array.isArray(json?.hits) ? json.hits : [];
  return hits
    .map((h: any) => ({
      type: "article",
      platform: "Hacker News",
      title: String(h?.title || "").trim(),
      url: String(h?.url || (h?.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : "")).trim(),
      score: Number(h?.points ?? 0),
      comments: Number(h?.num_comments ?? 0),
      publishedAt: isoDate(h?.created_at),
      author: h?.author ? String(h.author) : null,
    }))
    .filter((x: any) => x.title && x.url);
}

async function searchReddit(query: string) {
  const q = normQuery(query);
  if (!q) return [];
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=top&t=month&limit=8`;
  const json = await fetchJson(url);
  const children = json?.data?.children;
  const posts = Array.isArray(children) ? children.map((c: any) => c?.data).filter(Boolean) : [];
  return posts
    .map((p: any) => ({
      type: "discussion",
      platform: "Reddit",
      title: String(p?.title || "").trim(),
      url: p?.permalink ? `https://www.reddit.com${p.permalink}` : String(p?.url || "").trim(),
      subreddit: p?.subreddit ? String(p.subreddit) : null,
      score: Number(p?.score ?? 0),
      comments: Number(p?.num_comments ?? 0),
      publishedAt: typeof p?.created_utc === "number" ? new Date(p.created_utc * 1000).toISOString() : null,
      author: p?.author ? String(p.author) : null,
    }))
    .filter((x: any) => x.title && x.url);
}

async function searchStackOverflow(query: string) {
  const q = normQuery(query);
  if (!q) return [];
  const url =
    `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&site=stackoverflow&pagesize=8&q=${encodeURIComponent(q)}`;
  const json = await fetchJson(url);
  const items = Array.isArray(json?.items) ? json.items : [];
  return items
    .map((it: any) => ({
      type: "qa",
      platform: "Stack Overflow",
      title: String(it?.title || "").trim(),
      url: String(it?.link || "").trim(),
      score: Number(it?.score ?? 0),
      answers: Number(it?.answer_count ?? 0),
      publishedAt: typeof it?.creation_date === "number" ? new Date(it.creation_date * 1000).toISOString() : null,
      tags: Array.isArray(it?.tags) ? it.tags.slice(0, 8).map(String) : [],
    }))
    .filter((x: any) => x.title && x.url);
}

async function searchGdelt(query: string) {
  const q = normQuery(query);
  if (!q) return [];
  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=ArtList&format=json&maxrecords=8&sort=HybridRel`;
  const json = await fetchJson(url);
  const articles = Array.isArray(json?.articles) ? json.articles : [];
  return articles
    .map((a: any) => ({
      type: "page",
      platform: "GDELT",
      title: String(a?.title || "").trim(),
      url: String(a?.url || "").trim(),
      sourceCountry: a?.sourceCountry ? String(a.sourceCountry) : null,
      domain: a?.domain ? String(a.domain) : null,
      publishedAt: isoDate(a?.seendate) || isoDate(a?.datetime),
    }))
    .filter((x: any) => x.title && x.url);
}

const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.privacydev.net",
  "https://nitter.space",
];

function parseRssItems(xml: string, limit = 6) {
  const items: Array<{ title: string; url: string; publishedAt: string | null }> = [];
  const parts = String(xml || "").split("<item>").slice(1);
  for (const p of parts) {
    if (items.length >= limit) break;
    const title = (p.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] ||
      p.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
    const link = (p.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "").trim();
    const pub = (p.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim();
    const publishedAt = pub ? isoDate(pub) : null;
    if (title && link) items.push({ title, url: link, publishedAt });
  }
  return items;
}

async function searchTwitterViaNitter(query: string) {
  const q = normQuery(query);
  if (!q) return [];
  let lastErr: unknown = null;
  for (const base of NITTER_INSTANCES) {
    try {
      const url = `${base}/search/rss?f=tweets&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "User-Agent": "LuminaryNodeAgent/1.0" } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const xml = await res.text();
      const items = parseRssItems(xml, 6);
      return items.map((it) => ({
        type: "tweet",
        platform: "X (via Nitter)",
        title: it.title,
        url: it.url,
        publishedAt: it.publishedAt,
        via: `nitter:${base}`,
      }));
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  console.warn("Twitter search failed (all Nitter instances).", lastErr);
  return [];
}

const INVIDIOUS_INSTANCES = [
  "https://invidious.privacyredirect.com",
  "https://yewtu.be",
  "https://invidious.projectsegfau.lt",
];

async function searchYouTube(query: string) {
  const q = normQuery(query);
  if (!q) return [];
  let lastErr: unknown = null;
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const url = `${base}/api/v1/search?q=${encodeURIComponent(q)}&type=video&sort_by=relevance`;
      const items = await fetchJson(url);
      const arr = Array.isArray(items) ? items : [];
      return arr
        .slice(0, 8)
        .map((v: any) => ({
          type: "video",
          platform: "YouTube",
          title: String(v?.title || "").trim(),
          url: v?.videoId ? `https://www.youtube.com/watch?v=${v.videoId}` : "",
          channel: v?.author ? String(v.author) : null,
          views: typeof v?.viewCount === "number" ? v.viewCount : null,
          publishedAt: v?.published ? new Date(v.published * 1000).toISOString() : null,
          durationSeconds: typeof v?.lengthSeconds === "number" ? v.lengthSeconds : null,
          via: `invidious:${base}`,
        }))
        .filter((x: any) => x.title && x.url);
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  console.warn("YouTube search failed (all instances).", lastErr);
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nodeTitle, nodeDescription, roadmapSubject, roadmapDifficulty } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured in Supabase secrets");

    // ══════════════════════════════════════════════════
    // AGENT 1 — Deep Content Analyzer
    // Analyzes the node topic and identifies key learning areas
    // ══════════════════════════════════════════════════
    const agent1Prompt = `You are Agent 1: Deep Content Analyzer in a multi-agent node processing pipeline.

Your job: Analyze this specific learning node and break it down into detailed components.

Node Information:
- Title: "${nodeTitle}"
- Description: "${nodeDescription}"
- Overall Subject: "${roadmapSubject}"
- Difficulty Level: "${roadmapDifficulty}"

Your analysis should cover:
1. Key concepts and subtopics within this node
2. Skills that will be developed
3. Common challenges or pain points
4. Prerequisite knowledge that's absolutely essential
5. Learning outcomes and success metrics

Return ONLY a JSON object:
{
  "keyConcepts": ["concept1", "concept2", "concept3"],
  "skillsDeveloped": ["skill1", "skill2"],
  "commonChallenges": ["challenge1", "challenge2"],
  "essentialPrerequisites": ["prereq1", "prereq2"],
  "learningOutcomes": ["outcome1", "outcome2"],
  "estimatedComplexity": number (1-10),
  "learningApproach": "visual/auditory/kinesthetic/mixed"
}`;

    const agent1Raw = await callGemini(GEMINI_API_KEY, agent1Prompt);
    const agent1 = parseJSON(agent1Raw);

    // ══════════════════════════════════════════════════
    // AGENT 2 — Web Resource Harvester (public sources)
    // Pulls latest/top links from public APIs
    // ══════════════════════════════════════════════════
    const searchQuery = normQuery(
      [nodeTitle, roadmapSubject, ...(Array.isArray(agent1.keyConcepts) ? agent1.keyConcepts.slice(0, 3) : [])]
        .filter(Boolean)
        .join(" "),
    );

    const [hn, reddit, so, yt] = await Promise.all([
      searchHackerNews(searchQuery).catch(() => []),
      searchReddit(searchQuery).catch(() => []),
      searchStackOverflow(searchQuery).catch(() => []),
      searchYouTube(searchQuery).catch(() => []),
    ]);
    const [pages, tweets] = await Promise.all([
      searchGdelt(searchQuery).catch(() => []),
      searchTwitterViaNitter(searchQuery).catch(() => []),
    ]);

    const harvested = {
      query: searchQuery,
      articles: hn,
      pages,
      discussions: reddit,
      videos: yt,
      qa: so,
      tweets,
    };

    // Scrape previews for a handful of high-signal URLs (articles + QA).
    const urlsToScrape = [
      ...harvested.articles.slice(0, 3).map((x: any) => x.url),
      ...harvested.pages.slice(0, 2).map((x: any) => x.url),
      ...harvested.qa.slice(0, 2).map((x: any) => x.url),
    ].filter(Boolean);

    const scrapedPreviews: Array<{ url: string; text: string | null; scraper: string; error?: string }> = [];
    for (const url of urlsToScrape) {
      const s = await scrapeWebContent(url);
      scrapedPreviews.push({ url, ...s });
    }

    // ══════════════════════════════════════════════════
    // AGENT 3 — Prerequisites Structurer
    // Turns prerequisites into a structured "prereqs" section
    // ══════════════════════════════════════════════════
    const agent3Prompt = `You are a learning designer.\n\nGiven this node:\n- Title: "${nodeTitle}"\n- Description: "${nodeDescription}"\n- Difficulty: "${roadmapDifficulty}"\n\nAnd these essential prerequisites:\n${JSON.stringify(agent1.essentialPrerequisites || [])}\n\nReturn ONLY JSON in this shape:\n{\n  "prereqs":[\n    {\n      "title":"",\n      "why":"",\n      "howToVerify":"",\n      "quickPractice":"",\n      "searchQueries":["",""]\n    }\n  ]\n}\n\nRules:\n- No placeholders\n- Keep prereqs minimal but real (3-8 items)\n- Each prereq must be a real skill/concept\n- searchQueries must be specific (include key terms / APIs)\n- Return only JSON`;
    const agent3Raw = await callGemini(GEMINI_API_KEY, agent3Prompt);
    const prereqStructured = parseJSON(agent3Raw);

    // ══════════════════════════════════════════════════
    // AGENT 4 — Learning Path Designer
    // Creates a step-by-step learning approach for this node
    // ══════════════════════════════════════════════════
    const agent4Prompt = `You are Agent 4: Learning Path Designer in a multi-agent node processing pipeline.

Previous agents have analyzed this node "${nodeTitle}" and found:
- Key Concepts: ${JSON.stringify(agent1.keyConcepts)}
- Skills: ${JSON.stringify(agent1.skillsDeveloped)}
- Challenges: ${JSON.stringify(agent1.commonChallenges)}
- Learning Approach: ${agent1.learningApproach}
- Available Resources (web): ${JSON.stringify({ hn: harvested.articles.length, reddit: harvested.discussions.length, youtube: harvested.videos.length, stackoverflow: harvested.qa.length })}

Your job: Design a step-by-step learning path for this specific node.

Create 3-5 sequential learning steps that:
1. Build on each other logically
2. Address the common challenges
3. Match the learning approach preference
4. Incorporate the available resources
5. Include practice activities

Return ONLY a JSON array:
[
  {
    "step": number,
    "title": "Step title",
    "description": "What to do in this step",
    "activities": ["activity1", "activity2"],
    "resources": ["titles of relevant resources from the list"],
    "estimatedTime": "X hours",
    "successCriteria": "How to know this step is complete"
  }
]`;

    const agent4Raw = await callGemini(GEMINI_API_KEY, agent4Prompt);
    const agent4LearningPath = parseJSON(agent4Raw);

    // ══════════════════════════════════════════════════
    // AGENT 5 — Assessment Designer
    // Creates ways to test knowledge and track progress
    // ══════════════════════════════════════════════════
    const agent5Prompt = `You are Agent 5: Assessment Designer in a multi-agent node processing pipeline.

For the node "${nodeTitle}" with these learning outcomes: ${JSON.stringify(agent1.learningOutcomes)}

Your job: Design assessment methods to validate learning and track progress.

Create different types of assessments:
1. Quick knowledge checks (5-10 questions)
2. Practical exercises or mini-projects
3. Self-reflection prompts
4. Peer review or feedback opportunities

Return ONLY a JSON object:
{
  "knowledgeChecks": [
    {
      "question": "Question text",
      "type": "multiple-choice/true-false/short-answer",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0,
      "explanation": "Why this is correct"
    }
  ],
  "practicalExercises": [
    {
      "title": "Exercise title",
      "description": "What to do",
      "estimatedTime": "X hours",
      "deliverables": ["What to produce"],
      "successCriteria": "How to evaluate success"
    }
  ],
  "reflectionPrompts": [
    "Prompt for self-reflection"
  ],
  "peerReviewSuggestions": [
    "Suggestion for getting feedback"
  ]
}`;

    const agent5Raw = await callGemini(GEMINI_API_KEY, agent5Prompt);
    const agent5Assessments = parseJSON(agent5Raw);

    // Merge all agent outputs
    const prereqsArr = Array.isArray(prereqStructured?.prereqs) ? prereqStructured.prereqs : [];
    const prereqs = prereqsArr
      .map((p: any) => ({
        title: String(p?.title || "").trim(),
        why: String(p?.why || "").trim(),
        howToVerify: String(p?.howToVerify || "").trim(),
        quickPractice: String(p?.quickPractice || "").trim(),
        searchQueries: Array.isArray(p?.searchQueries) ? p.searchQueries.map(String).filter(Boolean).slice(0, 4) : [],
      }))
      .filter((p: any) => p.title && p.why);

    return new Response(
      JSON.stringify({
        nodeAnalysis: agent1,
        harvestedResources: harvested,
        scrapedPreviews,
        prereqs,
        learningPath: agent4LearningPath,
        assessments: agent5Assessments,
        techInfo: {
          webHarvesterAgent: "Agent 2 — Web Resource Harvester (public APIs)",
          pageScraperAgent: "Scraper — jina.ai fallback allorigins",
          llmPlannerAgent: "Gemini 1.5 Flash (via Generative Language API)",
          sources: {
            hackerNews: "hn.algolia.com search API",
            reddit: "reddit.com search.json (top/month)",
            youtube: "Invidious public API (falls back across instances)",
            stackOverflow: "StackExchange search/advanced API",
            pages: "GDELT Doc 2.1 API",
            twitter: "Nitter RSS (best-effort)",
          },
        },
        processingSummary: {
          totalAgentsRun: 5,
          resourcesFound:
            harvested.articles.length +
            harvested.pages.length +
            harvested.discussions.length +
            harvested.videos.length +
            harvested.qa.length +
            harvested.tweets.length,
          resourcesScraped: scrapedPreviews.filter((r) => !!r.text).length,
          learningSteps: agent4LearningPath.length,
          knowledgeChecks: agent5Assessments.knowledgeChecks.length,
          practicalExercises: agent5Assessments.practicalExercises.length
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Node agent processor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Node processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

function extractJson(text) {
  const trimmed = String(text ?? "").trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (codeBlock ? codeBlock[1] : trimmed).trim();
  const objMatch = candidate.match(/\{[\s\S]*\}/);
  const jsonStr = objMatch ? objMatch[0] : candidate;
  return JSON.parse(jsonStr);
}

export async function generateJson(prompt, { maxOutputTokens = 600 } = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not set.");
  }

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens,
      },
    }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  if (!res.ok) {
    const msg = data?.error?.message || `Gemini API error: ${res.status}`;
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response.");

  return extractJson(text);
}


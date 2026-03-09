import { generateJson } from "@/api/gemini.js";

export async function runScopeAgent(topic) {
  const prompt = `Identify the major learning domains required to learn this topic.\n\nTopic: ${topic}\n\nReturn ONLY valid JSON:\n{"domains":["..."]}\n\nRules:\n- Provide 5-8 domains max\n- Domains should be short noun phrases\n- No markdown, no commentary`;

  const data = await generateJson(prompt, { maxOutputTokens: 250 });
  const domains = Array.isArray(data?.domains) ? data.domains.filter(Boolean).slice(0, 8) : [];
  return { domains };
}


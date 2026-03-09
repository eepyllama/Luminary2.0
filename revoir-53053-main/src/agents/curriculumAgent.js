import { generateJson } from "@/api/gemini.js";

export async function runCurriculumAgent({ topic, domains, trendSignals }) {
  const d = (Array.isArray(domains) ? domains : []).slice(0, 8);
  const t = (Array.isArray(trendSignals) ? trendSignals : []).slice(0, 5);

  const prompt = `You are an AI curriculum architect.\n\nUser topic: ${topic}\n\nLearning domains:\n${d.join("\n")}\n\nCurrent industry trends:\n${t.join("\n")}\n\nGenerate a structured learning roadmap.\n\nRules:\n1. Start with foundational prerequisites.\n2. Progress toward advanced topics.\n3. Integrate modern industry trends.\n4. Avoid generic placeholders.\n5. Every topic must be a real skill or concept.\n\nReturn ONLY JSON:\n\n{\n "roadmap":[\n  {\n   "title":"",\n   "description":"",\n   "difficulty":"beginner|intermediate|advanced"\n  }\n ]\n}`;

  const data = await generateJson(prompt, { maxOutputTokens: 600 });
  const roadmap = Array.isArray(data?.roadmap) ? data.roadmap : [];
  const cleaned = roadmap
    .map((n) => ({
      title: String(n?.title || "").trim(),
      description: String(n?.description || "").trim(),
      difficulty: String(n?.difficulty || "").trim(),
    }))
    .filter((n) => n.title && n.description && ["beginner", "intermediate", "advanced"].includes(n.difficulty))
    .slice(0, 16);

  return { roadmap: cleaned };
}


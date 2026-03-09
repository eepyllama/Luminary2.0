import { generateJson } from "@/api/gemini.js";

export async function runPrerequisiteAgent(nodes) {
  const minimal = (Array.isArray(nodes) ? nodes : []).map((n) => ({
    id: n.id,
    title: n.title,
    difficulty: n.difficulty,
  }));

  const prompt = `You map prerequisites between learning nodes.\n\nGiven nodes, output prerequisite edges.\n\nNodes:\n${JSON.stringify(minimal)}\n\nReturn ONLY valid JSON:\n{\"nodes\":[{\"id\":\"\",\"title\":\"\"}],\"edges\":[{\"from\":\"nodeId\",\"to\":\"nodeId\"}]}\n\nRules:\n- Keep edges minimal: 0-2 prerequisites per node\n- Use only ids from the input\n- Edges mean: from is prerequisite for to\n- No cycles\n- No markdown, no extra keys`;

  const data = await generateJson(prompt, { maxOutputTokens: 450 });
  const outNodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const outEdges = Array.isArray(data?.edges) ? data.edges : [];

  const nodeSet = new Set(minimal.map((n) => n.id));
  const edges = outEdges
    .map((e) => ({ from: String(e?.from || ""), to: String(e?.to || "") }))
    .filter((e) => nodeSet.has(e.from) && nodeSet.has(e.to) && e.from !== e.to);

  // Trust input nodes as source of truth.
  const nodesNormalized = minimal.map((n) => ({ id: n.id, title: n.title }));

  return { nodes: nodesNormalized, edges };
}


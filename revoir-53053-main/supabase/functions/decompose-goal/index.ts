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
        temperature: 0.8,
        maxOutputTokens: 4096,
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
  // Strip markdown fences if present
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  // Extract first JSON array or object
  const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!match) throw new Error("No JSON found in response");
  return JSON.parse(match[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { goal, subject, difficulty } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured in Supabase secrets");

    // ══════════════════════════════════════════════════
    // AGENT 1 — Scope Expander
    // Takes the raw topic and expands it into learning domains
    // ══════════════════════════════════════════════════
    const agent1Prompt = `You are Agent 1: Scope Expander in a multi-agent curriculum pipeline.

Your job: Given a learning goal, expand it into distinct learning domains and identify what a learner truly needs to master this topic end-to-end.

Input:
- Goal: "${goal}"
- Subject area: "${subject}"  
- Difficulty: "${difficulty}"

Think about:
1. What foundational knowledge is needed first?
2. What are the 3-5 core domains within this topic?
3. What practical skills should the learner have at the end?
4. What is commonly overlooked when learning this?

Return ONLY a JSON object:
{
  "domains": ["domain1", "domain2", "domain3"],
  "coreSkills": ["skill1", "skill2"],
  "estimatedWeeks": number,
  "pitfalls": ["pitfall1", "pitfall2"]
}`;

    const agent1Raw = await callGemini(GEMINI_API_KEY, agent1Prompt);
    const agent1 = parseJSON(agent1Raw);

    // ══════════════════════════════════════════════════
    // AGENT 2 — Curriculum Architect
    // Uses Agent 1's domains to build structured nodes
    // ══════════════════════════════════════════════════
    const agent2Prompt = `You are Agent 2: Curriculum Architect in a multi-agent curriculum pipeline.

Agent 1 (Scope Expander) already analyzed this learning goal and found:
- Domains: ${JSON.stringify(agent1.domains)}
- Core skills to build: ${JSON.stringify(agent1.coreSkills)}
- Common pitfalls: ${JSON.stringify(agent1.pitfalls)}

Your job: Use this analysis to create ${difficulty === 'beginner' ? '6-8' : difficulty === 'advanced' ? '10-14' : '8-12'} structured learning nodes (subtasks).

Goal: "${goal}" | Subject: "${subject}" | Difficulty: "${difficulty}"

Rules:
- Each node should be completable in 2-8 hours
- Progress from foundational → intermediate → applied
- Make titles specific and actionable (not vague like "Learn basics")
- Descriptions should tell exactly WHAT the learner will do/build

Return ONLY a JSON array:
[
  {
    "title": "Specific actionable title",
    "description": "Exactly what the learner will study, build, or practice in this node",
    "estimated_hours": number,
    "domain": "which domain from agent 1 this belongs to",
    "prerequisites": ["exact title of prerequisite node"]
  }
]`;

    const agent2Raw = await callGemini(GEMINI_API_KEY, agent2Prompt);
    const agent2Nodes = parseJSON(agent2Raw);

    // ══════════════════════════════════════════════════
    // AGENT 3 — Prerequisite Mapper
    // Validates and enriches the dependency graph
    // ══════════════════════════════════════════════════
    const agent3Prompt = `You are Agent 3: Prerequisite Mapper in a multi-agent curriculum pipeline.

Agent 2 generated these learning nodes:
${JSON.stringify(agent2Nodes, null, 2)}

Your job: Review the prerequisite dependencies and fix any issues. Also add a "difficulty_rating" (1-5) and "type" to each node.

Rules:
- Prerequisites must reference EXACT titles of other nodes in this list
- No circular dependencies (A requires B requires A is invalid)
- Nodes with no prerequisites should have prerequisites: []
- type must be one of: "concept", "practice", "project", "assessment"

Return the SAME array with corrected prerequisites, added difficulty_rating, and added type field. Return ONLY the JSON array, nothing else.`;

    const agent3Raw = await callGemini(GEMINI_API_KEY, agent3Prompt);
    const agent3Nodes = parseJSON(agent3Raw);

    // ══════════════════════════════════════════════════
    // AGENT 4 — Resource Curator
    // Adds specific resources and tips per node
    // ══════════════════════════════════════════════════
    const agent4Prompt = `You are Agent 4: Resource Curator in a multi-agent curriculum pipeline.

The curriculum for "${goal}" (${difficulty}) has been finalized with these nodes:
${JSON.stringify(agent3Nodes.map((n: any) => ({ title: n.title, domain: n.domain, type: n.type })), null, 2)}

Your job: For each node, add a "resource_tip" — a specific, actionable tip about HOW to study this node and what kind of resource to look for.

Be specific to the actual topic — not generic advice like "watch YouTube videos".
Good example: "Search for 'React useEffect cleanup' on the official React docs beta — the interactive examples explain the mental model better than any tutorial"

Return ONLY a JSON array with one object per node:
[
  {
    "title": "exact title matching the node",
    "resource_tip": "specific actionable tip"
  }
]`;

    const agent4Raw = await callGemini(GEMINI_API_KEY, agent4Prompt);
    const agent4Tips = parseJSON(agent4Raw);

    // Merge all agent outputs
    const finalSubtasks = agent3Nodes.map((node: any) => {
      const tip = agent4Tips.find((t: any) => t.title === node.title);
      return {
        ...node,
        resource_tip: tip?.resource_tip ?? "",
      };
    });

    return new Response(
      JSON.stringify({
        subtasks: finalSubtasks,
        meta: {
          domains: agent1.domains,
          estimatedWeeks: agent1.estimatedWeeks,
          pitfalls: agent1.pitfalls,
          totalNodes: finalSubtasks.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Multi-agent pipeline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Pipeline failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
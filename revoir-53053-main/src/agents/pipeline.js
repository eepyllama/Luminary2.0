import { runScopeAgent } from "@/agents/scopeAgent.js";
import { runTrendAgent } from "@/agents/trendAgent.js";
import { runCurriculumAgent } from "@/agents/curriculumAgent.js";
import { runPrerequisiteAgent } from "@/agents/prerequisiteAgent.js";

const STEPS = [
  { id: 1, key: "scope", name: "Agent 1 — Scope Expander" },
  { id: 2, key: "trends", name: "Agent 2 — Trend Scanner" },
  { id: 3, key: "curriculum", name: "Agent 3 — Curriculum Architect" },
  { id: 4, key: "prereqs", name: "Agent 4 — Prerequisite Mapper" },
];

export function createInitialStatuses() {
  return STEPS.map((s) => ({ id: s.id, name: s.name, status: "waiting" }));
}

function emit(onStatus, patch) {
  if (!onStatus) return;
  onStatus(patch);
}

export async function runPipeline({ topic }, onStatus) {
  const t = String(topic || "").trim();
  if (!t) throw new Error("Topic is required.");

  emit(onStatus, { type: "init", steps: createInitialStatuses() });

  emit(onStatus, { type: "step", id: 1, status: "running" });
  const scope = await runScopeAgent(t);
  emit(onStatus, { type: "step", id: 1, status: "done" });

  emit(onStatus, { type: "step", id: 2, status: "running" });
  const trendSignals = await runTrendAgent();
  emit(onStatus, { type: "step", id: 2, status: "done" });

  emit(onStatus, { type: "step", id: 3, status: "running" });
  const curriculum = await runCurriculumAgent({
    topic: t,
    domains: scope.domains,
    trendSignals,
  });
  emit(onStatus, { type: "step", id: 3, status: "done" });

  const nodes = curriculum.roadmap.map((n, idx) => ({
    id: `n${idx + 1}`,
    title: n.title,
    description: n.description,
    difficulty: n.difficulty,
  }));

  emit(onStatus, { type: "step", id: 4, status: "running" });
  const prereqs = await runPrerequisiteAgent(nodes);
  emit(onStatus, { type: "step", id: 4, status: "done" });

  return {
    topic: t,
    domains: scope.domains,
    trendSignals,
    roadmap: curriculum.roadmap,
    graph: {
      nodes,
      edges: prereqs.edges,
    },
  };
}


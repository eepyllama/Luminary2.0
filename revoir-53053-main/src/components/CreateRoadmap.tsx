import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, BookOpen, Target, Clock, Lightbulb, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AgentPipeline from "@/components/AgentPipeline";
import { runPipeline, createInitialStatuses } from "@/agents/pipeline.js";

interface Subtask {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  prerequisites: string[];
  resource_tip?: string;
  type?: string;
}

type AgentStatus = "idle" | "running" | "done" | "error";

interface AgentStep {
  id: number;
  name: string;
  role: string;
  status: AgentStatus;
  detail: string;
  startTime?: number;
  endTime?: number;
}

interface CreateRoadmapProps {
  onSuccess?: () => void;
}

const AGENTS: AgentStep[] = [
  { id: 1, name: "Scope Expander",       role: "Identifying learning domains & boundaries",      status: "idle", detail: "" },
  { id: 2, name: "Trend Scanner",        role: "Scanning HackerNews + Reddit (no LLM)",          status: "idle", detail: "" },
  { id: 3, name: "Curriculum Architect", role: "Generating structured curriculum nodes",          status: "idle", detail: "" },
  { id: 4, name: "Prerequisite Mapper",  role: "Mapping concept dependencies",                   status: "idle", detail: "" },
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Synthwave colour per agent
const AGENT_COLORS = [
  { glow: "#a855f7", text: "text-purple-400",  border: "border-purple-500/50", bg: "bg-purple-500/10" },
  { glow: "#ec4899", text: "text-pink-400",    border: "border-pink-500/50",   bg: "bg-pink-500/10"   },
  { glow: "#06b6d4", text: "text-cyan-400",    border: "border-cyan-500/50",   bg: "bg-cyan-500/10"   },
  { glow: "#f97316", text: "text-orange-400",  border: "border-orange-500/50", bg: "bg-orange-500/10" },
];

export function CreateRoadmap({ onSuccess }: CreateRoadmapProps = {}) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "", subject: "", description: "", difficulty: "", deadline: "", tags: [] as string[],
  });
  const [subtasks, setSubtasks]       = useState<Subtask[]>([]);
  const [currentSubtask, setCurrentSubtask] = useState({ title: "", description: "", estimatedHours: 0 });
  const [newTag, setNewTag]           = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [agents, setAgents]           = useState<AgentStep[]>(AGENTS);
  const [showPanel, setShowPanel]     = useState(false);
  const [pipelineDone, setPipelineDone] = useState(false);
  const [meta, setMeta]               = useState<any>(null);
  const [pipelineSteps, setPipelineSteps] = useState<any[]>(createInitialStatuses());
  const [pipelineEdges, setPipelineEdges] = useState<Array<{ from: string; to: string }>>([]);

  const setAgent = (id: number, patch: Partial<AgentStep>) =>
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));

  const onPipelineStatus = (evt: any) => {
    if (evt?.type === "init" && Array.isArray(evt.steps)) {
      setPipelineSteps(evt.steps);
      return;
    }
    if (evt?.type === "step") {
      setPipelineSteps((prev: any[]) =>
        prev.map((s: any) => (s.id === evt.id ? { ...s, status: evt.status } : s))
      );
    }
  };

  const topoOrder = (tasks: Subtask[], edges: Array<{ from: string; to: string }>) => {
    // Edges are id->id, where from is prerequisite of to.
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const indeg = new Map(tasks.map((t) => [t.id, 0]));
    const adj = new Map(tasks.map((t) => [t.id, [] as string[]]));
    for (const e of edges || []) {
      if (!byId.has(e.from) || !byId.has(e.to)) continue;
      adj.get(e.from)!.push(e.to);
      indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    }
    const q: string[] = [];
    for (const [id, d] of indeg.entries()) if (d === 0) q.push(id);
    const out: Subtask[] = [];
    while (q.length) {
      const id = q.shift()!;
      const t = byId.get(id);
      if (t) out.push(t);
      for (const nxt of adj.get(id) || []) {
        indeg.set(nxt, (indeg.get(nxt) || 0) - 1);
        if ((indeg.get(nxt) || 0) === 0) q.push(nxt);
      }
    }
    // Fallback: append any remaining in original order (handles cycles/invalid).
    if (out.length !== tasks.length) {
      const seen = new Set(out.map((t) => t.id));
      for (const t of tasks) if (!seen.has(t.id)) out.push(t);
    }
    return out;
  };

  // ── Tag helpers ──
  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      setNewTag("");
    }
  };
  const removeTag = (tag: string) =>
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));

  // ── Subtask helpers ──
  const addSubtask = () => {
    if (currentSubtask.title && currentSubtask.description) {
      setSubtasks(prev => [...prev, { id: Date.now().toString(), ...currentSubtask, prerequisites: [] }]);
      setCurrentSubtask({ title: "", description: "", estimatedHours: 0 });
    }
  };
  const removeSubtask = (id: string) => setSubtasks(prev => prev.filter(t => t.id !== id));

  // ── Multi-agent Gemini pipeline ──
  const generateRoadmapWithAI = async () => {
    if (!formData.title || !formData.subject) {
      toast.error("Please enter a title and subject first");
      return;
    }

    // Reset state
    setAgents(AGENTS.map(a => ({ ...a, status: "idle", detail: "" })));
    setPipelineDone(false);
    setMeta(null);
    setShowPanel(true);
    setIsGenerating(true);
    setPipelineSteps(createInitialStatuses());
    setPipelineEdges([]);

    try {
      const out = await runPipeline({ topic: `${formData.title} (${formData.subject})` }, onPipelineStatus);

      const idByTitle = new Map(out.graph.nodes.map((n: any) => [n.title, n.id]));
      const prereqTitlesById = new Map<string, string[]>();
      for (const e of out.graph.edges || []) {
        const from = out.graph.nodes.find((n: any) => n.id === e.from);
        if (!from) continue;
        if (!prereqTitlesById.has(e.to)) prereqTitlesById.set(e.to, []);
        prereqTitlesById.get(e.to)!.push(from.title);
      }

      const mapped: Subtask[] = out.graph.nodes.map((n: any) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        estimatedHours: n.difficulty === "beginner" ? 2 : n.difficulty === "intermediate" ? 3 : 4,
        prerequisites: prereqTitlesById.get(n.id) || [],
        type: "concept",
      }));

      setPipelineEdges(out.graph.edges || []);

      setSubtasks(mapped);
      setMeta({ domains: out.domains, trendSignals: out.trendSignals });
      setPipelineDone(true);
      toast.success(`Pipeline complete — ${mapped.length} nodes generated ✦`);

    } catch (err: any) {
      console.error("Pipeline error:", err);
      toast.error(err.message ?? "Pipeline failed — check VITE_GEMINI_API_KEY in your .env");
      setAgents(AGENTS);
      setShowPanel(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save roadmap ──
  const createRoadmap = async () => {
    if (!formData.title || !formData.subject || subtasks.length === 0) {
      toast.error("Fill in title, subject, and generate subtasks first");
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("You must be logged in"); return; }

      const { data: roadmap, error: re } = await supabase
        .from("roadmaps")
        .insert({
          user_id: user.id,
          title: formData.title,
          subject: formData.subject,
          description: formData.description,
          difficulty: formData.difficulty,
          deadline: formData.deadline || null,
          tags: formData.tags,
        })
        .select().single();

      if (re) throw re;

      const { error: se } = await supabase.from("subtasks").insert(
        topoOrder(subtasks, pipelineEdges).map((s, i) => ({
          roadmap_id: roadmap.id,
          title: s.title,
          description: s.description,
          estimated_hours: s.estimatedHours,
          order_index: i,
        }))
      );
      if (se) throw se;

      toast.success("Roadmap saved! 🎉");
      setFormData({ title: "", subject: "", description: "", difficulty: "", deadline: "", tags: [] });
      setSubtasks([]);
      setAgents(AGENTS);
      setShowPanel(false);
      setPipelineDone(false);

      if (onSuccess) onSuccess(); else navigate("/");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save roadmap — " + err.message);
    }
  };

  const doneCount = pipelineSteps.filter((a) => a.status === "done").length;
  const progress  = (doneCount / Math.max(pipelineSteps.length, 1)) * 100;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Create Learning Roadmap
        </h2>
        <p className="text-sm text-muted-foreground">AI generates a personalized, structured path for any topic</p>
      </div>

      {/* ══════════ AGENT PIPELINE PANEL ══════════ */}
      {showPanel && (
        <div
          className="relative rounded-2xl overflow-hidden border"
          style={{
            background: "linear-gradient(135deg, #0d0015 0%, #0a0020 40%, #000d1a 100%)",
            borderColor: "rgba(168,85,247,0.3)",
            boxShadow: "0 0 40px rgba(168,85,247,0.15), 0 0 80px rgba(168,85,247,0.05)",
          }}
        >
          {/* Grid texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(rgba(168,85,247,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.4) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Scanline effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
            }}
          />

          <div className="relative p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span
                  className="text-xs font-mono font-bold tracking-widest uppercase"
                  style={{ color: "#c084fc", textShadow: "0 0 10px rgba(192,132,252,0.8)" }}
                >
                  ◈ Agent Pipeline Active
                </span>
              </div>
              <span className="text-[10px] font-mono text-purple-400/60">
                {doneCount}/{pipelineSteps.length} complete
              </span>
            </div>

            <AgentPipeline steps={pipelineSteps} />

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #a855f7, #ec4899, #06b6d4, #f97316)",
                    boxShadow: "0 0 12px rgba(168,85,247,0.6)",
                  }}
                />
              </div>
              {pipelineDone && meta && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {meta.domains?.map((d: string, i: number) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(168,85,247,0.1)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" }}>
                      {d}
                    </span>
                  ))}
                  {meta.estimatedWeeks && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.25)" }}>
                      ~{meta.estimatedWeeks} weeks
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ FORM ══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic info */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-primary" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Roadmap Title *</Label>
              <Input id="title" placeholder="e.g., Master Kubernetes from scratch"
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="subject">Subject / Category *</Label>
              <Input id="subject" placeholder="e.g., DevOps, Machine Learning, Finance…"
                value={formData.subject}
                onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="What do you want to achieve?"
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Difficulty</Label>
                <Select value={formData.difficulty}
                  onValueChange={v => setFormData(p => ({ ...p, difficulty: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" value={formData.deadline}
                  onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input placeholder="Add a tag" value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyPress={e => e.key === "Enter" && addTag()} />
                <Button onClick={addTag} size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subtasks */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-primary" />
                Learning Nodes
              </CardTitle>
              <Button
                onClick={generateRoadmapWithAI}
                disabled={isGenerating || !formData.title || !formData.subject}
                variant="outline" size="sm"
                className="gap-2 border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5 text-purple-400"
              >
                {isGenerating
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />}
                {isGenerating ? "Pipeline running…" : "AI Generate"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input placeholder="Node title"
                value={currentSubtask.title}
                onChange={e => setCurrentSubtask(p => ({ ...p, title: e.target.value }))} />
              <Textarea placeholder="What will the learner do/build in this node?"
                value={currentSubtask.description}
                onChange={e => setCurrentSubtask(p => ({ ...p, description: e.target.value }))} />
              <div className="flex gap-2">
                <Input type="number" placeholder="Est. hours"
                  value={currentSubtask.estimatedHours}
                  onChange={e => setCurrentSubtask(p => ({ ...p, estimatedHours: parseInt(e.target.value) || 0 }))} />
                <Button onClick={addSubtask} className="bg-primary hover:bg-primary-hover">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {subtasks.map((s, i) => (
                <div key={s.id} className="p-3 border border-border rounded-lg bg-muted/20 group">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          #{i + 1}
                        </span>
                        {s.type && (
                          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">
                            {s.type}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm text-foreground mt-1">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                      {s.resource_tip && (
                        <p className="text-xs text-purple-400/70 mt-1 italic line-clamp-1">💡 {s.resource_tip}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />{s.estimatedHours}h
                        </span>
                        {s.prerequisites.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ← {s.prerequisites.length} prereq{s.prerequisites.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm"
                      onClick={() => removeSubtask(s.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex justify-center">
        <Button
          onClick={createRoadmap}
          size="lg"
          disabled={subtasks.length === 0}
          className="bg-gradient-primary text-white px-10 shadow-orange hover:shadow-lg hover:-translate-y-px transition-all gap-2"
        >
          <Target className="h-4 w-4" />
          Save Roadmap
        </Button>
      </div>
    </div>
  );
}

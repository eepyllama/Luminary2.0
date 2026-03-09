import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  Brain,
  Target,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

const GEMINI_MODELS_URL = "https://generativelanguage.googleapis.com/v1/models";
interface Recommendation {
  task: string;
  roadmap_title?: string;
  reason: string;
  effort: string;
  priority: "high" | "medium" | "low";
}

interface Insight {
  title: string;
  detail: string;
}

interface CoachResponse {
  greeting: string;
  insights: Insight[];
  recommendations: Recommendation[];
  motivation: string;
}

function parseCoachJson(text: string): CoachResponse | null {
  try {
    let trimmed = text.trim();
    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) trimmed = codeBlock[1].trim();
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
    const parsed = JSON.parse(jsonStr) as CoachResponse;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.insights)) parsed.insights = [];
    if (!Array.isArray(parsed.recommendations)) parsed.recommendations = [];
    return parsed;
  } catch {
    return null;
  }
}

interface AICoachProps {
  onNavigateToRoadmaps?: () => void;
}

function dbg(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  // #region agent log
  const payload = {
    sessionId: "330cbb",
    runId: "coach-run",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  try {
    // Avoid CORS preflight in browser environments.
    const ok = navigator.sendBeacon(
      "http://127.0.0.1:7580/ingest/71a776b0-1b43-4069-a6c4-5df62cbd3d45",
      new Blob([JSON.stringify(payload)], { type: "text/plain" }),
    );
    if (ok) return;
  } catch {
    // ignore
  }
  fetch("http://127.0.0.1:7580/ingest/71a776b0-1b43-4069-a6c4-5df62cbd3d45", {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}

export function AICoach({ onNavigateToRoadmaps }: AICoachProps) {
  const [loading, setLoading] = useState(false);
  const [coachData, setCoachData] = useState<CoachResponse | null>(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    dbg("H0", "AICoach.tsx:useEffect", "AICoach mounted", {
      hasApiKey: !!GEMINI_API_KEY,
      model: GEMINI_URL.split("/models/")[1]?.split(":")[0] || "unknown",
    });
    checkUserData();
  }, []);

  const checkUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      dbg("H0", "AICoach.tsx:checkUserData", "supabase.auth.getUser result", {
        hasUser: !!user,
      });
      if (!user) return;
      setHasData(true);
    } catch (error) {
      dbg("H0", "AICoach.tsx:checkUserData", "supabase.auth.getUser failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      console.error("Error checking user data:", error);
    }
  };

  const fetchCoachAdvice = async () => {
    dbg("H1", "AICoach.tsx:fetchCoachAdvice", "fetchCoachAdvice start", {
      hasApiKey: !!GEMINI_API_KEY,
      model: GEMINI_URL.split("/models/")[1]?.split(":")[0] || "unknown",
    });
    if (!GEMINI_API_KEY) {
      toast.error(
        "Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env",
      );
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to get personalized advice");
        return;
      }

      let roadmapsResult = { data: [] as any[] };
      let subtasksResult = { data: [] as any[] };
      let sessionsResult = { data: [] as any[] };
      let streakResult = { data: 0 };
      let longestResult = { data: 0 };
      let todayResult = { data: 0 };

      try {
        [
          roadmapsResult,
          subtasksResult,
          sessionsResult,
          streakResult,
          longestResult,
          todayResult,
        ] = await Promise.all([
          supabase.from("roadmaps").select("*"),
          supabase.from("subtasks").select("*, roadmaps(title)"),
          supabase
            .from("study_sessions")
            .select("*")
            .order("completed_at", { ascending: false })
            .limit(100),
          (
            supabase.rpc("get_current_streak", {
              user_uuid: user.id,
            }) as unknown as Promise<{ data: number | null }>
          ).catch(() => ({ data: 0 })),
          (
            supabase.rpc("get_longest_streak", {
              user_uuid: user.id,
            }) as unknown as Promise<{ data: number | null }>
          ).catch(() => ({ data: 0 })),
          (
            supabase.rpc("get_today_pomodoro_count", {
              user_uuid: user.id,
            }) as unknown as Promise<{ data: number | null }>
          ).catch(() => ({ data: 0 })),
        ]);
      } catch (e) {
        console.warn(
          "Some dashboard data failed to load, continuing with empty data:",
          e,
        );
      }

      const userData = {
        roadmaps: (roadmapsResult.data || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          subject: r.subject || "General",
          difficulty: r.difficulty || "intermediate",
        })),
        subtasks: (subtasksResult.data || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          description: s.description || "",
          completed: s.completed || false,
          estimated_hours: s.estimated_hours || 2,
          roadmap_title: s.roadmaps?.title || "Unknown",
          updated_at: s.updated_at,
        })),
        studySessions: (sessionsResult.data || []).map((s: any) => ({
          duration_minutes: s.duration_minutes,
          completed_at: s.completed_at,
          subtask_title: "Study session",
        })),
        currentStreak: streakResult.data ?? 0,
        longestStreak: longestResult.data ?? 0,
        todayPomodoros: todayResult.data ?? 0,
      };

      dbg("H2", "AICoach.tsx:beforeGeminiFetch", "prepared userData", {
        roadmapsCount: (userData.roadmaps || []).length,
        subtasksCount: (userData.subtasks || []).length,
        studySessionsCount: (userData.studySessions || []).length,
      });

      const prompt = `You are an AI Learning Coach. Based on this learner's data, respond with exactly one JSON object (no markdown, no code fence). Use this shape only:
{"greeting":"string - one short personalized greeting sentence","insights":[{"title":"string","detail":"string"}],"recommendations":[{"task":"string - e.g. Introduction to React: Core Concepts","reason":"string - one line why","effort":"string - e.g. 15h","priority":"high|medium|low"}],"motivation":"string - one short motivational line"}

Learner data:
${JSON.stringify(userData)}

Return only the JSON object.`;

      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      let data: Record<string, unknown>;
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        dbg("H3", "AICoach.tsx:geminiResponse", "non-json response", {
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
        });
        throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        const errMsg =
          (data?.error as { message?: string })?.message ||
          `Gemini API error: ${res.status}`;
        dbg("H3", "AICoach.tsx:geminiResponse", "gemini error response", {
          status: res.status,
          statusText: res.statusText,
          errMsg,
        });

        // Probe which models this key can access (no secrets logged).
        try {
          const modelsRes = await fetch(
            `${GEMINI_MODELS_URL}?key=${GEMINI_API_KEY}`,
            { method: "GET" },
          );
          const modelsJson = (await modelsRes.json()) as any;
          const names: string[] = (modelsJson?.models || [])
            .map((m: any) => m?.name)
            .filter(Boolean);
          const sample = names.slice(0, 8);
          dbg("H4", "AICoach.tsx:modelsProbe", "models list fetched", {
            ok: modelsRes.ok,
            status: modelsRes.status,
            count: names.length,
            sample,
            hasGemini20Flash: names.some((n) =>
              String(n).includes("gemini-2.0-flash"),
            ),
            hasGemini25Flash: names.some((n) =>
              String(n).includes("gemini-2.5-flash"),
            ),
            hasGemini3: names.some((n) => String(n).includes("gemini-3")),
          });
        } catch (e: unknown) {
          dbg("H4", "AICoach.tsx:modelsProbe", "models probe failed", {
            message: e instanceof Error ? e.message : String(e),
          });
        }

        throw new Error(errMsg);
      }

      const blockReason = (
        data?.candidates as Array<{
          finishReason?: string;
          content?: { parts?: Array<{ text?: string }> };
          safetyRatings?: unknown;
        }>
      )?.[0]?.finishReason;
      const text = (
        data?.candidates as Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>
      )?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        dbg("H5", "AICoach.tsx:geminiResponse", "gemini empty text", {
          blockReason: blockReason || null,
        });
        throw new Error(
          blockReason
            ? `Response blocked: ${blockReason}`
            : "No response from Gemini.",
        );
      }

      const coach = parseCoachJson(text);
      if (
        coach &&
        Array.isArray(coach.insights) &&
        Array.isArray(coach.recommendations)
      ) {
        dbg("H5", "AICoach.tsx:parseCoachJson", "parsed coach json", {
          insights: coach.insights.length,
          recommendations: coach.recommendations.length,
        });
        setCoachData({
          greeting:
            coach.greeting ||
            "Hello! Here are your personalized recommendations.",
          insights: coach.insights,
          recommendations: coach.recommendations,
          motivation:
            coach.motivation ||
            "Small steps lead to big progress. You got this!",
        });
      } else {
        dbg("H5", "AICoach.tsx:parseCoachJson", "failed to parse coach json", {
          textLen: text.length,
        });
        throw new Error("Invalid response format from AI.");
      }
    } catch (error: unknown) {
      console.error("Error fetching coach advice:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to get AI recommendations. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      case "low":
        return "bg-success text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!hasData) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Learning Coach</CardTitle>
              <p className="text-sm text-muted-foreground">
                Personalized recommendations
              </p>
            </div>
          </div>
          <Button
            onClick={fetchCoachAdvice}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-primary/30 hover:bg-primary/10"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                {coachData ? "Refresh" : "Get Advice"}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!coachData && !loading && (
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 text-primary/40 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Click "Get Advice" to receive AI-powered study recommendations
              based on your progress
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-3">
            <span className="inline-flex gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: "300ms" }}
              />
            </span>
            <span className="text-sm text-muted-foreground">
              Getting recommendations…
            </span>
          </div>
        )}

        {coachData && !loading && (
          <div className="space-y-5 animate-fade-in">
            {/* Greeting */}
            <div className="text-lg font-medium text-foreground">
              {coachData.greeting}
            </div>

            {/* Insights */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Lightbulb className="h-4 w-4" />
                Insights
              </div>
              <Accordion type="multiple" className="space-y-1">
                {coachData.insights.map((insight, index) => (
                  <AccordionItem
                    key={index}
                    value={`insight-${index}`}
                    className="border border-border/50 rounded-lg bg-muted/50 px-3 data-[state=open]:bg-muted/80"
                  >
                    <AccordionTrigger className="text-sm text-foreground/80 hover:no-underline py-3">
                      <div className="flex items-center gap-2 text-left">
                        <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                        {insight.title}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-3">
                      {insight.detail}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                Recommended Next Steps
              </div>
              <div className="space-y-2">
                {coachData.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="bg-card border border-border/50 rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer group"
                    onClick={() => onNavigateToRoadmaps?.()}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {rec.task}
                      </h4>
                      <Badge
                        className={getPriorityColor(rec.priority)}
                        variant="secondary"
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {rec.reason}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-primary font-medium flex items-center gap-1">
                        <Clock className="h-3.5 w-3" />
                        {rec.effort}
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                        Open in Roadmap <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Motivation */}
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-4 border border-primary/20">
              <p className="text-sm text-foreground italic">
                💪 {coachData.motivation}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

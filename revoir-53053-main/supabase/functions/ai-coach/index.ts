import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserStudyData {
  roadmaps: Array<{
    id: string;
    title: string;
    subject: string;
    difficulty: string;
  }>;
  subtasks: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    estimated_hours: number;
    roadmap_title: string;
    updated_at: string;
  }>;
  studySessions: Array<{
    duration_minutes: number;
    completed_at: string;
    subtask_title: string;
  }>;
  currentStreak: number;
  longestStreak: number;
  todayPomodoros: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData } = await req.json() as { userData: UserStudyData };
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in Supabase secrets");
    }

    // Analyze user data
    const completedTasks = userData.subtasks.filter(t => t.completed);
    const pendingTasks = userData.subtasks.filter(t => !t.completed);
    
    // Find tasks not touched in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const stagnantTasks = pendingTasks.filter(task => {
      const lastUpdate = new Date(task.updated_at);
      return lastUpdate < sevenDaysAgo;
    });

    // Calculate total study time
    const totalStudyMinutes = userData.studySessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);

    // Recent activity (last 7 days)
    const recentSessions = userData.studySessions.filter(s => {
      const sessionDate = new Date(s.completed_at);
      return sessionDate >= sevenDaysAgo;
    });
    const recentStudyMinutes = recentSessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  const systemPrompt = `You are a concise CS learning coach. Keep ALL text under 15-20 words max. Be crisp and direct.

Your response MUST be a valid JSON object with this exact structure:
{
  "greeting": "Short greeting, max 15 words",
  "insights": [
    { "title": "Max 15 words summary", "detail": "2-3 sentence detailed explanation with actionable advice" }
  ],
  "recommendations": [
    {
      "task": "Exact task title from user's pending tasks (must match exactly)",
      "roadmap_title": "Exact roadmap title this task belongs to",
      "reason": "Max 15 words why",
      "effort": "e.g. '2h'",
      "priority": "high" | "medium" | "low"
    }
  ],
  "motivation": "Max 20 words"
}

CRITICAL: "task" must be the EXACT title from the user's pending tasks list. "roadmap_title" must match exactly too. Keep everything ultra-concise.`;

    const userPrompt = `User Study Data:

ROADMAPS:
${userData.roadmaps.map(r => `- ${r.title} (${r.subject}, ${r.difficulty})`).join('\n')}

COMPLETED TASKS (${completedTasks.length}):
${completedTasks.slice(-5).map(t => `- ${t.title} (${t.roadmap_title})`).join('\n') || 'None yet'}

PENDING TASKS (${pendingTasks.length}):
${pendingTasks.slice(0, 10).map(t => `- ${t.title} (${t.roadmap_title}, Est: ${t.estimated_hours || '?'}h)`).join('\n') || 'None'}

STAGNANT TASKS (not touched in 7+ days):
${stagnantTasks.slice(0, 5).map(t => `- ${t.title} (${t.roadmap_title})`).join('\n') || 'None - great job staying consistent!'}

STUDY STATS:
- Total study time: ${totalStudyHours} hours
- Recent week: ${(recentStudyMinutes / 60).toFixed(1)} hours
- Current streak: ${userData.currentStreak} days
- Longest streak: ${userData.longestStreak} days
- Today's pomodoros: ${userData.todayPomodoros}

Based on this data, provide 3 personalized task recommendations with reasons, insights about their learning patterns, and motivation.`;

    console.log('Calling Gemini AI with user study data...');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('AI coach response received:', content);

    // Parse JSON from response
    let coachResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      coachResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback response
      coachResponse = {
        greeting: "Hey there, learner! 👋",
        insights: [
          { title: `${pendingTasks.length} tasks waiting to be conquered`, detail: "Review your pending tasks and pick the most impactful one to start with today." },
          userData.currentStreak > 0 
            ? { title: `${userData.currentStreak}-day streak — keep it going!`, detail: "Consistency is key. Even 25 minutes of focused study today will maintain your momentum." }
            : { title: "Start a new streak today", detail: "Every journey begins with one step. Set a timer for 25 minutes and tackle your easiest pending task." }
        ],
        recommendations: pendingTasks.slice(0, 3).map((task, i) => ({
          task: task.title,
          reason: i === 0 ? "This is your next logical step" : "Good follow-up task",
          effort: `${task.estimated_hours || 2} hours`,
          priority: i === 0 ? "high" : "medium"
        })),
        motivation: "Every hour of focused learning brings you closer to mastery. Let's make today count!"
      };
    }

    return new Response(
      JSON.stringify({ coach: coachResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error in ai-coach function:', error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, Loader2 } from "lucide-react";

export const TestAICoach = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testAICoach = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to test AI Coach");
        return;
      }

      // Mock user data for testing
      const mockUserData = {
        roadmaps: [
          { id: "1", title: "Learn React", subject: "Web Development", difficulty: "intermediate" },
          { id: "2", title: "Master TypeScript", subject: "Programming", difficulty: "advanced" }
        ],
        subtasks: [
          { id: "1", title: "Understanding useState Hook", description: "Learn React state management", completed: true, estimated_hours: 2, roadmap_title: "Learn React", updated_at: "2024-01-15" },
          { id: "2", title: "Building Components", description: "Create reusable React components", completed: false, estimated_hours: 3, roadmap_title: "Learn React", updated_at: "2024-01-10" },
          { id: "3", title: "TypeScript Basics", description: "Understanding types and interfaces", completed: false, estimated_hours: 4, roadmap_title: "Master TypeScript", updated_at: "2024-01-08" }
        ],
        studySessions: [
          { duration_minutes: 45, completed_at: "2024-01-15T10:00:00Z", subtask_title: "Understanding useState Hook" },
          { duration_minutes: 30, completed_at: "2024-01-14T14:00:00Z", subtask_title: "Study session" }
        ],
        currentStreak: 3,
        longestStreak: 7,
        todayPomodoros: 2
      };

      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { userData: mockUserData },
      });

      if (error) throw error;

      setResults(data);
      toast.success("AI Coach test successful!");
    } catch (error: any) {
      console.error('AI Coach test error:', error);
      toast.error(error.message || "Failed to test AI Coach");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Coach Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testAICoach} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing AI Coach...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Test AI Coach with Gemini API
            </>
          )}
        </Button>

        {results && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">Test Results:</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Greeting:</strong> {results.coach?.greeting}</p>
              <p><strong>Insights:</strong></p>
              <ul className="ml-4 list-disc">
                {results.coach?.insights?.map((insight: any, i: number) => (
                  <li key={i}>
                    <strong>{insight.title}:</strong> {insight.detail}
                  </li>
                ))}
              </ul>
              <p><strong>Recommendations:</strong></p>
              <ul className="ml-4 list-disc">
                {results.coach?.recommendations?.map((rec: any, i: number) => (
                  <li key={i}>
                    <strong>{rec.task}</strong> - {rec.reason} (Priority: {rec.priority})
                  </li>
                ))}
              </ul>
              <p><strong>Motivation:</strong> {results.coach?.motivation}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

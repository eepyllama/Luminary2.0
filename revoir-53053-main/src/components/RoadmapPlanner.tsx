import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Sparkles, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { supabase } from "@/integrations/supabase/client";

interface RoadmapPlannerProps {
  roadmapData: any;
}

interface StudyEvent {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

export default function RoadmapPlanner({ roadmapData }: RoadmapPlannerProps) {
  const { signInAndExecute, addEventsToCalendar } = useGoogleAuth();
  const [planType, setPlanType] = useState<"weekly" | "monthly">("weekly");
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<StudyEvent[]>([]);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

  const handleGeneratePlan = async () => {
    if (!roadmapData || !roadmapData.subtasks || roadmapData.subtasks.length === 0) {
      toast.error("No roadmap data available to generate a plan");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-study-plan', {
        body: {
          roadmap: roadmapData,
          planType,
          hoursPerWeek,
        },
      });

      if (error) throw error;

      if (data?.events && Array.isArray(data.events)) {
        setGeneratedPlan(data.events);
        toast.success(`Generated ${data.events.length} study sessions! 🎉`);
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error) {
      console.error("Error generating study plan:", error);
      toast.error("Failed to generate study plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToCalendar = async () => {
    if (!generatedPlan || generatedPlan.length === 0) {
      toast.error("No study plan to add");
      return;
    }

    setIsAddingToCalendar(true);
    try {
      await signInAndExecute(async () => {
        await addEventsToCalendar(generatedPlan);
        toast.success("Study plan added to your Google Calendar!");
        setIsAddingToCalendar(false);
      });
    } catch (error) {
      console.error('Error adding to calendar:', error);
      toast.error("Failed to add events to calendar");
      setIsAddingToCalendar(false);
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50 w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Calendar className="h-6 w-6 text-primary" />
          Roadmap Study Planner
        </CardTitle>
        <p className="text-muted-foreground">
          Generate a personalized study schedule and sync it with Google Calendar
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="planType">Plan Type</Label>
              <Select value={planType} onValueChange={(value: "weekly" | "monthly") => setPlanType(value)}>
                <SelectTrigger id="planType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly Schedule</SelectItem>
                  <SelectItem value="monthly">Monthly Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="hoursPerWeek">Hours per Week</Label>
              <Input
                id="hoursPerWeek"
                type="number"
                min={1}
                max={40}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(parseInt(e.target.value) || 10)}
              />
            </div>
          </div>

          <Button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="w-full bg-gradient-primary text-primary-foreground shadow-orange"
            size="lg"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            {isGenerating ? "Gemini is generating your plan..." : "Generate Your Study Plan"}
          </Button>
        </div>

        {/* Plan Preview Section */}
        {generatedPlan.length > 0 && (
          <div className="space-y-4">
            <div className="border-t border-border pt-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Your Study Plan Preview ({generatedPlan.length} sessions)
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {generatedPlan.map((event, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg bg-muted/20">
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{event.summary}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(event.start.dateTime).toLocaleString()} - {new Date(event.end.dateTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleAddToCalendar}
              disabled={isAddingToCalendar}
              className="w-full bg-primary hover:bg-primary-hover"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              {isAddingToCalendar ? "Adding to Calendar..." : "Add to Google Calendar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

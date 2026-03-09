import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import RoadmapPlanner from "./RoadmapPlanner";

export default function CalendarPreview() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<any>(null);

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const fetchRoadmaps = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roadmapsData } = await supabase
        .from('roadmaps')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (roadmapsData && roadmapsData.length > 0) {
        const roadmap = roadmapsData[0];
        const { data: subtasksData } = await supabase
          .from('subtasks')
          .select('*')
          .eq('roadmap_id', roadmap.id);

        setSelectedRoadmap({
          ...roadmap,
          subtasks: subtasksData || []
        });
      }
    } catch (error) {
      console.error("Error fetching roadmaps:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-t border-border" />
      
      {selectedRoadmap && selectedRoadmap.subtasks.length > 0 && (
        <RoadmapPlanner roadmapData={selectedRoadmap} />
      )}

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Study Calendar</CardTitle>
          <p className="text-muted-foreground">View and plan your study sessions</p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border border-border w-full"
          />
        </CardContent>
      </Card>
    </div>
  );
}

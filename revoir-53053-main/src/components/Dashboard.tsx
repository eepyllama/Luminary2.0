import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Clock, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AICoach } from "@/components/AICoach";
interface Roadmap {
  id: string;
  title: string;
  subject: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  deadline: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  hoursCommitted: number;
  hoursSpent: number;
}

interface DashboardProps {
  onCreateRoadmap: () => void;
  onNavigateToRoadmaps?: () => void;
}

export function Dashboard({ onCreateRoadmap, onNavigateToRoadmaps }: DashboardProps) {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const fetchRoadmaps = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: roadmapsData, error: roadmapsError } = await supabase
        .from('roadmaps')
        .select('*')
        .order('created_at', { ascending: false });

      if (roadmapsError) throw roadmapsError;

      // Fetch subtasks for each roadmap
      const roadmapsWithStats = await Promise.all(
        (roadmapsData || []).map(async (roadmap) => {
          const { data: subtasksData } = await supabase
            .from('subtasks')
            .select('*')
            .eq('roadmap_id', roadmap.id);

          const totalTasks = subtasksData?.length || 0;
          const completedTasks = subtasksData?.filter(st => st.completed).length || 0;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          // Fetch hours spent - safely handle if function doesn't exist yet
          let hoursSpent = 0;
          try {
            const supabaseClient = supabase as any;
            const { data: hoursData } = await supabaseClient
              .rpc('get_roadmap_hours_spent', { roadmap_uuid: roadmap.id });
            hoursSpent = hoursData || 0;
          } catch (error) {
            console.log('Hours tracking not yet available:', error);
          }

          return {
            id: roadmap.id,
            title: roadmap.title,
            subject: roadmap.subject,
            progress: progress,
            totalTasks: totalTasks,
            completedTasks: completedTasks,
            deadline: 'No deadline',
            difficulty: (roadmap.difficulty.charAt(0).toUpperCase() + roadmap.difficulty.slice(1)) as "Beginner" | "Intermediate" | "Advanced",
            hoursCommitted: (roadmap as any).hours_committed || 0,
            hoursSpent: hoursSpent
          };
        })
      );

      setRoadmaps(roadmapsWithStats);
    } catch (error) {
      console.error("Error fetching roadmaps:", error);
      toast.error("Failed to load roadmaps");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalRoadmaps: roadmaps.length,
    averageProgress: Math.round(roadmaps.reduce((acc, r) => acc + r.progress, 0) / roadmaps.length),
    completedTasks: roadmaps.reduce((acc, r) => acc + r.completedTasks, 0),
    totalTasks: roadmaps.reduce((acc, r) => acc + r.totalTasks, 0)
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-success text-success-foreground";
      case "Intermediate": return "bg-warning text-warning-foreground";
      case "Advanced": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading your roadmaps...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Learning Dashboard</h2>
          <p className="text-muted-foreground">Track. Analyze. Illuminate.</p>
        </div>
        <Button onClick={onCreateRoadmap} className="bg-primary hover:bg-primary-hover shadow-orange">
          <Plus className="h-4 w-4 mr-2" />
          New Roadmap
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Roadmaps</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalRoadmaps}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Progress</p>
                <p className="text-2xl font-bold text-foreground">{stats.averageProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold text-foreground">{stats.completedTasks}/{stats.totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Study Streak</p>
                <p className="text-2xl font-bold text-foreground">7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Coach */}
      <AICoach onNavigateToRoadmaps={onNavigateToRoadmaps} />

      {/* Roadmaps Grid */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-4">Your Learning Roadmaps</h3>
        {roadmaps.length === 0 ? (
          <Card className="bg-gradient-card border-border/50 p-8 text-center">
            <p className="text-muted-foreground mb-4">No roadmaps yet. Create your first learning roadmap to get started!</p>
            <Button onClick={onCreateRoadmap} className="bg-primary hover:bg-primary-hover">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Roadmap
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roadmaps.map((roadmap) => (
            <Card key={roadmap.id} className="bg-gradient-card border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {roadmap.title}
                  </CardTitle>
                  <Badge className={getDifficultyColor(roadmap.difficulty)}>
                    {roadmap.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{roadmap.subject}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground font-medium">{roadmap.progress}%</span>
                  </div>
                  <Progress value={roadmap.progress} className="h-2" />
                </div>
                
                {roadmap.hoursCommitted > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Hrs / Time Spent</span>
                      <span className="text-foreground font-medium">
                        {(roadmap.hoursSpent || 0).toFixed(1)}/{roadmap.hoursCommitted} hrs
                      </span>
                    </div>
                    <Progress 
                      value={roadmap.hoursCommitted > 0 ? ((roadmap.hoursSpent || 0) / roadmap.hoursCommitted) * 100 : 0} 
                      className="h-2" 
                    />
                  </div>
                )}
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {roadmap.completedTasks}/{roadmap.totalTasks} tasks
                  </span>
                  <span className="text-muted-foreground">Due: {roadmap.deadline}</span>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
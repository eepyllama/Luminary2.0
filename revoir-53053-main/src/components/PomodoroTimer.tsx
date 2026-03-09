import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Subtask {
  id: string;
  title: string;
}

interface PomodoroTimerProps {
  roadmaps: Array<{ id: string; title: string }>;
  onSessionComplete: () => void;
}

export function PomodoroTimer({ roadmaps, onSessionComplete }: PomodoroTimerProps) {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [initialMinutes, setInitialMinutes] = useState(25);
  const [selectedRoadmap, setSelectedRoadmap] = useState<string>("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [selectedSubtask, setSelectedSubtask] = useState<string>("");

  useEffect(() => {
    if (selectedRoadmap) {
      fetchSubtasks();
    } else {
      setSubtasks([]);
      setSelectedSubtask("");
    }
  }, [selectedRoadmap]);

  const fetchSubtasks = async () => {
    try {
      const { data } = await supabase
        .from('subtasks')
        .select('id, title')
        .eq('roadmap_id', selectedRoadmap)
        .order('created_at', { ascending: true });

      if (data) {
        setSubtasks(data);
      }
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    }
  };
  
useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    // This part runs the countdown
    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds === 0) {
          setMinutes((prev) => prev - 1);
          setSeconds(59);
        } else {
          setSeconds((prev) => prev - 1);
        }
      }, 1000);
    } 
    // THIS IS THE CRUCIAL FIX:
    // This part runs ONLY when the timer hits 00:00
    else if (isActive && minutes === 0 && seconds === 0) {
      handleSessionComplete();
    }

    // This cleans up the interval
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, minutes, seconds]); // The dependencies are important!


const handleSessionComplete = async () => {
  // Ensure timer stops and UI doesn't get stuck at 00:00
  setIsActive(false);

  if (!selectedRoadmap) {
    toast.error("Please select a roadmap before starting");
    resetTimer();
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to track study sessions");
      resetTimer();
      return;
    }

    const { error } = await supabase.from('study_sessions').insert({
      user_id: user.id,
      roadmap_id: selectedRoadmap,
      subtask_id: selectedSubtask || null,
      duration_minutes: initialMinutes,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error saving study session:', error);
      toast.error('Could not save study session');
      resetTimer();
      return;
    }

    // ✅ SUCCESS: log + reset + streak refresh
    toast.success("Great job! Time logged to your roadmap.");
    resetTimer();          // auto-reset
    onSessionComplete();   // refresh streak calendar
  } catch (error) {
    console.error('Error saving study session:', error);
    toast.error('Could not save study session');
    resetTimer();
  }
};

  const toggleTimer = () => {
    if (!selectedRoadmap && !isActive) {
      toast.error("Please select a roadmap first");
      return;
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    const safe = Number.isFinite(initialMinutes) && initialMinutes > 0 ? initialMinutes : 1;
    setMinutes(safe);
    setSeconds(0);
  };

  const handleMinutesChange = (value: string) => {
    const parsed = parseInt(value, 10);
    const clamped = Number.isFinite(parsed) ? Math.min(120, Math.max(1, parsed)) : 1;
    setInitialMinutes(clamped);
    setMinutes(clamped);
    setSeconds(0);
  };

  const safeInitial = Number.isFinite(initialMinutes) && initialMinutes > 0 ? initialMinutes : 1;
  const elapsed = safeInitial * 60 - (minutes * 60 + seconds);
  const progress = Math.min(100, Math.max(0, (elapsed / (safeInitial * 60)) * 100));
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <Card className="bg-gradient-card border-border/50">
      <CardContent className="p-8">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative w-64 h-64">
            <svg className="transform -rotate-90 w-64 h-64">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-foreground">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {isActive ? 'Focus Time' : 'Ready to Start'}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-xs space-y-4">
            <div className="space-y-2">
              <Label>Select Roadmap</Label>
              <Select value={selectedRoadmap} onValueChange={setSelectedRoadmap} disabled={isActive}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a roadmap" />
                </SelectTrigger>
                <SelectContent>
                  {roadmaps.map((roadmap) => (
                    <SelectItem key={roadmap.id} value={roadmap.id}>
                      {roadmap.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRoadmap && subtasks.length > 0 && (
              <div className="space-y-2">
                <Label>Select Module (Optional)</Label>
                <Select value={selectedSubtask} onValueChange={setSelectedSubtask} disabled={isActive}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {subtasks.map((subtask) => (
                      <SelectItem key={subtask.id} value={subtask.id}>
                        {subtask.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={Number.isFinite(initialMinutes) && initialMinutes > 0 ? initialMinutes : 1}
                onChange={(e) => handleMinutesChange(e.target.value)}
                disabled={isActive}
                min="1"
                max="120"
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <Button
              size="lg"
              onClick={toggleTimer}
              className="bg-primary hover:bg-primary-hover shadow-orange"
            >
              {isActive ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={resetTimer}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

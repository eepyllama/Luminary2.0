import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Award, Calendar as CalendarIcon, Target } from "lucide-react";
import { format } from "date-fns";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  today_count: number;
}

export function StreakCalendar() {
  const [dayCounts, setDayCounts] = useState<Map<string, number>>(new Map());
  const [streakData, setStreakData] = useState<StreakData>({ 
    current_streak: 0, 
    longest_streak: 0,
    today_count: 0 
  });

  useEffect(() => {
    fetchStudyData();
  }, []);

  const fetchStudyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch study sessions with counts per day
      try {
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('completed_at')
          .eq('user_id', user.id);

        if (sessions) {
          const counts = new Map<string, number>();
          sessions.forEach((s: any) => {
            const dateStr = new Date(s.completed_at).toDateString();
            counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
          });
          setDayCounts(counts);
        }
      } catch (error) {
        console.log('Study sessions table not yet available:', error);
      }

      // Fetch streak data using database functions
      try {
        const [currentStreakResult, longestStreakResult] = await Promise.all([
          supabase.rpc('get_current_streak', { user_uuid: user.id }),
          supabase.rpc('get_longest_streak', { user_uuid: user.id })
        ]);

        // Calculate today's count from the sessions we already fetched
        const today = new Date().toDateString();
        const todayCount = dayCounts.get(today) || 0;

        setStreakData({
          current_streak: currentStreakResult.data || 0,
          longest_streak: longestStreakResult.data || 0,
          today_count: todayCount
        });
      } catch (error) {
        console.log('Streak functions not yet available:', error);
      }
    } catch (error) {
      console.error('Error fetching study data:', error);
    }
  };

  // Generate last 42 days (6 weeks)
  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 41; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  const getDayColor = (date: Date) => {
    const dateStr = date.toDateString();
    const count = dayCounts.get(dateStr) || 0;
    const today = new Date().toDateString();
    const isToday = dateStr === today;
    
    // Color gradient based on Pomodoro count
    if (count === 0) {
      // No Pomodoros - dark red
      return isToday 
        ? 'bg-destructive/30 hover:bg-destructive/40 border-2 border-primary' 
        : 'bg-destructive/20 hover:bg-destructive/30';
    } else if (count === 1) {
      // 1 Pomodoro - light green with pattern
      return isToday
        ? 'bg-success/40 hover:bg-success/50 border-2 border-primary bg-gradient-to-br from-success/30 to-success/50'
        : 'bg-success/40 hover:bg-success/50 bg-gradient-to-br from-success/30 to-success/50';
    } else if (count === 2) {
      // 2 Pomodoros - medium green
      return isToday
        ? 'bg-success/60 hover:bg-success/70 border-2 border-primary'
        : 'bg-success/60 hover:bg-success/70';
    } else if (count === 3) {
      // 3 Pomodoros - bright green
      return isToday
        ? 'bg-success/80 hover:bg-success/90 border-2 border-primary'
        : 'bg-success/80 hover:bg-success/90';
    } else {
      // 4+ Pomodoros - full bright green
      return isToday
        ? 'bg-success hover:bg-success border-2 border-primary'
        : 'bg-success hover:bg-success';
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          Study Streak Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Today's Info */}
        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Today</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {format(new Date(), 'MMMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Target className="h-5 w-5 text-success" />
            <span className="text-2xl font-bold text-foreground">
              {streakData.today_count}
            </span>
            <span className="text-sm text-muted-foreground">
              Pomodoro{streakData.today_count !== 1 ? 's' : ''} completed
            </span>
          </div>
        </div>

        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-primary rounded-lg p-4 text-center">
            <Flame className="h-8 w-8 mx-auto mb-2 text-primary-foreground" />
            <div className="text-3xl font-bold text-primary-foreground">
              {streakData.current_streak}
            </div>
            <div className="text-sm text-primary-foreground/80">Current Streak</div>
            <div className="text-xs text-primary-foreground/60 mt-1">
              {streakData.current_streak === 1 ? 'day' : 'days'}
            </div>
          </div>
          <div className="bg-gradient-success rounded-lg p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-success-foreground" />
            <div className="text-3xl font-bold text-success-foreground">
              {streakData.longest_streak}
            </div>
            <div className="text-sm text-success-foreground/80">Longest Streak</div>
            <div className="text-xs text-success-foreground/60 mt-1">
              {streakData.longest_streak === 1 ? 'day' : 'days'}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-xs text-muted-foreground text-center font-medium">
                {day}
              </div>
            ))}
            {calendarDays.map((date, index) => {
              const dateStr = date.toDateString();
              const count = dayCounts.get(dateStr) || 0;
              return (
                <div
                  key={index}
                  className={`aspect-square rounded-md transition-colors relative ${getDayColor(date)}`}
                  title={`${date.toLocaleDateString()}${count > 0 ? ` - ${count} Pomodoro${count !== 1 ? 's' : ''}` : ''}`}
                >
                  {count > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-lg">
                      {count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3 text-xs flex-wrap mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-destructive/20" />
              <span className="text-muted-foreground">0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-success/40" />
              <span className="text-muted-foreground">1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-success/60" />
              <span className="text-muted-foreground">2</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-success/80" />
              <span className="text-muted-foreground">3</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-success" />
              <span className="text-muted-foreground">4+</span>
            </div>
            <span className="text-muted-foreground ml-2">Pomodoros</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

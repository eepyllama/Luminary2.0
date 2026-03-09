import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sword, Flame, Trophy, ExternalLink, Calendar } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { format } from "date-fns";
interface LeetCodeProblem {
  date: string;
  question: {
    title: string;
    titleSlug: string;
    difficulty: string;
  };
}
interface CodingStreak {
  id: string;
  user_id: string;
  date: string;
  problem_title: string;
  problem_link: string;
  difficulty: string;
  completed: boolean;
  created_at: string;
}
const motivationalQuotes = ["Discipline > Motivation", "Each bug is a lesson.", "Warriors are built one problem at a time.", "Consistency is the ultimate power.", "The only way out is through.", "Small daily wins create legends."];
const WarriorMode = () => {
  const {
    user
  } = useAuth();
  const [dailyChallenge, setDailyChallenge] = useState<LeetCodeProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [streaks, setStreaks] = useState<CodingStreak[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [quote] = useState(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  useEffect(() => {
    if (user) {
      fetchDailyChallenge();
      fetchStreaks();
    }
  }, [user]);
  const fetchDailyChallenge = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('leetcode-daily');
      if (error) throw error;
      setDailyChallenge(data.data.activeDailyCodingChallengeQuestion);
    } catch (error) {
      console.error("Error fetching daily challenge:", error);
      toast.error("Failed to load today's challenge");
    } finally {
      setLoading(false);
    }
  };
  const fetchStreaks = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('coding_streaks').select('*').eq('user_id', user.id).order('date', {
        ascending: false
      });
      if (error) throw error;
      setStreaks(data || []);
      calculateStreak(data || []);
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayEntry = data?.find(s => s.date === today && s.completed);
      setTodayCompleted(!!todayEntry);
    } catch (error) {
      console.error("Error fetching streaks:", error);
    }
  };
  const calculateStreak = (data: CodingStreak[]) => {
    if (!data.length) {
      setCurrentStreak(0);
      return;
    }
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const entry = data.find(s => s.date === dateStr && s.completed);
      if (entry) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    setCurrentStreak(streak);
  };
  const handleMarkComplete = async () => {
    if (!user || !dailyChallenge) return;
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const {
        error
      } = await supabase.from('coding_streaks').upsert({
        user_id: user.id,
        date: today,
        problem_title: dailyChallenge.question.title,
        problem_link: `https://leetcode.com/problems/${dailyChallenge.question.titleSlug}/`,
        difficulty: dailyChallenge.question.difficulty,
        completed: true
      }, {
        onConflict: 'user_id,date'
      });
      if (error) throw error;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: {
          y: 0.6
        }
      });
      toast.success("🎉 Victory! You completed today's challenge!\nStreak +1 🔥");
      await fetchStreaks();
    } catch (error) {
      console.error("Error marking complete:", error);
      toast.error("Failed to mark as completed");
    }
  };
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'hard':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const filteredStreaks = filterDifficulty === 'all' ? streaks : streaks.filter(s => s.difficulty.toLowerCase() === filterDifficulty);
  const totalSolved = streaks.filter(s => s.completed).length;
  const lastSolved = streaks.length > 0 ? format(new Date(streaks[0].date), 'MMM dd, yyyy') : 'Never';
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading battlefield...</p>
      </div>;
  }
  return <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3">
            <Sword className="h-10 w-10 text-primary" />
            🛡️ Warrior Mode
          </h1>
          <p className="text-muted-foreground text-lg">Step into the coding battleground — one problem at a time.</p>
        </div>

        {/* Motivational Quote */}
        <Card className="bg-transparent border-border/30">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-semibold text-foreground">"{quote}"</p>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <p className="text-3xl font-bold text-foreground">{currentStreak}</p>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold text-foreground">{totalSolved}</p>
              <p className="text-sm text-muted-foreground">Total Solved</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-lg font-bold text-foreground">{lastSolved}</p>
              <p className="text-sm text-muted-foreground">Last Solved</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Challenge */}
        {dailyChallenge ? <Card className="bg-gradient-card border-primary/30 shadow-orange">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Sword className="h-6 w-6 text-primary" />
                Today's Challenge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {dailyChallenge.question.title}
                  </h3>
                  <Badge className={getDifficultyColor(dailyChallenge.question.difficulty)}>
                    {dailyChallenge.question.difficulty}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => window.open(`https://leetcode.com/problems/${dailyChallenge.question.titleSlug}/`, '_blank')} variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Solve Now
                  </Button>
                  {!todayCompleted && <Button onClick={handleMarkComplete} className="bg-primary hover:bg-primary/90">
                      Mark as Completed
                    </Button>}
                  {todayCompleted && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 px-4 py-2">
                      ✓ Completed Today
                    </Badge>}
                </div>
              </div>

              {currentStreak > 0 && <p className="text-muted-foreground">
                  🔥 You're on a {currentStreak}-day streak! Keep going!
                </p>}
              {currentStreak === 0 && streaks.length > 0 && <p className="text-muted-foreground">
                  Even warriors rest. Rise again ⚔️
                </p>}
            </CardContent>
          </Card> : <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-12 text-center">
              <Sword className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                You haven't entered Warrior Mode yet ⚔️
              </h3>
              <p className="text-muted-foreground mb-4">Start with today's LeetCode challenge!</p>
              <Button onClick={fetchDailyChallenge} className="bg-primary hover:bg-primary/90">
                Enter Battleground
              </Button>
            </CardContent>
          </Card>}

        {/* Practice Log */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-2xl">Practice Log</CardTitle>
              <div className="flex gap-2">
                <Button variant={filterDifficulty === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterDifficulty('all')}>
                  All
                </Button>
                <Button variant={filterDifficulty === 'easy' ? 'default' : 'outline'} size="sm" onClick={() => setFilterDifficulty('easy')} className={filterDifficulty === 'easy' ? 'bg-green-500 hover:bg-green-600' : ''}>
                  Easy
                </Button>
                <Button variant={filterDifficulty === 'medium' ? 'default' : 'outline'} size="sm" onClick={() => setFilterDifficulty('medium')} className={filterDifficulty === 'medium' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
                  Medium
                </Button>
                <Button variant={filterDifficulty === 'hard' ? 'default' : 'outline'} size="sm" onClick={() => setFilterDifficulty('hard')} className={filterDifficulty === 'hard' ? 'bg-red-500 hover:bg-red-600' : ''}>
                  Hard
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStreaks.length === 0 ? <p className="text-center text-muted-foreground py-8">
                No problems solved yet. Start your journey!
              </p> : <div className="space-y-3">
                {filteredStreaks.map(streak => <div key={streak.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50 hover:border-primary/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{streak.problem_title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className={getDifficultyColor(streak.difficulty)}>
                          {streak.difficulty}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(streak.date), 'MMM dd, yyyy')}
                        </span>
                        {streak.completed && <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            ✓ Completed
                          </Badge>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => window.open(streak.problem_link, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>)}
              </div>}
          </CardContent>
        </Card>

        {/* Future Features */}
        <Card className="bg-gradient-card border-border/50 opacity-60">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              🏆 Leaderboard — Compete with friends (coming soon)
            </p>
            <p className="text-muted-foreground mt-2">
              ⚔️ Daily Reminders — Stay sharp! (coming soon)
            </p>
          </CardContent>
        </Card>

        {/* Motivation Message */}
        <Card className="bg-gradient-primary border-primary/20">
          
        </Card>
      </div>
    </div>;
};
export default WarriorMode;
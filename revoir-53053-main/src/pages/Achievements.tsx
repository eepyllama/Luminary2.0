import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Flame, BookOpen, Target, Clock, Star, Zap, Award,
  Crown, Shield, Rocket, Medal, TrendingUp, Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  category: "streak" | "tasks" | "roadmaps" | "time";
}

interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalPomodoros: number;
  totalRoadmaps: number;
  completedTasks: number;
  totalTasks: number;
  totalStudyMinutes: number;
  weeklyActivity: { day: string; minutes: number }[];
  categoryBreakdown: { name: string; value: number }[];
  streakHistory: { date: string; streak: number }[];
}

const TIER_STYLES = {
  bronze: "from-amber-700/20 to-amber-900/10 border-amber-700/30",
  silver: "from-slate-300/20 to-slate-500/10 border-slate-400/30",
  gold: "from-yellow-400/20 to-amber-500/10 border-yellow-500/40",
  platinum: "from-violet-400/20 to-indigo-500/10 border-violet-500/40",
};

const TIER_BADGE = {
  bronze: "bg-amber-700/20 text-amber-700 dark:text-amber-400",
  silver: "bg-slate-400/20 text-slate-600 dark:text-slate-300",
  gold: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  platinum: "bg-violet-500/20 text-violet-700 dark:text-violet-400",
};

const TIER_ICON_BG = {
  bronze: "bg-amber-700/10",
  silver: "bg-slate-400/10",
  gold: "bg-yellow-500/10",
  platinum: "bg-violet-500/10",
};

const CHART_COLORS = [
  "hsl(16, 100%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(220, 70%, 55%)",
  "hsl(280, 60%, 55%)",
];

export default function Achievements() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebratedIds, setCelebratedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { data: roadmaps },
        { data: subtasks },
        { data: sessions },
        { data: currentStreak },
        { data: longestStreak },
      ] = await Promise.all([
        supabase.from("roadmaps").select("id, title, subject"),
        supabase.from("subtasks").select("id, completed, roadmap_id"),
        supabase.from("study_sessions").select("duration_minutes, completed_at, roadmap_id"),
        supabase.rpc("get_current_streak", { user_uuid: user.id }),
        supabase.rpc("get_longest_streak", { user_uuid: user.id }),
      ]);

      const totalMinutes = (sessions || []).reduce((sum, s) => sum + s.duration_minutes, 0);
      const completedTasks = (subtasks || []).filter(s => s.completed).length;

      // Weekly activity (last 7 days)
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toISOString().split("T")[0];
        const mins = (sessions || [])
          .filter(s => s.completed_at.startsWith(dayStr))
          .reduce((sum, s) => sum + s.duration_minutes, 0);
        return { day: days[d.getDay()], minutes: mins };
      });

      // Category breakdown by roadmap subject
      const subjectMap = new Map<string, number>();
      (sessions || []).forEach(s => {
        const rm = (roadmaps || []).find(r => r.id === s.roadmap_id);
        const subject = rm?.subject || "Other";
        subjectMap.set(subject, (subjectMap.get(subject) || 0) + s.duration_minutes);
      });
      const categoryBreakdown = Array.from(subjectMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Streak history (last 14 days)
      const streakHistory = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        const dayStr = d.toISOString().split("T")[0];
        const had = (sessions || []).some(s => s.completed_at.startsWith(dayStr));
        return { date: `${d.getMonth() + 1}/${d.getDate()}`, streak: had ? 1 : 0 };
      });

      setStats({
        currentStreak: currentStreak || 0,
        longestStreak: longestStreak || 0,
        totalPomodoros: (sessions || []).length,
        totalRoadmaps: (roadmaps || []).length,
        completedTasks,
        totalTasks: (subtasks || []).length,
        totalStudyMinutes: totalMinutes,
        weeklyActivity,
        categoryBreakdown,
        streakHistory,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load achievements");
    } finally {
      setLoading(false);
    }
  };

  const achievements: AchievementBadge[] = useMemo(() => {
    if (!stats) return [];
    return [
      // Streak badges
      { id: "streak-3", title: "Warming Up", description: "3-day study streak", icon: <Flame className="h-6 w-6" />, unlocked: stats.longestStreak >= 3, progress: Math.min(stats.longestStreak, 3), maxProgress: 3, tier: "bronze", category: "streak" },
      { id: "streak-7", title: "Week Warrior", description: "7-day study streak", icon: <Zap className="h-6 w-6" />, unlocked: stats.longestStreak >= 7, progress: Math.min(stats.longestStreak, 7), maxProgress: 7, tier: "silver", category: "streak" },
      { id: "streak-30", title: "30-Day Legend", description: "30-day study streak", icon: <Crown className="h-6 w-6" />, unlocked: stats.longestStreak >= 30, progress: Math.min(stats.longestStreak, 30), maxProgress: 30, tier: "gold", category: "streak" },
      { id: "streak-100", title: "Centurion", description: "100-day study streak", icon: <Shield className="h-6 w-6" />, unlocked: stats.longestStreak >= 100, progress: Math.min(stats.longestStreak, 100), maxProgress: 100, tier: "platinum", category: "streak" },
      // Task badges
      { id: "tasks-5", title: "Getting Started", description: "Complete 5 tasks", icon: <Target className="h-6 w-6" />, unlocked: stats.completedTasks >= 5, progress: Math.min(stats.completedTasks, 5), maxProgress: 5, tier: "bronze", category: "tasks" },
      { id: "tasks-25", title: "Task Crusher", description: "Complete 25 tasks", icon: <Star className="h-6 w-6" />, unlocked: stats.completedTasks >= 25, progress: Math.min(stats.completedTasks, 25), maxProgress: 25, tier: "silver", category: "tasks" },
      { id: "tasks-50", title: "Task Master", description: "Complete 50 tasks", icon: <Award className="h-6 w-6" />, unlocked: stats.completedTasks >= 50, progress: Math.min(stats.completedTasks, 50), maxProgress: 50, tier: "gold", category: "tasks" },
      { id: "tasks-100", title: "Completionist", description: "Complete 100 tasks", icon: <Medal className="h-6 w-6" />, unlocked: stats.completedTasks >= 100, progress: Math.min(stats.completedTasks, 100), maxProgress: 100, tier: "platinum", category: "tasks" },
      // Roadmap badges
      { id: "roadmap-1", title: "First Steps", description: "Create your first roadmap", icon: <BookOpen className="h-6 w-6" />, unlocked: stats.totalRoadmaps >= 1, progress: Math.min(stats.totalRoadmaps, 1), maxProgress: 1, tier: "bronze", category: "roadmaps" },
      { id: "roadmap-3", title: "Multi-Learner", description: "Create 3 roadmaps", icon: <Rocket className="h-6 w-6" />, unlocked: stats.totalRoadmaps >= 3, progress: Math.min(stats.totalRoadmaps, 3), maxProgress: 3, tier: "silver", category: "roadmaps" },
      { id: "roadmap-5", title: "Knowledge Seeker", description: "Create 5 roadmaps", icon: <TrendingUp className="h-6 w-6" />, unlocked: stats.totalRoadmaps >= 5, progress: Math.min(stats.totalRoadmaps, 5), maxProgress: 5, tier: "gold", category: "roadmaps" },
      // Time badges
      { id: "time-60", title: "First Hour", description: "Study for 1 hour total", icon: <Clock className="h-6 w-6" />, unlocked: stats.totalStudyMinutes >= 60, progress: Math.min(stats.totalStudyMinutes, 60), maxProgress: 60, tier: "bronze", category: "time" },
      { id: "time-600", title: "Dedicated Learner", description: "Study for 10 hours total", icon: <Calendar className="h-6 w-6" />, unlocked: stats.totalStudyMinutes >= 600, progress: Math.min(stats.totalStudyMinutes, 600), maxProgress: 600, tier: "silver", category: "time" },
      { id: "time-3000", title: "Study Machine", description: "Study for 50 hours total", icon: <Trophy className="h-6 w-6" />, unlocked: stats.totalStudyMinutes >= 3000, progress: Math.min(stats.totalStudyMinutes, 3000), maxProgress: 3000, tier: "gold", category: "time" },
    ] as AchievementBadge[];
  }, [stats]);

  const celebrate = (id: string) => {
    if (celebratedIds.has(id)) return;
    setCelebratedIds(prev => new Set(prev).add(id));
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading achievements...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          Achievements
        </h2>
        <p className="text-muted-foreground">
          {unlockedCount}/{achievements.length} badges unlocked
        </p>
        <Progress value={(unlockedCount / achievements.length) * 100} className="h-3 max-w-xs mx-auto" />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Flame className="h-5 w-5 text-primary" />, label: "Current Streak", value: `${stats?.currentStreak || 0} days` },
          { icon: <Crown className="h-5 w-5 text-primary" />, label: "Best Streak", value: `${stats?.longestStreak || 0} days` },
          { icon: <Target className="h-5 w-5 text-primary" />, label: "Tasks Done", value: `${stats?.completedTasks || 0}` },
          { icon: <Clock className="h-5 w-5 text-primary" />, label: "Study Time", value: `${Math.round((stats?.totalStudyMinutes || 0) / 60)}h` },
        ].map((s, i) => (
          <Card key={i} className="bg-gradient-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Streak Reward Banner */}
      {(stats?.currentStreak || 0) > 0 && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 overflow-hidden relative">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Flame className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-lg">
                🔥 {stats?.currentStreak}-Day Streak!
              </p>
              <p className="text-sm text-muted-foreground">
                {(stats?.currentStreak || 0) >= 30
                  ? "Legendary! You're unstoppable! 🏆"
                  : (stats?.currentStreak || 0) >= 7
                    ? "Amazing consistency — keep the fire burning! ⚡"
                    : "Great start — study today to keep it alive!"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievement Badges Grid */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Medal className="h-5 w-5 text-primary" /> Badges
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {achievements.map((badge) => (
            <Card
              key={badge.id}
              onClick={() => badge.unlocked && celebrate(badge.id)}
              className={`relative overflow-hidden border transition-all duration-300 cursor-pointer
                bg-gradient-to-br ${TIER_STYLES[badge.tier]}
                ${badge.unlocked ? "hover:scale-[1.03] hover:shadow-lg" : "opacity-50 grayscale"}
              `}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${TIER_ICON_BG[badge.tier]}`}>
                    {badge.icon}
                  </div>
                  <Badge className={`text-[10px] uppercase tracking-wide ${TIER_BADGE[badge.tier]}`}>
                    {badge.tier}
                  </Badge>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{badge.title}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{badge.progress}/{badge.maxProgress}</span>
                    <span>{Math.round((badge.progress / badge.maxProgress) * 100)}%</span>
                  </div>
                  <Progress value={(badge.progress / badge.maxProgress) * 100} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Performance Analytics */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Performance Analytics
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Study Activity (min)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.weeklyActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Study Time by Subject</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {(stats?.categoryBreakdown || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats?.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name }) => name}
                    >
                      {(stats?.categoryBreakdown || []).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(value: number) => `${value} min`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-10">No study data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Streak History */}
          <Card className="bg-gradient-card border-border/50 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">14-Day Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={stats?.streakHistory || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis hide domain={[0, 1]} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => v === 1 ? "✅ Active" : "❌ Missed"}
                  />
                  <Line type="stepAfter" dataKey="streak" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

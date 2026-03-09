import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Challenge {
  title: string;
  difficulty: string;
  link: string;
  acRate: string;
  date: string;
}

export default function LeetCodeChallenge() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDailyChallenge() {
      try {
        const { data, error } = await supabase.functions.invoke('leetcode-daily');
        
        if (error) throw error;
        
        const question = data.data?.activeDailyCodingChallengeQuestion;

        if (question) {
          setChallenge({
            title: question.question.title,
            difficulty: question.question.difficulty,
            link: "https://leetcode.com" + question.link,
            acRate: question.question.acRate.toFixed(2),
            date: question.date,
          });
        } else {
          throw new Error("Failed to fetch LeetCode challenge");
        }
      } catch (err) {
        setError("Failed to load today's challenge 😭");
        console.error("Error fetching daily challenge:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDailyChallenge();
  }, []);

  if (loading)
    return (
      <Card className="p-6 mt-6 flex justify-center items-center">
        <Loader2 className="animate-spin mr-2" /> Loading today's challenge...
      </Card>
    );

  if (error)
    return (
      <Card className="p-6 mt-6 text-center text-destructive font-semibold">
        {error}
      </Card>
    );

  if (!challenge) return null;

  return (
    <Card className="mt-6 bg-gradient-to-r from-background to-muted border border-primary rounded-2xl shadow-lg">
      <CardContent className="p-6 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-primary mb-2">
          🚀 Today's LeetCode Challenge
        </h2>
        <p className="text-xl text-foreground mb-2">{challenge.title}</p>
        <p className="text-muted-foreground text-sm mb-3">
          Difficulty:{" "}
          <span
            className={
              challenge.difficulty === "Easy"
                ? "text-green-400"
                : challenge.difficulty === "Medium"
                ? "text-yellow-400"
                : "text-red-400"
            }
          >
            {challenge.difficulty}
          </span>{" "}
          | Acceptance Rate: {challenge.acRate}%
        </p>

        <Button
          onClick={() => window.open(challenge.link, "_blank")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2 rounded-xl transition-all"
        >
          ⚔️ Enter Battleground
        </Button>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { StreakCalendar } from "@/components/StreakCalendar";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Music } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Roadmap {
  id: string;
  title: string;
}

export function StudySessions() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchRoadmaps();
    const savedUrl = localStorage.getItem('spotifyPlaylist');
    if (savedUrl) {
      setEmbedUrl(savedUrl);
    }
  }, []);

  const fetchRoadmaps = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('roadmaps')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (data) {
        setRoadmaps(data);
      }
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
    }
  };

  const handleSessionComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleSavePlaylist = () => {
    if (!spotifyUrl.trim()) {
      toast.error("Please paste a Spotify embed link");
      return;
    }

    // Extract the src URL from the iframe embed code
    const srcMatch = spotifyUrl.match(/src="([^"]+)"/);
    const url = srcMatch ? srcMatch[1] : spotifyUrl;

    if (!url.includes('spotify.com/embed')) {
      toast.error("Please paste a valid Spotify embed link");
      return;
    }

    setEmbedUrl(url);
    localStorage.setItem('spotifyPlaylist', url);
    setSpotifyUrl("");
    toast.success("Playlist saved!");
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Clock className="h-8 w-8 text-primary" />
          Study Sessions
        </h2>
        <p className="text-muted-foreground">Focus and track your learning journey</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <PomodoroTimer roadmaps={roadmaps} onSessionComplete={handleSessionComplete} />
          
          <Card className="bg-gradient-card border-border shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Music className="h-6 w-6 text-primary" />
                Study Playlist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!embedUrl ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Paste your Spotify playlist embed link below to play music while you study
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste Spotify embed code or link here..."
                      value={spotifyUrl}
                      onChange={(e) => setSpotifyUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSavePlaylist}>
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tip: Right-click on a Spotify playlist → Share → Embed playlist
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <iframe
                    style={{ borderRadius: '12px' }}
                    src={embedUrl}
                    width="100%"
                    height="352"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="shadow-md"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEmbedUrl(null);
                      localStorage.removeItem('spotifyPlaylist');
                      toast.success("Playlist removed");
                    }}
                  >
                    Change Playlist
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <StreakCalendar key={refreshKey} />
      </div>
    </div>
  );
}

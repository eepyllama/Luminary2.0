import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, ExternalLink, Trash2, Edit, Award, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import confetti from "canvas-confetti";

interface Certification {
  id: string;
  course_name: string;
  course_link: string;
  platform: string;
  progress: number;
  completed: boolean;
  created_at: string;
}

const PLATFORMS = [
  { name: "Coursera", domain: "coursera.org", url: "https://www.coursera.org", tagline: "Learn from top universities" },
  { name: "edX", domain: "edx.org", url: "https://www.edx.org", tagline: "University-level learning" },
  { name: "Udemy", domain: "udemy.com", url: "https://www.udemy.com", tagline: "Learn at your own pace" },
  { name: "NPTEL", domain: "nptel.ac.in", url: "https://nptel.ac.in", tagline: "Quality education from IITs" },
  { name: "freeCodeCamp", domain: "freecodecamp.org", url: "https://www.freecodecamp.org", tagline: "Learn to code for free" },
  { name: "Google Digital Garage", domain: "learndigital.withgoogle.com", url: "https://learndigital.withgoogle.com/digitalgarage", tagline: "Grow your digital skills" },
  { name: "Other", domain: "", url: "", tagline: "" }
];

const detectPlatform = (url: string): string => {
  const platform = PLATFORMS.find(p => p.domain && url.toLowerCase().includes(p.domain));
  return platform ? platform.name : "Other";
};

const getProgressColor = (progress: number): string => {
  if (progress < 40) return "bg-destructive";
  if (progress < 80) return "bg-yellow-500";
  return "bg-green-500";
};

export default function Certifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [courseName, setCourseName] = useState("");
  const [courseLink, setCourseLink] = useState("");
  const [platform, setPlatform] = useState("");
  const [progress, setProgress] = useState(0);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  
  // Completion celebration state
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [completedCert, setCompletedCert] = useState<Certification | null>(null);

  useEffect(() => {
    fetchCertifications();
  }, []);

  const fetchCertifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("certifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCertifications(data || []);
    } catch (error) {
      console.error("Error fetching certifications:", error);
      toast.error("Failed to load certifications");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || !courseLink.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to add certifications");
        return;
      }

      const detectedPlatform = platform || detectPlatform(courseLink);
      const isCompleted = progress === 100;

      const { error } = await supabase.from("certifications").insert({
        user_id: user.id,
        course_name: courseName,
        course_link: courseLink,
        platform: detectedPlatform,
        progress,
        completed: isCompleted,
      });

      if (error) throw error;

      toast.success("Certification added successfully!");
      
      // Reset form
      setCourseName("");
      setCourseLink("");
      setPlatform("");
      setProgress(0);
      
      // Refresh list
      await fetchCertifications();
      
      // Trigger celebration if completed
      if (isCompleted) {
        const newCert: Certification = {
          id: "temp",
          course_name: courseName,
          course_link: courseLink,
          platform: detectedPlatform,
          progress: 100,
          completed: true,
          created_at: new Date().toISOString()
        };
        triggerCelebration(newCert);
      }
    } catch (error) {
      console.error("Error adding certification:", error);
      toast.error("Failed to add certification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("certifications").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Certification deleted");
      await fetchCertifications();
    } catch (error) {
      console.error("Error deleting certification:", error);
      toast.error("Failed to delete certification");
    }
  };

  const openEditDialog = (cert: Certification) => {
    setEditingCert(cert);
    setEditProgress(cert.progress);
    setEditDialogOpen(true);
  };

  const handleUpdateProgress = async () => {
    if (!editingCert) return;
    
    try {
      const wasCompleted = editingCert.completed;
      const isNowCompleted = editProgress === 100;
      
      const { error } = await supabase
        .from("certifications")
        .update({ 
          progress: editProgress,
          completed: isNowCompleted 
        })
        .eq("id", editingCert.id);

      if (error) throw error;
      
      toast.success("Progress updated!");
      setEditDialogOpen(false);
      await fetchCertifications();
      
      // Trigger celebration if just completed
      if (!wasCompleted && isNowCompleted) {
        triggerCelebration({ ...editingCert, progress: 100, completed: true });
      }
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    }
  };

  const triggerCelebration = (cert: Certification) => {
    // Confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    setCompletedCert(cert);
    setCelebrationOpen(true);
  };

  const shareOnLinkedIn = () => {
    if (!completedCert) return;
    
    const text = `Just completed the ${completedCert.course_name} certification on ${completedCert.platform}! #LearningNeverStops #Tech #CS`;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(completedCert.course_link)}`;
    
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Award className="h-8 w-8" />
              My Certifications
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your learning journey and celebrate your achievements
            </p>
          </div>
        </div>

        {/* Add Certification Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Certification</CardTitle>
            <CardDescription>Track a new course or certification</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courseName">Course Name *</Label>
                  <Input
                    id="courseName"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="e.g., Complete Python Bootcamp"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="courseLink">Course Link *</Label>
                  <Input
                    id="courseLink"
                    type="url"
                    value={courseLink}
                    onChange={(e) => {
                      setCourseLink(e.target.value);
                      if (!platform) {
                        setPlatform(detectPlatform(e.target.value));
                      }
                    }}
                    placeholder="https://..."
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detected from link" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="progress">Progress: {progress}%</Label>
                  <Slider
                    id="progress"
                    value={[progress]}
                    onValueChange={(val) => setProgress(val[0])}
                    max={100}
                    step={5}
                  />
                </div>
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Certification"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Certifications Grid */}
        {certifications.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certifications.map((cert) => (
              <Card key={cert.id} className="relative overflow-hidden">
                {cert.completed && (
                  <div className="absolute top-2 right-2">
                    <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{cert.course_name}</CardTitle>
                  <CardDescription>{cert.platform}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-bold">{cert.progress}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={cert.progress} className="h-2" />
                      <div 
                        className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor(cert.progress)}`}
                        style={{ width: `${cert.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(cert.course_link, "_blank")}
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(cert)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(cert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Empty State
          <div className="text-center space-y-8 py-12">
            <div>
              <Award className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">You haven't added any certifications yet</h2>
              <p className="text-muted-foreground">Start learning something new today!</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Recommended Learning Platforms</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {PLATFORMS.filter(p => p.domain).map((platform) => (
                  <Card key={platform.name} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{platform.name}</CardTitle>
                      <CardDescription>{platform.tagline}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(platform.url, "_blank")}
                      >
                        Explore
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Future Feature Placeholder */}
        <Card className="border-dashed bg-muted/50">
          <CardContent className="py-8 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              <strong>Coming Soon:</strong> Get reminders when your courses are pending or due!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Progress Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>
              {editingCert?.course_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Progress: {editProgress}%</Label>
              <Slider
                value={[editProgress]}
                onValueChange={(val) => setEditProgress(val[0])}
                max={100}
                step={5}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleUpdateProgress} className="flex-1">
                Update
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Celebration Dialog */}
      <Dialog open={celebrationOpen} onOpenChange={setCelebrationOpen}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-3xl flex items-center justify-center gap-2">
              🎉 Yay! You did it! 🎉
            </DialogTitle>
            <DialogDescription className="text-lg pt-4">
              Congratulations on completing <strong>{completedCert?.course_name}</strong>!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <p className="text-muted-foreground">
              Ready to inspire others? Share your achievement on LinkedIn!
            </p>
            
            <div className="flex gap-2">
              <Button onClick={shareOnLinkedIn} className="flex-1">
                Share on LinkedIn
              </Button>
              <Button variant="outline" onClick={() => setCelebrationOpen(false)}>
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

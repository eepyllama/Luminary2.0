import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, BookOpen, Clock, Target, Sparkles, Loader2, ExternalLink, CheckCircle, Play, FileText, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    description: string | null;
    estimated_hours: number | null;
    deadline: string | null;
    status: string | null;
    completed: boolean | null;
  };
  roadmapSubject?: string;
  roadmapDifficulty?: string;
  onUpdate: () => void;
}

interface AgentProcessingResult {
  nodeAnalysis: {
    keyConcepts: string[];
    skillsDeveloped: string[];
    commonChallenges: string[];
    essentialPrerequisites: string[];
    learningOutcomes: string[];
    estimatedComplexity: number;
    learningApproach: string;
  };
  harvestedResources: {
    query: string;
    articles: Array<{
      platform: string;
      title: string;
      url: string;
      score?: number;
      comments?: number;
      publishedAt?: string | null;
      author?: string | null;
    }>;
    pages: Array<{
      platform: string;
      title: string;
      url: string;
      domain?: string | null;
      sourceCountry?: string | null;
      publishedAt?: string | null;
    }>;
    discussions: Array<{
      platform: string;
      title: string;
      url: string;
      subreddit?: string | null;
      score?: number;
      comments?: number;
      publishedAt?: string | null;
      author?: string | null;
    }>;
    videos: Array<{
      platform: string;
      title: string;
      url: string;
      channel?: string | null;
      views?: number | null;
      publishedAt?: string | null;
      durationSeconds?: number | null;
      via?: string;
    }>;
    qa: Array<{
      platform: string;
      title: string;
      url: string;
      score?: number;
      answers?: number;
      publishedAt?: string | null;
      tags?: string[];
    }>;
    tweets: Array<{
      platform: string;
      title: string;
      url: string;
      publishedAt?: string | null;
      via?: string;
    }>;
  };
  scrapedPreviews: Array<{
    url: string;
    text: string | null;
    scraper: string;
    error?: string;
  }>;
  prereqs: Array<{
    title: string;
    why: string;
    howToVerify: string;
    quickPractice: string;
    searchQueries: string[];
  }>;
  learningPath: Array<{
    step: number;
    title: string;
    description: string;
    activities: string[];
    resources: string[];
    estimatedTime: string;
    successCriteria: string;
  }>;
  assessments: {
    knowledgeChecks: Array<{
      question: string;
      type: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }>;
    practicalExercises: Array<{
      title: string;
      description: string;
      estimatedTime: string;
      deliverables: string[];
      successCriteria: string;
    }>;
    reflectionPrompts: string[];
    peerReviewSuggestions: string[];
  };
  processingSummary: {
    totalAgentsRun: number;
    resourcesFound: number;
    resourcesScraped: number;
    learningSteps: number;
    knowledgeChecks: number;
    practicalExercises: number;
  };
  techInfo?: {
    webHarvesterAgent?: string;
    pageScraperAgent?: string;
    llmPlannerAgent?: string;
    sources?: Record<string, string>;
  };
}

export const EnhancedTaskDetailsModal = ({ 
  open, 
  onOpenChange, 
  task, 
  roadmapSubject,
  roadmapDifficulty,
  onUpdate 
}: TaskDetailsModalProps) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [estimatedHours, setEstimatedHours] = useState(task.estimated_hours || 0);
  const [deadline, setDeadline] = useState<Date | undefined>(
    task.deadline ? new Date(task.deadline) : undefined
  );
  const [status, setStatus] = useState(task.status || "not_started");
  const [isSaving, setIsSaving] = useState(false);
  
  // Agent processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentResults, setAgentResults] = useState<AgentProcessingResult | null>(null);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<{ [key: number]: number }>({});

  const runAgentProcessing = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("node-agent-processor", {
        body: {
          nodeTitle: task.title,
          nodeDescription: task.description || "",
          roadmapSubject: roadmapSubject || "",
          roadmapDifficulty: roadmapDifficulty || "intermediate",
        },
      });

      if (error) throw error;

      setAgentResults(data);
      toast.success(
        `AI analysis complete! Found ${data.processingSummary.resourcesFound} links (${data.processingSummary.resourcesScraped} previews scraped)`,
      );
    } catch (error: any) {
      console.error("Error running agent processing:", error);
      toast.error(error.message || "Failed to run AI analysis");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setEstimatedHours(task.estimated_hours || 0);
    setDeadline(task.deadline ? new Date(task.deadline) : undefined);
    setStatus(task.status || "not_started");
    setAgentResults(null);
    setSelectedQuizAnswer({});
  }, [task]);

  // Separate useEffect for AI analysis to prevent infinite loop
  useEffect(() => {
    // Auto-run AI analysis when modal opens
    if (open && task.title && !agentResults && !isProcessing) {
      runAgentProcessing();
    }
  }, [open, task.title, agentResults, isProcessing]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("subtasks")
        .update({
          title,
          description,
          estimated_hours: estimatedHours,
          deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
          status,
          completed: status === "completed",
        })
        .eq("id", task.id);

      if (error) throw error;

      toast.success("Task updated successfully");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    setSelectedQuizAnswer(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const checkQuizAnswer = (questionIndex: number, correctAnswer: number) => {
    return selectedQuizAnswer[questionIndex] === correctAnswer;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const previewByUrl = (agentResults?.scrapedPreviews || []).reduce<Record<string, { text: string | null; scraper: string; error?: string }>>((acc, p) => {
    acc[p.url] = { text: p.text, scraper: p.scraper, error: p.error };
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Learning Node Details
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="ai-analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="ai-analysis" className="relative">
              AI Analysis
              {isProcessing && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="prereqs">Prereqs</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Estimated Hours</Label>
                  <Input
                    id="hours"
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={setDeadline}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai-analysis" className="space-y-4 py-4">
            {isProcessing && (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI Agents Working...</span>
                </div>
              </div>
            )}

            {!isProcessing && !agentResults && (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>AI analysis is running... This will take a few moments.</p>
                <p className="text-sm mt-2">Our agents are analyzing content and finding resources.</p>
              </div>
            )}

            {agentResults && (
              <div className="space-y-6">
                {/* Node Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Deep Content Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Key Concepts</h4>
                      <div className="flex flex-wrap gap-2">
                        {agentResults.nodeAnalysis.keyConcepts.map((concept, i) => (
                          <Badge key={i} variant="secondary">{concept}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Skills You'll Develop</h4>
                      <div className="flex flex-wrap gap-2">
                        {agentResults.nodeAnalysis.skillsDeveloped.map((skill, i) => (
                          <Badge key={i} className="bg-blue-100 text-blue-800">{skill}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Common Challenges</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {agentResults.nodeAnalysis.commonChallenges.map((challenge, i) => (
                          <li key={i}>{challenge}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Essential Prerequisites</h4>
                      <div className="flex flex-wrap gap-2">
                        {agentResults.nodeAnalysis.essentialPrerequisites.map((prereq, i) => (
                          <Badge key={i} variant="outline">{prereq}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Complexity</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(agentResults.nodeAnalysis.estimatedComplexity / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm">{agentResults.nodeAnalysis.estimatedComplexity}/10</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Learning Approach</h4>
                        <Badge className="capitalize">{agentResults.nodeAnalysis.learningApproach}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Learning Path */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Step-by-Step Learning Path</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {agentResults.learningPath.map((step) => (
                        <div key={step.step} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                              {step.step}
                            </div>
                            <h4 className="font-medium">{step.title}</h4>
                            <Badge variant="outline">{step.estimatedTime}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                          
                          {step.activities.length > 0 && (
                            <div className="mb-2">
                              <h5 className="text-sm font-medium mb-1">Activities:</h5>
                              <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {step.activities.map((activity, i) => (
                                  <li key={i}>{activity}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="text-sm">
                            <span className="font-medium">Success Criteria: </span>
                            <span className="text-muted-foreground">{step.successCriteria}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 py-4">
            {agentResults ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Web Resources (latest/top)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      Found {agentResults.processingSummary.resourcesFound} links, scraped {agentResults.processingSummary.resourcesScraped} previews.
                    </div>
                    {agentResults.harvestedResources?.query && (
                      <div>
                        <span className="font-medium">Query:</span> <span className="font-mono">{agentResults.harvestedResources.query}</span>
                      </div>
                    )}
                    {agentResults.techInfo && (
                      <div className="pt-1">
                        <span className="font-medium">Tech info:</span>{" "}
                        <span className="font-mono">
                          {agentResults.techInfo.webHarvesterAgent || "Web harvester"} · {agentResults.techInfo.pageScraperAgent || "Scraper"} · {agentResults.techInfo.llmPlannerAgent || "LLM"}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Articles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" /> Articles (HN)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(agentResults.harvestedResources?.articles || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No articles found.</div>
                    ) : (
                      agentResults.harvestedResources.articles.map((a, i) => {
                        const pv = previewByUrl[a.url];
                        return (
                          <div key={i} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-sm">{a.title}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {a.platform} · score {a.score ?? 0} · {a.comments ?? 0} comments
                                </div>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <a href={a.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                            {pv?.text && (
                              <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Preview scraped via <span className="font-mono">{pv.scraper}</span>
                                </div>
                                <p className="text-muted-foreground line-clamp-3">{pv.text}</p>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Videos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Play className="h-5 w-5" /> YouTube Videos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(agentResults.harvestedResources?.videos || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No videos found.</div>
                    ) : (
                      agentResults.harvestedResources.videos.map((v, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-sm">{v.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {v.platform} · {v.channel || "Unknown channel"}{v.via ? ` · ${v.via}` : ""}
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={v.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Discussions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" /> Discussions (Reddit)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(agentResults.harvestedResources?.discussions || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No discussions found.</div>
                    ) : (
                      agentResults.harvestedResources.discussions.map((d, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-sm">{d.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {d.platform}{d.subreddit ? ` · r/${d.subreddit}` : ""} · score {d.score ?? 0} · {d.comments ?? 0} comments
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={d.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Pages */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" /> Pages (News/Web via GDELT)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(agentResults.harvestedResources?.pages || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No pages found.</div>
                    ) : (
                      agentResults.harvestedResources.pages.map((p, i) => {
                        const pv = previewByUrl[p.url];
                        return (
                          <div key={i} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-sm">{p.title}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {p.platform}{p.domain ? ` · ${p.domain}` : ""}
                                </div>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <a href={p.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                            {pv?.text && (
                              <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Preview scraped via <span className="font-mono">{pv.scraper}</span>
                                </div>
                                <p className="text-muted-foreground line-clamp-3">{pv.text}</p>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Twitter/X */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" /> X / Twitter (best-effort)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(agentResults.harvestedResources?.tweets || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No tweets found.</div>
                    ) : (
                      agentResults.harvestedResources.tweets.map((t, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-sm">{t.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {t.platform}{t.via ? ` · ${t.via}` : ""}
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={t.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Q&A */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5" /> Q&A (Stack Overflow)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(agentResults.harvestedResources?.qa || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No Q&A found.</div>
                    ) : (
                      agentResults.harvestedResources.qa.map((q, i) => {
                        const pv = previewByUrl[q.url];
                        return (
                          <div key={i} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-sm">{q.title}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {q.platform} · score {q.score ?? 0} · {q.answers ?? 0} answers
                                </div>
                                {Array.isArray(q.tags) && q.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {q.tags.slice(0, 8).map((t, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-[10px]">{t}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <a href={q.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                            {pv?.text && (
                              <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Preview scraped via <span className="font-mono">{pv.scraper}</span>
                                </div>
                                <p className="text-muted-foreground line-clamp-3">{pv.text}</p>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Run AI Analysis to discover learning resources</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="prereqs" className="space-y-4 py-4">
            {agentResults ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Prereqs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(agentResults.prereqs || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">No prerequisites returned.</div>
                    ) : (
                      agentResults.prereqs.map((p, i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-2">
                          <div className="font-medium">{p.title}</div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Why:</span> {p.why}
                          </div>
                          {p.howToVerify && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">How to verify:</span> {p.howToVerify}
                            </div>
                          )}
                          {p.quickPractice && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Quick practice:</span> {p.quickPractice}
                            </div>
                          )}
                          {p.searchQueries?.length > 0 && (
                            <div className="pt-2">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Suggested searches</div>
                              <div className="flex flex-wrap gap-2">
                                {p.searchQueries.map((q, idx) => (
                                  <Badge key={idx} variant="outline" className="font-mono text-[10px]">
                                    {q}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Run AI Analysis to generate prerequisites</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="assessment" className="space-y-4 py-4">
            {agentResults ? (
              <div className="space-y-6">
                {/* Knowledge Checks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Knowledge Checks</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {agentResults.assessments.knowledgeChecks.map((quiz, qIndex) => (
                      <div key={qIndex} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">{quiz.question}</h4>
                        <div className="space-y-2">
                          {quiz.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <input
                                type="radio"
                                id={`q${qIndex}_o${oIndex}`}
                                name={`question_${qIndex}`}
                                checked={selectedQuizAnswer[qIndex] === oIndex}
                                onChange={() => handleQuizAnswer(qIndex, oIndex)}
                                className="w-4 h-4"
                              />
                              <label 
                                htmlFor={`q${qIndex}_o${oIndex}`}
                                className={cn(
                                  "flex-1 p-2 rounded cursor-pointer transition-colors",
                                  selectedQuizAnswer[qIndex] === oIndex && "bg-blue-50 border border-blue-200"
                                )}
                              >
                                {option}
                              </label>
                            </div>
                          ))}
                        </div>
                        {selectedQuizAnswer[qIndex] !== undefined && (
                          <div className={cn(
                            "mt-3 p-2 rounded text-sm",
                            checkQuizAnswer(qIndex, quiz.correctAnswer) 
                              ? "bg-green-50 text-green-800" 
                              : "bg-red-50 text-red-800"
                          )}>
                            {checkQuizAnswer(qIndex, quiz.correctAnswer) ? "✓ Correct!" : "✗ Incorrect"}
                            <p className="mt-1">{quiz.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Practical Exercises */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Practical Exercises</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {agentResults.assessments.practicalExercises.map((exercise, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{exercise.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>{exercise.estimatedTime}</span>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium mb-1">Deliverables:</h5>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {exercise.deliverables.map((deliverable, i) => (
                                <li key={i}>{deliverable}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium mb-1">Success Criteria:</h5>
                            <p className="text-sm text-muted-foreground">{exercise.successCriteria}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Reflection and Peer Review */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Self-Reflection
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {agentResults.assessments.reflectionPrompts.map((prompt, index) => (
                          <li key={index} className="text-sm p-2 bg-gray-50 rounded">
                            {prompt}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Peer Review
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {agentResults.assessments.peerReviewSuggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm p-2 bg-gray-50 rounded">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Run AI Analysis to generate assessments</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

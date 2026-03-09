import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export const TestNodeAgent = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTest = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("node-agent-processor", {
        body: {
          nodeTitle: "Learn React Hooks",
          nodeDescription: "Understanding useState, useEffect, and custom hooks in React",
          roadmapSubject: "React Development",
          roadmapDifficulty: "intermediate",
        },
      });

      if (error) throw error;

      setResults(data);
      toast.success("Test completed successfully!");
    } catch (error: any) {
      console.error("Test error:", error);
      toast.error(error.message || "Test failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Node Agent Processor Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTest} 
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isProcessing ? "Running Test..." : "Run Test"}
        </Button>

        {results && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Test Results:</h3>
            <div className="text-sm space-y-2">
              <p><strong>Total Agents Run:</strong> {results.processingSummary.totalAgentsRun}</p>
              <p><strong>Resources Found:</strong> {results.processingSummary.resourcesFound}</p>
              <p><strong>Resources Scraped:</strong> {results.processingSummary.resourcesScraped}</p>
              <p><strong>Learning Steps:</strong> {results.processingSummary.learningSteps}</p>
              <p><strong>Knowledge Checks:</strong> {results.processingSummary.knowledgeChecks}</p>
              <p><strong>Practical Exercises:</strong> {results.processingSummary.practicalExercises}</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Key Concepts Found:</h4>
              <div className="flex flex-wrap gap-2">
                {results.nodeAnalysis.keyConcepts.map((concept: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Sample Resources:</h4>
              {results.resources.slice(0, 3).map((resource: any, i: number) => (
                <div key={i} className="p-2 bg-white rounded text-sm">
                  <p className="font-medium">{resource.title}</p>
                  <p className="text-gray-600">{resource.source}</p>
                  <p className="text-gray-500">{resource.type} - {resource.estimatedTime}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

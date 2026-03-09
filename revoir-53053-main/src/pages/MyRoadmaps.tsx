import { MindMap } from "@/components/MindMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

export function MyRoadmaps() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Map className="h-8 w-8 text-primary" />
          My Roadmaps
        </h2>
        <p className="text-muted-foreground">Visualize and manage your learning paths</p>
      </div>
      
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Interactive Mind Map</CardTitle>
        </CardHeader>
        <CardContent>
          <MindMap />
        </CardContent>
      </Card>
    </div>
  );
}

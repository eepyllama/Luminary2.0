import { CheckCircle2, Lock, Play, Clock, Calendar, Trophy, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, addDays } from 'date-fns';

interface TimelineNode {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  estimated_hours: number | null;
  order: number;
  startDate: Date;
  endDate: Date;
  daysRequired: number;
}

interface TimelineViewProps {
  nodes: TimelineNode[];
  onNodeClick: (node: TimelineNode) => void;
}

export function TimelineView({ nodes, onNodeClick }: TimelineViewProps) {
  const completedCount = nodes.filter(n => n.completed).length;
  const totalCount = nodes.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Find current active node (first incomplete)
  const activeNodeIndex = nodes.findIndex(n => !n.completed);

  return (
    <div className="p-6 space-y-8">
      {/* Progress Header */}
      <div className="bg-gradient-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/20">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Learning Journey</h2>
              <p className="text-sm text-muted-foreground">
                {completedCount} of {totalCount} milestones completed
              </p>
            </div>
          </div>
          <div className="text-3xl font-bold text-primary">{progressPercent}%</div>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      {/* Timeline Path */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-muted rounded-full" />

        <div className="space-y-6">
          {nodes.map((node, index) => {
            const isCompleted = node.completed;
            const isActive = index === activeNodeIndex;
            const isLocked = !isCompleted && index > activeNodeIndex;

            return (
              <div
                key={node.id}
                className={cn(
                  "relative pl-20 transition-all duration-300",
                  isLocked && "opacity-60"
                )}
              >
                {/* Node Marker */}
                <div
                  className={cn(
                    "absolute left-4 w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all z-10",
                    isCompleted && "bg-success border-success text-success-foreground",
                    isActive && "bg-primary border-primary text-primary-foreground animate-pulse",
                    isLocked && "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isActive ? (
                    <Play className="h-5 w-5" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </div>

                {/* Level Badge */}
                <div className="absolute left-0 -top-2 text-xs font-bold text-muted-foreground">
                  LVL {node.order}
                </div>

                {/* Card */}
                <div
                  onClick={() => !isLocked && onNodeClick(node)}
                  className={cn(
                    "rounded-xl p-5 border-2 transition-all cursor-pointer",
                    isCompleted && "bg-success/10 border-success hover:border-success/80",
                    isActive && "bg-primary/10 border-primary hover:border-primary/80 shadow-lg shadow-primary/20",
                    isLocked && "bg-muted/50 border-border cursor-not-allowed",
                    !isLocked && !isCompleted && !isActive && "bg-card border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "font-semibold text-lg",
                          isCompleted && "text-success",
                          isActive && "text-primary",
                          isLocked && "text-muted-foreground"
                        )}>
                          {node.title}
                        </h3>
                        {isActive && (
                          <Badge className="bg-primary text-primary-foreground animate-bounce">
                            Current
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge className="bg-success text-success-foreground">
                            Complete
                          </Badge>
                        )}
                      </div>

                      {node.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {node.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(node.startDate, 'MMM d')}</span>
                          <span>→</span>
                          <span>{format(node.endDate, 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{node.daysRequired} days</span>
                        </div>
                        {node.estimated_hours && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span>{node.estimated_hours}h total</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isCompleted && (
                      <div className="p-2 rounded-full bg-success/20">
                        <Trophy className="h-6 w-6 text-success" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Final Goal */}
          <div className="relative pl-20">
            <div className="absolute left-4 w-10 h-10 rounded-full flex items-center justify-center border-4 bg-warning border-warning text-warning-foreground z-10">
              <Flag className="h-5 w-5" />
            </div>
            <div className="rounded-xl p-5 bg-gradient-to-r from-warning/20 to-primary/20 border-2 border-warning">
              <h3 className="font-bold text-lg text-warning">🎉 Goal Complete!</h3>
              <p className="text-sm text-muted-foreground">
                {progressPercent === 100 
                  ? "Congratulations! You've completed all milestones!" 
                  : `Complete all ${totalCount} milestones to reach your goal`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

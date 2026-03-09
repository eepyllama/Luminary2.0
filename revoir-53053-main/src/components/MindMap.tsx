import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CheckCircle2, Circle, Clock, Sparkles, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { saveMap } from '@/lib/db';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskDetailsModal } from './TaskDetailsModal';
import { EnhancedTaskDetailsModal } from './EnhancedTaskDetailsModal';
import { TimelineView } from './TimelineView';
import { StartDateModal } from './StartDateModal';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { addDays, format, setHours, setMinutes } from 'date-fns';

// Custom node component for roadmap tasks
function TaskNode({ data }: NodeProps) {
  const { title, description, completed, estimatedHours, difficulty, order, status, onClick } = data as {
    title: string;
    description: string | null;
    completed: boolean;
    estimatedHours: number;
    difficulty: string;
    order?: number;
    status?: string | null;
    onClick: () => void;
  };
  
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'hard': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isInProgress = status === 'in_progress';

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border-2 bg-gradient-card min-w-[200px] max-w-[250px] shadow-md transition-all hover:shadow-lg cursor-pointer",
        completed ? "border-success bg-success/10" : 
        isInProgress ? "border-warning bg-warning/20" : 
        "border-border hover:border-primary"
      )}
      onClick={onClick}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary border-2 border-background" />
      
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {order && (
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                #{order}
              </span>
            )}
            <h3 className="font-semibold text-sm text-foreground leading-tight">{title}</h3>
          </div>
          {completed ? (
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <Badge className={getDifficultyColor(difficulty)}>
            {difficulty}
          </Badge>
          
          {estimatedHours && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {estimatedHours}h
            </div>
          )}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary border-2 border-background" />
    </div>
  );
}

// Custom node component for the main goal
function GoalNode({ data }: { data: any }) {
  return (
    <div className="p-6 rounded-xl bg-gradient-primary text-primary-foreground min-w-[250px] shadow-lg">
      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-background border-2 border-primary-foreground" />
      
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold">{data.title}</h2>
        <p className="text-sm opacity-90">{data.subject}</p>
        {data.progress !== undefined && (
          <div className="text-sm font-medium">
            Progress: {data.progress}%
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  task: TaskNode,
  goal: GoalNode,
};

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

export function MindMap() {
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [sortedOrder, setSortedOrder] = useState<Map<string, number>>(new Map());
  const [isSorting, setIsSorting] = useState(false);
  const [mapId, setMapId] = useState<string | null>(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'mindmap' | 'timeline'>('mindmap');
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [timelineNodes, setTimelineNodes] = useState<TimelineNode[]>([]);
  const [scheduleConfig, setScheduleConfig] = useState<{ startDate: Date; hoursPerDay: number } | null>(null);
  
  // Google Calendar
  const { isConnected: isCalendarConnected, isLoading: isCalendarLoading, connect: connectCalendar, addEvents } = useGoogleCalendar();
  
  const [nodes, setNodes, onNodesState] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const selectedRoadmap = roadmaps.find(r => r.id === selectedRoadmapId);

  // Fetch all roadmaps
  useEffect(() => {
    fetchRoadmaps();
  }, []);

  const fetchRoadmaps = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: roadmapsData, error } = await supabase
        .from('roadmaps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRoadmaps(roadmapsData || []);
      if (roadmapsData && roadmapsData.length > 0) {
        setSelectedRoadmapId(roadmapsData[0].id);
      }
    } catch (error) {
      console.error("Error fetching roadmaps:", error);
      toast.error("Failed to load roadmaps");
    } finally {
      setLoading(false);
    }
  };

  // Fetch subtasks and build graph when roadmap is selected
  useEffect(() => {
    if (selectedRoadmapId) {
      loadRoadmapGraph(selectedRoadmapId);
    }
  }, [selectedRoadmapId, sortedOrder]);

  const loadRoadmapGraph = async (roadmapId: string) => {
    try {
      // Fetch roadmap details
      const { data: roadmap, error: roadmapError } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('id', roadmapId)
        .single();

      if (roadmapError) throw roadmapError;

      // Fetch subtasks
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select('*')
        .eq('roadmap_id', roadmapId);

      if (subtasksError) throw subtasksError;

      setSubtasks(subtasksData || []);

      // Sort subtasks by order if we have sorted order
      const orderedSubtasks = [...(subtasksData || [])].sort((a, b) => {
        const orderA = sortedOrder.get(a.id) ?? Infinity;
        const orderB = sortedOrder.get(b.id) ?? Infinity;
        return orderA - orderB;
      });

      // Calculate progress
      const totalTasks = orderedSubtasks.length || 0;
      const completedTasks = orderedSubtasks.filter(st => st.completed).length || 0;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Build nodes
      const newNodes: Node[] = [
        {
          id: 'goal',
          type: 'goal',
          position: { x: 400, y: 50 },
          data: { 
            title: roadmap.title,
            subject: roadmap.subject,
            progress: progress
          },
          draggable: false,
        },
      ];

      // Add subtask nodes - now with order-based positioning
      const tasksPerRow = 3;
      orderedSubtasks.forEach((subtask, index) => {
        const row = Math.floor(index / tasksPerRow);
        const col = index % tasksPerRow;
        const xOffset = 300;
        const yOffset = 200;
        const orderNum = sortedOrder.get(subtask.id);
        
        newNodes.push({
          id: `task-${subtask.id}`,
          type: 'task',
          position: { 
            x: xOffset * col + 100, 
            y: yOffset * (row + 1)
          },
          data: {
            title: subtask.title,
            description: subtask.description,
            completed: subtask.completed,
            estimatedHours: subtask.estimated_hours,
            difficulty: roadmap.difficulty,
            order: orderNum,
            status: subtask.status,
            onClick: () => handleTaskClick(subtask),
          },
        });
      });

      // Build edges - connect in order if sorted
      let newEdges: Edge[] = [];
      if (sortedOrder.size > 0 && orderedSubtasks.length > 1) {
        // Connect goal to first task
        newEdges.push({
          id: `goal-task-${orderedSubtasks[0].id}`,
          source: 'goal',
          target: `task-${orderedSubtasks[0].id}`,
          type: 'smoothstep',
        });
        // Connect tasks in sequence
        for (let i = 0; i < orderedSubtasks.length - 1; i++) {
          newEdges.push({
            id: `task-${orderedSubtasks[i].id}-task-${orderedSubtasks[i + 1].id}`,
            source: `task-${orderedSubtasks[i].id}`,
            target: `task-${orderedSubtasks[i + 1].id}`,
            type: 'smoothstep',
          });
        }
      } else {
        // Default: all connected to goal
        newEdges = orderedSubtasks.map((subtask) => ({
          id: `goal-task-${subtask.id}`,
          source: 'goal',
          target: `task-${subtask.id}`,
          type: 'smoothstep',
        }));
      }

      setNodes(newNodes);
      setEdges(newEdges);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const rawTopic = roadmap.title || roadmap.subject;
          const laid = { nodes: newNodes, edges: newEdges };
          const id = await saveMap(user.id, rawTopic, laid);
          setMapId(id);
        }
      } catch (err) {
        console.error("Error saving mind map:", err);
      }
    } catch (error) {
      console.error("Error loading roadmap graph:", error);
      toast.error("Failed to load roadmap visualization");
    }
  };

  const handleSortRoadmap = async () => {
    if (!subtasks.length) {
      toast.error('No tasks to sort');
      return;
    }

    setIsSorting(true);
    try {
      const response = await supabase.functions.invoke('sort-roadmap', {
        body: {
          nodes: subtasks.map(st => ({
            id: st.id,
            title: st.title,
            description: st.description,
            estimated_hours: st.estimated_hours,
            difficulty: selectedRoadmap?.difficulty
          }))
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { sortedNodes } = response.data;
      const orderMap = new Map<string, number>();
      sortedNodes.forEach((node: { id: string; order: number }) => {
        orderMap.set(node.id, node.order);
      });

      setSortedOrder(orderMap);
      toast.success('Roadmap sorted by optimal learning order!');
    } catch (error) {
      console.error('Error sorting roadmap:', error);
      toast.error('Failed to sort roadmap');
    } finally {
      setIsSorting(false);
    }
  };

  const handleSetStartDate = () => {
    if (sortedOrder.size === 0) {
      toast.error('Please sort the roadmap first before creating a timeline');
      return;
    }
    setIsDateModalOpen(true);
  };

  const handleDateConfirm = (startDate: Date, hoursPerDay: number) => {
    setScheduleConfig({ startDate, hoursPerDay });

    // Calculate timeline nodes
    const orderedSubtasks = [...subtasks].sort((a, b) => {
      const orderA = sortedOrder.get(a.id) ?? Infinity;
      const orderB = sortedOrder.get(b.id) ?? Infinity;
      return orderA - orderB;
    });

    let currentDate = new Date(startDate);
    const calculatedNodes: TimelineNode[] = orderedSubtasks.map((subtask, index) => {
      const estimatedHours = subtask.estimated_hours || 2;
      const daysRequired = Math.max(1, Math.ceil(estimatedHours / hoursPerDay));
      const nodeStartDate = new Date(currentDate);
      const nodeEndDate = addDays(currentDate, daysRequired - 1);

      const node: TimelineNode = {
        id: subtask.id,
        title: subtask.title,
        description: subtask.description,
        completed: subtask.completed || false,
        estimated_hours: subtask.estimated_hours,
        order: sortedOrder.get(subtask.id) || index + 1,
        startDate: nodeStartDate,
        endDate: nodeEndDate,
        daysRequired,
      };

      currentDate = addDays(nodeEndDate, 1);
      return node;
    });

    setTimelineNodes(calculatedNodes);
    setViewMode('timeline');
    toast.success('Timeline created! Switch between views using the buttons.');
  };

  const handleConnectCalendar = async () => {
    if (timelineNodes.length === 0) {
      toast.error('Please create a timeline first');
      return;
    }

    if (!isCalendarConnected) {
      const connected = await connectCalendar();
      if (!connected) return;
    }

    // Convert timeline nodes to calendar events
    const events = timelineNodes.flatMap(node => {
      const eventsForNode = [];
      let currentDate = new Date(node.startDate);
      const hoursPerDay = scheduleConfig?.hoursPerDay || 2;

      while (currentDate <= node.endDate) {
        const startTime = setMinutes(setHours(currentDate, 18), 0); // 6 PM
        const endTime = setMinutes(setHours(currentDate, 18 + hoursPerDay), 0);

        eventsForNode.push({
          summary: `📚 ${node.title}`,
          description: node.description || `Study session for: ${node.title}`,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });

        currentDate = addDays(currentDate, 1);
      }

      return eventsForNode;
    });

    await addEvents(events);
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleTimelineNodeClick = (node: TimelineNode) => {
    const task = subtasks.find(st => st.id === node.id);
    if (task) {
      handleTaskClick(task);
    }
  };

  const handleTaskUpdate = () => {
    if (selectedRoadmapId) {
      loadRoadmapGraph(selectedRoadmapId);
      // Recalculate timeline if in timeline view
      if (scheduleConfig && viewMode === 'timeline') {
        handleDateConfirm(scheduleConfig.startDate, scheduleConfig.hoursPerDay);
      }
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (loading) {
    return (
      <div className="h-[600px] w-full rounded-lg border border-border bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading roadmaps...</p>
      </div>
    );
  }

  if (roadmaps.length === 0) {
    return (
      <div className="h-[600px] w-full rounded-lg border border-border bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No roadmaps yet. Create your first roadmap to see it visualized here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-foreground">Select Roadmap:</label>
          <Select value={selectedRoadmapId || ''} onValueChange={(id) => {
            setSelectedRoadmapId(id);
            setSortedOrder(new Map());
            setTimelineNodes([]);
            setViewMode('mindmap');
          }}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a roadmap" />
            </SelectTrigger>
            <SelectContent>
              {roadmaps.map((roadmap) => (
                <SelectItem key={roadmap.id} value={roadmap.id}>
                  {roadmap.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSortRoadmap}
            disabled={isSorting || !subtasks.length}
          >
            {isSorting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Sort Roadmap
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSetStartDate}
            disabled={sortedOrder.size === 0}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Set Start Date
          </Button>

          <Button
            variant={isCalendarConnected ? "secondary" : "outline"}
            size="sm"
            onClick={handleConnectCalendar}
            disabled={timelineNodes.length === 0 || isCalendarLoading}
          >
            {isCalendarLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4 mr-2" />
            )}
            {isCalendarConnected ? 'Sync to Calendar' : 'Connect Google Calendar'}
          </Button>

          {timelineNodes.length > 0 && (
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={viewMode === 'mindmap' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode('mindmap')}
              >
                Mind Map
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Main View */}
      <div className="h-[600px] w-full rounded-lg border border-border bg-background overflow-hidden">
        {viewMode === 'mindmap' ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesState}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/10"
            defaultEdgeOptions={{
              style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
              markerEnd: {
                type: 'arrowclosed',
                width: 20,
                height: 20,
                color: 'hsl(var(--primary))',
              },
            }}
          >
            <Controls className="bg-card border border-border" />
            <MiniMap 
              className="bg-card border border-border"
              nodeColor={(node) => {
                if (node.type === 'goal') return 'hsl(var(--primary))';
                return node.data.completed ? 'hsl(var(--success))' : 'hsl(var(--muted))';
              }}
            />
            <Background color="hsl(var(--muted-foreground))" gap={20} />
          </ReactFlow>
        ) : (
          <div className="h-full overflow-auto">
            <TimelineView nodes={timelineNodes} onNodeClick={handleTimelineNodeClick} />
          </div>
        )}
      </div>

      {/* Modals */}
      <StartDateModal 
        open={isDateModalOpen} 
        onOpenChange={setIsDateModalOpen}
        onConfirm={handleDateConfirm}
      />

      {selectedTask && (
        <EnhancedTaskDetailsModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          task={selectedTask}
          roadmapSubject={selectedRoadmap?.subject}
          roadmapDifficulty={selectedRoadmap?.difficulty}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
}

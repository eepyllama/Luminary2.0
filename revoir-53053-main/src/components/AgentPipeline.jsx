import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  waiting: "text-muted-foreground border-border/50 bg-muted/30",
  running: "text-primary border-primary/30 bg-primary/10",
  done: "text-success border-success/30 bg-success/10",
  error: "text-destructive border-destructive/30 bg-destructive/10",
};

export default function AgentPipeline({ steps }) {
  return (
    <div className="rounded-xl border border-border/50 bg-gradient-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-lg">🤖</div>
        <div className="font-semibold text-foreground">Agent Pipeline Running</div>
      </div>

      <div className="space-y-2">
        {steps.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2"
          >
            <div className="text-sm text-foreground/90">{s.name}</div>
            <span
              className={cn(
                "text-xs font-medium px-2 py-1 rounded-full border",
                STATUS_STYLES[s.status] || STATUS_STYLES.waiting
              )}
            >
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


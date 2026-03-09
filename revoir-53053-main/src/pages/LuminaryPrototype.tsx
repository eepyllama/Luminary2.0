// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AICoach } from "@/components/AICoach";
import AgentPipeline from "@/components/AgentPipeline";
import { runPipeline, createInitialStatuses } from "@/agents/pipeline.js";
import { supabase } from "@/integrations/supabase/client";

/* ─── GLOBAL CSS ─────────────────────────────────────────────────────────────*/
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
.luminary-root{height:100vh;background:#0a0a0f;color:#e8e8f0;font-family:'Outfit',sans-serif;overflow:hidden;}
:::-webkit-scrollbar{width:5px;height:5px;}
:::-webkit-scrollbar-track{background:transparent;}
:::-webkit-scrollbar-thumb{background:#ff6b2260;border-radius:3px;}

::root{
  --bg:#0a0a0f; --surface:#111118; --surface2:#16161f;
  --card:#1a1a25; --border:#ffffff0c; --border2:#ffffff14;
  --orange:#ff6b22; --orange2:#ff8c4a; --orangeSoft:#ff6b2215; --orangeGlow:#ff6b2240;
  --green:#22c55e; --text:#e8e8f0; --textMuted:#6b7280; --textDim:#9ca3af;
  --mono:'JetBrains Mono',monospace;
}

@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes spinR{to{transform:rotate(-360deg)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px var(--orangeGlow)}50%{box-shadow:0 0 40px var(--orangeGlow)}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes nodeIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
@keyframes ripple{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}
@keyframes borderSpin{to{transform:rotate(360deg)}}

.page{animation:fadeIn .3s ease both;}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;transition:border-color .2s,box-shadow .2s;}
.card:hover{border-color:var(--border2);}
.card-glow:hover{border-color:var(--orangeGlow);box-shadow:0 0 20px var(--orangeSoft);}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:600;font-size:14px;transition:all .2s cubic-bezier(.34,1.56,.64,1);}
.btn:hover{transform:translateY(-2px);}
.btn:active{transform:translateY(0);}
.btn-orange{background:var(--orange);color:#fff;}
.btn-orange:hover{background:var(--orange2);box-shadow:0 6px 20px var(--orangeGlow);}
.btn-ghost{background:var(--surface2);color:var(--textDim);border:1px solid var(--border);}
.btn-ghost:hover{color:var(--text);border-color:var(--border2);}
.tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;font-family:var(--mono);letter-spacing:.04em;}
.shimmer-text{background:linear-gradient(90deg,var(--orange),var(--orange2),#ffb347,var(--orange));background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 3s linear infinite;}
.input{width:100%;padding:11px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:'Outfit',sans-serif;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;}
.input:focus{border-color:var(--orange);box-shadow:0 0 0 3px var(--orangeSoft);}
.input::placeholder{color:var(--textMuted);}
select.input{cursor:pointer;}

/* React Flow overrides */
.react-flow__background{background:#0a0a0f !important;}
.react-flow__controls{background:var(--card) !important;border:1px solid var(--border) !important;border-radius:10px !important;}
.react-flow__controls-button{background:transparent !important;border:none !important;border-bottom:1px solid var(--border) !important;color:var(--textMuted) !important;}
.react-flow__controls-button:last-child{border-bottom:none !important;}
.react-flow__controls-button:hover{background:var(--surface2) !important;color:var(--text) !important;}
.react-flow__controls-button svg{fill:currentColor !important;}
.react-flow__minimap{background:var(--surface) !important;border:1px solid var(--border) !important;border-radius:10px !important;}
.react-flow__edge-path{stroke-width:2px;}
.react-flow__handle{opacity:0 !important;pointer-events:none !important;}
.react-flow__attribution{display:none !important;}

/* Level label nodes */
.level-label-node{pointer-events:none;}

/* Responsive tweaks and corrected variables */
:root{
  --bg:#0a0a0f; --surface:#111118; --surface2:#16161f;
  --card:#1a1a25; --border:#ffffff0c; --border2:#ffffff14;
  --orange:#ff6b22; --orange2:#ff8c4a; --orangeSoft:#ff6b2215; --orangeGlow:#ff6b2240;
  --green:#22c55e; --text:#e8e8f0; --textMuted:#6b7280; --textDim:#9ca3af;
  --mono:'JetBrains Mono',monospace;
}

.luminary-root{
  min-height:100vh;
  background:#0a0a0f;
  color:#e8e8f0;
  font-family:'Outfit',sans-serif;
  overflow:hidden;
}

@media (max-width: 900px){
  .page{
    padding:16px !important;
  }
}
`;

/* ─── CONSTANTS ──────────────────────────────────────────────────────────────*/
const today = new Date();
const fmt = (d: Date) => d.toISOString().split("T")[0];
const TIER_COLORS = { BRONZE:"#cd7f32", SILVER:"#c0c0c0", GOLD:"#ffd700", PLATINUM:"#e5e4e2" };

const LEVEL_PALETTE = [
  { color:"#ff6b22", glow:"#ff6b2250", bg:"#ff6b2212", label:"Level 1 — Foundations" },
  { color:"#3b82f6", glow:"#3b82f650", bg:"#3b82f612", label:"Level 2 — Intermediate" },
  { color:"#22c55e", glow:"#22c55e50", bg:"#22c55e12", label:"Level 3 — Advanced" },
  { color:"#a855f7", glow:"#a855f750", bg:"#a855f712", label:"Level 4 — Expert" },
];

const LEETCODE_PROBLEMS = [
  {id:1,title:"Two Sum",difficulty:"Easy",url:"https://leetcode.com/problems/two-sum/"},
  {id:2,title:"Add Two Numbers",difficulty:"Medium",url:"https://leetcode.com/problems/add-two-numbers/"},
  {id:3,title:"Longest Substring Without Repeating Characters",difficulty:"Medium",url:"https://leetcode.com/problems/longest-substring-without-repeating-characters/"},
  {id:4,title:"Median of Two Sorted Arrays",difficulty:"Hard",url:"https://leetcode.com/problems/median-of-two-sorted-arrays/"},
  {id:5,title:"Valid Parentheses",difficulty:"Easy",url:"https://leetcode.com/problems/valid-parentheses/"},
  {id:6,title:"Merge K Sorted Lists",difficulty:"Hard",url:"https://leetcode.com/problems/merge-k-sorted-lists/"},
  {id:7,title:"Maximum Subarray",difficulty:"Medium",url:"https://leetcode.com/problems/maximum-subarray/"},
  {id:8,title:"Climbing Stairs",difficulty:"Easy",url:"https://leetcode.com/problems/climbing-stairs/"},
  {id:9,title:"Word Search II",difficulty:"Hard",url:"https://leetcode.com/problems/word-search-ii/"},
  {id:10,title:"Binary Tree Level Order Traversal",difficulty:"Medium",url:"https://leetcode.com/problems/binary-tree-level-order-traversal/"},
  {id:11,title:"Coin Change",difficulty:"Medium",url:"https://leetcode.com/problems/coin-change/"},
  {id:12,title:"LRU Cache",difficulty:"Medium",url:"https://leetcode.com/problems/lru-cache/"},
];

const BADGE_DEFS = [
  {id:"first_roadmap",icon:"🗺️",name:"First Steps",desc:"Create your first roadmap",tier:"BRONZE",max:1,current:(s:any)=>Math.min(s.roadmaps.length,1)},
  {id:"multi_roadmap",icon:"🧭",name:"Multi-Learner",desc:"Create 3 roadmaps",tier:"SILVER",max:3,current:(s:any)=>Math.min(s.roadmaps.length,3)},
  {id:"node_5",icon:"⭐",name:"Getting Started",desc:"Complete 5 nodes",tier:"BRONZE",max:5,current:(s:any)=>Math.min(s.totalCompleted,5)},
  {id:"node_25",icon:"🔥",name:"On Fire",desc:"Complete 25 nodes",tier:"SILVER",max:25,current:(s:any)=>Math.min(s.totalCompleted,25)},
  {id:"streak_3",icon:"📅",name:"Warming Up",desc:"3-day streak",tier:"BRONZE",max:3,current:(s:any)=>Math.min(s.studyStreak,3)},
  {id:"streak_7",icon:"⚡",name:"Week Warrior",desc:"7-day streak",tier:"SILVER",max:7,current:(s:any)=>Math.min(s.studyStreak,7)},
  {id:"pomo_1",icon:"🍅",name:"First Focus",desc:"Complete 1 Pomodoro",tier:"BRONZE",max:1,current:(s:any)=>Math.min(s.totalPomodoros,1)},
  {id:"pomo_10",icon:"⏰",name:"Time Master",desc:"Complete 10 Pomodoros",tier:"SILVER",max:10,current:(s:any)=>Math.min(s.totalPomodoros,10)},
  {id:"cert_1",icon:"🎓",name:"Certified",desc:"Add your first cert",tier:"BRONZE",max:1,current:(s:any)=>Math.min(s.certifications.length,1)},
  {id:"battle_5",icon:"⚔️",name:"Warrior",desc:"Solve 5 LeetCode problems",tier:"SILVER",max:5,current:(s:any)=>Math.min(s.battleSolved,5)},
  {id:"completionist",icon:"🏆",name:"Completionist",desc:"Finish an entire roadmap",tier:"GOLD",max:1,current:(s:any)=>s.roadmaps.some((r:any)=>r.completed===r.total&&r.total>0)?1:0},
];

/* ─── API ────────────────────────────────────────────────────────────────────*/
async function callClaude(messages:any, system:string, maxTokens = 1500) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages}),
  });
  const data = await res.json();
  return data.content?.map((b:any)=>b.text||"").join("")||"";
}
function cleanJSON(raw:string) {
  return raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
}

/* ─── LAYOUT BUILDER ─────────────────────────────────────────────────────────*/
function buildFlowLayout(topic:string, levels:any[]) {
  const rfNodes:any[] = [];
  const rfEdges:any[] = [];

  const NODE_W = 200;
  const NODE_H = 100;
  const H_GAP  = 60;
  const V_GAP  = 120;
  const LABEL_H = 40;

  const totalWidth = levels.reduce(
    (max, lv) => Math.max(max, lv.subtopics.length * (NODE_W + H_GAP) - H_GAP),
    0
  );

  rfNodes.push({
    id: "root",
    type: "rootNode",
    position: { x: totalWidth / 2 - 110, y: 0 },
    data: { label: topic },
    draggable: false,
  });

  let yOffset = NODE_H + V_GAP + 20;

  levels.forEach((lv, li) => {
    const count = lv.subtopics.length;
    const rowWidth = count * NODE_W + (count - 1) * H_GAP;
    const startX = totalWidth / 2 - rowWidth / 2;

    rfNodes.push({
      id: `level_label_${li}`,
      type: "levelLabel",
      position: { x: startX - 10, y: yOffset - LABEL_H - 8 },
      data: { level: li, label: LEVEL_PALETTE[li % LEVEL_PALETTE.length].label },
      draggable: false,
      selectable: false,
    });

    lv.subtopics.forEach((t:any, ti:number) => {
      const id = `L${li}_N${ti}`;
      const x = startX + ti * (NODE_W + H_GAP);

      rfNodes.push({
        id,
        type: "topicNode",
        position: { x, y: yOffset },
        data: {
          id,
          name: t.name,
          sublabel: t.sublabel || "",
          description: t.description || "",
          prerequisites: t.prerequisites || [],
          techInfo: t.techInfo || null,
          level: li,
          completed: false,
          unlocked: li === 0,
          resources: [],
          takeaways: [],
          eta: "",
        },
        draggable: false,
      });

      const sourceId = li === 0
        ? "root"
        : `L${li-1}_N${ti % levels[li-1].subtopics.length}`;

      rfEdges.push({
        id: `e_${sourceId}_${id}`,
        source: sourceId,
        target: id,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: "#ffffff18",
          strokeWidth: 1.5,
          strokeDasharray: li === 0 ? "none" : "5 5",
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#ffffff25", width: 12, height: 12 },
      });
    });

    yOffset += NODE_H + V_GAP + LABEL_H + 8;
  });

  return { rfNodes, rfEdges };
}

/* ─── CUSTOM NODES ───────────────────────────────────────────────────────────*/
function RootNode({ data }:any) {
  return (
    <div style={{
      width: 220, padding: "16px 20px",
      background: "linear-gradient(135deg, #ff6b22cc, #ff8c4acc)",
      border: "2px solid #ff8c4a",
      borderRadius: 16,
      boxShadow: "0 0 32px #ff6b2260, 0 8px 32px #00000080",
      textAlign: "center",
      cursor: "default",
      animation: "nodeIn .5s cubic-bezier(.34,1.56,.64,1) both",
    }}>
      <Handle type="source" position={Position.Bottom} />
      <div style={{ fontSize: 22, marginBottom: 6 }}>🎯</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2, letterSpacing: "-.01em" }}>
        {data.label}
      </div>
      <div style={{ fontSize: 10, color: "#ffffff90", marginTop: 5, fontFamily: "var(--mono)", letterSpacing: ".12em" }}>
        LEARNING ROADMAP
      </div>
    </div>
  );
}

function LevelLabelNode({ data }:any) {
  const pal = LEVEL_PALETTE[data.level % LEVEL_PALETTE.length];
  return (
    <div className="level-label-node" style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "5px 14px",
      background: pal.bg,
      border: `1px solid ${pal.color}30`,
      borderRadius: 20,
      pointerEvents: "none",
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: pal.color, boxShadow: `0 0 8px ${pal.color}` }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: pal.color, fontFamily: "var(--mono)", letterSpacing: ".1em", whiteSpace: "nowrap" }}>
        {data.label.toUpperCase()}
      </span>
    </div>
  );
}

function TopicNode({ data, selected }:any) {
  const [hovered, setHovered] = useState(false);
  const pal = LEVEL_PALETTE[data.level % LEVEL_PALETTE.length];
  const { completed, unlocked } = data;

  const borderColor = completed ? "#22c55e"
    : selected ? pal.color
    : hovered ? pal.color
    : unlocked ? `${pal.color}60`
    : "#ffffff12";

  const bgColor = completed ? "#22c55e0f"
    : unlocked ? pal.bg
    : "#ffffff04";

  const glowShadow = completed
    ? `0 0 24px #22c55e40, 0 4px 20px #00000060`
    : (hovered || selected)
    ? `0 0 28px ${pal.glow}, 0 4px 24px #00000060`
    : `0 2px 12px #00000040`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 200,
        minHeight: 100,
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 14,
        boxShadow: glowShadow,
        padding: "14px 16px",
        cursor: unlocked ? "pointer" : "not-allowed",
        opacity: unlocked ? 1 : 0.45,
        transition: "all .22s cubic-bezier(.34,1.56,.64,1)",
        transform: hovered && unlocked ? "translateY(-3px) scale(1.03)" : "translateY(0) scale(1)",
        animation: `nodeIn .45s cubic-bezier(.34,1.56,.64,1) ${data.level * 0.08 + (data.index || 0) * 0.04}s both`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      {(hovered || selected) && unlocked && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${pal.color}, transparent)`,
          borderRadius: "14px 14px 0 0",
        }} />
      )}

      {completed && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 22, height: 22,
          borderRadius: "50%",
          background: "#22c55e15",
          border: "1.5px solid #22c55e",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11,
        }}>✓</div>
      )}

      {!unlocked && (
        <div style={{ position: "absolute", top: 8, right: 8, fontSize: 13, opacity: .5 }}>🔒</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: completed ? "#22c55e" : pal.color, boxShadow: `0 0 6px ${completed ? "#22c55e" : pal.color}`, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: completed ? "#22c55e" : pal.color, letterSpacing: ".12em", fontWeight: 600 }}>
          LEVEL {data.level + 1}
        </span>
      </div>

      <div style={{
        fontSize: 13, fontWeight: 700,
        color: unlocked ? "#e8e8f0" : "#6b7280",
        lineHeight: 1.35,
        marginBottom: data.sublabel ? 5 : 0,
      }}>
        {data.name}
      </div>

      {data.sublabel && (
        <div style={{
          fontSize: 10, color: completed ? "#22c55e90" : `${pal.color}90`,
          fontFamily: "var(--mono)", letterSpacing: ".06em",
        }}>
          {data.sublabel}
        </div>
      )}

      {unlocked && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
          background: completed
            ? "linear-gradient(90deg, #22c55e60, #22c55e30)"
            : `linear-gradient(90deg, ${pal.color}40, transparent)`,
          borderRadius: "0 0 14px 14px",
          transition: "all .3s",
        }} />
      )}
    </div>
  );
}

const nodeTypes = {
  rootNode: RootNode,
  topicNode: TopicNode,
  levelLabel: LevelLabelNode,
};

/* ─── SHARED COMPONENTS ──────────────────────────────────────────────────────*/
function Spinner({ size = 20, color = "var(--orange)" }) {
  return <div style={{width:size,height:size,border:`2px solid ${color}30`,borderTopColor:color,borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>;
}

function ProgressBar({ value, max=100, color="var(--orange)", height=5 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{height,background:"var(--surface2)",borderRadius:height,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:height,transition:"width .8s cubic-bezier(.34,1.56,.64,1)",boxShadow:`0 0 8px ${color}60`}}/>
    </div>
  );
}

function StatCard({ icon, label, value, color="var(--orange)" }) {
  return (
    <div className="card" style={{padding:"18px 22px",display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:44,height:44,borderRadius:12,background:`${color}18`,border:`1px solid ${color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
      <div>
        <div style={{fontSize:11,color:"var(--textMuted)",fontFamily:"var(--mono)",letterSpacing:".08em",marginBottom:2}}>{label}</div>
        <div style={{fontSize:24,fontWeight:700,color,lineHeight:1}}>{value}</div>
      </div>
    </div>
  );
}

/* ─── NAVBAR ─────────────────────────────────────────────────────────────────*/
function Navbar({ page, setPage }:any) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const tabs = [
    {id:"dashboard",icon:"⬡",label:"Dashboard"},
    {id:"roadmaps",icon:"◈",label:"My Roadmaps"},
    {id:"sessions",icon:"◷",label:"Study Sessions"},
    {id:"certifications",icon:"◎",label:"Certifications"},
    {id:"battleground",icon:"⚔",label:"Battleground"},
    {id:"achievements",icon:"◆",label:"Achievements"},
  ];

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "LU";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
  };

  return (
    <nav
      style={{
        height: 56,
        background:
          "linear-gradient(90deg, rgba(10,10,15,0.95), rgba(26,26,37,0.98))",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 12,
        flexShrink: 0,
        zIndex: 50,
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Logo + title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginRight: 24,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "999px",
            background:
              "conic-gradient(from 180deg, #ff6b22, #ffb347, #ff6b22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            animation: "glow 3s ease-in-out infinite",
            boxShadow: "0 0 24px var(--orangeGlow)",
          }}
        >
          ◈
        </div>
        <div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "-0.03em",
            }}
          >
            Luminary
          </span>
          <div
            style={{
              fontSize: 10,
              color: "var(--textMuted)",
              fontFamily: "var(--mono)",
              letterSpacing: ".14em",
              textTransform: "uppercase",
            }}
          >
            Learning Studio
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, flex: 1 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setPage(t.id)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "'Outfit',sans-serif",
              fontWeight: 500,
              whiteSpace: "nowrap",
              transition: "all .2s",
              background:
                page === t.id ? "var(--orange)" : "transparent",
              color: page === t.id ? "#fff" : "var(--textMuted)",
            }}
            onMouseEnter={(e) => {
              if (page !== t.id) {
                (e.target as HTMLButtonElement).style.color = "var(--text)";
                (e.target as HTMLButtonElement).style.background =
                  "var(--surface2)";
              }
            }}
            onMouseLeave={(e) => {
              if (page !== t.id) {
                (e.target as HTMLButtonElement).style.color =
                  "var(--textMuted)";
                (e.target as HTMLButtonElement).style.background =
                  "transparent";
              }
            }}
          >
            <span style={{ marginRight: 6, fontSize: 11 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* User avatar + menu */}
      <div
        ref={menuRef}
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        {user && (
          <>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--surface2)",
                cursor: "pointer",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.borderColor =
                  "var(--orange)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.borderColor =
                  "var(--border)";
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "999px",
                  background: "#111118",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#ffedd5",
                  boxShadow: "0 0 12px rgba(0,0,0,0.6)",
                }}
              >
                {initials}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  maxWidth: 140,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text)",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.email}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--textMuted)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  Signed in
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--textMuted)",
                  transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform .15s ease",
                }}
              >
                ▾
              </span>
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: 54,
                  right: 20,
                  width: 210,
                  background: "var(--card)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.65)",
                  overflow: "hidden",
                  zIndex: 60,
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--textMuted)",
                      fontFamily: "var(--mono)",
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Account
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "none",
                    background: "transparent",
                    color: "#f97373",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background .15s ease,color .15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background =
                      "#7f1d1d33";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  <span>⎋</span>
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

/* ─── NODE RESOURCE PANEL ────────────────────────────────────────────────────*/
function NodePanel({ node, topic, onClose, onComplete }:any) {
  const [resources, setResources] = useState(node.resources||[]);
  const [loading, setLoading] = useState(!node.resources?.length);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("resources");
  const [takeaways, setTakeaways] = useState(node.takeaways||[]);
  const [eta, setEta] = useState(node.eta||"");
  const pal = LEVEL_PALETTE[node.level % LEVEL_PALETTE.length];
  const col = pal.color;

  useEffect(()=>{
    let cancelled = false;
    setError(null);

    // If already cached on node, use it immediately.
    if (node.resources?.length) { setLoading(false); return; }

    setLoading(true);
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("node-agent-processor", {
          body: {
            nodeTitle: node.name,
            nodeDescription: node.description || "",
            roadmapSubject: topic || "",
            roadmapDifficulty: (node.sublabel || "").toLowerCase().includes("advanced")
              ? "advanced"
              : (node.sublabel || "").toLowerCase().includes("intermediate")
                ? "intermediate"
                : "beginner",
          },
        });
        if (fnErr) {
          const msg = (fnErr as any)?.message || "Edge function error";
          const ctx = (fnErr as any)?.context ? JSON.stringify((fnErr as any).context) : "";
          throw new Error(ctx ? `${msg} — ${ctx}` : msg);
        }
        if (cancelled) return;

        const harvested = data?.harvestedResources || {};
        const previews = Array.isArray(data?.scrapedPreviews) ? data.scrapedPreviews : [];
        const previewMap = new Map(previews.map((p:any) => [p.url, p]));

        const flat:any[] = [];
        for (const a of (harvested.articles || [])) {
          flat.push({
            title: a.title,
            type: "article",
            url: a.url,
            duration: "",
            difficulty: "intermediate",
            description: `Hacker News · score ${a.score ?? 0} · ${a.comments ?? 0} comments`,
            preview: previewMap.get(a.url)?.text || "",
          });
        }
        for (const p of (harvested.pages || [])) {
          flat.push({
            title: p.title,
            type: "article",
            url: p.url,
            duration: "",
            difficulty: "intermediate",
            description: `Web/News · ${p.domain || "page"}`,
            preview: previewMap.get(p.url)?.text || "",
          });
        }
        for (const v of (harvested.videos || [])) {
          flat.push({
            title: v.title,
            type: "video",
            url: v.url,
            duration: v.durationSeconds ? `${Math.round(v.durationSeconds/60)} min` : "",
            difficulty: "intermediate",
            description: `YouTube · ${v.channel || "Unknown channel"}`,
            preview: "",
          });
        }
        for (const d of (harvested.discussions || [])) {
          flat.push({
            title: d.title,
            type: "article",
            url: d.url,
            duration: "",
            difficulty: "intermediate",
            description: `Reddit · r/${d.subreddit || "?"} · score ${d.score ?? 0}`,
            preview: "",
          });
        }
        for (const q of (harvested.qa || [])) {
          flat.push({
            title: q.title,
            type: "docs",
            url: q.url,
            duration: "",
            difficulty: "intermediate",
            description: `Stack Overflow · score ${q.score ?? 0} · ${q.answers ?? 0} answers`,
            preview: previewMap.get(q.url)?.text || "",
          });
        }
        for (const t of (harvested.tweets || [])) {
          flat.push({
            title: t.title,
            type: "article",
            url: t.url,
            duration: "",
            difficulty: "intermediate",
            description: `X/Twitter signal · ${t.via || ""}`.trim(),
            preview: "",
          });
        }

        const tk = Array.isArray(data?.nodeAnalysis?.learningOutcomes) ? data.nodeAnalysis.learningOutcomes
          : Array.isArray(data?.nodeAnalysis?.keyConcepts) ? data.nodeAnalysis.keyConcepts
          : [];

        node.resources = flat;
        node.takeaways = tk.slice(0, 6);
        node.eta = `Links: ${data?.processingSummary?.resourcesFound ?? flat.length}`;
        node.prerequisites = Array.isArray(data?.prereqs) ? data.prereqs.map((p:any)=>p.title).filter(Boolean) : (node.prerequisites||[]);
        node.techInfo = data?.techInfo ? {
          webHarvester: data.techInfo.webHarvesterAgent,
          pageScraper: data.techInfo.pageScraperAgent,
          model: data.techInfo.llmPlannerAgent,
        } : node.techInfo;

        setResources(flat);
        setTakeaways(node.takeaways||[]);
        setEta(node.eta||"");
      } catch (e:any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load resources");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  },[node.name, topic]);

  const typeIcon:any = {video:"▶",article:"◈",docs:"◉",course:"◆",exercise:"◇"};
  const typeCols:any = {video:"#f43f5e",article:"#22c55e",docs:"#3b82f6",course:"#f59e0b",exercise:"#a855f7"};

  return (
    <div style={{
      position:"absolute",right:0,top:0,bottom:0,width:420,
      background:"linear-gradient(180deg,#0f0f1a 0%,#0a0a0f 100%)",
      borderLeft:`1px solid ${col}30`,
      boxShadow:`-20px 0 60px ${col}12`,
      display:"flex",flexDirection:"column",
      zIndex:10,
      animation:"slideRight .3s cubic-bezier(.34,1.56,.64,1)",
    }}>
      <div style={{padding:"20px 20px 0",borderBottom:"1px solid var(--border)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div style={{
            width:42,height:42,borderRadius:"50%",
            background:pal.bg,border:`2px solid ${col}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:18,boxShadow:`0 0 20px ${pal.glow}`,
          }}>
            {node.completed ? "✅" : "◈"}
          </div>
          <button onClick={onClose}
            style={{background:"none",border:"1px solid var(--border)",color:"var(--textMuted)",cursor:"pointer",width:30,height:30,borderRadius:8,fontSize:15,transition:"all .2s"}}
            onMouseEnter={e=>{(e.target as HTMLButtonElement).style.borderColor="#f43f5e";(e.target as HTMLButtonElement).style.color="#f43f5e";}}
            onMouseLeave={e=>{(e.target as HTMLButtonElement).style.borderColor="var(--border)";(e.target as HTMLButtonElement).style.color="var(--textMuted)";}}>✕</button>
        </div>

        <div style={{fontSize:10,color:col,fontFamily:"var(--mono)",letterSpacing:".15em",marginBottom:5}}>{pal.label.toUpperCase()}</div>
        <h2 style={{fontSize:19,fontWeight:700,marginBottom:4,lineHeight:1.3}}>{node.name}</h2>
        {node.sublabel && <p style={{fontSize:12,color:"var(--textMuted)",marginBottom:5}}>{node.sublabel}</p>}
        {node.description && <p style={{fontSize:13,color:"var(--textDim)",lineHeight:1.6,marginBottom:10}}>{node.description}</p>}
        {eta && (
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:pal.bg,border:`1px solid ${col}25`,borderRadius:20,padding:"3px 12px",marginBottom:12}}>
            <span style={{fontSize:11,color:col,fontFamily:"var(--mono)"}}>⏱ {eta}</span>
          </div>
        )}

        <div style={{display:"flex",gap:0,marginBottom:-1}}>
          {["resources","prerequisites","tech"].map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{background:"none",border:"none",borderBottom:`2px solid ${tab===t?col:"transparent"}`,color:tab===t?col:"var(--textMuted)",cursor:"pointer",padding:"7px 14px",fontSize:12,fontFamily:"'Outfit',sans-serif",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",transition:"all .2s"}}>
              {t==="prerequisites"?"Prereqs":t==="tech"?"Tech Info":t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:16}}>
        {loading ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,paddingTop:60}}>
            <Spinner size={28} color={col}/>
            <span style={{fontSize:13,color:"var(--textMuted)",fontFamily:"var(--mono)"}}>Curating resources…</span>
          </div>
        ) : error ? (
          <div style={{textAlign:"center",padding:36,color:"var(--textMuted)"}}>
            <div style={{fontSize:26,marginBottom:8}}>◎</div>
            <p style={{fontSize:13,marginBottom:10}}>Couldn’t load resources.</p>
            <p style={{fontSize:12,opacity:.8,fontFamily:"var(--mono)"}}>{error}</p>
          </div>
        ) : tab==="resources" ? (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {takeaways.length>0 && (
              <div style={{background:pal.bg,border:`1px solid ${col}25`,borderRadius:12,padding:14,marginBottom:4}}>
                <div style={{fontSize:10,color:col,fontFamily:"var(--mono)",letterSpacing:".1em",marginBottom:8}}>KEY TAKEAWAYS</div>
                {takeaways.map((t:any,i:number)=>(
                  <div key={i} style={{display:"flex",gap:8,marginBottom:5,alignItems:"flex-start"}}>
                    <span style={{color:col,fontSize:11,marginTop:2,flexShrink:0}}>◆</span>
                    <span style={{fontSize:13,color:"var(--textDim)",lineHeight:1.5}}>{t}</span>
                  </div>
                ))}
              </div>
            )}
            {resources.length ? resources.map((r:any,i:number)=>(
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                style={{display:"block",padding:14,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,textDecoration:"none",transition:"all .22s",animation:`fadeIn .3s ease ${i*.06}s both`}}
                onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.borderColor=(typeCols[r.type]||col)+"50";(e.currentTarget as HTMLAnchorElement).style.transform="translateX(4px)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.borderColor="var(--border)";(e.currentTarget as HTMLAnchorElement).style.transform="none";}}
              >
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <span style={{fontSize:13,color:typeCols[r.type]||col}}>{typeIcon[r.type]||"◈"}</span>
                  <span style={{flex:1,fontSize:13,fontWeight:600,color:"var(--text)"}}>{r.title}</span>
                  <span className="tag" style={{background:`${typeCols[r.type]||col}18`,color:typeCols[r.type]||col}}>{r.type}</span>
                </div>
                <p style={{fontSize:12,color:"var(--textMuted)",lineHeight:1.5,marginBottom:6}}>{r.description}</p>
                {r.preview && (
                  <p style={{fontSize:11,color:"var(--textDim)",lineHeight:1.45,opacity:.9}}>
                    {String(r.preview).slice(0, 180)}{String(r.preview).length>180?"…":""}
                  </p>
                )}
                <div style={{display:"flex",gap:10}}>
                  {r.duration && <span style={{fontSize:10,color:"var(--textMuted)",fontFamily:"var(--mono)"}}>⏱ {r.duration}</span>}
                  {r.difficulty && <span style={{fontSize:10,color:{beginner:"#22c55e",intermediate:"#f59e0b",advanced:"#f43f5e"}[r.difficulty]||"var(--textMuted)",fontFamily:"var(--mono)"}}>◆ {r.difficulty}</span>}
                </div>
              </a>
            )) : (
              <div style={{textAlign:"center",padding:36,color:"var(--textMuted)"}}>
                <div style={{fontSize:26,marginBottom:8}}>◎</div>
                <p style={{fontSize:13}}>No resources found for this node yet.</p>
              </div>
            )}
          </div>
        ) : tab==="prerequisites" ? (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {node.prerequisites?.length ? node.prerequisites.map((p:any,i:number)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:13,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,animation:`fadeIn .3s ease ${i*.07}s both`}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:"#f59e0b",flexShrink:0}}/>
                <span style={{fontSize:13,color:"var(--textDim)"}}>{p}</span>
              </div>
            )) : (
              <div style={{textAlign:"center",padding:36,color:"var(--textMuted)"}}>
                <div style={{fontSize:26,marginBottom:8}}>◎</div>
                <p style={{fontSize:13}}>No prerequisites — great entry point!</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {node.techInfo ? Object.entries(node.techInfo).map(([k,v]:any,i:number)=>(
              <div key={i} style={{padding:14,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,animation:`fadeIn .3s ease ${i*.07}s both`}}>
                <div style={{fontSize:10,color:col,fontFamily:"var(--mono)",letterSpacing:".1em",marginBottom:5,textTransform:"uppercase"}}>{k}</div>
                <div style={{fontSize:13,color:"var(--text)"}}>{v}</div>
              </div>
            )) : (
              <div style={{textAlign:"center",padding:36,color:"var(--textMuted)"}}>
                <div style={{fontSize:26,marginBottom:8}}>◎</div>
                <p style={{fontSize:13}}>No specific tech requirements.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{padding:14,borderTop:"1px solid var(--border)"}}>
        {node.completed
          ? <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px",borderRadius:10,background:"#22c55e15",border:"1px solid #22c55e30",color:"#22c55e",fontWeight:600,fontSize:14}}>✅ Completed</div>
          : node.unlocked
            ? <button className="btn btn-orange" onClick={()=>onComplete(node.id)} style={{width:"100%",justifyContent:"center",padding:"13px",borderRadius:10,fontSize:14}}>✓ Mark as Complete</button>
            : <div style={{textAlign:"center",fontSize:13,color:"var(--textMuted)",padding:"10px 0"}}>🔒 Complete previous level to unlock</div>
        }
      </div>
    </div>
  );
}

/* ─── REACT FLOW CANVAS ──────────────────────────────────────────────────────*/
function FlowCanvas({ roadmap, onNodeClick }:any) {
  const { rfNodes: initialRFNodes, rfEdges: initialRFEdges } = useMemo(
    () => buildFlowLayout(roadmap.topic, roadmap.levels),
    [roadmap.id]
  );

  const enrichedNodes = useMemo(() => {
    return initialRFNodes.map((n:any) => {
      if (n.type !== "topicNode") return n;
      const nodeData = roadmap.nodes.find((nd:any) => nd.id === n.id);
      if (!nodeData) return n;
      return {
        ...n,
        data: {
          ...n.data,
          completed: roadmap.completedIds.has(n.id),
          unlocked: roadmap.unlockedIds.has(n.id),
          resources: nodeData.resources || [],
          takeaways: nodeData.takeaways || [],
          eta: nodeData.eta || "",
          prerequisites: nodeData.prerequisites || [],
          techInfo: nodeData.techInfo || null,
        },
      };
    });
  }, [roadmap.completedIds, roadmap.unlockedIds, roadmap.nodes, initialRFNodes]);

  const enrichedEdges = useMemo(() => {
    return initialRFEdges.map((e:any) => {
      const targetUnlocked = roadmap.unlockedIds.has(e.target);
      const targetDone = roadmap.completedIds.has(e.target);
      const pal = (() => {
        const node = roadmap.nodes.find((n:any) => n.id === e.target);
        return node ? LEVEL_PALETTE[node.level % LEVEL_PALETTE.length] : LEVEL_PALETTE[0];
      })();
      return {
        ...e,
        animated: targetUnlocked && !targetDone,
        style: {
          stroke: targetDone ? "#22c55e50"
            : targetUnlocked ? `${pal.color}60`
            : "#ffffff0a",
          strokeWidth: targetUnlocked ? 2 : 1.5,
          strokeDasharray: targetUnlocked ? "none" : "5 5",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: targetDone ? "#22c55e50" : targetUnlocked ? `${pal.color}80` : "#ffffff15",
          width: 12, height: 12,
        },
      };
    });
  }, [roadmap.completedIds, roadmap.unlockedIds, initialRFEdges]);

  const [flowNodes, , onNodesChange] = useNodesState(enrichedNodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(enrichedEdges);

  useEffect(() => { (onNodesChange as any)([]); }, []); // no-op just to satisfy hook

  useEffect(() => {
    // sync nodes/edges when enriched change
  }, [enrichedNodes, enrichedEdges]);

  const handleNodeClick = useCallback((_:any, node:any) => {
    if (node.type !== "topicNode") return;
    const nd = roadmap.nodes.find((n:any) => n.id === node.id);
    if (!nd) return;
    onNodeClick({
      ...nd,
      completed: roadmap.completedIds.has(node.id),
      unlocked: roadmap.unlockedIds.has(node.id),
    });
  }, [roadmap, onNodeClick]);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
      minZoom={0.2}
      maxZoom={2}
      style={{ background: "#0a0a0f" }}
    >
      <Background color="#ffffff06" gap={28} size={1} />
      <Controls style={{ bottom: 20, left: 20 }} />
      <MiniMap
        nodeColor={(n:any) => {
          if (n.type === "rootNode") return "#ff6b22";
          if (n.type !== "topicNode") return "transparent";
          const done = roadmap.completedIds.has(n.id);
          const unlocked = roadmap.unlockedIds.has(n.id);
          if (done) return "#22c55e";
          const nd = roadmap.nodes.find((nd:any) => nd.id === n.id);
          if (!nd) return "#ffffff10";
          const pal = LEVEL_PALETTE[nd.level % LEVEL_PALETTE.length];
          return unlocked ? pal.color : "#ffffff10";
        }}
        maskColor="#0a0a0f80"
        style={{ bottom: 20, right: 20, background: "#111118", border: "1px solid #ffffff0c" }}
      />
    </ReactFlow>
  );
}

/* ─── PAGES (Roadmaps, Dashboard, etc.) ──────────────────────────────────────*/
function RoadmapsPage({ appState, setAppState }:any) {
  const [view, setView] = useState<"list" | "creating" | "map">("list");
  const [topicInput, setTopicInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [agentStatus, setAgentStatus] = useState<any[]>(createInitialStatuses());
  const [selectedRoadmap, setSelectedRoadmap] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const setAgent = (i:number,u:any) =>
    setAgentStatus(p=>{const n=[...p];n[i]={...n[i],...u};return n;});

  const onPipelineStatus = (evt:any) => {
    if (evt?.type === "init" && Array.isArray(evt.steps)) {
      setAgentStatus(evt.steps);
      return;
    }
    if (evt?.type === "step") {
      setAgentStatus((prev:any[]) =>
        prev.map((s:any) => (s.id === evt.id ? { ...s, status: evt.status } : s))
      );
    }
  };

  const toLevels = ({ nodes, edges }:any) => {
    const byId = new Map(nodes.map((n:any) => [n.id, n]));
    const prereqMap = new Map();
    for (const e of edges || []) {
      const from = byId.get(e.from);
      const to = byId.get(e.to);
      if (!from || !to) continue;
      if (!prereqMap.has(to.id)) prereqMap.set(to.id, []);
      prereqMap.get(to.id).push(from.title);
    }

    const buckets:any = { beginner: [], intermediate: [], advanced: [] };
    for (const n of nodes) {
      const diff = ["beginner", "intermediate", "advanced"].includes(n.difficulty) ? n.difficulty : "beginner";
      buckets[diff].push({
        name: n.title,
        sublabel: diff,
        description: n.description,
        prerequisites: prereqMap.get(n.id) || [],
        techInfo: null,
      });
    }

    const toSubtopics = (arr:any[], count:number) => {
      if (arr.length <= count) return arr;
      return arr.slice(0, count);
    };

    return [
      { levelName: "Foundations", subtopics: toSubtopics(buckets.beginner, 6) },
      { levelName: "Core Concepts", subtopics: toSubtopics(buckets.intermediate, 6) },
      { levelName: "Modern Topics", subtopics: toSubtopics(buckets.advanced, 6) },
    ].filter((lv:any) => lv.subtopics.length > 0);
  };

  const finalizeRoadmap = (topic:string, levels:any[]) => {
    const nodes:any[] = [];
    const initUnlocked = new Set(["root"]);
    levels.forEach((lv:any,li:number) => {
      lv.subtopics.forEach((t:any,ti:number) => {
        const id = `L${li}_N${ti}`;
        nodes.push({
          id, name:t.name, sublabel:t.sublabel||"", description:t.description||"",
          prerequisites:t.prerequisites||[], techInfo:t.techInfo||null,
          level:li, completed:false, unlocked:li===0,
          resources:[], takeaways:[], eta:"",
        });
        if (li===0) initUnlocked.add(id);
      });
    });

    const roadmap = {
      id: Date.now().toString(), topic, levels, nodes,
      completedIds: new Set(), unlockedIds: initUnlocked,
      createdAt: fmt(today), total: nodes.length, completed: 0,
    };

    setAppState((s:any)=>({...s,roadmaps:[...s.roadmaps,roadmap]}));
    setSelectedRoadmap(roadmap);
    setView("map");
  };

  const createRoadmap = async () => {
    if (!topicInput.trim()) return;
    const topic = topicInput.trim();
    setGenerating(true);
    setAgentStatus(createInitialStatuses());

    try {
      const out = await runPipeline({ topic }, onPipelineStatus);
      const levels = toLevels(out.graph);
      finalizeRoadmap(topic, levels);
    } catch(e) {
      console.error(e);
      const fallbackLevels = [
        {levelName:"Foundations",subtopics:[
          {name:"Introduction",sublabel:"start here",description:"Core overview",prerequisites:[],techInfo:null},
          {name:"Setup & Install",sublabel:"environment",description:"Get tools ready",prerequisites:["Introduction"],techInfo:{tools:"VS Code"}},
          {name:"Core Concepts",sublabel:"fundamentals",description:"Essential theory",prerequisites:["Setup & Install"],techInfo:null},
          {name:"First Project",sublabel:"hands-on",description:"Apply the basics",prerequisites:["Core Concepts"],techInfo:null},
        ]},
        {levelName:"Intermediate",subtopics:[
          {name:"Advanced Patterns",sublabel:"deeper dive",description:"Complex patterns",prerequisites:["Core Concepts"],techInfo:null},
          {name:"State Management",sublabel:"data flow",description:"Manage app state",prerequisites:["Advanced Patterns"],techInfo:null},
          {name:"Testing",sublabel:"quality",description:"Reliable test suites",prerequisites:["State Management"],techInfo:null},
          {name:"Performance",sublabel:"optimization",description:"Speed and efficiency",prerequisites:["Testing"],techInfo:null},
          {name:"Real Project",sublabel:"build it",description:"Complete application",prerequisites:["Performance"],techInfo:null},
        ]},
        {levelName:"Advanced",subtopics:[
          {name:"Architecture",sublabel:"design patterns",description:"Scale and structure",prerequisites:["Real Project"],techInfo:null},
          {name:"DevOps & CI/CD",sublabel:"deployment",description:"Ship to production",prerequisites:["Architecture"],techInfo:null},
          {name:"Security",sublabel:"hardening",description:"Secure your app",prerequisites:["DevOps & CI/CD"],techInfo:null},
          {name:"Open Source",sublabel:"contribute",description:"Give back",prerequisites:["Security"],techInfo:null},
        ]},
      ];
      finalizeRoadmap(topic, fallbackLevels);
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = (nodeId:string) => {
    setAppState((s:any) => {
      const roadmaps = s.roadmaps.map((rm:any) => {
        if (rm.id !== selectedRoadmap?.id) return rm;
        const newCompleted = new Set(rm.completedIds);
        newCompleted.add(nodeId);
        const node = rm.nodes.find((n:any)=>n.id===nodeId);
        const levelNodes = rm.nodes.filter((n:any)=>n.level===node?.level);
        const allLevelDone = levelNodes.every((n:any)=>newCompleted.has(n.id));
        const newUnlocked = new Set(rm.unlockedIds);
        if (allLevelDone) {
          rm.nodes.filter((n:any)=>n.level===(node?.level??0)+1).forEach((n:any)=>newUnlocked.add(n.id));
        }
        return {...rm, completedIds:newCompleted, unlockedIds:newUnlocked, completed:newCompleted.size};
      });
      return {...s, roadmaps, totalCompleted:roadmaps.reduce((a:number,r:any)=>a+r.completed,0)};
    });
    setSelectedNode((n:any) => n?.id===nodeId ? {...n, completed:true} : n);
  };

  if (view==="map" && selectedRoadmap) {
    const rm = appState.roadmaps.find((r:any)=>r.id===selectedRoadmap.id) || selectedRoadmap;
    const progress = rm.total>0 ? Math.round((rm.completed/rm.total)*100) : 0;

    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"10px 20px",background:"var(--surface)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button className="btn btn-ghost" onClick={()=>{setView("list");setSelectedNode(null);}} style={{padding:"7px 14px",fontSize:13}}>← Back</button>
            <div style={{width:1,height:28,background:"var(--border)"}}/>
            <div>
              <div style={{fontSize:10,color:"var(--textMuted)",fontFamily:"var(--mono)",letterSpacing:".1em"}}>ROADMAP</div>
              <div style={{fontSize:15,fontWeight:700}}>{rm.topic}</div>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {LEVEL_PALETTE.slice(0, rm.levels?.length||3).map((pal,i) => {
              const lNodes = rm.nodes.filter((n:any)=>n.level===i);
              const done = lNodes.filter((n:any)=>rm.completedIds.has(n.id)).length;
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:pal.bg,border:`1px solid ${pal.color}30`,borderRadius:8}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:pal.color,boxShadow:`0 0 6px ${pal.color}`}}/>
                  <span style={{fontSize:11,color:pal.color,fontFamily:"var(--mono)",fontWeight:600}}>L{i+1} {done}/{lNodes.length}</span>
                </div>
              );
            })}
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 14px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8}}>
              <span style={{fontSize:14,fontWeight:700,color:"var(--orange)"}}>{progress}%</span>
              <div style={{width:80}}><ProgressBar value={rm.completed} max={Math.max(rm.total,1)} height={4}/></div>
            </div>
          </div>
        </div>

        <div style={{flex:1,position:"relative",overflow:"hidden"}}>
          <ReactFlowProvider>
            <div style={{position:"absolute",inset:0,right:selectedNode?420:0,transition:"right .3s ease"}}>
              <FlowCanvas
                roadmap={rm}
                onNodeClick={setSelectedNode}
              />
            </div>
          </ReactFlowProvider>

          {!selectedNode && (
            <div style={{position:"absolute",bottom:70,left:"50%",transform:"translateX(-50%)",background:"#111118cc",backdropFilter:"blur(12px)",border:"1px solid var(--border)",borderRadius:20,padding:"6px 16px",fontSize:11,color:"var(--textMuted)",fontFamily:"var(--mono)",pointerEvents:"none",whiteSpace:"nowrap",zIndex:5}}>
              scroll to zoom · drag to pan · click nodes to explore
            </div>
          )}

          {selectedNode && (
            <div style={{position:"absolute",top:0,right:0,bottom:0,width:420,zIndex:10}}>
              <NodePanel
                node={selectedNode}
                topic={rm.topic}
                onClose={()=>setSelectedNode(null)}
                onComplete={handleComplete}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800,marginBottom:4}}>My Roadmaps</h1>
          <p style={{color:"var(--textMuted)",fontSize:14}}>AI-generated React Flow mind maps with level progression</p>
        </div>
        <button className="btn btn-orange" onClick={()=>setView("creating")}>+ New Roadmap</button>
      </div>

      {view==="creating" && (
        <div className="card" style={{padding:28,marginBottom:28,border:"1px solid var(--orange)30",boxShadow:"0 0 40px var(--orangeSoft)"}}>
          {generating ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"20px 0"}}>
              <div style={{fontSize:15,fontWeight:600}}>Building <span className="shimmer-text">{topicInput}</span> roadmap…</div>
              <div style={{width:"100%",maxWidth:520}}>
                <AgentPipeline steps={agentStatus} />
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{fontSize:18,fontWeight:700,marginBottom:16}}>Create New Roadmap</h2>
              <div style={{display:"flex",gap:12}}>
                <input className="input" value={topicInput} onChange={e=>setTopicInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createRoadmap()} placeholder="e.g. React, Machine Learning, System Design…" style={{flex:1}}/>
                <button className="btn btn-orange" onClick={createRoadmap}>Generate →</button>
                <button className="btn btn-ghost" onClick={()=>setView("list")}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {appState.roadmaps.length===0 ? (
        <div style={{textAlign:"center",padding:"80px 40px",color:"var(--textMuted)"}}>
          <div style={{fontSize:48,marginBottom:16,animation:"float 3s ease-in-out infinite"}}>◈</div>
          <h2 style={{fontSize:20,fontWeight:700,marginBottom:8,color:"var(--textDim)"}}>No roadmaps yet</h2>
          <p style={{fontSize:14,marginBottom:20}}>Create your first AI-generated React Flow roadmap</p>
          <button className="btn btn-orange" onClick={()=>setView("creating")}>+ Create Roadmap</button>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
          {appState.roadmaps.map((rm:any,i:number)=>{
            const pct = rm.total>0?Math.round((rm.completed/rm.total)*100):0;
            return (
              <div key={rm.id} className="card card-glow" style={{padding:22,cursor:"pointer",animation:`fadeIn .3s ease ${i*.07}s both`}}
                onClick={()=>{setSelectedRoadmap(rm);setView("map");}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div style={{width:38,height:38,borderRadius:10,background:"var(--orangeSoft)",border:"1px solid var(--orangeGlow)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>◈</div>
                  <span className="tag" style={{background:`${pct===100?"#22c55e":"var(--orange)"}15`,color:pct===100?"#22c55e":"var(--orange)"}}>{pct===100?"COMPLETE":`${pct}%`}</span>
                </div>
                <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>{rm.topic}</h3>
                <p style={{fontSize:12,color:"var(--textMuted)",marginBottom:14,fontFamily:"var(--mono)"}}>Created {rm.createdAt} · {rm.levels?.length||0} levels</p>
                <ProgressBar value={rm.completed} max={Math.max(rm.total,1)} height={4}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
                  <span style={{fontSize:12,color:"var(--textMuted)"}}>{rm.completed} / {rm.total} nodes</span>
                  <span style={{fontSize:12,color:"var(--orange)"}}>Open Map →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DashboardPage({ appState, setPage }:any) {
  const totalNodes = appState.roadmaps.reduce((a:number,r:any)=>a+r.total,0);
  const overallPct = totalNodes>0?Math.round((appState.totalCompleted/totalNodes)*100):0;

  return (
    <div className="page" style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:26,fontWeight:800,marginBottom:4}}>Dashboard</h1>
        <p style={{color:"var(--textMuted)",fontSize:14}}>Your learning overview at a glance</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        <StatCard icon="🔥" label="STUDY STREAK" value={`${appState.studyStreak}d`} color="var(--orange)"/>
        <StatCard icon="◆" label="NODES DONE" value={appState.totalCompleted} color="#22c55e"/>
        <StatCard icon="⏱" label="STUDY HOURS" value={`${Math.round(appState.totalPomodoros*25/60)}h`} color="#3b82f6"/>
        <StatCard icon="🗺️" label="ROADMAPS" value={appState.roadmaps.length} color="#a855f7"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={{minWidth:0}}>
          <AICoach onNavigateToRoadmaps={()=>setPage("roadmaps")} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div className="card" style={{padding:22}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:700}}>Overall Progress</div>
              <div style={{fontSize:20,fontWeight:800,color:"var(--orange)"}}>{overallPct}%</div>
            </div>
            <ProgressBar value={appState.totalCompleted} max={Math.max(totalNodes,1)} height={8}/>
            <div style={{fontSize:12,color:"var(--textMuted)",marginTop:8}}>{appState.totalCompleted} of {totalNodes} nodes completed</div>
          </div>
          <div className="card" style={{padding:22,flex:1,overflowY:"auto",maxHeight:300}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:700}}>My Roadmaps</div>
              <button onClick={()=>setPage("roadmaps")} style={{background:"none",border:"none",color:"var(--orange)",cursor:"pointer",fontSize:12,fontWeight:600}}>View all →</button>
            </div>
            {appState.roadmaps.length===0 ? (
              <div style={{textAlign:"center",padding:24,color:"var(--textMuted)"}}>
                <p style={{fontSize:13,marginBottom:10}}>No roadmaps yet.</p>
                <button className="btn btn-orange" onClick={()=>setPage("roadmaps")} style={{padding:"8px 16px",fontSize:12}}>+ New Roadmap</button>
              </div>
            ) : appState.roadmaps.map((rm:any,i:number)=>{
              const pct = rm.total>0?Math.round((rm.completed/rm.total)*100):0;
              return (
                <div key={rm.id} style={{marginBottom:12,padding:"12px 0",borderBottom:i<appState.roadmaps.length-1?"1px solid var(--border)":"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                    <span style={{fontSize:13,fontWeight:600}}>{rm.topic}</span>
                    <span style={{fontSize:12,color:"var(--orange)",fontFamily:"var(--mono)"}}>{pct}%</span>
                  </div>
                  <ProgressBar value={rm.completed} max={Math.max(rm.total,1)} height={4}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudySessionsPage({ appState, setAppState }:any) {
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25*60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<any>(null);

  useEffect(()=>{
    if (running) {
      intervalRef.current = setInterval(()=>{
        setTimeLeft(t=>{
          if (t<=1) {
            setRunning(false);
            setAppState((s:any)=>{
              const newStreak = s.lastStudyDate===fmt(today)?s.studyStreak:(s.lastStudyDate===fmt(new Date(today.getTime()-86400000))?s.studyStreak+1:1);
              const studyDates = new Set(s.studyDates||[]);
              studyDates.add(fmt(today));
              return {...s,totalPomodoros:s.totalPomodoros+1,studyStreak:newStreak,lastStudyDate:fmt(today),studyDates:[...studyDates]};
            });
            return duration*60;
          }
          return t-1;
        });
      },1000);
    } else clearInterval(intervalRef.current);
    return ()=>clearInterval(intervalRef.current);
  },[running,duration]);

  const mins = Math.floor(timeLeft/60).toString().padStart(2,"0");
  const secs = (timeLeft%60).toString().padStart(2,"0");
  const r=100, circ=2*Math.PI*r;
  const circPct = timeLeft/(duration*60);
  const studyDates = new Set(appState.studyDates||[]);
  const firstDay = new Date(today.getFullYear(),today.getMonth(),1).getDay();
  const daysInMonth = new Date(today.getFullYear(),today.getMonth()+1,0).getDate();

  return (
    <div className="page" style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:26,fontWeight:800,marginBottom:4}}>Study Sessions</h1>
        <p style={{color:"var(--textMuted)",fontSize:14}}>Focus and track your learning journey</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:24}}>
        <div>
          <div className="card" style={{padding:28,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:24}}>
              <div style={{position:"relative",width:240,height:240}}>
                <svg width={240} height={240} style={{transform:"rotate(-90deg)"}}>
                  <circle cx={120} cy={120} r={r} fill="none" stroke="var(--surface2)" strokeWidth={8}/>
                  <circle cx={120} cy={120} r={r} fill="none" stroke="var(--orange)" strokeWidth={8}
                    strokeDasharray={circ} strokeDashoffset={circ*(1-circPct)} strokeLinecap="round"
                    style={{transition:"stroke-dashoffset .5s ease",filter:"drop-shadow(0 0 8px var(--orangeGlow))"}}/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:46,fontWeight:800,fontFamily:"var(--mono)",lineHeight:1}}>{mins}:{secs}</div>
                  <div style={{fontSize:12,color:"var(--textMuted)",marginTop:6}}>{running?"Focusing…":"Ready to Start"}</div>
                </div>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:"var(--textMuted)",display:"block",marginBottom:6}}>Duration (minutes)</label>
              <input className="input" type="number" value={duration} onChange={e=>{const v=+e.target.value;setDuration(v);if(!running)setTimeLeft(v*60);}} min={1} max={120}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-orange" onClick={()=>setRunning(r=>!r)} style={{flex:1,justifyContent:"center"}}>{running?"⏸ Pause":"▶ Start"}</button>
              <button className="btn btn-ghost" onClick={()=>{setRunning(false);setTimeLeft(duration*60);}}>↺ Reset</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div className="card" style={{padding:16,textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:800,color:"var(--orange)"}}>{appState.studyStreak}</div>
              <div style={{fontSize:11,color:"var(--textMuted)",fontFamily:"var(--mono)"}}>DAY STREAK 🔥</div>
            </div>
            <div className="card" style={{padding:16,textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:800,color:"#22c55e"}}>{appState.totalPomodoros}</div>
              <div style={{fontSize:11,color:"var(--textMuted)",fontFamily:"var(--mono)"}}>TOTAL 🍅</div>
            </div>
          </div>
        </div>
        <div className="card" style={{padding:24}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>🔥 Study Streak Calendar</div>
          <div style={{fontSize:13,color:"var(--textMuted)",marginBottom:18}}>{today.toLocaleString("default",{month:"long",year:"numeric"})}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
              <div key={d} style={{textAlign:"center",fontSize:11,color:"var(--textMuted)",fontFamily:"var(--mono)",padding:"4px 0"}}>{d}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {[...Array(firstDay)].map((_,i)=><div key={`e${i}`}/>)}
            {[...Array(daysInMonth)].map((_,i)=>{
              const d=i+1;
              const ds=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              const isToday=ds===fmt(today), studied=studyDates.has(ds);
              return (
                <div key={d} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,fontSize:12,fontWeight:600,background:studied?"var(--orange)":isToday?"var(--surface2)":"transparent",border:isToday?"1px solid var(--orange)":"1px solid transparent",color:studied?"#fff":isToday?"var(--orange)":"var(--textMuted)",boxShadow:studied?"0 0 8px var(--orangeGlow)":"none"}}>
                  {d}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:20,marginTop:18,paddingTop:16,borderTop:"1px solid var(--border)"}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:"var(--orange)"}}>{appState.studyStreak}</div><div style={{fontSize:11,color:"var(--textMuted)",fontFamily:"var(--mono)"}}>STREAK</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:"#22c55e"}}>{Math.round(appState.totalPomodoros*25/60)}</div><div style={{fontSize:11,color:"var(--textMuted)",fontFamily:"var(--mono)"}}>HOURS</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:"#3b82f6"}}>{studyDates.size}</div><div style={{fontSize:11,color:"var(--textMuted)",fontFamily:"var(--mono)"}}>DAYS</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertificationsPage({ appState, setAppState }:any) {
  const [name, setName] = useState(""); const [link, setLink] = useState("");
  const [platform, setPlatform] = useState("auto"); const [progress, setProgress] = useState(0);
  const detect = (url:string) => {
    if (!url) return "Other";
    const m = [{k:"udemy",v:"Udemy"},{k:"coursera",v:"Coursera"},{k:"youtube",v:"YouTube"},{k:"pluralsight",v:"Pluralsight"},{k:"linkedin",v:"LinkedIn Learning"},{k:"edx",v:"edX"},{k:"freecodecamp",v:"freeCodeCamp"}];
    return m.find(x=>url.includes(x.k))?.v||"Other";
  };
  const add = () => {
    if (!name.trim()||!link.trim()) return;
    setAppState((s:any)=>({...s,certifications:[...s.certifications,{id:Date.now().toString(),name,link,platform:platform==="auto"?detect(link):platform,progress,addedAt:fmt(today)}]}));
    setName("");setLink("");setPlatform("auto");setProgress(0);
  };
  const updateProg = (id:string,v:number) => setAppState((s:any)=>({...s,certifications:s.certifications.map((c:any)=>c.id===id?{...c,progress:v}:c)}));
  const del = (id:string) => setAppState((s:any)=>({...s,certifications:s.certifications.filter((c:any)=>c.id!==id)}));
  const pCols:any = {"Udemy":"#a435f0","Coursera":"#0056d2","YouTube":"#ff0000","LinkedIn Learning":"#0a66c2","edX":"#02262b","freeCodeCamp":"#0a0a23","Other":"#6b7280","Pluralsight":"#ef4444"};

  return (
    <div className="page" style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:26,fontWeight:800,marginBottom:4}}>My Certifications</h1>
        <p style={{color:"var(--textMuted)",fontSize:14}}>Track your courses and celebrate achievements</p>
      </div>
      <div className="card" style={{padding:26,marginBottom:28}}>
        <h2 style={{fontSize:16,fontWeight:700,marginBottom:4}}>Add New Certification</h2>
        <p style={{fontSize:13,color:"var(--textMuted)",marginBottom:18}}>Paste a course link to start tracking</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div><label style={{fontSize:12,color:"var(--textMuted)",display:"block",marginBottom:6}}>Course Name *</label><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Complete Python Bootcamp"/></div>
          <div><label style={{fontSize:12,color:"var(--textMuted)",display:"block",marginBottom:6}}>Course Link *</label><input className="input" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://..."/></div>
          <div><label style={{fontSize:12,color:"var(--textMuted)",display:"block",marginBottom:6}}>Platform</label>
            <select className="input" value={platform} onChange={e=>setPlatform(e.target.value)}>
              <option value="auto">Auto-detect from link</option>
              <option>Udemy</option><option>Coursera</option><option>YouTube</option>
              <option>Pluralsight</option><option>LinkedIn Learning</option><option>edX</option><option>freeCodeCamp</option><option>Other</option>
            </select>
          </div>
          <div><label style={{fontSize:12,color:"var(--textMuted)",display:"block",marginBottom:6}}>Starting Progress: {progress}%</label>
            <input type="range" min={0} max={100} value={progress} onChange={e=>setProgress(+e.target.value)} style={{width:"100%",accentColor:"var(--orange)",cursor:"pointer"}}/>
          </div>
        </div>
        <button className="btn btn-orange" onClick={add}>+ Add Certification</button>
      </div>
      {appState.certifications.length===0 ? (
        <div style={{textAlign:"center",padding:"60px",color:"var(--textMuted)"}}>
          <div style={{fontSize:40,marginBottom:12,animation:"float 3s ease-in-out infinite"}}>🎓</div>
          <p style={{fontSize:14}}>No certifications yet. Add your first course above!</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:16}}>
          {appState.certifications.map((c:any,i:number)=>{
            const pc = pCols[c.platform]||"#6b7280";
            return (
              <div key={c.id} className="card card-glow" style={{padding:22,animation:`fadeIn .3s ease ${i*.07}s both`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <span className="tag" style={{background:`${pc}18`,color:pc}}>{c.platform}</span>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>window.open(c.link,"_blank")} style={{background:"none",border:"1px solid var(--border)",color:"var(--textMuted)",cursor:"pointer",width:28,height:28,borderRadius:7,fontSize:12,transition:"all .2s"}} onMouseEnter={e=>{(e.target as HTMLButtonElement).style.color="var(--orange)";}} onMouseLeave={e=>{(e.target as HTMLButtonElement).style.color="var(--textMuted)";}}>↗</button>
                    <button onClick={()=>del(c.id)} style={{background:"none",border:"1px solid var(--border)",color:"var(--textMuted)",cursor:"pointer",width:28,height:28,borderRadius:7,fontSize:12,transition:"all .2s"}} onMouseEnter={e=>{(e.target as HTMLButtonElement).style.color="#f43f5e";}} onMouseLeave={e=>{(e.target as HTMLButtonElement).style.color="var(--textMuted)";}}>✕</button>
                  </div>
                </div>
                <h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>{c.name}</h3>
                <div style={{marginBottom:4}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:12,color:"var(--textMuted)"}}>Progress</span>
                    <span style={{fontSize:12,fontWeight:700,color:c.progress===100?"#22c55e":"var(--orange)"}}>{c.progress}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={c.progress} onChange={e=>updateProg(c.id,+e.target.value)} style={{width:"100%",accentColor:c.progress===100?"#22c55e":"var(--orange)",cursor:"pointer",marginBottom:6}}/>
                  <ProgressBar value={c.progress} max={100} color={c.progress===100?"#22c55e":"var(--orange)"} height={4}/>
                </div>
                {c.progress===100 && <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:8,background:"#22c55e12",border:"1px solid #22c55e30",color:"#22c55e",fontSize:12,fontWeight:600,marginTop:8}}>🎓 Certificate Earned!</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BattlegroundPage({ appState, setAppState }:any) {
  const [current, setCurrent] = useState<any>(null);
  const [filter, setFilter] = useState<"All"|"Easy"|"Medium"|"Hard">("All");
  const diffColor:any = {Easy:"#22c55e",Medium:"#f59e0b",Hard:"#f43f5e"};
  const QUOTES = ["Discipline > Motivation","Hard problems build strong engineers","One problem at a time","Consistency beats talent"];
  const [quote] = useState(QUOTES[Math.floor(Math.random()*QUOTES.length)]);

  const generate = () => {
    const pool = filter==="All"?LEETCODE_PROBLEMS:LEETCODE_PROBLEMS.filter(p=>p.difficulty===filter);
    setCurrent(pool[Math.floor(Math.random()*pool.length)]);
  };
  const markSolved = () => {
    if (!current) return;
    const log = appState.battleLog||[];
    if (log.some((l:any)=>l.id===current.id&&l.date===fmt(today))) return;
    setAppState((s:any)=>{
      const newLog = [...(s.battleLog||[]),{...current,date:fmt(today)}];
      const newStreak = s.lastBattleDate===fmt(today)?s.battleStreak:(s.lastBattleDate===fmt(new Date(today.getTime()-86400000))?s.battleStreak+1:1);
      return {...s,battleLog:newLog,battleSolved:(s.battleSolved||0)+1,battleStreak:newStreak,lastBattleDate:fmt(today)};
    });
  };

  const log = appState.battleLog||[];
  const filtLog = filter==="All"?log:log.filter((l:any)=>l.difficulty===filter);

  return (
    <div className="page" style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:32,marginBottom:8}}>⚔️ 🛡️</div>
        <h1 style={{fontSize:28,fontWeight:800,marginBottom:6}}>Warrior Mode</h1>
        <p style={{color:"var(--textMuted)",fontSize:14,marginBottom:10}}>Step into the coding battleground — one problem at a time.</p>
        <div style={{display:"inline-block",padding:"6px 18px",borderRadius:20,background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--textDim)",fontSize:13,fontStyle:"italic"}}>"{quote}"</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:28}}>
        <StatCard icon="🔥" label="DAY STREAK" value={appState.battleStreak||0} color="var(--orange)"/>
        <StatCard icon="⚔️" label="TOTAL SOLVED" value={appState.battleSolved||0} color="#22c55e"/>
        <StatCard icon="📅" label="LAST SOLVED" value={appState.lastBattleDate||"—"} color="#3b82f6"/>
      </div>
      <div className="card" style={{padding:24,marginBottom:24,border:"1px solid var(--orange)20"}}>
        <div style={{fontSize:13,color:"var(--textMuted)",fontFamily:"var(--mono)",letterSpacing:".1em",marginBottom:14}}>⚡ GENERATE A CHALLENGE</div>
        <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
          {["All","Easy","Medium","Hard"].map(d=>(
            <button key={d} onClick={()=>setFilter(d as any)} style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${filter===d?(diffColor[d]||"var(--orange)")+"60":"var(--border)"}`,background:filter===d?`${diffColor[d]||"var(--orange)"}15`:"transparent",color:filter===d?(diffColor[d]||"var(--orange)"):"var(--textMuted)",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'Outfit',sans-serif",transition:"all .2s"}}>{d}</button>
          ))}
          <button className="btn btn-orange" onClick={generate} style={{marginLeft:"auto"}}>🎲 Generate Problem</button>
        </div>
        {current ? (
          <div style={{padding:20,background:"var(--surface2)",borderRadius:12,border:"1px solid var(--border)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
              <div>
                <h3 style={{fontSize:17,fontWeight:700,marginBottom:8}}>{current.title}</h3>
                <span className="tag" style={{background:`${diffColor[current.difficulty]}18`,color:diffColor[current.difficulty]}}>{current.difficulty}</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <a href={current.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{textDecoration:"none",fontSize:13}}>↗ LeetCode</a>
                <button className="btn btn-orange" onClick={markSolved}>✓ Solved</button>
              </div>
            </div>
            {log.some((l:any)=>l.id===current.id) && <div style={{marginTop:10,color:"#22c55e",fontSize:13}}>✓ Previously solved!</div>}
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"30px",color:"var(--textMuted)"}}>
            <div style={{fontSize:32,marginBottom:8,animation:"float 3s ease-in-out infinite"}}>⚔️</div>
            <p style={{fontSize:14}}>Click "Generate Problem" to get a challenge</p>
          </div>
        )}
      </div>
      <div className="card" style={{padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{fontSize:16,fontWeight:700}}>Practice Log</h2>
          <div style={{display:"flex",gap:6}}>
            {["All","Easy","Medium","Hard"].map(d=>(
              <button key={d} onClick={()=>setFilter(d as any)} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${filter===d?(diffColor[d]||"var(--orange)")+"50":"var(--border)"}`,background:filter===d?`${diffColor[d]||"var(--orange)"}12`:"transparent",color:filter===d?(diffColor[d]||"var(--orange)"):"var(--textMuted)",cursor:"pointer",fontSize:12,fontFamily:"'Outfit',sans-serif",transition:"all .2s"}}>{d}</button>
            ))}
          </div>
        </div>
        {filtLog.length===0 ? (
          <div style={{textAlign:"center",padding:"40px",color:"var(--textMuted)"}}><p style={{fontSize:13}}>No problems solved yet. Start your journey!</p></div>
        ) : [...filtLog].reverse().map((l:any,i:number)=>(
          <div key={`${l.id}-${i}`} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:i<filtLog.length-1?"1px solid var(--border)":"none",animation:`fadeIn .25s ease ${i*.04}s both`}}>
            <div>
              <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{l.title}</div>
              <div style={{display:"flex",gap:10}}>
                <span className="tag" style={{background:`${diffColor[l.difficulty]}18`,color:diffColor[l.difficulty]}}>{l.difficulty}</span>
                <span style={{fontSize:11,color:"var(--textMuted)",fontFamily:"var(--mono)"}}>{l.date}</span>
                <span style={{fontSize:11,color:"#22c55e",fontFamily:"var(--mono)"}}>✓ Solved</span>
              </div>
            </div>
            <a href={l.url} target="_blank" rel="noopener noreferrer" style={{color:"var(--textMuted)",fontSize:16,textDecoration:"none"}}>↗</a>
          </div>
        ))}
      </div>
    </div>
  );
}

function AchievementsPage({ appState }:any) {
  const badges = BADGE_DEFS.map(b=>({...b,cur:b.current(appState),unlocked:b.current(appState)>=b.max,pct:Math.round((b.current(appState)/b.max)*100)}));
  const unlocked = badges.filter(b=>b.unlocked).length;
  return (
    <div className="page" style={{flex:1,overflowY:"auto",padding:"28px 32px"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:32,marginBottom:8,animation:"float 3s ease-in-out infinite"}}>◆</div>
        <h1 style={{fontSize:28,fontWeight:800,marginBottom:4}}>Achievements</h1>
        <p style={{color:"var(--textMuted)",fontSize:14,marginBottom:14}}>Celebrate your learning milestones</p>
        <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:8}}>
          <div style={{fontSize:15,color:"var(--textDim)"}}><span style={{fontSize:22,fontWeight:800,color:"var(--orange)"}}>{unlocked}</span> / {badges.length} badges unlocked</div>
          <div style={{width:280}}><ProgressBar value={unlocked} max={badges.length} height={7}/></div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:32}}>
        <StatCard icon="🔥" label="STUDY STREAK" value={`${appState.studyStreak}d`} color="var(--orange)"/>
        <StatCard icon="◆" label="NODES DONE" value={appState.totalCompleted} color="#22c55e"/>
        <StatCard icon="⏱" label="STUDY TIME" value={`${Math.round(appState.totalPomodoros*25/60)}h`} color="#3b82f6"/>
        <StatCard icon="⚔️" label="PROBLEMS SOLVED" value={appState.battleSolved||0} color="#a855f7"/>
      </div>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><span style={{color:"var(--orange)"}}>◆</span> Badges</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
        {badges.map((b:any,i:number)=>{
          const tc = TIER_COLORS[b.tier]||"#6b7280";
          return (
            <div key={b.id} className="card" style={{padding:20,background:b.unlocked?`linear-gradient(135deg,${tc}0f,${tc}06)`:"var(--card)",border:`1px solid ${b.unlocked?tc+"40":"var(--border)"}`,boxShadow:b.unlocked?`0 0 20px ${tc}18`:"none",animation:`fadeIn .3s ease ${i*.04}s both`,position:"relative",overflow:"hidden"}}>
              {b.unlocked && <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`${tc}10`,filter:"blur(20px)"}}/>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{fontSize:28,animation:b.unlocked?"float 4s ease-in-out infinite":"none"}}>{b.icon}</div>
                <span className="tag" style={{background:`${tc}18`,color:tc}}>{b.tier}</span>
              </div>
              <div style={{fontSize:15,fontWeight:700,marginBottom:3,color:b.unlocked?"var(--text)":"var(--textMuted)"}}>{b.name}</div>
              <div style={{fontSize:12,color:"var(--textMuted)",marginBottom:12}}>{b.desc}</div>
              <ProgressBar value={b.cur} max={b.max} color={b.unlocked?tc:"#ffffff20"} height={4}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                <span style={{fontSize:11,color:"var(--textMuted)",fontFamily:"var(--mono)"}}>{b.cur}/{b.max}</span>
                <span style={{fontSize:11,fontFamily:"var(--mono)",color:b.unlocked?tc:"var(--textMuted)"}}>{b.pct}%</span>
              </div>
              {b.unlocked && <div style={{marginTop:10,display:"flex",alignItems:"center",gap:5,color:"#22c55e",fontSize:11,fontWeight:600}}><span>✓</span><span>Unlocked</span></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ROOT COMPONENT ─────────────────────────────────────────────────────────*/
export default function LuminaryPrototype() {
  const [page, setPage] = useState("dashboard");
  const [appState, setAppState] = useState(() => {
    const defaultState = {
      roadmaps: [],
      certifications: [],
      battleLog: [],
      battleSolved: 0,
      battleStreak: 0,
      lastBattleDate: null,
      studyStreak: 0,
      lastStudyDate: null,
      studyDates: [],
      totalPomodoros: 0,
      totalCompleted: 0,
    };

    if (typeof window === "undefined") {
      return defaultState;
    }

    try {
      const stored = window.localStorage.getItem("luminary-app-state");
      if (!stored) return defaultState;

      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object") return defaultState;

      const restoredRoadmaps = Array.isArray(parsed.roadmaps)
        ? parsed.roadmaps.map((rm: any) => ({
            ...rm,
            completedIds: new Set(rm.completedIds || []),
            unlockedIds: new Set(rm.unlockedIds || []),
          }))
        : [];

      return {
        ...defaultState,
        ...parsed,
        roadmaps: restoredRoadmaps,
      };
    } catch (e) {
      console.error("Failed to restore Luminary state", e);
      return defaultState;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const serializable = {
        ...appState,
        roadmaps: (appState.roadmaps || []).map((rm: any) => ({
          ...rm,
          completedIds: Array.from(rm.completedIds || []),
          unlockedIds: Array.from(rm.unlockedIds || []),
        })),
      };
      window.localStorage.setItem(
        "luminary-app-state",
        JSON.stringify(serializable)
      );
    } catch (e) {
      console.error("Failed to save Luminary state", e);
    }
  }, [appState]);

  return (
    <>
      <style>{CSS}</style>
      <div className="luminary-root" style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>
        <Navbar page={page} setPage={setPage}/>
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {page==="dashboard"      && <DashboardPage      appState={appState} setPage={setPage}/>}
          {page==="roadmaps"       && <RoadmapsPage       appState={appState} setAppState={setAppState}/>}
          {page==="sessions"       && <StudySessionsPage  appState={appState} setAppState={setAppState}/>}
          {page==="certifications" && <CertificationsPage appState={appState} setAppState={setAppState}/>}
          {page==="battleground"   && <BattlegroundPage   appState={appState} setAppState={setAppState}/>}
          {page==="achievements"   && <AchievementsPage   appState={appState}/>}
        </div>
      </div>
    </>
  );
}


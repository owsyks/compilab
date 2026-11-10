"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Node,
  Edge,
  useNodesInitialized,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { Download } from "lucide-react";
import { LRMachine, itemText } from "@/lib/compiler/lr";
import { Tree } from "@/lib/compiler/derivation";
import { DFA } from "@/lib/compiler/lexer";
import { useUI } from "./providers";
function FitMeasuredGraph() {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  useEffect(() => {
    if (initialized && width > 0 && height > 0)
      void fitView({ padding: 0.2, duration: 0 });
  }, [initialized, width, height, fitView]);
  return null;
}
export function DFAGraph({ dfa, current }: { dfa: DFA; current: string }) {
  const { t } = useUI();
  const nodes: Node[] = dfa.states.map((s, i) => ({
    id: s,
    position: { x: (i % 3) * 180, y: Math.floor(i / 3) * 140 },
    data: { label: (dfa.start === s ? "→ " : "") + s },
    style: {
      width: 80,
      height: 80,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderStyle: dfa.finals.includes(s) ? "double" : "solid",
      borderWidth: dfa.finals.includes(s) ? 5 : 1,
      borderColor: current === s ? "var(--accent)" : "var(--muted)",
      background: current === s ? "var(--accent-soft)" : "var(--surface)",
      color: "var(--text)",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
    },
  }));
  const groups = new Map<
    string,
    { from: string; to: string; labels: string[] }
  >();
  for (const [key, to] of Object.entries(dfa.transitions)) {
    const split = key.indexOf("|");
    const from = key.slice(0, split),
      label = key.slice(split + 1);
    const group = groups.get(from + "\u0000" + to) ?? { from, to, labels: [] };
    group.labels.push(label);
    groups.set(from + "\u0000" + to, group);
  }
  const edges: Edge[] = [...groups.values()].map((e, i) => ({
    id: "dfa-" + i,
    source: e.from,
    target: e.to,
    label: e.labels.join(", "),
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "var(--muted)" },
    labelStyle: { fill: "var(--text)", fontSize: 10 },
    labelBgStyle: { fill: "var(--surface)" },
  }));
  return (
    <div
      className="state-graph"
      style={{ height: 280 }}
      role="img"
      aria-label={t(
        "Graphe de l’AFD défini par la table de transitions",
        "DFA graph defined by the transition table",
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: false }}
      >
        <FitMeasuredGraph />
        <Background color="var(--border)" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
export function ItemGraph({
  machine,
  selected,
  onSelect,
}: {
  machine: LRMachine;
  selected: number;
  onSelect: (n: number) => void;
}) {
  const { t } = useUI();
  const graph = useMemo(() => {
    const layout = new dagre.graphlib.Graph();
    layout.setGraph({ rankdir: "LR", nodesep: 35, ranksep: 90 });
    layout.setDefaultEdgeLabel(() => ({}));
    machine.states.forEach((_, i) =>
      layout.setNode(String(i), { width: 220, height: 130 }),
    );
    machine.transitions.forEach((e) =>
      layout.setEdge(String(e.from), String(e.to)),
    );
    dagre.layout(layout);
    const nodes: Node[] = machine.states.map((items, i) => {
      const p = layout.node(String(i));
      const conflict = machine.conflicts.some((c) => c.state === i);
      return {
        id: String(i),
        position: { x: p.x - 110, y: p.y - 65 },
        data: {
          label: (
            <div className="item-node">
              <strong>
                I{i}
                {conflict ? " · ⚠" : ""}
              </strong>
              {items.slice(0, 4).map((item, j) => (
                <code key={j}>{itemText(machine, item)}</code>
              ))}
              {items.length > 4 && <small>+{items.length - 4} items</small>}
            </div>
          ),
        },
        style: {
          width: 220,
          height: 130,
          borderColor: conflict
            ? "var(--red)"
            : i === selected
              ? "var(--accent)"
              : "var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          boxShadow:
            i === selected ? "0 0 0 2px var(--accent-soft)" : undefined,
        },
      };
    });
    const edges: Edge[] = machine.transitions.map((e, i) => ({
      id: "edge" + i,
      source: String(e.from),
      target: String(e.to),
      label: e.symbol,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "var(--muted)" },
      labelStyle: { fill: "var(--text)" },
      labelBgStyle: { fill: "var(--surface)" },
    }));
    return { nodes, edges };
  }, [machine, selected]);
  return (
    <div
      className="state-graph"
      role="img"
      aria-label={t(
        "Automate canonique des items LR, sélection des états disponible dans la liste",
        "Canonical LR item automaton; select states using the list",
      )}
    >
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        onNodeClick={(_, node) => onSelect(Number(node.id))}
        fitView
        minZoom={0.1}
        maxZoom={1.7}
        nodesDraggable={false}
        proOptions={{ hideAttribution: false }}
      >
        <FitMeasuredGraph />
        <Background color="var(--border)" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
export function TreeDiagram({ tree }: { tree: Tree }) {
  const { t } = useUI();
  const ref = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  let leaf = 0;
  let depth = 0;
  const nodes: {
    id: number;
    x: number;
    y: number;
    symbol: string;
    production?: number;
  }[] = [];
  const edges: { from: number; to: number }[] = [];
  function walk(n: Tree, d: number): number {
    depth = Math.max(depth, d);
    const id = nodes.length;
    nodes.push({
      id,
      x: 0,
      y: d * 85 + 30,
      symbol: n.symbol,
      production: n.production,
    });
    const children = n.children.map((c) => walk(c, d + 1));
    const x = children.length
      ? children.reduce((sum, id) => sum + nodes[id].x, 0) / children.length
      : leaf++ * 75 + 45;
    nodes[id].x = x;
    children.forEach((to) => edges.push({ from: id, to }));
    return id;
  }
  walk(tree, 0);
  const width = Math.max(300, leaf * 75 + 20),
    height = (depth + 1) * 85;
  function download() {
    const blob = new Blob([ref.current!.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compilab-tree.svg";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="tree-container">
      <div className="diagram-toolbar">
        <label>
          Zoom{" "}
          <input
            aria-label="Tree zoom"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <button className="text-button" onClick={download}>
          <Download size={14} />
          {t("Télécharger SVG", "Download SVG")}
        </button>
      </div>
      <div className="tree-scroll">
        <svg
          ref={ref}
          xmlns="http://www.w3.org/2000/svg"
          width={width * zoom}
          height={height * zoom}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t(
            "Arbre de dérivation calculé",
            "Computed derivation tree",
          )}
        >
          <rect width="100%" height="100%" fill="#ffffff" />
          {edges.map((e, i) => (
            <line
              key={i}
              x1={nodes[e.from].x}
              y1={nodes[e.from].y + 14}
              x2={nodes[e.to].x}
              y2={nodes[e.to].y - 14}
              stroke="#afbac4"
            />
          ))}
          {nodes.map((n) => (
            <g key={n.id}>
              <rect
                x={n.x - 24}
                y={n.y - 16}
                width="48"
                height="32"
                rx="5"
                fill={n.production ? "#edf4f7" : "#f6f6f2"}
                stroke="#cbd6dd"
              />
              <text
                x={n.x}
                y={n.y + 5}
                textAnchor="middle"
                fontSize="14"
                fill="#173f54"
                fontFamily="monospace"
              >
                {n.symbol}
              </text>
              {n.production && (
                <text
                  x={n.x + 29}
                  y={n.y - 9}
                  fontSize="10"
                  fill="#637481"
                  fontFamily="monospace"
                >
                  r{n.production}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Loader2, AlertCircle, Map, RefreshCw } from 'lucide-react';

// Color palette for branches — first & last use theme primary via CSS vars
function getBranchColors() {
  const s = getComputedStyle(document.documentElement);
  const p500 = s.getPropertyValue('--color-primary-500').trim() || '#f43f5e';
  const p400 = s.getPropertyValue('--color-primary-400').trim() || '#fb7185';
  return [p500, '#ff6b6b', '#51cf66', '#fcc419', '#cc5de8', '#20c997', '#ff922b', p400];
}

/**
 * Convert hierarchical mindmap data into React Flow nodes and edges
 */
function convertToReactFlow(data) {
  if (!data?.nodes?.[0]) return { nodes: [], edges: [] };

  const rfNodes = [];
  const rfEdges = [];
  const root = data.nodes[0];
  const BRANCH_COLORS = getBranchColors();

  // Root node at center
  rfNodes.push({
    id: root.id,
    type: 'default',
    data: { label: root.label },
    position: { x: 0, y: 0 },
    style: {
      background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))',
      color: '#fff',
      border: 'none',
      borderRadius: '16px',
      padding: '16px 24px',
      fontSize: '16px',
      fontWeight: '700',
      fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
      boxShadow: '0 8px 32px color-mix(in srgb, var(--color-primary-600) 30%, transparent)',
      minWidth: '180px',
      textAlign: 'center',
    },
  });

  if (!root.children?.length) return { nodes: rfNodes, edges: rfEdges };

  const childCount = root.children.length;
  const verticalSpacing = 150;
  const horizontalSpacing = 300;

  root.children.forEach((branch, i) => {
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
    const isLeft = i % 2 === 0;
    const row = Math.floor(i / 2);
    const xOffset = isLeft ? -horizontalSpacing : horizontalSpacing;
    const yOffset = (row - Math.floor(childCount / 4)) * verticalSpacing;

    // Branch node (level 1)
    rfNodes.push({
      id: branch.id,
      type: 'default',
      data: { label: branch.label },
      position: { x: xOffset, y: yOffset },
      style: {
        background: `${color}15`,
        color: color,
        border: `2px solid ${color}40`,
        borderRadius: '12px',
        padding: '10px 18px',
        fontSize: '13px',
        fontWeight: '600',
        fontFamily: 'Inter, sans-serif',
        minWidth: '140px',
        textAlign: 'center',
      },
    });

    rfEdges.push({
      id: `e-${root.id}-${branch.id}`,
      source: root.id,
      target: branch.id,
      type: 'smoothstep',
      style: { stroke: color, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    });

    // Sub-branch nodes (level 2)
    if (branch.children?.length) {
      branch.children.forEach((sub, j) => {
        const subX = xOffset + (isLeft ? -240 : 240);
        const subY = yOffset + (j - Math.floor(branch.children.length / 2)) * 60;

        rfNodes.push({
          id: sub.id,
          type: 'default',
          data: { label: sub.label },
          position: { x: subX, y: subY },
          style: {
            background: '#242736',
            color: '#e4e5e9',
            border: `1px solid ${color}30`,
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: '500',
            fontFamily: 'Inter, sans-serif',
            maxWidth: '200px',
            textAlign: 'center',
          },
        });

        rfEdges.push({
          id: `e-${branch.id}-${sub.id}`,
          source: branch.id,
          target: sub.id,
          type: 'smoothstep',
          style: { stroke: `${color}60`, strokeWidth: 1.5 },
        });

        // Level 3 sub-children
        if (sub.children?.length) {
          sub.children.forEach((leaf, k) => {
            const leafX = subX + (isLeft ? -220 : 220);
            const leafY = subY + (k - Math.floor(sub.children.length / 2)) * 45;

            rfNodes.push({
              id: leaf.id,
              type: 'default',
              data: { label: leaf.label },
              position: { x: leafX, y: leafY },
              style: {
                background: '#1a1d27',
                color: '#9496a1',
                border: '1px solid #2e3144',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: '400',
                fontFamily: 'Inter, sans-serif',
                maxWidth: '180px',
                textAlign: 'center',
              },
            });

            rfEdges.push({
              id: `e-${sub.id}-${leaf.id}`,
              source: sub.id,
              target: leaf.id,
              type: 'smoothstep',
              style: { stroke: '#2e3144', strokeWidth: 1 },
            });
          });
        }
      });
    }
  });

  return { nodes: rfNodes, edges: rfEdges };
}

export default function MindmapView({ data, loading, error, onGenerate }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => (data ? convertToReactFlow(data) : { nodes: [], edges: [] }),
    [data]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when data changes
  useMemo(() => {
    if (data) {
      const { nodes: n, edges: e } = convertToReactFlow(data);
      setNodes(n);
      setEdges(e);
    }
  }, [data]);

  const [loadingText, setLoadingText] = useState("Đang phân tích cấu trúc tài liệu...");

  useEffect(() => {
    if (!loading) return;
    const texts = [
      "Đang phân tích cấu trúc tài liệu...",
      "Trích xuất các ý chính và khái niệm...",
      "Thiết lập các nhánh liên kết sơ đồ...",
      "Hoàn thiện giao diện đồ họa..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] h-full gap-8 relative overflow-hidden bg-surface">
        {/* Skeleton Graph Structure */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          {/* Center Root */}
          <div className="w-48 h-16 bg-line rounded-2xl animate-pulse relative z-10 shadow-[0_0_30px_rgba(99,102,241,0.2)]" />

          {/* Left Branch */}
          <div className="absolute w-[200px] h-1 bg-gradient-to-l from-line to-transparent top-1/2 -ml-[200px] -translate-y-1/2" />
          <div className="absolute -ml-[300px] -translate-y-1/2 w-32 h-10 bg-surface-2 rounded-xl animate-pulse delay-100" />

          {/* Right Branch */}
          <div className="absolute w-[200px] h-1 bg-gradient-to-r from-line to-transparent top-1/2 ml-[200px] -translate-y-1/2" />
          <div className="absolute ml-[300px] -translate-y-1/2 w-32 h-10 bg-surface-2 rounded-xl animate-pulse delay-200" />

          {/* Top Left Branch */}
          <svg className="absolute w-full h-full opacity-50" style={{ transform: 'translate(-150px, -100px)' }}>
            <path d="M 150 100 Q 50 100 50 0" fill="transparent" stroke="#2e3144" strokeWidth="2" />
          </svg>
          <div className="absolute -translate-x-[150px] -translate-y-[100px] w-28 h-8 bg-surface-2 rounded-xl animate-pulse delay-300" />

          {/* Bottom Right Branch */}
          <svg className="absolute w-full h-full opacity-50" style={{ transform: 'translate(150px, 100px)' }}>
            <path d="M -150 -100 Q -50 -100 -50 0" fill="transparent" stroke="#2e3144" strokeWidth="2" />
          </svg>
          <div className="absolute translate-x-[150px] translate-y-[100px] w-28 h-8 bg-surface-2 rounded-xl animate-pulse delay-150" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-20 flex flex-col items-center bg-surface/80 backdrop-blur-md px-8 py-6 rounded-3xl border border-line shadow-xl animate-in zoom-in duration-500">
          <div className="relative">
            <Loader2 size={40} className="text-primary-400 animate-spin" />
            <div className="absolute inset-0 bg-primary-400/20 rounded-full blur-xl animate-pulse" />
          </div>
          <p className="mt-4 font-medium bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500 text-center w-64 min-h-[40px] flex items-center justify-center">
            {loadingText}
          </p>
          <div className="w-full bg-line h-1 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full w-1/3 animate-[slide_2s_ease-in-out_infinite_alternate]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-red-400">Lỗi tạo sơ đồ tư duy</p>
        <p className="text-sm text-muted max-w-md text-center">{error}</p>
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 rounded-lg text-sm hover:bg-primary-700 transition-colors"
        >
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <Map size={48} className="text-line" />
        <p className="text-muted">Chưa có sơ đồ tư duy</p>
        <button
          onClick={onGenerate}
          className="px-6 py-2.5 bg-primary-600 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
        >
          Tạo Sơ đồ tư duy
        </button>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <h3 className="font-semibold text-sm">{data.title || 'Sơ đồ tư duy'}</h3>
        <span className="text-xs text-muted">Kéo để di chuyển • Cuộn để zoom</span>
      </div>
      <div style={{ height: 'calc(100% - 48px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            style={{
              background: '#242736',
              border: '1px solid #2e3144',
              borderRadius: '8px',
            }}
          />
          <Background color="#2e3144" gap={20} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

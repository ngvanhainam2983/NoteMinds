import { useCallback, useMemo } from 'react';
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <Loader2 size={40} className="text-primary-400 animate-spin" />
        <p className="text-[#9496a1]">NoteMindAI đang phân tích và tạo sơ đồ tư duy<span className="loading-dots"></span></p>
        <p className="text-xs text-[#9496a1]/60">Quá trình này có thể mất một chút thời gian. Vui lòng đợi.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-red-400">Lỗi tạo sơ đồ tư duy</p>
        <p className="text-sm text-[#9496a1] max-w-md text-center">{error}</p>
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
        <Map size={48} className="text-[#2e3144]" />
        <p className="text-[#9496a1]">Chưa có sơ đồ tư duy</p>
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
      <div className="px-4 py-3 border-b border-[#2e3144] flex items-center justify-between">
        <h3 className="font-semibold text-sm">{data.title || 'Sơ đồ tư duy'}</h3>
        <span className="text-xs text-[#9496a1]">Kéo để di chuyển • Cuộn để zoom</span>
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

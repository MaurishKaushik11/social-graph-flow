import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  MarkerType,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UserNode } from './UserNode';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface NetworkGraphProps {
  onUserSelect: (userId: string | null) => void;
  refreshTrigger?: number;
}

const nodeTypes: NodeTypes = {
  userNode: UserNode,
};

export const NetworkGraph = ({ onUserSelect, refreshTrigger }: NetworkGraphProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  const loadGraphData = useCallback(async () => {
    try {
      setLoading(true);
      const graphData = await api.getGraphData();

      // Create nodes with circular layout
      const radius = 250;
      const centerX = 400;
      const centerY = 300;

      const newNodes: Node[] = graphData.nodes.map((user, index) => {
        const angle = (index / graphData.nodes.length) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        // Determine node color based on popularity score
        let color = 'hsl(var(--node-low))';
        if (user.popularityScore > 5) {
          color = 'hsl(var(--node-high))';
        } else if (user.popularityScore > 2) {
          color = 'hsl(var(--node-medium))';
        }

        return {
          id: user.id,
          type: 'userNode',
          position: { x, y },
          data: {
            username: user.username,
            age: user.age,
            popularityScore: user.popularityScore,
            hobbies: user.hobbies,
            color,
          },
        };
      });

      // Create edges from friendships
      const newEdges: Edge[] = graphData.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'straight',
        animated: true,
        style: {
          stroke: 'hsl(var(--primary))',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: 'hsl(var(--primary))',
        },
      }));

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error: any) {
      console.error('Error loading graph data:', error);
      toast.error('Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData, refreshTrigger]);

  // Listen for refresh events from drag and drop
  useEffect(() => {
    const handleRefreshGraph = () => {
      loadGraphData();
    };

    window.addEventListener('refreshGraph', handleRefreshGraph);
    return () => window.removeEventListener('refreshGraph', handleRefreshGraph);
  }, [loadGraphData]);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      try {
        await api.createFriendship(connection.source, connection.target);
        toast.success('Friendship created!');
        loadGraphData();
      } catch (error: any) {
        console.error('Error creating friendship:', error);
        toast.error(error.message || 'Failed to create friendship');
      }
    },
    [loadGraphData]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onUserSelect(node.id);
    },
    [onUserSelect]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-muted-foreground">Loading network...</div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      fitView
      className="bg-background/50"
    >
      <Background color="hsl(var(--border))" gap={16} />
      <Controls className="bg-card/70 backdrop-blur-xl border border-border/30" />
    </ReactFlow>
  );
};

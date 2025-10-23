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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Fetch all friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*');

      if (friendshipsError) throw friendshipsError;

      // Fetch all user hobbies
      const { data: userHobbies, error: hobbiesError } = await supabase
        .from('user_hobbies')
        .select('user_id, hobby_id, hobbies(name)');

      if (hobbiesError) throw hobbiesError;

      // Calculate popularity scores for all users
      const usersWithScores = await Promise.all(
        (users || []).map(async (user) => {
          const { data: scoreData } = await supabase
            .rpc('calculate_popularity_score', { user_uuid: user.id });
          
          const hobbies = (userHobbies || [])
            .filter((uh: any) => uh.user_id === user.id)
            .map((uh: any) => uh.hobbies?.name)
            .filter(Boolean);

          return {
            ...user,
            popularityScore: scoreData || 0,
            hobbies,
          };
        })
      );

      // Create nodes with circular layout
      const radius = 250;
      const centerX = 400;
      const centerY = 300;
      
      const newNodes: Node[] = usersWithScores.map((user, index) => {
        const angle = (index / usersWithScores.length) * 2 * Math.PI;
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
      const newEdges: Edge[] = (friendships || []).map((friendship) => ({
        id: friendship.id,
        source: friendship.user_id_1,
        target: friendship.user_id_2,
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

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      try {
        const [userId1, userId2] = [connection.source, connection.target].sort();

        const { error } = await supabase
          .from('friendships')
          .insert({
            user_id_1: userId1,
            user_id_2: userId2,
          });

        if (error) throw error;

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

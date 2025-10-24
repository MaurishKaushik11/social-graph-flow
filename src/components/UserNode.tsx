import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface UserNodeData {
  username: string;
  age: number;
  popularityScore: number;
  hobbies: string[];
  color: string;
}

export const UserNode = memo(({ data, id }: NodeProps) => {
  const nodeData = data as unknown as UserNodeData;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    const hobbyId = e.dataTransfer.getData('hobbyId');
    const hobbyName = e.dataTransfer.getData('hobbyName');

    if (!hobbyId) return;

    try {
      await api.addHobbyToUser(id, hobbyName);
      toast.success(`Added ${hobbyName} to ${nodeData.username}!`);

      // Trigger a refresh of the graph data
      window.dispatchEvent(new CustomEvent('refreshGraph'));
    } catch (error: any) {
      console.error('Error adding hobby:', error);
      toast.error('Failed to add hobby');
    }
  };

  return (
    <div
      className="px-6 py-4 rounded-xl border-2 transition-all duration-300 hover:scale-110 cursor-pointer min-w-[160px]"
      style={{
        backgroundColor: nodeData.color,
        borderColor: nodeData.color,
        boxShadow: `0 0 20px ${nodeData.color}50`,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-accent" />

      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center">
          <Users className="w-5 h-5 text-foreground" />
        </div>

        <div className="text-center">
          <div className="font-bold text-foreground text-sm">{nodeData.username}</div>
          <div className="text-xs text-foreground/80">Age: {nodeData.age}</div>
          <div className="text-xs text-foreground/80 font-semibold mt-1">
            Score: {nodeData.popularityScore.toFixed(1)}
          </div>
        </div>

        {/* Display hobbies */}
        {nodeData.hobbies && nodeData.hobbies.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 justify-center">
            {nodeData.hobbies.slice(0, 3).map((hobby, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-background/40 backdrop-blur-sm rounded-full text-foreground/90 border border-foreground/20"
                title={hobby}
              >
                {hobby}
              </span>
            ))}
            {nodeData.hobbies.length > 3 && (
              <span className="px-2 py-1 text-xs bg-background/40 backdrop-blur-sm rounded-full text-foreground/70 border border-foreground/20">
                +{nodeData.hobbies.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Drop indicator when dragging */}
        <div className="text-xs text-foreground/60 mt-1">
          Drop hobbies here
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-accent" />
    </div>
  );
});

UserNode.displayName = 'UserNode';

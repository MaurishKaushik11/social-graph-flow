import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Users } from 'lucide-react';

export const UserNode = memo(({ data }: NodeProps) => {
  const { username, age, popularityScore, color } = data as {
    username: string;
    age: number;
    popularityScore: number;
    hobbies: string[];
    color: string;
  };

  return (
    <div
      className="px-6 py-4 rounded-xl border-2 transition-all duration-300 hover:scale-110 cursor-pointer min-w-[160px]"
      style={{
        backgroundColor: color,
        borderColor: color,
        boxShadow: `0 0 20px ${color}50`,
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-accent" />
      
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center">
          <Users className="w-5 h-5 text-foreground" />
        </div>
        
        <div className="text-center">
          <div className="font-bold text-foreground text-sm">{username}</div>
          <div className="text-xs text-foreground/80">Age: {age}</div>
          <div className="text-xs text-foreground/80 font-semibold mt-1">
            Score: {popularityScore.toFixed(1)}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-accent" />
    </div>
  );
});

UserNode.displayName = 'UserNode';

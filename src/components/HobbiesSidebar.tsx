import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Hobby {
  id: string;
  name: string;
}

interface HobbiesSidebarProps {
  selectedUserId: string | null;
  onHobbyAdded: () => void;
}

export const HobbiesSidebar = ({ selectedUserId, onHobbyAdded }: HobbiesSidebarProps) => {
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHobbies();
  }, []);

  const loadHobbies = async () => {
    try {
      const { data, error } = await supabase
        .from('hobbies')
        .select('*')
        .order('name');

      if (error) throw error;
      setHobbies(data || []);
    } catch (error) {
      console.error('Error loading hobbies:', error);
      toast.error('Failed to load hobbies');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, hobbyId: string, hobbyName: string) => {
    e.dataTransfer.setData('hobbyId', hobbyId);
    e.dataTransfer.setData('hobbyName', hobbyName);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filteredHobbies = hobbies.filter(hobby =>
    hobby.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-panel p-6 space-y-4 h-full flex flex-col">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          Hobbies
        </h3>
        <p className="text-sm text-muted-foreground">
          {selectedUserId ? 'Drag hobbies to add them to the selected user' : 'Select a user to add hobbies'}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search hobbies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 glass-input"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : filteredHobbies.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No hobbies found</div>
        ) : (
          filteredHobbies.map((hobby) => (
            <div
              key={hobby.id}
              draggable={!!selectedUserId}
              onDragStart={(e) => handleDragStart(e, hobby.id, hobby.name)}
              className={`
                px-4 py-3 rounded-lg border border-border/50 
                bg-secondary/50 backdrop-blur-sm
                transition-all duration-200
                ${selectedUserId 
                  ? 'cursor-grab hover:bg-primary/20 hover:border-primary hover:scale-105' 
                  : 'cursor-not-allowed opacity-50'
                }
              `}
            >
              <div className="text-sm font-medium text-foreground">{hobby.name}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

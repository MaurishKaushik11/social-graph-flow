import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, Plus, X, TrendingUp, Users, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Hobby {
  id: string;
  name: string;
  category?: string;
  popularity?: number;
  color?: string;
}

interface HobbiesSidebarProps {
  selectedUserId: string | null;
  onHobbyAdded: () => void;
}

const HOBBY_CATEGORIES = [
  { name: 'Creative', icon: '🎨', color: 'bg-purple-500' },
  { name: 'Active', icon: '⚡', color: 'bg-green-500' },
  { name: 'Social', icon: '👥', color: 'bg-blue-500' },
  { name: 'Relaxing', icon: '🧘', color: 'bg-pink-500' },
  { name: 'Learning', icon: '📚', color: 'bg-yellow-500' },
];

const POPULAR_HOBBIES = [
  { id: 'hobby-1', name: 'Reading', category: 'Relaxing', popularity: 95, color: '#8B5CF6' },
  { id: 'hobby-2', name: 'Gaming', category: 'Active', popularity: 87, color: '#10B981' },
  { id: 'hobby-3', name: 'Cooking', category: 'Creative', popularity: 78, color: '#F59E0B' },
  { id: 'hobby-4', name: 'Hiking', category: 'Active', popularity: 82, color: '#059669' },
  { id: 'hobby-5', name: 'Photography', category: 'Creative', popularity: 71, color: '#7C3AED' },
  { id: 'hobby-6', name: 'Music', category: 'Creative', popularity: 89, color: '#DC2626' },
  { id: 'hobby-7', name: 'Painting', category: 'Creative', popularity: 65, color: '#2563EB' },
  { id: 'hobby-8', name: 'Dancing', category: 'Active', popularity: 73, color: '#EC4899' },
  { id: 'hobby-9', name: 'Sports', category: 'Active', popularity: 91, color: '#059669' },
  { id: 'hobby-10', name: 'Traveling', category: 'Social', popularity: 88, color: '#0EA5E9' },
  { id: 'hobby-11', name: 'Writing', category: 'Creative', popularity: 69, color: '#7C2D12' },
  { id: 'hobby-12', name: 'Yoga', category: 'Relaxing', popularity: 76, color: '#BE123C' },
  { id: 'hobby-13', name: 'Movies', category: 'Relaxing', popularity: 84, color: '#1F2937' },
  { id: 'hobby-14', name: 'Coding', category: 'Learning', popularity: 80, color: '#059669' },
  { id: 'hobby-15', name: 'Gardening', category: 'Relaxing', popularity: 67, color: '#16A34A' },
];

export const HobbiesSidebar = ({ selectedUserId, onHobbyAdded }: HobbiesSidebarProps) => {
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [newHobbyName, setNewHobbyName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHobbies();
  }, []);

  const loadHobbies = async () => {
    try {
      setLoading(true);
      // Use fallback hobbies since API might not return formatted data
      setHobbies(POPULAR_HOBBIES);
    } catch (error) {
      console.error('Error loading hobbies:', error);
      toast.error('Failed to load hobbies');
      setHobbies(POPULAR_HOBBIES);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, hobbyId: string, hobbyName: string) => {
    e.dataTransfer.setData('hobbyId', hobbyId);
    e.dataTransfer.setData('hobbyName', hobbyName);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleAddHobby = async () => {
    if (!newHobbyName.trim()) return;

    try {
      // For now, just add to local state - in a real app, this would call the API
      const newHobby: Hobby = {
        id: `hobby-${Date.now()}`,
        name: newHobbyName.trim(),
        category: 'Custom',
        popularity: Math.floor(Math.random() * 50) + 50,
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
      };

      setHobbies(prev => [...prev, newHobby]);
      setNewHobbyName('');
      setShowAddForm(false);
      toast.success(`Added ${newHobby.name} hobby!`);
    } catch (error) {
      toast.error('Failed to add hobby');
    }
  };

  const filteredHobbies = hobbies.filter(hobby => {
    const matchesSearch = hobby.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || hobby.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...Array.from(new Set(hobbies.map(h => h.category || 'Other')))];

  return (
    <div className="glass-panel p-6 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            Hobbies
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {selectedUserId
            ? 'Drag hobbies to add them to the selected user'
            : 'Select a user to start adding hobbies'
          }
        </p>

        {/* Add Hobby Form */}
        {showAddForm && (
          <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter hobby name..."
                value={newHobbyName}
                onChange={(e) => setNewHobbyName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddHobby()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddHobby} disabled={!newHobbyName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search hobbies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 glass-input"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className={`text-xs ${
              selectedCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-secondary/50'
            }`}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Popular Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/20">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <div>
            <div className="text-xs text-muted-foreground">Most Popular</div>
            <div className="text-sm font-semibold text-foreground">
              {hobbies.reduce((max, h) => h.popularity && h.popularity > max ? h.popularity : max, 0)}%
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/20">
          <Users className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-xs text-muted-foreground">Total Hobbies</div>
            <div className="text-sm font-semibold text-foreground">{hobbies.length}</div>
          </div>
        </div>
      </div>

      {/* Hobbies List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading hobbies...
          </div>
        ) : filteredHobbies.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <div>No hobbies found</div>
            <div className="text-xs mt-1">Try adjusting your search or add a new hobby</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHobbies.map((hobby) => (
              <div
                key={hobby.id}
                draggable={!!selectedUserId}
                onDragStart={(e) => handleDragStart(e, hobby.id, hobby.name)}
                className={`
                  group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer
                  ${selectedUserId
                    ? 'cursor-grab hover:scale-105 hover:shadow-lg active:cursor-grabbing'
                    : 'cursor-not-allowed opacity-50'
                  }
                  bg-gradient-to-br from-background/50 to-secondary/30
                  border-border/50 hover:border-primary/50
                `}
                style={{
                  background: selectedUserId
                    ? `linear-gradient(135deg, ${hobby.color}08, ${hobby.color}15)`
                    : undefined
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: hobby.color }}
                      />
                      <div className="text-sm font-semibold text-foreground truncate">
                        {hobby.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {hobby.category}
                      </Badge>
                      {hobby.popularity && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Heart className="w-3 h-3" />
                          {hobby.popularity}%
                        </div>
                      )}
                    </div>

                    {/* Drag indicator */}
                    {selectedUserId && (
                      <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        Drag to add to user
                      </div>
                    )}
                  </div>

                  {/* Drag handle */}
                  {selectedUserId && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-1 h-8 bg-gradient-to-b from-transparent via-primary/50 to-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

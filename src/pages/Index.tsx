import { useState } from 'react';
import { NetworkGraph } from '@/components/NetworkGraph';
import { HobbiesSidebar } from '@/components/HobbiesSidebar';
import { UserManagementPanel } from '@/components/UserManagementPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Network } from 'lucide-react';

const Index = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUserChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      toast.error('Please select a user first');
      return;
    }

    const hobbyId = e.dataTransfer.getData('hobbyId');
    const hobbyName = e.dataTransfer.getData('hobbyName');

    if (!hobbyId) return;

    try {
      const { error } = await supabase
        .from('user_hobbies')
        .insert({
          user_id: selectedUserId,
          hobby_id: hobbyId,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('User already has this hobby');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Added ${hobbyName} to user!`);
      handleUserChange();
    } catch (error: any) {
      console.error('Error adding hobby:', error);
      toast.error('Failed to add hobby');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass-panel border-b border-border/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Network className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cybernauts Network</h1>
            <p className="text-sm text-muted-foreground">Interactive User Relationship & Hobby Network</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Sidebar - User Management */}
        <div className="w-80 flex-shrink-0 overflow-hidden">
          <UserManagementPanel
            selectedUserId={selectedUserId}
            onUserChange={handleUserChange}
            onClearSelection={() => setSelectedUserId(null)}
          />
        </div>

        {/* Center - Graph */}
        <div
          className="flex-1 glass-panel overflow-hidden"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <NetworkGraph
            onUserSelect={setSelectedUserId}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* Right Sidebar - Hobbies */}
        <div className="w-80 flex-shrink-0 overflow-hidden">
          <HobbiesSidebar
            selectedUserId={selectedUserId}
            onHobbyAdded={handleUserChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;

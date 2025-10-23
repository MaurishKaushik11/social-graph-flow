import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Trash2, X, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface User {
  id: string;
  username: string;
  age: number;
  hobbies?: string[];
  popularityScore?: number;
}

interface UserManagementPanelProps {
  selectedUserId: string | null;
  onUserChange: () => void;
  onClearSelection: () => void;
}

export const UserManagementPanel = ({
  selectedUserId,
  onUserChange,
  onClearSelection,
}: UserManagementPanelProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        setSelectedUser(user);
        setUsername(user.username);
        setAge(user.age.toString());
      }
    } else {
      setSelectedUser(null);
      setUsername('');
      setAge('');
    }
  }, [selectedUserId, users]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load hobbies and scores for each user
      const usersWithDetails = await Promise.all(
        (data || []).map(async (user) => {
          const { data: hobbiesData } = await supabase
            .from('user_hobbies')
            .select('hobbies(name)')
            .eq('user_id', user.id);

          const { data: scoreData } = await supabase
            .rpc('calculate_popularity_score', { user_uuid: user.id });

          return {
            ...user,
            hobbies: hobbiesData?.map((h: any) => h.hobbies?.name).filter(Boolean) || [],
            popularityScore: scoreData || 0,
          };
        })
      );

      setUsers(usersWithDetails);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !age) {
      toast.error('Please fill in all fields');
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      toast.error('Please enter a valid age');
      return;
    }

    setLoading(true);
    try {
      if (selectedUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({ username: username.trim(), age: ageNum })
          .eq('id', selectedUser.id);

        if (error) throw error;
        toast.success('User updated successfully!');
      } else {
        // Create new user
        const { error } = await supabase
          .from('users')
          .insert({ username: username.trim(), age: ageNum });

        if (error) throw error;
        toast.success('User created successfully!');
      }

      setUsername('');
      setAge('');
      onClearSelection();
      loadUsers();
      onUserChange();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;

    setLoading(true);
    try {
      // Check if user has friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('id')
        .or(`user_id_1.eq.${deleteUserId},user_id_2.eq.${deleteUserId}`)
        .limit(1);

      if (friendshipsError) throw friendshipsError;

      if (friendships && friendships.length > 0) {
        toast.error('Cannot delete user with active friendships. Remove friendships first.');
        setDeleteUserId(null);
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', deleteUserId);

      if (error) throw error;

      toast.success('User deleted successfully!');
      setDeleteUserId(null);
      if (selectedUserId === deleteUserId) {
        onClearSelection();
      }
      loadUsers();
      onUserChange();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="glass-panel p-6 space-y-6 h-full flex flex-col">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-accent" />
            User Management
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter age"
              min="1"
              max="150"
              className="glass-input"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {selectedUser ? 'Update User' : 'Create User'}
            </Button>
            {selectedUser && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedUser(null);
                  setUsername('');
                  setAge('');
                  onClearSelection();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">All Users</h4>
          {users.map((user) => (
            <Card
              key={user.id}
              className={`cursor-pointer transition-all duration-200 border-border/50 bg-secondary/30 backdrop-blur-sm ${
                selectedUserId === user.id ? 'ring-2 ring-primary' : 'hover:bg-secondary/50'
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{user.username}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteUserId(user.id)}
                    className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <div className="text-xs text-muted-foreground">
                  Age: {user.age} • Score: {user.popularityScore?.toFixed(1) || 0}
                </div>
                {user.hobbies && user.hobbies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {user.hobbies.map((hobby, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {hobby}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="glass-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user must not have any active friendships.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MachineType } from '@/types/machine';

interface AddMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  userRole: 'super_admin' | 'admin' | 'client';
  onMachineAdded: () => void;
}

export const AddMachineDialog = ({ open, onOpenChange, ownerId, userRole, onMachineAdded }: AddMachineDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [assignmentType, setAssignmentType] = useState<'self' | 'other'>('self');
  const [formData, setFormData] = useState({
    name: '',
    type: 'fan' as MachineType,
    apiEndpoint: '',
    assignedUserId: '',
  });

  useEffect(() => {
    if (open) {
      loadAssignableUsers();
    }
  }, [open, userRole]);

  const loadAssignableUsers = async () => {
    try {
      if (userRole === 'super_admin') {
        // Super admin can assign to admins
        const { data: adminRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (rolesError) throw rolesError;

        const adminIds = (adminRoles || []).map(r => r.user_id);
        
        if (adminIds.length === 0) {
          setAssignableUsers([]);
          return;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', adminIds);

        if (profilesError) throw profilesError;

        setAssignableUsers((profiles || []).map(p => ({ ...p, role: 'admin' })));
      } else if (userRole === 'admin') {
        // Admin can assign to their clients
        const { data, error } = await supabase
          .from('client_admin_assignments')
          .select('client_id, profiles!client_admin_assignments_client_id_fkey(name)')
          .eq('admin_id', ownerId);

        if (error) throw error;

        const userList = (data || []).map((assignment: any) => ({
          id: assignment.client_id,
          name: assignment.profiles?.name || 'Unknown',
          role: 'client',
        }));

        setAssignableUsers(userList);
      }
    } catch (error) {
      console.error('Error loading assignable users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalOwnerId = assignmentType === 'other' ? formData.assignedUserId : ownerId;
      
      if (assignmentType === 'other' && !formData.assignedUserId) {
        throw new Error(`Please select ${userRole === 'super_admin' ? 'an admin' : 'a client'}`);
      }

      const { data, error } = await supabase
        .from('machines')
        .insert({
          name: formData.name,
          type: formData.type,
          owner_id: finalOwnerId,
          api_endpoint: formData.apiEndpoint || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: (
          <div className="space-y-1">
            <p>Machine created successfully</p>
            <p className="text-xs text-muted-foreground">API Key: {data.api_key}</p>
            <p className="text-xs text-muted-foreground">Store this key securely - it won't be shown again!</p>
          </div>
        ),
      });

      onMachineAdded();
      onOpenChange(false);
      
      setFormData({
        name: '',
        type: 'fan',
        apiEndpoint: '',
        assignedUserId: '',
      });
      setAssignmentType('self');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Machine</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Assign To</Label>
            <RadioGroup value={assignmentType} onValueChange={(value: 'self' | 'other') => setAssignmentType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="self" id="self" />
                <Label htmlFor="self" className="font-normal cursor-pointer">My Account</Label>
              </div>
              {assignableUsers.length > 0 && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal cursor-pointer">
                    {userRole === 'super_admin' ? 'An Admin' : 'A Client'}
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {assignmentType === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="user-select">
                Select {userRole === 'super_admin' ? 'Admin' : 'Client'} *
              </Label>
              <Select 
                value={formData.assignedUserId} 
                onValueChange={(value) => setFormData({ ...formData, assignedUserId: value })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder={`Choose ${userRole === 'super_admin' ? 'an admin' : 'a client'}`} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {assignableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Machine Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Machine Type *</Label>
            <Select value={formData.type} onValueChange={(value: MachineType) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fan">Fan</SelectItem>
                <SelectItem value="heatpump">Heat Pump</SelectItem>
                <SelectItem value="airconditioner">Air Conditioner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API Endpoint (Optional)</Label>
            <Input
              id="apiEndpoint"
              type="url"
              placeholder="https://..."
              value={formData.apiEndpoint}
              onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              The HTTPS endpoint where the machine can receive API commands
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Machine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
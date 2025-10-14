import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChangeOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineId: string;
  machineName: string;
  currentOwnerId: string;
  users: Array<{ id: string; name: string; role: string }>;
  onOwnerChanged: () => void;
  currentUserRole: 'super_admin' | 'admin' | 'client';
  currentUserId: string;
}

export const ChangeOwnerDialog: React.FC<ChangeOwnerDialogProps> = ({
  open,
  onOpenChange,
  machineId,
  machineName,
  currentOwnerId,
  users,
  onOwnerChanged,
  currentUserRole,
  currentUserId,
}) => {
  const [newOwnerId, setNewOwnerId] = useState(currentOwnerId);
  const [isLoading, setIsLoading] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'client' | 'admin'>('client');
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);

  useEffect(() => {
    if (open) {
      loadAvailableUsers();
    }
  }, [open, assignmentType, currentUserRole]);

  const loadAvailableUsers = async () => {
    try {
      if (currentUserRole === 'super_admin') {
        // Super admins can only assign to admins
        const { data: adminRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (rolesError) throw rolesError;

        const adminIds = (adminRoles || []).map(r => r.user_id);
        
        if (adminIds.length === 0) {
          setAvailableUsers([]);
          return;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', adminIds);

        if (profilesError) throw profilesError;

        setAvailableUsers((profiles || []).map(p => ({ ...p, role: 'admin' })));
      } else if (currentUserRole === 'admin') {
        if (assignmentType === 'client') {
          // Load admin's clients
          const { data, error } = await supabase
            .from('client_admin_assignments')
            .select('client_id, profiles!client_admin_assignments_client_id_fkey(name)')
            .eq('admin_id', currentUserId);

          if (error) throw error;

          const userList = (data || []).map((assignment: any) => ({
            id: assignment.client_id,
            name: assignment.profiles?.name || 'Unknown',
            role: 'client',
          }));

          setAvailableUsers(userList);
        } else {
          // Load other admins
          const { data: adminRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin')
            .neq('user_id', currentUserId);

          if (rolesError) throw rolesError;

          const adminIds = (adminRoles || []).map(r => r.user_id);
          
          if (adminIds.length === 0) {
            setAvailableUsers([]);
            return;
          }

          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', adminIds);

          if (profilesError) throw profilesError;

          setAvailableUsers((profiles || []).map(p => ({ ...p, role: 'admin' })));
        }
      }
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };

  const handleChangeOwner = async () => {
    if (newOwnerId === currentOwnerId) {
      toast.error('Please select a different owner');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('machines')
        .update({ owner_id: newOwnerId })
        .eq('id', machineId);

      if (error) throw error;

      toast.success('Machine owner changed successfully');
      onOwnerChanged();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to change machine owner');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currentUserRole === 'super_admin' ? 'Assign to Admin' : 'Reassign Machine'}: {machineName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {currentUserRole === 'admin' && (
            <div className="space-y-2">
              <Label>Assign To</Label>
              <RadioGroup value={assignmentType} onValueChange={(value: 'client' | 'admin') => {
                setAssignmentType(value);
                setNewOwnerId('');
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="client" />
                  <Label htmlFor="client" className="font-normal cursor-pointer">My Client</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="admin" />
                  <Label htmlFor="admin" className="font-normal cursor-pointer">Another Admin</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Select {currentUserRole === 'super_admin' ? 'Admin' : assignmentType === 'client' ? 'Client' : 'Admin'}
            </Label>
            <Select value={newOwnerId} onValueChange={setNewOwnerId}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder={`Select ${currentUserRole === 'super_admin' ? 'admin' : assignmentType}`} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleChangeOwner} disabled={isLoading}>
            {isLoading ? 'Assigning...' : 'Assign Machine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
  currentUserRole: 'super_admin' | 'installer' | 'company' | 'client';
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
  const [assignmentType, setAssignmentType] = useState<'client' | 'installer'>('client');
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);

  useEffect(() => {
    if (open) {
      loadAvailableUsers();
    }
  }, [open, assignmentType, currentUserRole]);

  const loadAvailableUsers = async () => {
    try {
      if (currentUserRole === 'super_admin') {
        // Super admins can assign to companies, installers, and clients
        const { data: allRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['company', 'installer', 'client']);

        if (rolesError) throw rolesError;

        const userIds = (allRoles || []).map(r => r.user_id);
        const allIds = [currentUserId, ...userIds];

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', allIds);

        if (profilesError) throw profilesError;

        // Map profiles with their roles
        const userList = (profiles || []).map(p => {
          if (p.id === currentUserId) {
            return { ...p, role: 'super_admin' };
          }
          const roleData = allRoles?.find(r => r.user_id === p.id);
          return { ...p, role: roleData?.role || 'client' };
        });

        setAvailableUsers(userList);
      } else if (currentUserRole === 'installer' || currentUserRole === 'admin') {
        if (assignmentType === 'client') {
          // Load installer's clients
          const { data, error } = await supabase
            .from('client_admin_assignments')
            .select('client_id')
            .eq('admin_id', currentUserId);

          if (error) throw error;

          const clientIds = (data || []).map((a: any) => a.client_id);

          if (clientIds.length === 0) {
            setAvailableUsers([]);
            return;
          }

          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', clientIds);

          if (profilesError) throw profilesError;

          const userList = (profiles || []).map(p => ({
            ...p,
            role: 'client',
          }));

          setAvailableUsers(userList);
        } else {
          // Load other installers
          const { data: installerRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'installer')
            .neq('user_id', currentUserId);

          if (rolesError) throw rolesError;

          const installerIds = (installerRoles || []).map(r => r.user_id);
          
          if (installerIds.length === 0) {
            setAvailableUsers([]);
            return;
          }

          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', installerIds);

          if (profilesError) throw profilesError;

          setAvailableUsers((profiles || []).map(p => ({ ...p, role: 'installer' })));
        }
      } else if (currentUserRole === 'company') {
        // Company can assign to their installers and clients
        // Get installers
        const { data: installerAssignments, error: installerError } = await supabase
          .from('installer_company_assignments')
          .select('installer_id')
          .eq('company_id', currentUserId);

        if (installerError) throw installerError;

        const installerIds = (installerAssignments || []).map((a: any) => a.installer_id);
        
        // Get clients of those installers
        let clientIds: string[] = [];
        if (installerIds.length > 0) {
          const { data: clientAssignments, error: clientError } = await supabase
            .from('client_admin_assignments')
            .select('client_id')
            .in('admin_id', installerIds);

          if (!clientError && clientAssignments) {
            clientIds = clientAssignments.map((a: any) => a.client_id);
          }
        }

        const allUserIds = [...installerIds, ...clientIds];
        
        if (allUserIds.length === 0) {
          setAvailableUsers([]);
          return;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', allUserIds);

        if (profilesError) throw profilesError;

        // Map profiles with their roles
        const userList = (profiles || []).map(p => {
          const isInstaller = installerIds.includes(p.id);
          return {
            ...p,
            role: isInstaller ? 'installer' : 'client',
          };
        });

        setAvailableUsers(userList);
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
      <DialogContent className="bg-card border-2 border-border">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-2xl font-bold text-primary">
            {currentUserRole === 'super_admin' ? 'Assign Machine' : 'Reassign Machine'}: {machineName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {(currentUserRole === 'installer' || currentUserRole === 'admin') && (
            <div className="space-y-2">
              <Label>Assign To</Label>
              <RadioGroup value={assignmentType} onValueChange={(value: 'client' | 'installer') => {
                setAssignmentType(value);
                setNewOwnerId('');
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="client" />
                  <Label htmlFor="client" className="font-normal cursor-pointer">My Client</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="installer" id="installer" />
                  <Label htmlFor="installer" className="font-normal cursor-pointer">Another Installer</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Select {currentUserRole === 'super_admin' ? 'Owner' : assignmentType === 'client' ? 'Client' : 'Installer'}
            </Label>
            <Select value={newOwnerId} onValueChange={setNewOwnerId}>
              <SelectTrigger className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all">
                <SelectValue placeholder={`Select ${currentUserRole === 'super_admin' ? 'owner' : assignmentType}`} />
              </SelectTrigger>
              <SelectContent className="bg-card border-2 border-border">
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}{user.id === currentUserId ? ' (Me)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
            className="border-border hover:bg-secondary hover:text-secondary-foreground transition-all"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleChangeOwner} 
            disabled={isLoading}
            className="bg-primary hover:bg-primary-glow text-primary-foreground transition-all"
          >
            {isLoading ? 'Assigning...' : 'Assign Machine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

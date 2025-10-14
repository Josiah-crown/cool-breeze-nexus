import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
}

export const ChangeOwnerDialog: React.FC<ChangeOwnerDialogProps> = ({
  open,
  onOpenChange,
  machineId,
  machineName,
  currentOwnerId,
  users,
  onOwnerChanged,
}) => {
  const [newOwnerId, setNewOwnerId] = useState(currentOwnerId);
  const [isLoading, setIsLoading] = useState(false);

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
          <DialogTitle>Change Owner of {machineName}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">Select New Owner</label>
          <Select value={newOwnerId} onValueChange={setNewOwnerId}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleChangeOwner} disabled={isLoading}>
            {isLoading ? 'Changing...' : 'Change Owner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

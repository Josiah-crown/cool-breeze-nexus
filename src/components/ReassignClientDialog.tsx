import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReassignClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  currentAdminId: string;
  onReassigned: () => void;
}

export const ReassignClientDialog = ({ 
  open, 
  onOpenChange, 
  clientId, 
  clientName,
  currentAdminId,
  onReassigned 
}: ReassignClientDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');

  useEffect(() => {
    if (open) {
      fetchAdmins();
    }
  }, [open]);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, profiles(name)')
        .eq('role', 'admin');

      if (error) throw error;

      const adminList = data
        .filter(item => item.profiles)
        .map(item => ({
          id: item.user_id,
          name: (item.profiles as any).name,
        }));

      setAdmins(adminList);
      setSelectedAdminId(currentAdminId);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load admins',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('client_admin_assignments')
        .update({ admin_id: selectedAdminId })
        .eq('client_id', clientId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Client reassigned successfully',
      });

      onReassigned();
      onOpenChange(false);
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
          <DialogTitle>Reassign Client: {clientName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin">Assign to Admin</Label>
            <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
              <SelectTrigger>
                <SelectValue placeholder="Select admin" />
              </SelectTrigger>
              <SelectContent>
                {admins.map(admin => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedAdminId}>
              {loading ? 'Reassigning...' : 'Reassign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
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
      // Get installers (replaces old 'admin' role)
      const { data: installerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'installer');

      if (rolesError) throw rolesError;

      const installerIds = (installerRoles || []).map(r => r.user_id);
      
      if (installerIds.length === 0) {
        setAdmins([]);
        setSelectedAdminId(currentAdminId);
        return;
      }

      // Get profiles for installers
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', installerIds);

      if (profilesError) throw profilesError;

      const adminList = (profiles || []).map(p => ({
        id: p.id,
        name: p.name,
      }));

      setAdmins(adminList);
      setSelectedAdminId(currentAdminId);
    } catch (error: any) {
      console.error('Error fetching admins:', error);
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
      <DialogContent className="bg-card border-2 border-border">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-2xl font-bold text-primary">Reassign Client: {clientName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin">Assign to Installer</Label>
            <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
              <SelectTrigger className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all">
                <SelectValue placeholder="Select installer" />
              </SelectTrigger>
              <SelectContent className="bg-card border-2 border-border">
                {admins.map(admin => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-border hover:bg-secondary hover:text-secondary-foreground transition-all"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedAdminId}
              className="bg-primary hover:bg-primary-glow text-primary-foreground transition-all"
            >
              {loading ? 'Reassigning...' : 'Reassign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
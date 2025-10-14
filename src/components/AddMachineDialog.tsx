import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MachineType } from '@/types/machine';

interface AddMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  onMachineAdded: () => void;
}

export const AddMachineDialog = ({ open, onOpenChange, ownerId, onMachineAdded }: AddMachineDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'fan' as MachineType,
    apiEndpoint: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('machines')
        .insert({
          name: formData.name,
          type: formData.type,
          owner_id: ownerId,
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
      });
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
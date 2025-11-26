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
import { 
  getAvailableManufacturers, 
  isManufacturerRequired,
  type Manufacturer 
} from '@/lib/machineConfig';

interface AddMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  userRole: 'super_admin' | 'installer' | 'company' | 'client';
  onMachineAdded: () => void;
}

export const AddMachineDialog = ({ open, onOpenChange, ownerId, userRole, onMachineAdded }: AddMachineDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [assignmentType, setAssignmentType] = useState<'self' | 'other'>('self');
  // Initialize with auto-selected manufacturer if only one option
  const getInitialManufacturer = (type: MachineType): string => {
    const manufacturers = getAvailableManufacturers(type);
    return manufacturers.length === 1 ? manufacturers[0] : '';
  };

  const [formData, setFormData] = useState({
    name: '',
    type: 'evaporative' as MachineType,
    manufacturer: getInitialManufacturer('evaporative') as 'Cirrus' | 'CoolBreeze' | 'Alliance' | '',
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
        // Super admin can assign to companies, installers, and clients
        const { data: allRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['company', 'installer', 'client']);

        if (rolesError) throw rolesError;

        const userIds = (allRoles || []).map(r => r.user_id);
        
        if (userIds.length === 0) {
          setAssignableUsers([]);
          return;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Map profiles with their roles
        const userList = (profiles || []).map(p => {
          const roleData = allRoles?.find(r => r.user_id === p.id);
          return {
            id: p.id,
            name: p.name,
            role: roleData?.role || 'client',
          };
        });

        setAssignableUsers(userList);
      } else if (userRole === 'admin' || userRole === 'installer') {
        // Installer can assign to their clients
        const { data: assignments, error: assignError } = await supabase
          .from('client_admin_assignments')
          .select('client_id')
          .eq('admin_id', ownerId);

        if (assignError) throw assignError;

        const clientIds = (assignments || []).map((a: any) => a.client_id);

        if (clientIds.length === 0) {
          setAssignableUsers([]);
          return;
        }

        const { data: clientProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', clientIds);

        if (profilesError) throw profilesError;

        const userList = (clientProfiles || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          role: 'client',
        }));

        setAssignableUsers(userList);
      } else if (userRole === 'company') {
        // Company can assign to their installers and clients
        // First get installers
        const { data: installerAssignments, error: installerError } = await supabase
          .from('installer_company_assignments')
          .select('installer_id')
          .eq('company_id', ownerId);

        if (installerError) throw installerError;

        const installerIds = (installerAssignments || []).map((a: any) => a.installer_id);
        
        // Then get clients of those installers
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
          setAssignableUsers([]);
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
            id: p.id,
            name: p.name,
            role: isInstaller ? 'installer' : 'client',
          };
        });

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

      // Get available manufacturers and ensure one is selected
      const availableManufacturers = getAvailableManufacturers(formData.type);
      let finalManufacturer = formData.manufacturer;
      
      // If only one manufacturer available, use it
      if (availableManufacturers.length === 1) {
        finalManufacturer = availableManufacturers[0];
      }
      
      // If multiple manufacturers available, require selection
      if (availableManufacturers.length > 1 && !finalManufacturer) {
        throw new Error('Please select a manufacturer');
      }

      let defaultLocation: string | null = null;
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('street')
          .eq('id', finalOwnerId)
          .single();
        if (profileError) {
          console.warn('Unable to load owner profile for machine location', profileError);
        } else {
          defaultLocation = profile?.street || null;
        }
      } catch (profileErr) {
        console.warn('Unexpected error fetching owner profile', profileErr);
      }

      const { data, error } = await supabase
        .from('machines')
        .insert({
          name: formData.name,
          type: formData.type,
          manufacturer: finalManufacturer || null,
          owner_id: finalOwnerId,
          api_endpoint: formData.apiEndpoint || null,
          location: defaultLocation,
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
      
      // Reset form with auto-selected manufacturer for default type
      const defaultType: MachineType = 'evaporative';
      const defaultManufacturers = getAvailableManufacturers(defaultType);
      const defaultManufacturer = defaultManufacturers.length === 1 ? defaultManufacturers[0] : '';
      
      setFormData({
        name: '',
        type: defaultType,
        manufacturer: defaultManufacturer,
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
      <DialogContent className="bg-card border-2 border-border">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-2xl font-bold text-primary">Add New Machine</DialogTitle>
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
                <SelectTrigger className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all">
                  <SelectValue placeholder={`Choose ${userRole === 'super_admin' ? 'an admin' : 'a client'}`} />
                </SelectTrigger>
                <SelectContent className="bg-card border-2 border-border">
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
              className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Machine Type *</Label>
            <Select value={formData.type} onValueChange={(value: MachineType) => {
              const availableManufacturers = getAvailableManufacturers(value);
              // Auto-select manufacturer if only one option
              const autoManufacturer = availableManufacturers.length === 1 ? availableManufacturers[0] : '';
              setFormData({ ...formData, type: value, manufacturer: autoManufacturer });
            }}>
              <SelectTrigger className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-2 border-border">
                <SelectItem value="evaporative">Evaporative Cooler</SelectItem>
                <SelectItem value="heatpump">Heat Pump</SelectItem>
                <SelectItem value="airconditioner">Air Conditioner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {getAvailableManufacturers(formData.type).length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="manufacturer">
                Manufacturer *
              </Label>
              <Select 
                value={formData.manufacturer} 
                onValueChange={(value: Manufacturer | '') => setFormData({ ...formData, manufacturer: value || '' })}
                required
              >
                <SelectTrigger className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all">
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent className="bg-card border-2 border-border">
                  {getAvailableManufacturers(formData.type).map((manufacturer) => (
                    <SelectItem key={manufacturer} value={manufacturer}>
                      {manufacturer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API Endpoint (Optional)</Label>
            <Input
              id="apiEndpoint"
              type="url"
              placeholder="https://..."
              value={formData.apiEndpoint}
              onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
              className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all"
            />
            <p className="text-xs text-muted-foreground">
              The HTTPS endpoint where the machine can receive API commands
            </p>
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
              disabled={loading}
              className="bg-primary hover:bg-primary-glow text-primary-foreground transition-all"
            >
              {loading ? 'Creating...' : 'Create Machine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: 'super_admin' | 'admin';
  currentUserId: string;
  onUserAdded: () => void;
}

export const AddUserDialog = ({ open, onOpenChange, userRole, currentUserId, onUserAdded }: AddUserDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    role: 'client' as 'admin' | 'client',
    name: '',
    email: '',
    password: '',
    cellNumber: '',
    country: '',
    state: '',
    city: '',
    street: '',
    suburb: '',
    poBox: '',
    fullNameBusiness: '',
    assignToAdmin: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: formData.name,
          email: formData.email,
          cell_number: formData.cellNumber,
          country: formData.country,
          state: formData.state,
          city: formData.city,
          street: formData.street,
          suburb: formData.suburb,
          po_box: formData.poBox || null,
          full_name_business: formData.fullNameBusiness,
        });

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: formData.role,
          created_by: currentUserId,
        });

      if (roleError) throw roleError;

      // If creating a client, assign to admin
      if (formData.role === 'client') {
        const adminId = userRole === 'admin' ? currentUserId : formData.assignToAdmin;
        
        const { error: assignError } = await supabase
          .from('client_admin_assignments')
          .insert({
            client_id: authData.user.id,
            admin_id: adminId,
            assigned_by: currentUserId,
          });

        if (assignError) throw assignError;
      }

      toast({
        title: 'Success',
        description: `${formData.role === 'admin' ? 'Admin' : 'Client'} account created successfully`,
      });

      onUserAdded();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        role: 'client',
        name: '',
        email: '',
        password: '',
        cellNumber: '',
        country: '',
        state: '',
        city: '',
        street: '',
        suburb: '',
        poBox: '',
        fullNameBusiness: '',
        assignToAdmin: '',
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New {userRole === 'super_admin' ? 'Admin or Client' : 'Client'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {userRole === 'super_admin' && (
            <div className="space-y-2">
              <Label htmlFor="role">Account Type *</Label>
              <Select value={formData.role} onValueChange={(value: 'admin' | 'client') => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cellNumber">Cell Number *</Label>
              <Input
                id="cellNumber"
                value={formData.cellNumber}
                onChange={(e) => setFormData({ ...formData, cellNumber: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullNameBusiness">Full Name/Business Name *</Label>
              <Input
                id="fullNameBusiness"
                value={formData.fullNameBusiness}
                onChange={(e) => setFormData({ ...formData, fullNameBusiness: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb *</Label>
              <Input
                id="suburb"
                value={formData.suburb}
                onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street *</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poBox">P.O. Box</Label>
              <Input
                id="poBox"
                value={formData.poBox}
                onChange={(e) => setFormData({ ...formData, poBox: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
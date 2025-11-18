import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MachineType } from '@/types/machine';
import { 
  getAvailableManufacturers, 
  isManufacturerRequired,
  type Manufacturer 
} from '@/lib/machineConfig';

interface ChangeManufacturerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineId: string;
  machineName: string;
  machineType: MachineType;
  currentManufacturer: string | null;
  onSuccess: () => void;
}

export const ChangeManufacturerDialog: React.FC<ChangeManufacturerDialogProps> = ({
  open,
  onOpenChange,
  machineId,
  machineName,
  machineType,
  currentManufacturer,
  onSuccess,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState<Manufacturer | ''>(currentManufacturer as Manufacturer || '');

  useEffect(() => {
    if (open) {
      setSelectedManufacturer(currentManufacturer as Manufacturer || '');
    }
  }, [open, currentManufacturer]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      // Validate if manufacturer is required
      if (isManufacturerRequired(machineType) && !selectedManufacturer) {
        toast.error(`Please select a ${machineType === 'evaporative' ? 'Evaporative Cooler' : 'HVAC'} model`);
        setIsUpdating(false);
        return;
      }

      const { error } = await supabase
        .from('machines')
        .update({ manufacturer: selectedManufacturer || null })
        .eq('id', machineId);

      if (error) throw error;

      toast.success(`Manufacturer updated for "${machineName}"`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating manufacturer:', error);
      toast.error(error.message || 'Failed to update manufacturer');
    } finally {
      setIsUpdating(false);
    }
  };

  const availableManufacturers = getAvailableManufacturers(machineType);
  const manufacturerRequired = isManufacturerRequired(machineType);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-2 border-border">
        <AlertDialogHeader className="border-b border-border pb-4">
          <AlertDialogTitle className="text-2xl font-bold text-primary">
            Change Manufacturer
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Change the manufacturer for "{machineName}"?
            <br /><br />
            This will change which processing table handles this machine's data. 
            {currentManufacturer && (
              <>
                <br />
                <strong>Current manufacturer:</strong> {currentManufacturer}
              </>
            )}
            {!currentManufacturer && (
              <>
                <br />
                <strong>Current manufacturer:</strong> None (will use default processing table)
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-2">
          <Label htmlFor="manufacturer">
            Manufacturer
            {manufacturerRequired && ' *'}
            {!manufacturerRequired && ' (Optional)'}
          </Label>
          <Select 
            value={selectedManufacturer} 
            onValueChange={(value: Manufacturer | '') => setSelectedManufacturer(value || '')}
            disabled={isUpdating}
          >
            <SelectTrigger 
              id="manufacturer"
              className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all"
            >
              <SelectValue placeholder={manufacturerRequired ? "Select manufacturer" : "Select manufacturer (optional)"} />
            </SelectTrigger>
            <SelectContent className="bg-card border-2 border-border">
              {!manufacturerRequired && (
                <SelectItem value="">None</SelectItem>
              )}
              {availableManufacturers.map((manufacturer) => (
                <SelectItem key={manufacturer} value={manufacturer}>
                  {manufacturer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {manufacturerRequired
              ? 'Select the manufacturer to ensure data is processed in the correct table'
              : `Select a manufacturer if this is a specific ${machineType === 'airconditioner' ? 'air conditioner' : 'heat pump'} system`}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isUpdating}
            className="border-border hover:bg-secondary hover:text-secondary-foreground transition-all"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleUpdate}
            disabled={isUpdating || (manufacturerRequired && !selectedManufacturer)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            {isUpdating ? 'Updating...' : 'Update Manufacturer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


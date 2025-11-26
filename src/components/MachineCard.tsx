import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreVertical, Trash2, UserCog, Edit, Settings } from 'lucide-react';
import { MachineStatus } from '@/types/machine';
import { StatusLight } from './StatusLight';
import { FanComponent } from './FanComponent';
import { AirConditionerComponent } from './AirConditionerComponent';
import { HeatPumpComponent } from './HeatPumpComponent';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getProcessingTable, type MachineType } from '@/lib/machineConfig';

interface MachineCardProps {
  machine: MachineStatus;
  onClick?: () => void;
  ownerName?: string;
  onDelete?: (machineId: string) => void;
  onChangeOwner?: (machineId: string) => void;
  onRename?: (machineId: string) => void;
  onChangeManufacturer?: (machineId: string) => void;
  showManagement?: boolean;
  onNotificationChange?: () => void;
}

const MachineCard: React.FC<MachineCardProps> = ({ 
  machine: initialMachine, 
  onClick, 
  ownerName,
  onDelete,
  onChangeOwner,
  onRename,
  onChangeManufacturer,
  showManagement = false,
  onNotificationChange
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [machine, setMachine] = useState<MachineStatus>(initialMachine);
  const { user } = useAuth();
  
  // Fetch latest reading from processing table (same source as historical graph)
  useEffect(() => {
    const processingTable = getProcessingTable(initialMachine.type as MachineType, initialMachine.manufacturer);
    if (!processingTable) {
      setMachine(initialMachine);
      return;
    }
    
    const fetchLatestReading = async () => {
      try {
        const { data: latestReading, error } = await supabase
          .from(processingTable)
          .select('fan_active, is_cooling, is_on, has_water')
          .eq('machine_id', initialMachine.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle empty results gracefully
        
        // Handle table-not-found errors gracefully (table might not exist yet)
        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('does not exist')) {
            // Table doesn't exist yet - this is expected for new manufacturers
            console.debug(`[MachineCard] Table '${processingTable}' does not exist yet for machine ${initialMachine.id}. Using default values.`);
            setMachine(initialMachine);
            return;
          } else if (error.code === 'PGRST116') {
            // No rows found - this is normal when there's no data yet
            console.debug(`[MachineCard] No readings found in '${processingTable}' for machine ${initialMachine.id}. Using default values.`);
            setMachine(initialMachine);
            return;
          } else {
            console.warn(`[MachineCard] Error fetching latest ${processingTable} reading:`, error);
            setMachine(initialMachine);
            return;
          }
        }
        
        if (latestReading) {
          setMachine(prev => ({
            ...prev,
            fanActive: latestReading.fan_active ?? prev.fanActive,
            isCooling: latestReading.is_cooling ?? prev.isCooling,
            isOn: latestReading.is_on ?? prev.isOn,
            hasWater: latestReading.has_water ?? prev.hasWater,
          }));
        } else {
          // No data found - use default values
          setMachine(initialMachine);
        }
      } catch (err) {
        console.error(`[MachineCard] Unexpected error fetching latest ${processingTable} reading:`, err);
        setMachine(initialMachine);
      }
    };
    
    fetchLatestReading();
    
    // Poll every 10 seconds
    const pollInterval = setInterval(fetchLatestReading, 10000);
    
    return () => clearInterval(pollInterval);
  }, [initialMachine.id, initialMachine.type, initialMachine.manufacturer]);

  // Debug: Log props when component renders
  useEffect(() => {
    if (showManagement) {
      console.log('MachineCard DEBUG:', {
        machineId: initialMachine.id,
        machineName: initialMachine.name,
        manufacturer: initialMachine.manufacturer,
        location: initialMachine.location,
        hasLocation: !!initialMachine.location,
        hasOnChangeManufacturer: !!onChangeManufacturer,
        onChangeManufacturerType: typeof onChangeManufacturer,
        onChangeManufacturerValue: onChangeManufacturer,
        showManagement,
        allProps: {
          hasOnRename: !!onRename,
          hasOnChangeOwner: !!onChangeOwner,
          hasOnDelete: !!onDelete,
          hasOnChangeManufacturer: !!onChangeManufacturer
        }
      });
    }
  }, [initialMachine.id, initialMachine.manufacturer, initialMachine.location, onChangeManufacturer, showManagement, onRename, onChangeOwner, onDelete]);

  const getMachineComponent = () => {
    const size = 'w-32 h-32';
    switch (machine.type) {
      case 'fan':
      case 'evaporative':
        return <FanComponent 
          isSpinning={machine.fanActive}
          size={size}
        />;
      case 'airconditioner':
        return <AirConditionerComponent 
          isActive={machine.isCooling}
          size={size}
        />;
      case 'heatpump':
        return <HeatPumpComponent 
          isActive={machine.isOn}
          size={size}
        />;
      default:
        return null;
    }
  };

  return (
    <>
      <Card
        className={cn(
          "relative p-4 cursor-pointer hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] backdrop-blur-sm border-2",
          machine.overallStatus === 'error' ? 'border-destructive' : 'border-[#8FB83D]'
        )}
        onClick={onClick}
      >
        {/* Management Dropdown */}
        {showManagement && (
          <>
          <div className="absolute top-2 right-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="p-1 hover:bg-accent rounded-md transition-colors">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRename && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onRename(machine.id);
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                )}
                {onChangeOwner && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onChangeOwner(machine.id);
                  }}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Change Owner
                  </DropdownMenuItem>
                )}
                {showManagement && onChangeManufacturer && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        onChangeManufacturer(machine.id);
                      } catch (error) {
                        console.error('Error opening Change Manufacturer dialog:', error);
                        toast.error('Failed to open Change Manufacturer dialog');
                      }
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Change Manufacturer
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Notification Toggle - Bottom Left */}
          <div className="absolute bottom-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-2 bg-card/95 backdrop-blur-sm border-2 rounded-lg px-3 py-2 shadow-lg transition-all duration-200 cursor-pointer",
                      machine.notificationsEnabled 
                        ? "border-[#8FB83D]/50 hover:border-[#8FB83D]" 
                        : "border-red-500/50 hover:border-red-500"
                    )}
                    onClick={async (e) => {
                      e.stopPropagation();
                      
                      if (!user) {
                        toast.error('You must be logged in');
                        return;
                      }
                      
                      const newValue = !machine.notificationsEnabled;
                      
                      try {
                        const { supabase } = await import('@/integrations/supabase/client');
                        const { error } = await supabase
                          .from('machine_notification_preferences')
                          .update({ enabled: newValue })
                          .eq('machine_id', machine.id)
                          .eq('user_id', user.id);

                        if (error) {
                          console.error('Error:', error);
                          toast.error('Failed to update');
                        } else {
                          toast.success(`Notifications ${newValue ? 'ON' : 'OFF'}`);
                          // Refetch data smoothly
                          if (onNotificationChange) {
                            onNotificationChange();
                          }
                        }
                      } catch (err) {
                        console.error('Error:', err);
                        toast.error('Update failed');
                      }
                    }}
                  >
                    {/* Bell Icon */}
                    {machine.notificationsEnabled ? (
                      <svg className="w-4 h-4 text-[#8FB83D] pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-600 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6zM4 2L2.28 3.72l2.81 2.81C5.04 7.08 5 7.54 5 8v7l-2 2v1h13.73l2 2L20 18.28 4 2z"/>
                      </svg>
                    )}
                    
                    {/* Switch - purely visual, container handles click */}
                    <Switch
                      checked={machine.notificationsEnabled}
                      className="scale-90 pointer-events-none"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs">
                    {machine.notificationsEnabled ? 'Notifications enabled for you' : 'Notifications disabled for you'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          </>
        )}

        {/* Machine Visual and Status Lights - Side by Side */}
        <div className="flex items-start justify-start gap-4 mb-3 px-3 pt-3">
          <div className="flex-shrink-0 w-32 h-32 flex items-center justify-center">
            {getMachineComponent()}
          </div>
          
          {/* Status Column - Different per machine type */}
          <div className="flex flex-col gap-1.5 justify-start">
            {machine.type === 'evaporative' && (
              <>
                <StatusLight
                  status={machine.isConnected ? 'active' : 'inactive'}
                  label="Connected"
                  size="sm"
                />
                {machine.isConnected ? (
                  <>
                    <StatusLight
                      status={machine.fanActive ? 'active' : 'inactive'}
                      label="Fan"
                      size="sm"
                    />
                    <StatusLight
                      status={machine.isCooling ? 'active' : 'inactive'}
                      label="Cool"
                      size="sm"
                    />
                    <StatusLight
                      status={machine.hasWater ? 'active' : 'error'}
                      label="Water"
                      size="sm"
                    />
                  </>
                ) : (
                  <>
                    <StatusLight
                      status="inactive"
                      label="Fan"
                      size="sm"
                    />
                    <StatusLight
                      status="inactive"
                      label="Cool"
                      size="sm"
                    />
                    <StatusLight
                      status="inactive"
                      label="Water"
                      size="sm"
                    />
                  </>
                )}
              </>
            )}
            
            {machine.type === 'airconditioner' && (
              <>
                <StatusLight
                  status={machine.isConnected ? 'active' : 'inactive'}
                  label="Connected"
                  size="sm"
                />
                <StatusLight
                  status={machine.fanActive ? 'active' : 'inactive'}
                  label="Fan"
                  size="sm"
                />
                <StatusLight
                  status={machine.isCooling ? 'active' : 'inactive'}
                  label="Cool"
                  size="sm"
                />
              </>
            )}
            
            {machine.type === 'heatpump' && (
              <>
                <StatusLight
                  status={machine.isConnected ? 'active' : 'inactive'}
                  label="Connected"
                  size="sm"
                />
                <StatusLight
                  status={machine.hasPump ? 'active' : 'inactive'}
                  label="Pump"
                  size="sm"
                />
                <StatusLight
                  status={machine.hasHeat ? 'active' : 'inactive'}
                  label="Heat"
                  size="sm"
                />
                <div className="text-center p-1.5 bg-panel-bg rounded-md">
                  <div className="text-xs text-muted-foreground">Setpoint</div>
                  <div className="text-sm font-semibold" style={{ color: '#8FB83D' }}>
                    {machine.temperatureSetpoint?.toFixed(0) || 55}°C
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Machine Info Section - Consistent spacing and alignment */}
        <div className="flex flex-col items-center px-3 justify-between flex-1 py-2">
          {/* Top Section: Name and metadata */}
          <div className="flex flex-col items-center gap-1 w-full">
            <h3 className="text-base font-semibold text-center text-foreground leading-tight">
              {machine.name}
            </h3>
            {!machine.apiKey && (
              <span className="text-[10px] font-medium px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 rounded-full">
                No API Key
              </span>
            )}
            
            {/* Location */}
            {machine.location && (
              <p className="text-xs text-muted-foreground text-center">
                {machine.location}
              </p>
            )}
            
            {/* Owner Name */}
            {ownerName && (
              <p className="text-xs text-muted-foreground text-center">
                Owner: {ownerName}
              </p>
            )}
            
            {/* Manufacturer */}
            {machine.manufacturer && (
              <p className="text-[13px] text-muted-foreground text-center leading-none">
                {machine.manufacturer}
              </p>
            )}
          </div>

          {/* Bottom Section: Delta T */}
          <div className="text-center mt-2">
            <div className="text-2xl font-bold leading-tight" style={{ color: '#8FB83D' }}>
              {Math.abs(machine.deltaT).toFixed(1)}°C
            </div>
            <div className="text-xs text-muted-foreground">Delta T</div>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-2 border-border">
          <AlertDialogHeader className="border-b border-border pb-4">
            <AlertDialogTitle className="text-2xl font-bold" style={{ color: '#8FB83D' }}>Delete Machine?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{machine.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-secondary hover:text-secondary-foreground transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(machine.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MachineCard;

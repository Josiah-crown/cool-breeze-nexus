import React, { useState } from 'react';
import { Card } from './ui/card';
import { MachineStatus } from '@/types/machine';
import StatusLight from './StatusLight';
import FanComponent from './FanComponent';
import HeatPumpComponent from './HeatPumpComponent';
import AirConditionerComponent from './AirConditionerComponent';
import { cn } from '@/lib/utils';
import { Lock, Trash2, UserCog, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface MachineCardProps {
  machine: MachineStatus;
  onClick: () => void;
  ownerName?: string;
  onDelete?: (machineId: string) => void;
  onChangeOwner?: (machineId: string) => void;
  onRename?: (machineId: string) => void;
  showManagement?: boolean;
}

const MachineCard: React.FC<MachineCardProps> = ({ 
  machine, 
  onClick, 
  ownerName,
  onDelete,
  onChangeOwner,
  onRename,
  showManagement = false
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    onDelete?.(machine.id);
    setShowDeleteDialog(false);
  };

  const handleChangeOwner = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeOwner?.(machine.id);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRename?.(machine.id);
  };

  const handleManagementClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleNotificationToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Import supabase at the top if not already imported
    const { supabase } = await import('@/integrations/supabase/client');
    const { toast } = await import('@/hooks/use-toast');
    
    const newValue = !machine.notificationsEnabled;
    
    try {
      const { error } = await supabase
        .from('machines')
        .update({ notifications_enabled: newValue })
        .eq('id', machine.id);
      
      if (error) {
        // Check if it's a column not found error (migration not run)
        if (error.message?.includes('notifications_enabled') || error.message?.includes('column')) {
          toast.toast({
            title: 'Migration Required',
            description: 'Please run the notifications_enabled migration first',
            variant: 'destructive',
          });
        } else {
          console.error('Error updating notifications:', error);
        }
      } else {
        // Force a page refresh to update the state
        window.location.reload();
      }
    } catch (err) {
      // Silently fail if migration not run
    }
  };

  const getMachineComponent = () => {
    const size = 'w-32 h-32';
    switch (machine.type) {
      case 'evaporative':
        return <FanComponent isSpinning={machine.fanActive} size={size} />;
      case 'heatpump':
        return <HeatPumpComponent isActive={machine.isOn} size={size} />;
      case 'airconditioner':
        return <AirConditionerComponent isActive={machine.isCooling} size={size} />;
    }
  };

  const getStatusColor = () => {
    switch (machine.overallStatus) {
      case 'good':
        return 'border-accent';
      case 'warning':
        return 'border-warning';
      case 'error':
        return 'border-destructive';
      default:
        return 'border-border';
    }
  };

  return (
    <>
      <Card
        className={cn(
          'p-3 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg relative',
          'bg-gradient-to-br from-card to-panel-bg',
          getStatusColor()
        )}
        onClick={onClick}
      >
        {/* Management Menu & Notifications */}
        {showManagement && (
          <>
            <div className="absolute top-2 right-2 z-20" onClick={handleManagementClick}>
            <DropdownMenu>
              <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleChangeOwner}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Change Owner
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRename}>
                  <Edit className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Notification Toggle - Bottom Left */}
          <div className="absolute bottom-2 left-2 z-[9999] pointer-events-auto" onClick={handleManagementClick}>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={cn(
                      "flex items-center gap-1 bg-card/80 backdrop-blur-sm border-2 rounded-md px-2 py-1 hover:bg-card transition-all relative z-[60]",
                      machine.notificationsEnabled ? "border-green-500" : "border-red-500"
                    )}
                    onClick={handleNotificationToggle}
                  >
                    <Switch
                      checked={machine.notificationsEnabled}
                      onCheckedChange={async (checked) => {
                        try {
                          const { supabase } = await import('@/integrations/supabase/client');
                          const { error } = await supabase
                            .from('machines')
                            .update({ notifications_enabled: checked })
                            .eq('id', machine.id);
                          
                          if (!error) {
                            window.location.reload();
                          }
                        } catch (err) {
                          // Migration not run yet, silently fail
                        }
                      }}
                      className="scale-75"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="z-[9999]">
                  <p>Toggle notifications</p>
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
                  status={machine.isOn ? 'active' : 'inactive'}
                  label="Power"
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
                <StatusLight
                  status={machine.hasWater ? 'active' : 'error'}
                  label="Water"
                  size="sm"
                />
              </>
            )}
            
            {machine.type === 'airconditioner' && (
              <>
                <StatusLight
                  status={machine.isOn ? 'active' : 'inactive'}
                  label="Power"
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
                  status={machine.isOn ? 'active' : 'inactive'}
                  label="Power"
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
                  <div className="text-sm font-semibold text-accent">
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
          <div className="flex flex-col items-center gap-0.5 w-full">
            <h3 className="text-base font-semibold text-center text-foreground leading-tight mb-0.5">
              {machine.name}
            </h3>
            {!machine.apiKey && (
              <span className="text-[10px] font-medium px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 rounded-full mb-1">
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
          </div>

          {/* Bottom Section: Delta T */}
          <div className="text-center mt-2">
            <div className="text-2xl font-bold text-accent leading-tight">
              {Math.abs(machine.deltaT).toFixed(1)}°C
            </div>
            <div className="text-xs text-muted-foreground">Delta T</div>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Machine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{machine.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MachineCard;

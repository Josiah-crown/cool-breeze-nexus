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

  const getMachineComponent = () => {
    const size = 'w-24 h-24';
    switch (machine.type) {
      case 'fan':
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
          'p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-xl relative',
          'bg-gradient-to-br from-card to-panel-bg',
          getStatusColor()
        )}
        onClick={onClick}
      >
        {/* Management Menu */}
        {showManagement && (
          <div className="absolute top-2 right-2 z-10" onClick={handleManagementClick}>
            <DropdownMenu>
              <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem 
                  onClick={handleChangeOwner}
                  className="cursor-pointer"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Change Owner
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleRename}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Machine Visual */}
        <div className="flex justify-center mb-4">
          {getMachineComponent()}
        </div>

        {/* Machine Name */}
        <h3 className="text-lg font-semibold text-center mb-2 text-foreground">
          {machine.name}
        </h3>
        
        {/* Owner Name */}
        {ownerName && (
          <p className="text-xs text-muted-foreground text-center mb-4">
            Owner: {ownerName}
          </p>
        )}

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatusLight
            status={machine.isOn ? 'active' : 'inactive'}
            label="Power"
            size="sm"
          />
          {machine.type !== 'heatpump' && (
            <StatusLight
              status={machine.fanActive ? 'active' : 'inactive'}
              label="Fan"
              size="sm"
            />
          )}
          <StatusLight
            status={machine.isCooling ? 'active' : 'inactive'}
            label={machine.type === 'airconditioner' ? 'Climate' : 'Cool'}
            size="sm"
          />
          {machine.type !== 'airconditioner' && (
            <StatusLight
              status={machine.hasWater ? 'active' : 'error'}
              label="Water"
              size="sm"
            />
          )}
          <StatusLight
            status={
              Math.abs(machine.deltaT) >= 5 && Math.abs(machine.deltaT) <= 15
                ? 'active'
                : Math.abs(machine.deltaT) > 15
                ? 'warning'
                : 'inactive'
            }
            label="ΔT"
            size="sm"
          />
          <StatusLight
            status={
              machine.motorTemp < 70
                ? 'active'
                : machine.motorTemp < 80
                ? 'warning'
                : 'error'
            }
            label="Motor"
            size="sm"
          />
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

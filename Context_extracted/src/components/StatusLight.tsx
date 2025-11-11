import React from 'react';
import { cn } from '@/lib/utils';

interface StatusLightProps {
  status: 'active' | 'warning' | 'error' | 'inactive';
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const StatusLight: React.FC<StatusLightProps> = ({ 
  status, 
  label, 
  size = 'md',
  showLabel = true 
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getStatusClasses = () => {
    switch (status) {
      case 'active':
        return 'status-light active';
      case 'warning':
        return 'status-light warning';
      case 'error':
        return 'status-light error';
      default:
        return 'status-light bg-muted border-border';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn(getStatusClasses(), sizeClasses[size])} />
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
};

export default StatusLight;
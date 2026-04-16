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
    sm: 'w-[0.75rem] h-[0.75rem]',
    md: 'w-[1rem] h-[1rem]',
    lg: 'w-[1.25rem] h-[1.25rem]'
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
    <div className="flex items-center gap-[0.5rem]">
      <div className={cn(getStatusClasses(), sizeClasses[size])} />
      {showLabel && (
        <span className="text-[0.875rem] font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
};

export { StatusLight };
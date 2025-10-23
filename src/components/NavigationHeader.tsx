import React from 'react';
import { Button } from '@/components/ui/button';

interface NavigationHeaderProps {
  onHome: () => void;
  onBack: () => void;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({ onHome, onBack }) => {
  return (
    <header className="relative hud-header bg-gradient-to-r from-panel-bg to-card border-b-2 border-primary/20 backdrop-blur-sm">
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      
      {/* Navigation Buttons */}
      <div className="absolute top-4 left-6 flex gap-3 z-10">
        <Button 
          onClick={onHome}
          className="btn-nav"
        >
          <span className="mr-2">🏠</span>
          Home
        </Button>
        <Button 
          onClick={onBack}
          className="btn-nav"
        >
          <span className="mr-2">←</span>
          Back
        </Button>
      </div>

      {/* Header Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          {/* Logo Area */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary to-primary-glow hud-button shadow-xl mb-4 border-2 border-primary/40">
              <span className="text-3xl">🌀</span>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
            Lounge Cooler
          </h1>
          <p className="text-lg text-muted-foreground">
            Professional IoT Monitoring System
          </p>
          
          {/* Status Bar */}
          <div className="mt-6 inline-flex items-center gap-6 px-6 py-3 bg-status-bg hud-button border-2 border-primary/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--accent))]"></div>
              <span className="text-sm font-medium text-muted-foreground">System Online</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="text-sm font-medium text-muted-foreground">
              IoT Nexus © 2025
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavigationHeader;
import React from 'react';
import { Button } from '@/components/ui/button';

interface NavigationHeaderProps {
  onHome: () => void;
  onBack: () => void;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({ onHome, onBack }) => {
  return (
    <header className="relative hud-header bg-[hsl(var(--navbar-bg))] border-b-2 border-primary/20 backdrop-blur-sm">
      {/* Accent line - 8x thicker */}
      <div className="absolute top-0 left-0 right-0 h-[16px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      
      {/* Navigation Buttons */}
      <div className="absolute top-4 left-6 flex gap-3 z-10">
        <Button 
          onClick={onHome}
          variant="outline"
          className="bg-background/90 backdrop-blur-sm border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
        >
          <span className="mr-2">🏠</span>
          Home
        </Button>
        <Button 
          onClick={onBack}
          variant="outline"
          className="bg-background/90 backdrop-blur-sm border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
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
          <h1 className="text-4xl font-bold text-[hsl(var(--background))] mb-2 tracking-tight">
            Lounge Cooler
          </h1>
          <p className="text-lg text-[hsl(var(--background))]">
            Professional IoT Monitoring System
          </p>
          
          {/* Status Bar */}
          <div className="mt-6 inline-flex items-center gap-6 px-6 py-3 bg-background hud-button border-2 border-primary/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--accent))]"></div>
              <span className="text-sm font-medium text-foreground">System Online</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="text-sm font-medium text-foreground">
              IoT Nexus © 2025
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavigationHeader;
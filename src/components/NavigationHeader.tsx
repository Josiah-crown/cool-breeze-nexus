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
      <div className="absolute top-0 left-0 right-0 h-[8px] sm:h-[16px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      
      {/* Navigation Buttons */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-6 flex gap-2 sm:gap-3 z-10">
        <Button 
          onClick={onHome}
          variant="outline"
          className="bg-background/90 backdrop-blur-sm border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
        >
          <span className="mr-1 sm:mr-2">🏠</span>
          <span className="hidden sm:inline">Home</span>
        </Button>
        <Button 
          onClick={onBack}
          variant="outline"
          className="bg-background/90 backdrop-blur-sm border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
        >
          <span className="mr-1 sm:mr-2">←</span>
          <span className="hidden sm:inline">Back</span>
        </Button>
      </div>

      {/* Header Content */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="text-center pt-8 sm:pt-0">
          {/* Logo Area */}
          <div className="mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-primary to-primary-glow hud-button shadow-xl mb-2 sm:mb-4 border-2 border-primary/40">
              <img src="/3.png" alt="Crown Technologies Logo" className="w-14 h-14 sm:w-18 sm:h-18 lg:w-20 lg:h-20 object-contain" />
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[hsl(var(--background))] mb-1 sm:mb-2 tracking-tight">
            Crown Technologies
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-[hsl(var(--background))]">
            Professional IoT Monitoring System
          </p>
          
          {/* Status Bar */}
          <div className="mt-4 sm:mt-6 inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-6 px-4 sm:px-6 py-2 sm:py-3 bg-background hud-button border-2 border-primary/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--accent))]"></div>
              <span className="text-xs sm:text-sm font-medium text-foreground">System Online</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border"></div>
            <div className="text-xs sm:text-sm font-medium text-foreground">
              Crown Technologies © 2025
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavigationHeader;
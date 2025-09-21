import React, { useEffect } from 'react';
import NavigationHeader from '@/components/NavigationHeader';
import ControlPanel from '@/components/ControlPanel';
import FanComponent from '@/components/FanComponent';
import StatusPanel from '@/components/StatusPanel';
import { useSystemState } from '@/hooks/useSystemState';

const Index = () => {
  const { state, actions } = useSystemState();

  const handleHome = () => {
    console.log('Navigate to home');
    // In a real app, this would use router navigation
  };

  const handleBack = () => {
    console.log('Navigate back');
    window.history.back();
  };

  const getFanSpeed = () => {
    if (!state.isOn || !state.fanMode) return 'slow';
    if (state.coolMode) return 'fast';
    if (state.exhaustMode) return 'medium';
    return 'medium';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          actions.togglePower();
          break;
        case 'KeyC':
          e.preventDefault();
          actions.toggleCool();
          break;
        case 'KeyF':
          e.preventDefault();
          actions.toggleFan();
          break;
        case 'KeyE':
          e.preventDefault();
          actions.toggleExhaust();
          break;
        case 'KeyT':
          e.preventDefault();
          actions.setTimer();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          actions.changeSpeed('decrease');
          break;
        case 'ArrowRight':
          e.preventDefault();
          actions.changeSpeed('increase');
          break;
        case 'KeyH':
          e.preventDefault();
          handleHome();
          break;
        case 'KeyB':
          e.preventDefault();
          handleBack();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions, handleHome, handleBack]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <NavigationHeader onHome={handleHome} onBack={handleBack} />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Controls and Status */}
          <div className="lg:col-span-1 space-y-6">
            {/* Control Panel */}
            <ControlPanel
              isOn={state.isOn}
              coolMode={state.coolMode}
              fanMode={state.fanMode}
              exhaustMode={state.exhaustMode}
              speed={state.speed}
              onPowerToggle={actions.togglePower}
              onCoolToggle={actions.toggleCool}
              onFanToggle={actions.toggleFan}
              onExhaustToggle={actions.toggleExhaust}
              onSpeedChange={actions.changeSpeed}
              onTimerSet={actions.setTimer}
              disabled={!state.hasWater}
            />
            
            {/* System Status below Controls */}
            <StatusPanel data={state} />
          </div>

          {/* Right Side - Fan and Readings */}
          <div className="lg:col-span-2">
            <div className="grid grid-rows-2 gap-6 h-full">
              {/* Top Right - Fan */}
              <div className="panel flex items-center justify-center">
                <div className="panel-header absolute top-4 left-4">
                  <span className="text-lg">🌀</span>
                  <h3 className="panel-title">Cooling System</h3>
                </div>
                
                <div className="flex flex-col items-center">
                  <FanComponent 
                    isSpinning={state.isOn && state.fanMode}
                    speed={getFanSpeed()}
                    size="lg"
                  />
                  
                  {/* Mode Display */}
                  <div className="mt-4 text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {state.coolMode && 'Cool'} {state.fanMode && 'Fan'} {state.exhaustMode && 'Exhaust'} - Speed {state.speed}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {state.timer && (
                        <span>Timer: {state.timer}h</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="mt-12 panel max-w-4xl mx-auto">
          <div className="panel-header">
            <span className="text-lg">⌨️</span>
            <h3 className="panel-title">Keyboard Shortcuts</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Power Toggle</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cool Mode</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs">C</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fan Mode</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs">F</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exhaust Mode</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs">E</kbd>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Speed Down</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs">←</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Speed Up</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs">→</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Set Timer</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs">T</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Home</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs">H</kbd>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-panel border-t border-border mt-12">
        <div className="container mx-auto px-6 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            IoT Nexus © 2025 | Engineered for Precision Control
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

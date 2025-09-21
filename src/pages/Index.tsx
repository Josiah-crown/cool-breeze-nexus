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
    if (!state.isOn) return 'slow';
    switch (state.mode) {
      case 'Cool': return 'fast';
      case 'Fan': return 'medium';
      case 'Auto': return state.deltaT > 5 ? 'fast' : 'medium';
      default: return 'slow';
    }
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
          actions.setMode('Cool');
          break;
        case 'KeyF':
          e.preventDefault();
          actions.setMode('Fan');
          break;
        case 'KeyE':
          e.preventDefault();
          actions.setMode('Exhaust');
          break;
        case 'KeyA':
          e.preventDefault();
          actions.setMode('Auto');
          break;
        case 'KeyT':
          e.preventDefault();
          actions.setTimer();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          actions.toggleSwing('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          actions.toggleSwing('right');
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
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <ControlPanel
              mode={state.mode}
              isOn={state.isOn}
              swingDirection={state.swingDirection}
              onModeChange={actions.setMode}
              onPowerToggle={actions.togglePower}
              onSwingToggle={actions.toggleSwing}
              onTimerSet={actions.setTimer}
              disabled={!state.hasWater}
            />
          </div>

          {/* Fan Display */}
          <div className="lg:col-span-1 flex items-center justify-center">
            <div className="panel w-full max-w-md">
              <div className="panel-header">
                <span className="text-lg">🌀</span>
                <h3 className="panel-title">Cooling System</h3>
              </div>
              
              <div className="flex flex-col items-center">
                <FanComponent 
                  isSpinning={state.isOn && state.mode !== 'Off'}
                  speed={getFanSpeed()}
                  size="lg"
                />
                
                {/* Mode Display */}
                <div className="mt-4 text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {state.mode}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {state.swingDirection !== 'center' && (
                      <span>Swing: {state.swingDirection}</span>
                    )}
                    {state.timer && (
                      <span>Timer: {state.timer}h</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Panel */}
          <div className="lg:col-span-1">
            <StatusPanel data={state} />
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
                <span className="text-muted-foreground">Auto Mode</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs">A</kbd>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Swing Left</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs">←</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Swing Right</span>
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

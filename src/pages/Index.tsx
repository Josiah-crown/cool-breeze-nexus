import React, { useEffect } from 'react';
import NavigationHeader from '@/components/NavigationHeader';
import ControlPanel from '@/components/ControlPanel';
import FanComponent from '@/components/FanComponent';
import StatusLight from '@/components/StatusLight';
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
          {/* Left Column - Control Panel */}
          <div className="lg:col-span-1">
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
          </div>

          {/* Right Side - Machine Container */}
          <div className="lg:col-span-2">
            <div className="panel">
              <div className="panel-header">
                <span className="text-lg">🏭</span>
                <h3 className="panel-title">Machine Monitor</h3>
              </div>
              
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left - Fan */}
                <div className="flex items-center justify-center lg:col-span-2">
                  <FanComponent 
                    isSpinning={state.isOn && state.fanMode}
                    speed={getFanSpeed()}
                    size="lg"
                  />
                </div>

                {/* Bottom Left - System Status */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-primary mb-3">System Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusLight 
                      status={state.isOn ? 'active' : 'inactive'} 
                      label="Power" 
                    />
                    <StatusLight 
                      status={state.hasWater ? 'active' : 'error'} 
                      label="Water Level" 
                    />
                    <StatusLight 
                      status={state.isCooling ? 'active' : 'inactive'} 
                      label="Cooling Active" 
                    />
                    <StatusLight 
                      status={state.motorTemp > 80 ? 'error' : state.motorTemp > 60 ? 'warning' : 'active'} 
                      label="Motor Status" 
                    />
                  </div>

                  {/* Delta T Display */}
                  <div className="mt-4 p-3 bg-status rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">ΔT Efficiency</span>
                      <div className="text-xl font-bold text-primary">
                        {state.deltaT.toFixed(1)}°C
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Right - Temperature & Electrical */}
                <div className="space-y-4">
                  {/* Temperature Monitoring */}
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-3">🌡️ Temperature</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Outside</span>
                        <span className="text-sm font-bold text-warning">{state.outsideTemp.toFixed(1)}°C</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Inside</span>
                        <span className="text-sm font-bold text-accent">{state.insideTemp.toFixed(1)}°C</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Motor</span>
                        <span className={`text-sm font-bold ${
                          state.motorTemp > 80 ? 'text-destructive' : 
                          state.motorTemp > 60 ? 'text-warning' : 'text-accent'
                        }`}>{state.motorTemp.toFixed(1)}°C</span>
                      </div>
                    </div>
                  </div>

                  {/* Electrical Monitoring */}
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-3">⚡ Electrical</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Current</span>
                        <span className="text-sm font-bold text-primary">{state.currentAmps.toFixed(1)}A</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Voltage</span>
                        <span className="text-sm font-bold text-primary">{state.voltage.toFixed(0)}V</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Power</span>
                        <span className="text-sm font-bold text-primary">{Math.round(state.power)}W</span>
                      </div>
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

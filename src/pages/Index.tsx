import React, { useEffect, useState, useMemo } from 'react';
import NavigationHeader from '@/components/NavigationHeader';
import ControlPanel from '@/components/ControlPanel';
import { FanComponent } from '@/components/FanComponent';
import { StatusLight } from '@/components/StatusLight';
import { useSystemState } from '@/hooks/useSystemState';
import { useAuth } from '@/contexts/AuthContext';
import { useMachineData } from '@/hooks/useMachineData';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { state, actions } = useSystemState();
  const { user } = useAuth();
  const { machines, refetch } = useMachineData(user?.id || '', user?.role || 'client');
  const [supabaseFanActive, setSupabaseFanActive] = useState<boolean>(false);
  const [supabaseIsOn, setSupabaseIsOn] = useState<boolean>(false);
  const [supabaseIsCooling, setSupabaseIsCooling] = useState<boolean>(false);
  
  // Find the first Cirrus machine
  const cirrusMachine = useMemo(() => {
    const found = machines.find(m => 
      (m.type === 'evaporative' && m.manufacturer === 'Cirrus') || 
      (m.type === 'evaporative' && !m.manufacturer) // Fallback for machines without manufacturer set
    ) || machines.find(m => m.type === 'evaporative') || machines[0];
    
    return found;
  }, [machines]);

  // Sync state with machine data whenever it changes
  useEffect(() => {
    if (!cirrusMachine) {
      return;
    }

    // Update state from machine data
    setSupabaseFanActive(cirrusMachine.fanActive || false);
    setSupabaseIsOn(cirrusMachine.isOn || false);
    setSupabaseIsCooling(cirrusMachine.isCooling || false);
  }, [cirrusMachine?.id, cirrusMachine?.fanActive, cirrusMachine?.isOn, cirrusMachine?.isCooling]);

  // Set up real-time subscription and polling
  useEffect(() => {
    if (!cirrusMachine) return;

    // Set up real-time subscription to machines table
    const channel = supabase
      .channel(`machine-${cirrusMachine.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'machines',
          filter: `id=eq.${cirrusMachine.id}`,
        },
        (payload) => {
          const updatedMachine = payload.new as any;
          setSupabaseFanActive(updatedMachine.fan_active || false);
          setSupabaseIsOn(updatedMachine.is_on || false);
          setSupabaseIsCooling(updatedMachine.is_cooling || false);
        }
      )
      .subscribe();

    // Also poll periodically to catch any missed updates
    const pollInterval = setInterval(() => {
      refetch();
    }, 5000); // Poll every 5 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [cirrusMachine?.id, refetch]);

  const handleHome = () => {
    // In a real app, this would use router navigation
  };

  const handleBack = () => {
    window.history.back();
  };

  const getFanSpeed = () => {
    // Use Supabase data if available, otherwise fall back to local state
    const isOn = cirrusMachine ? supabaseIsOn : state.isOn;
    const fanActive = cirrusMachine ? supabaseFanActive : (state.isOn && state.fanMode);
    const isCooling = cirrusMachine ? supabaseIsCooling : state.isCooling;
    
    if (!isOn || !fanActive) return 'slow';
    if (isCooling) return 'fast';
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
                <div className="flex items-center justify-center lg:col-span-2 relative">
                  <FanComponent 
                    isSpinning={cirrusMachine ? supabaseFanActive : (state.isOn && state.fanMode)}
                    speed={getFanSpeed()}
                    size="lg"
                  />
                  {/* Debug info - remove in production */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="absolute top-2 right-2 text-xs bg-black/50 text-white p-2 rounded z-10">
                      <div>Machine: {cirrusMachine?.name || 'None'}</div>
                      <div>fanActive (DB): {cirrusMachine?.fanActive ? 'true' : 'false'}</div>
                      <div>fanActive (State): {supabaseFanActive ? 'true' : 'false'}</div>
                      <div>Spinning: {cirrusMachine ? supabaseFanActive : (state.isOn && state.fanMode) ? 'true' : 'false'}</div>
                    </div>
                  )}
                </div>

                {/* Bottom Left - System Status */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-primary mb-3">System Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <StatusLight 
                      status={cirrusMachine ? (supabaseIsOn ? 'active' : 'inactive') : (state.isOn ? 'active' : 'inactive')} 
                      label="Power" 
                    />
                    <StatusLight 
                      status={cirrusMachine ? (cirrusMachine.hasWater ? 'active' : 'error') : (state.hasWater ? 'active' : 'error')} 
                      label="Water Level" 
                    />
                    <StatusLight 
                      status={cirrusMachine ? (supabaseFanActive ? 'active' : 'inactive') : (state.fanMode ? 'active' : 'inactive')} 
                      label="Fan" 
                    />
                    <StatusLight 
                      status={cirrusMachine ? (supabaseIsCooling ? 'active' : 'inactive') : (state.isCooling ? 'active' : 'inactive')} 
                      label="Cooling Active" 
                    />
                    <StatusLight 
                      status={cirrusMachine ? (cirrusMachine.motorTemp > 80 ? 'error' : cirrusMachine.motorTemp > 60 ? 'warning' : 'active') : (state.motorTemp > 80 ? 'error' : state.motorTemp > 60 ? 'warning' : 'active')} 
                      label="Motor Status" 
                    />
                  </div>

                  {/* Delta T Display */}
                  <div className="mt-4 p-3 bg-status rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">ΔT Efficiency</span>
                      <div className="text-xl font-bold text-primary">
                        {cirrusMachine ? cirrusMachine.deltaT.toFixed(1) : state.deltaT.toFixed(1)}°C
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
                        <span className="text-sm font-bold text-warning">{cirrusMachine ? cirrusMachine.outsideTemp.toFixed(1) : state.outsideTemp.toFixed(1)}°C</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Inside</span>
                        <span className="text-sm font-bold text-accent">{cirrusMachine ? cirrusMachine.insideTemp.toFixed(1) : state.insideTemp.toFixed(1)}°C</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Motor</span>
                        <span className={`text-sm font-bold ${
                          (cirrusMachine ? cirrusMachine.motorTemp : state.motorTemp) > 80 ? 'text-destructive' : 
                          (cirrusMachine ? cirrusMachine.motorTemp : state.motorTemp) > 60 ? 'text-warning' : 'text-accent'
                        }`}>{(cirrusMachine ? cirrusMachine.motorTemp : state.motorTemp).toFixed(1)}°C</span>
                      </div>
                    </div>
                  </div>

                  {/* Electrical Monitoring */}
                  <div>
                    <h4 className="text-sm font-semibold text-primary mb-3">⚡ Electrical</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Current</span>
                        <span className="text-sm font-bold text-primary">{(cirrusMachine ? cirrusMachine.current : state.currentAmps).toFixed(1)}A</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Voltage</span>
                        <span className="text-sm font-bold text-primary">{(cirrusMachine ? cirrusMachine.voltage : state.voltage).toFixed(0)}V</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-status rounded-lg">
                        <span className="text-xs text-muted-foreground">Power</span>
                        <span className="text-sm font-bold text-primary">{Math.round(cirrusMachine ? cirrusMachine.power : state.power)}W</span>
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

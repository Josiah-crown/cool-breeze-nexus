import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface SystemState {
  isOn: boolean;
  hasWater: boolean;
  mode: string;
  speed: number;
  timer: number | null;
  outsideTemp: number;
  insideTemp: number;
  motorTemp: number;
  currentAmps: number;
  voltage: number;
  power: number;
  deltaT: number;
  isCooling: boolean;
}

const initialState: SystemState = {
  isOn: false,
  hasWater: true,
  mode: 'Off',
  speed: 1,
  timer: null,
  outsideTemp: 30.2,
  insideTemp: 28.5,
  motorTemp: 25.0,
  currentAmps: 0,
  voltage: 230,
  power: 0,
  deltaT: 1.7,
  isCooling: false,
};

export const useSystemState = () => {
  const [state, setState] = useState<SystemState>(initialState);

  // Calculate derived values
  useEffect(() => {
    const deltaT = state.outsideTemp - state.insideTemp;
    const isCooling = state.isOn && 
                     (state.mode === 'Cool' || state.mode === 'Auto') && 
                     deltaT > 2;
    
    setState(prev => ({
      ...prev,
      deltaT,
      isCooling,
      power: prev.isOn ? prev.currentAmps * prev.voltage : 0
    }));
  }, [state.outsideTemp, state.insideTemp, state.isOn, state.mode, state.currentAmps, state.voltage]);

  // Power control
  const togglePower = useCallback(() => {
    if (!state.hasWater && state.mode === 'Off') {
      toast({
        title: "Water Level Low",
        description: "Please check water supply before starting system.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => {
      const newIsOn = !prev.isOn;
      const newMode = newIsOn ? 'Cool' : 'Off';
      const newCurrent = newIsOn ? getCurrentForMode('Cool') : 0;
      
      toast({
        title: newIsOn ? "System Powered ON" : "System Powered OFF",
        description: newIsOn ? "Cool mode activated" : "All systems stopped",
        variant: newIsOn ? "default" : "destructive",
      });

      return {
        ...prev,
        isOn: newIsOn,
        mode: newMode,
        currentAmps: newCurrent,
        motorTemp: newIsOn ? 35.0 : 25.0,
      };
    });
  }, [state.hasWater, state.mode]);

  // Mode control
  const setMode = useCallback((newMode: string) => {
    if (!state.hasWater && newMode !== 'Off') {
      toast({
        title: "Water Level Low",
        description: "Cannot change mode without adequate water supply.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => {
      const wasOff = prev.mode === 'Off';
      const isOn = newMode !== 'Off';
      const current = isOn ? getCurrentForMode(newMode) : 0;

      toast({
        title: wasOff && isOn ? "System Powered ON" : "Mode Changed",
        description: `${newMode} mode ${isOn ? 'activated' : 'deactivated'}`,
      });

      return {
        ...prev,
        isOn,
        mode: newMode,
        currentAmps: current,
        motorTemp: isOn ? 35.0 : 25.0,
      };
    });
  }, [state.hasWater]);

  // Speed control
  const changeSpeed = useCallback((direction: 'increase' | 'decrease') => {
    if (!state.isOn) {
      toast({
        title: "System Not Running",
        description: "Please turn the system on first.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => {
      const newSpeed = direction === 'increase' 
        ? Math.min(3, prev.speed + 1)
        : Math.max(1, prev.speed - 1);
      
      toast({
        title: "Speed Changed",
        description: `Speed set to ${newSpeed}`,
      });

      return {
        ...prev,
        speed: newSpeed,
      };
    });
  }, [state.isOn]);

  // Timer control
  const setTimer = useCallback(() => {
    if (!state.isOn) {
      toast({
        title: "System Not Running",
        description: "Please turn the system on first.",
        variant: "destructive",
      });
      return;
    }

    const hours = window.prompt('Set auto-off timer (hours):\n(Enter 0 to cancel)', '2');
    if (hours === null) return;

    const timerHours = parseFloat(hours);
    if (isNaN(timerHours) || timerHours < 0) {
      toast({
        title: "Invalid Timer",
        description: "Please enter a valid number of hours.",
        variant: "destructive",
      });
      return;
    }

    if (timerHours === 0) {
      setState(prev => ({ ...prev, timer: null }));
      toast({
        title: "Timer Cancelled",
        description: "Auto-off timer has been disabled.",
      });
    } else {
      setState(prev => ({ ...prev, timer: timerHours }));
      toast({
        title: "Timer Set",
        description: `System will auto-off in ${timerHours} hour${timerHours !== 1 ? 's' : ''}`,
      });

      // Simulate timer countdown (in real app, this would be handled by backend)
      setTimeout(() => {
        setMode('Off');
        toast({
          title: "Auto-Off Timer",
          description: "System powered off automatically.",
          variant: "destructive",
        });
      }, timerHours * 60 * 60 * 1000);
    }
  }, [state.isOn, setMode]);

  // Environment simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        let newOutsideTemp = prev.outsideTemp + (Math.random() - 0.5) * 0.5;
        newOutsideTemp = Math.max(15, Math.min(45, newOutsideTemp));

        let newInsideTemp = prev.insideTemp;
        if (prev.isOn && prev.mode !== 'Off') {
          const coolingRate = getCoolingRate(prev.mode);
          newInsideTemp = Math.max(18, prev.insideTemp - coolingRate);
        } else {
          // Temperature rises when off
          newInsideTemp = Math.min(newOutsideTemp, prev.insideTemp + 0.1);
        }

        let newMotorTemp = prev.motorTemp;
        if (prev.isOn) {
          newMotorTemp += (Math.random() - 0.5) * 2;
          newMotorTemp = Math.max(25, Math.min(85, newMotorTemp));
        } else {
          newMotorTemp = Math.max(25, newMotorTemp - 0.5);
        }

        const newVoltage = 230 + (Math.random() - 0.5) * 8;

        // Simulate occasional water level issues
        let newHasWater = prev.hasWater;
        if (Math.random() < 0.001 && prev.isOn) {
          newHasWater = false;
          toast({
            title: "Water Level Critical",
            description: "Please refill water tank immediately!",
            variant: "destructive",
          });
        }

        return {
          ...prev,
          outsideTemp: newOutsideTemp,
          insideTemp: newInsideTemp,
          motorTemp: newMotorTemp,
          voltage: newVoltage,
          hasWater: newHasWater,
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return {
    state,
    actions: {
      togglePower,
      setMode,
      changeSpeed,
      setTimer,
    },
  };
};

// Helper functions
const getCurrentForMode = (mode: string): number => {
  const currentMap: Record<string, number> = {
    'Cool': 4.2,
    'Fan': 3.1,
    'Exhaust': 2.8,
    'Auto': 3.8,
  };
  return currentMap[mode] || 0;
};

const getCoolingRate = (mode: string): number => {
  const rateMap: Record<string, number> = {
    'Cool': 0.3,
    'Fan': 0.1,
    'Exhaust': 0.05,
    'Auto': 0.25,
  };
  return rateMap[mode] || 0;
};
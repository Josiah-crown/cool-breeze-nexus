import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface SystemState {
  isOn: boolean;
  hasWater: boolean;
  coolMode: boolean;
  fanMode: boolean;
  exhaustMode: boolean;
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
  coolMode: false,
  fanMode: false,
  exhaustMode: false,
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
    const isCooling = state.isOn && state.coolMode && deltaT > 2;
    
    setState(prev => ({
      ...prev,
      deltaT,
      isCooling,
      power: prev.isOn ? prev.currentAmps * prev.voltage : 0
    }));
  }, [state.outsideTemp, state.insideTemp, state.isOn, state.coolMode, state.currentAmps, state.voltage]);

  // Power control
  const togglePower = useCallback(() => {
    if (!state.hasWater && !state.isOn) {
      toast({
        title: "Water Level Low",
        description: "Please check water supply before starting system.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => {
      const newIsOn = !prev.isOn;
      
      toast({
        title: newIsOn ? "System Powered ON" : "System Powered OFF",
        description: newIsOn ? "System ready" : "All systems stopped",
        variant: newIsOn ? "default" : "destructive",
      });

      return {
        ...prev,
        isOn: newIsOn,
        coolMode: newIsOn ? prev.coolMode : false,
        fanMode: newIsOn ? prev.fanMode : false,
        exhaustMode: newIsOn ? prev.exhaustMode : false,
        currentAmps: newIsOn ? getCurrentForModes(prev.coolMode, prev.fanMode, prev.exhaustMode) : 0,
        motorTemp: newIsOn ? 35.0 : 25.0,
      };
    });
  }, [state.hasWater]);

  // Mode control
  const toggleCool = useCallback(() => {
    if (!state.hasWater) {
      toast({
        title: "Water Level Low",
        description: "Cannot activate cooling without water supply.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => {
      const newCoolMode = !prev.coolMode;
      const newFanMode = newCoolMode ? true : prev.fanMode; // Auto-enable fan when cool is on
      
      toast({
        title: newCoolMode ? "Cool Mode ON" : "Cool Mode OFF",
        description: newCoolMode ? "Cooling activated, fan enabled" : "Cooling deactivated",
      });

      return {
        ...prev,
        coolMode: newCoolMode,
        fanMode: newFanMode,
        currentAmps: getCurrentForModes(newCoolMode, newFanMode, prev.exhaustMode),
      };
    });
  }, [state.hasWater]);

  const toggleFan = useCallback(() => {
    if (!state.isOn) {
      toast({
        title: "System Not Running",
        description: "Please turn the system on first.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => {
      const newFanMode = !prev.fanMode;
      
      toast({
        title: newFanMode ? "Fan Mode ON" : "Fan Mode OFF",
        description: newFanMode ? "Fan activated" : "Fan deactivated",
      });

      return {
        ...prev,
        fanMode: newFanMode,
        currentAmps: getCurrentForModes(prev.coolMode, newFanMode, prev.exhaustMode),
      };
    });
  }, [state.isOn]);

  const toggleExhaust = useCallback(() => {
    if (!state.isOn) {
      toast({
        title: "System Not Running",
        description: "Please turn the system on first.",
        variant: "destructive",
      });
      return;
    }

    setState(prev => {
      const newExhaustMode = !prev.exhaustMode;
      const newFanMode = newExhaustMode ? true : prev.fanMode; // Auto-enable fan when exhaust is on
      const newCoolMode = newExhaustMode ? false : prev.coolMode; // Turn off cool when exhaust is on
      
      toast({
        title: newExhaustMode ? "Exhaust Mode ON" : "Exhaust Mode OFF",
        description: newExhaustMode ? "Exhaust activated, cool disabled" : "Exhaust deactivated",
      });

      return {
        ...prev,
        exhaustMode: newExhaustMode,
        fanMode: newFanMode,
        coolMode: newCoolMode,
        currentAmps: getCurrentForModes(newCoolMode, newFanMode, newExhaustMode),
      };
    });
  }, [state.isOn]);

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
        setState(prev => ({
          ...prev,
          isOn: false,
          coolMode: false,
          fanMode: false,
          exhaustMode: false,
          currentAmps: 0,
        }));
        toast({
          title: "Auto-Off Timer",
          description: "System powered off automatically.",
          variant: "destructive",
        });
      }, timerHours * 60 * 60 * 1000);
    }
  }, [state.isOn]);

  // Environment simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        let newOutsideTemp = prev.outsideTemp + (Math.random() - 0.5) * 0.5;
        newOutsideTemp = Math.max(15, Math.min(45, newOutsideTemp));

        let newInsideTemp = prev.insideTemp;
        if (prev.isOn && (prev.coolMode || prev.fanMode || prev.exhaustMode)) {
          const coolingRate = getCoolingRate(prev.coolMode, prev.fanMode, prev.exhaustMode);
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
      toggleCool,
      toggleFan,
      toggleExhaust,
      changeSpeed,
      setTimer,
    },
  };
};

// Helper functions
const getCurrentForModes = (coolMode: boolean, fanMode: boolean, exhaustMode: boolean): number => {
  let current = 0;
  if (coolMode) current += 4.2;
  if (fanMode) current += 3.1;
  if (exhaustMode) current += 2.8;
  return current;
};

const getCoolingRate = (coolMode: boolean, fanMode: boolean, exhaustMode: boolean): number => {
  let rate = 0;
  if (coolMode) rate += 0.3;
  if (fanMode) rate += 0.1;
  if (exhaustMode) rate += 0.05;
  return rate;
};
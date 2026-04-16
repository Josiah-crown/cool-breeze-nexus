import React, { useEffect, useState, useMemo, memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MachineStatus, MachineHistoricalData } from '@/types/machine';
import { StatusLight } from './StatusLight';
import { FanComponent } from './FanComponent';
import { HeatPumpComponent } from './HeatPumpComponent';
import { AirConditionerComponent } from './AirConditionerComponent';
import ApiKeyManager from './ApiKeyManager';
import { NotificationRecipientsPanel } from './NotificationRecipientsPanel';
import { AlertThresholdsEditor } from './AlertThresholdsEditor';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { X } from 'lucide-react';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getProcessingTable, type MachineType } from '@/lib/machineConfig';
import { useAuth } from '@/contexts/AuthContext';
import { toast as sonnerToast } from 'sonner';
import { fetchHistoricalData } from '@/lib/historicalData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface MachineDetailViewProps {
  machine: MachineStatus;
  historicalData: MachineHistoricalData;
  onClose: () => void;
}

type Period = '24h' | '7d' | '30d' | '1y';

// Move CustomTooltip outside component to prevent recreation on every render
const CustomTooltip = memo(({ active, payload, machineType }: { active?: boolean; payload?: any[]; machineType?: string }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    // Helper to format numeric values, showing "N/A" for null
    const formatValue = (value: number | null | undefined, unit: string): string => {
      if (value == null) return 'N/A';
      return `${value}${unit}`;
    };
    
    return (
      <div className="bg-card border-2 border-[#8FB83D] p-3 rounded-lg shadow-lg">
        <p className="font-semibold mb-2" style={{ color: '#8FB83D' }}>{data.time}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Delta T:</span>
            <span className="font-semibold text-foreground">{formatValue(data.deltaT, '°C')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Motor Temp:</span>
            <span className="font-semibold text-foreground">{formatValue(data.motorTemp, '°C')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Ambient Temp:</span>
            <span className="font-semibold text-foreground">{formatValue(data.outsideTemp, '°C')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Duct Temp:</span>
            <span className="font-semibold text-foreground">{formatValue(data.insideTemp, '°C')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Motor Amps:</span>
            <span className="font-semibold text-foreground">{formatValue(data.current, 'A')}</span>
          </div>
          {machineType !== 'heatpump' && data.fanSpeed != null && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Fan Speed:</span>
              <span className="font-semibold text-foreground" style={{ color: '#166534' }}>{formatValue(data.fanSpeed, '%')}</span>
            </div>
          )}
          <div className="border-t border-border pt-1 mt-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Fan:</span>
              <span className={`font-semibold ${data.fanStatus === 'ON' ? 'text-red-500' : 'text-muted-foreground'}`}>{data.fanStatus}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Cool:</span>
              <span className={`font-semibold ${data.coolStatus === 'ON' ? 'text-blue-500' : 'text-muted-foreground'}`}>{data.coolStatus}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Pump:</span>
              <span className={`font-semibold ${data.pumpStatus === 'ON' ? 'text-green-500' : 'text-muted-foreground'}`}>{data.pumpStatus}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Water:</span>
              <span className={`font-semibold ${data.waterStatus === 'FULL' ? 'text-[#8FB83D]' : 'text-muted-foreground'}`}>{data.waterStatus}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';

// Memoized Historical Chart Component to prevent re-renders on hover
const HistoricalChart = memo(({ 
  chartData, 
  machineType, 
  temperatureSetpoint 
}: { 
  chartData: any[]; 
  machineType: string; 
  temperatureSetpoint?: number;
}) => {
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  
  const tooltipContent = useCallback((props: any) => {
    return <CustomTooltip {...props} machineType={machineType} />;
  }, [machineType]);

  const handleLegendClick = useCallback((e: any) => {
    // Recharts Legend onClick provides the dataKey in the event
    // The event structure can vary, so we check multiple possible properties
    const dataKey = e?.dataKey || e?.value || e?.payload?.dataKey;
    if (dataKey) {
      setHiddenLines(prev => {
        const newSet = new Set(prev);
        if (newSet.has(dataKey)) {
          newSet.delete(dataKey);
        } else {
          newSet.add(dataKey);
        }
        return newSet;
      });
    }
  }, []);

  return (
    <>
      <style>{`
        .recharts-legend-item {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .recharts-legend-item:hover {
          opacity: 0.7;
        }
        .recharts-legend-item-text {
          transition: all 0.2s ease;
        }
        .recharts-legend-item:hover .recharts-legend-item-text {
          color: #8FB83D !important;
          text-decoration: underline;
        }
      `}</style>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            interval="preserveStartEnd"
          />
          <YAxis 
            yAxisId="temp"
            stroke="hsl(var(--muted-foreground))" 
            label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
            domain={() => [0, 120]}
            allowDataOverflow={true}
            type="number"
          />
          <YAxis 
            yAxisId="current"
            orientation="right"
            stroke="hsl(var(--muted-foreground))" 
            label={{ value: `Current (A)`, angle: 90, position: 'insideRight' }}
            domain={() => [0, 40]}
            allowDataOverflow={true}
            type="number"
          />
          <YAxis 
            yAxisId="fanSpeed"
            orientation="right"
            stroke="hsl(var(--muted-foreground))" 
            label={{ value: `Fan Speed (%)`, angle: 90, position: 'insideRight' }}
            domain={[0, 100]}
            hide={true}
          />
          <RechartsTooltip content={tooltipContent} />
          <Legend 
            onClick={handleLegendClick}
            wrapperStyle={{ cursor: 'pointer' }}
            iconType="line"
          />
        
        {/* Free Flow Lines - With fill areas like 24h view */}
        <Line 
          yAxisId="temp"
          type="monotone" 
          dataKey="outsideTemp" 
          name="Ambient Temp"
          stroke="#000000" 
          strokeWidth={2}
          dot={false}
          fill="#000000"
          fillOpacity={0.3}
          connectNulls={false}
          hide={hiddenLines.has('outsideTemp')}
        />
        <Line 
          yAxisId="temp"
          type="monotone" 
          dataKey="motorTemp" 
          name="Motor Temp"
          stroke="#EAB308" 
          strokeWidth={2}
          dot={false}
          fill="#EAB308"
          fillOpacity={0.3}
          connectNulls={false}
          hide={hiddenLines.has('motorTemp')}
        />
        <Line 
          yAxisId="temp"
          type="monotone" 
          dataKey="insideTemp" 
          name="Duct Temp"
          stroke="#F97316" 
          strokeWidth={2}
          dot={false}
          fill="#F97316"
          fillOpacity={0.3}
          connectNulls={false}
          hide={hiddenLines.has('insideTemp')}
        />
        <Line 
          yAxisId="current"
          type="monotone" 
          dataKey="current" 
          name="Motor Amps"
          stroke="#EC4899" 
          strokeWidth={2}
          dot={false}
          fill="#EC4899"
          fillOpacity={0.3}
          connectNulls={false}
          hide={hiddenLines.has('current')}
        />
        
        {/* Fan Speed Line (Dark Green, 0-100%) - Hidden for heatpumps */}
        {machineType !== 'heatpump' && (
          <Line 
            yAxisId="fanSpeed"
            type="monotone" 
            dataKey="fanSpeed" 
            name="Fan Speed"
            stroke="#166534" 
            strokeWidth={2}
            dot={false}
            fill="#166534"
            fillOpacity={0.3}
            connectNulls={false}
            hide={hiddenLines.has('fanSpeed')}
          />
        )}
        
        {/* ON/OFF State Lines - At Top of Graph (300% wider) */}
        {/* Fan and Cool lines - Not shown for heatpumps */}
        {machineType !== 'heatpump' && (
          <>
            <Line 
              yAxisId="temp"
              type="stepAfter" 
              dataKey="fanActive" 
              name="Fan"
              stroke="#EF4444" 
              strokeWidth={9}
              dot={false}
              connectNulls={false}
              hide={hiddenLines.has('fanActive')}
            />
            <Line 
              yAxisId="temp"
              type="stepAfter" 
              dataKey="isCooling" 
              name="Cool"
              stroke="#3B82F6" 
              strokeWidth={9}
              dot={false}
              connectNulls={false}
              hide={hiddenLines.has('isCooling')}
            />
            <Line 
              yAxisId="temp"
              type="stepAfter" 
              dataKey="fanAndCool" 
              name="Fan+Cool"
              stroke="#9333EA" 
              strokeWidth={9}
              dot={false}
              connectNulls={false}
              hide={hiddenLines.has('fanAndCool')}
            />
          </>
        )}
        
        {/* Heat line - Heatpumps only */}
        {machineType === 'heatpump' && (
          <Line 
            yAxisId="temp"
            type="stepAfter" 
            dataKey="isHeating" 
            name="Heat"
            stroke="#F59E0B" 
            strokeWidth={9}
            dot={false}
            connectNulls={false}
            hide={hiddenLines.has('isHeating')}
          />
        )}
        
        {/* Pump Line - Just Below Cool/Fan (at 115°C) */}
        <Line 
          yAxisId="temp"
          type="stepAfter" 
          dataKey="pumpActive" 
          name="Pump"
          stroke="#10B981" 
          strokeWidth={9}
          dot={false}
          connectNulls={false}
          hide={hiddenLines.has('pumpActive')}
        />
        {/* Tank/Pump Line - At Base of Graph (300% thicker) */}
        {/* For evaporative: shows water level, For heatpump: shows pump status (GPIO5) */}
        <Line 
          yAxisId="temp"
          type="stepAfter" 
          dataKey="hasWater" 
          name={machineType === 'heatpump' ? 'Pump (GPIO5)' : 'Tank'}
          stroke="#4B5563" 
          strokeWidth={9}
          dot={false}
          connectNulls={false}
          hide={hiddenLines.has('hasWater')}
        />
        
        {/* Setpoint Reference Line for Heat Pump */}
        {machineType === 'heatpump' && temperatureSetpoint && (
          <ReferenceLine 
            yAxisId="temp"
            y={temperatureSetpoint} 
            stroke="hsl(var(--accent))" 
            strokeDasharray="5 5"
            label="Setpoint"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
    </>
  );
});
HistoricalChart.displayName = 'HistoricalChart';

const MachineDetailView: React.FC<MachineDetailViewProps> = ({ 
  machine: initialMachine, 
  historicalData: initialHistoricalData,
  onClose 
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [machine, setMachine] = useState<MachineStatus>(initialMachine);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('24h');
  const [historicalData, setHistoricalData] = useState<MachineHistoricalData>(initialHistoricalData);
  const [loadingHistoricalData, setLoadingHistoricalData] = useState(false);
  const [editingSetpoint, setEditingSetpoint] = useState(false);
  const [newSetpoint, setNewSetpoint] = useState(initialMachine.temperatureSetpoint?.toString() || '55');
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [newLocation, setNewLocation] = useState(initialMachine.location || '');
  const [locationFallback, setLocationFallback] = useState<string | null>(null);
  
  // Fetch latest reading from processing table (same source as historical graph)
  const fetchLatestReading = async () => {
    const processingTable = getProcessingTable(machine.type as MachineType, machine.manufacturer);
    if (!processingTable) {
      return; // No processing table for this machine type/manufacturer
    }
    
    // Select columns based on table type - each manufacturer table has different columns
    let selectColumns = 'fan_active, is_cooling, is_on, has_water, pump_active, motor_temp, ambient_temp, duct_temp, current, voltage, power';
    if (processingTable === 'alliance') {
      // Alliance (heatpump) has additional columns: is_heating, compressor_status
      selectColumns = 'fan_active, is_heating, is_on, has_water, pump_active, compressor_status, motor_temp, ambient_temp, duct_temp, current, voltage, power';
    }
    
    try {
        const { data: latestReading, error } = await (supabase as any)
          .from(processingTable)
          .select(selectColumns)
          .eq('machine_id', machine.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle() to handle empty results gracefully
      
      if (error) {
        // Handle table-not-found errors gracefully
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('does not exist')) {
          console.debug(`[MachineDetailView] Table '${processingTable}' does not exist yet. Using default values.`);
          return; // Use existing machine state
        } else if (error.code === 'PGRST116') {
          console.debug(`[MachineDetailView] No readings found in '${processingTable}'. Using default values.`);
          return; // Use existing machine state
        }
        console.warn(`⚠️ MachineDetailView: Error fetching latest ${processingTable} reading:`, error);
        return;
      }
      
      if (latestReading) {
        setMachine(prev => ({
          ...prev,
          fanActive: latestReading.fan_active ?? prev.fanActive,
          // is_cooling only exists on cirrus/coolbreeze tables
          isCooling: 'is_cooling' in latestReading ? (latestReading.is_cooling ?? prev.isCooling) : prev.isCooling,
          // is_heating only exists on alliance table
          hasHeat: 'is_heating' in latestReading ? (latestReading.is_heating ?? prev.hasHeat) : prev.hasHeat,
          hasWater: latestReading.has_water ?? prev.hasWater,
          // compressor_status only exists on alliance table
          compressorStatus: 'compressor_status' in latestReading ? (latestReading.compressor_status ?? prev.compressorStatus) : prev.compressorStatus,
          isOn: latestReading.is_on ?? prev.isOn,
          motorTemp: latestReading.motor_temp ?? prev.motorTemp,
          outsideTemp: latestReading.ambient_temp ?? prev.outsideTemp,
          insideTemp: latestReading.duct_temp ?? prev.insideTemp,
          current: latestReading.current ?? prev.current,
          voltage: latestReading.voltage ?? prev.voltage,
          power: latestReading.power ?? prev.power,
          deltaT: Math.abs((latestReading.ambient_temp ?? prev.outsideTemp) - (latestReading.duct_temp ?? prev.insideTemp)),
        }));
      }
      } catch (err) {
        // Handle table-not-found errors gracefully
        if (err && typeof err === 'object' && 'code' in err) {
          const error = err as any;
          if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('does not exist')) {
            console.debug(`[MachineDetailView] Table '${processingTable}' does not exist yet. Using default values.`);
            return; // Use existing machine state
          } else if (error.code === 'PGRST116') {
            console.debug(`[MachineDetailView] No readings found in '${processingTable}'. Using default values.`);
            return; // Use existing machine state
          }
        }
        console.error('❌ MachineDetailView: Error in fetchLatestReading:', err);
      }
  };
  
  // Update machine state when prop changes
  useEffect(() => {
    setMachine(initialMachine);
    // Also fetch latest from processing table
    fetchLatestReading();
  }, [machine.id, machine.type, machine.manufacturer]);
  
  // Set up real-time subscription to processing table (same source as historical graph)
  useEffect(() => {
    const processingTable = getProcessingTable(machine.type as MachineType, machine.manufacturer);
    if (!processingTable) {
      return; // No processing table for this machine type/manufacturer
    }
    
    // Subscribe to processing table updates (same source as historical graph)
    const channel = supabase
      .channel(`machine-detail-${processingTable}-${machine.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: processingTable,
          filter: `machine_id=eq.${machine.id}`,
        },
        (payload) => {
          const newReading = payload.new as any;
          setMachine(prev => ({
            ...prev,
            fanActive: newReading.fan_active ?? prev.fanActive,
            isCooling: newReading.is_cooling ?? prev.isCooling,
            hasHeat: newReading.is_heating ?? prev.hasHeat,  // Heat = current > 1A
            hasWater: newReading.has_water ?? prev.hasWater,  // For heatpumps: Pump from GPIO5
            compressorStatus: newReading.compressor_status as 'good' | 'warning' | 'failed' | undefined ?? prev.compressorStatus,
            isOn: newReading.is_on ?? prev.isOn,
            motorTemp: newReading.motor_temp ?? prev.motorTemp,
            outsideTemp: newReading.ambient_temp ?? prev.outsideTemp,
            insideTemp: newReading.duct_temp ?? prev.insideTemp,
            current: newReading.current ?? prev.current,
            voltage: newReading.voltage ?? prev.voltage,
            power: newReading.power ?? prev.power,
            deltaT: Math.abs((newReading.ambient_temp ?? prev.outsideTemp) - (newReading.duct_temp ?? prev.insideTemp)),
          }));
        }
      )
      .subscribe();
    
    // Also poll every 5 seconds to catch any missed updates
    const pollInterval = setInterval(() => {
      fetchLatestReading();
    }, 5000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [machine.id, machine.type, machine.manufacturer]);

  // Load historical data when period changes
  useEffect(() => {
    let ignore = false;
    const loadHistoricalData = async () => {
      setLoadingHistoricalData(true);
      try {
        const data = await fetchHistoricalData(machine.id, selectedPeriod);
        if (!ignore) {
          setHistoricalData(data);
        }
      } catch (error) {
        console.error('Error loading historical data:', error);
        if (!ignore) {
          toast({
            title: 'Error',
            description: 'Failed to load historical data',
            variant: 'destructive',
          });
        }
      } finally {
        if (!ignore) {
          setLoadingHistoricalData(false);
        }
      }
    };

    loadHistoricalData();
    return () => {
      ignore = true;
    };
  }, [machine.id, selectedPeriod, toast]);

  useEffect(() => {
    let ignore = false;
    const loadFallbackLocation = async () => {
      if (machine.location || !machine.ownerId) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('street')
          .eq('id', machine.ownerId)
          .single();

        if (!ignore && !error && data?.street) {
          setLocationFallback(data.street);
          setNewLocation((prev) => prev || data.street || '');
        }
      } catch (err) {
        console.warn('Unable to load default machine location', err);
      }
    };

    loadFallbackLocation();
    return () => {
      ignore = true;
    };
  }, [machine.location, machine.ownerId]);

  const getMachineComponent = () => {
    // Use rem units so it scales with zoom (30rem = 480px at 16px base)
    const size = 'w-[30rem] h-[30rem] max-w-[90vw] max-h-[90vw]';
    switch (machine.type) {
      case 'evaporative':
        return (
          <FanComponent 
            isSpinning={machine.fanActive} 
            isCooling={machine.isCooling}
            isConnected={machine.isConnected}
            size={size} 
          />
        );
      case 'heatpump':
        return (
          <HeatPumpComponent 
            isHeating={machine.hasHeat} 
            isConnected={machine.isConnected}
            size={size} 
          />
        );
      case 'airconditioner':
        return <AirConditionerComponent isActive={machine.isConnected && machine.isCooling} size={size} />;
    }
  };

  const getTemperatureLabels = () => {
    if (machine.type === 'heatpump') {
      return {
        motor: 'Compressor Temp',
        outside: 'Inlet Temp',
        inside: 'Outlet Temp',
        current: 'Compressor Amps',
      };
    }
    return {
      motor: 'Motor Temp',
      outside: 'Ambient Temp',
      inside: 'Duct Temp',
      current: 'Motor Amps',
    };
  };

  const labels = getTemperatureLabels();

  // Memoize chart data to prevent graph resets when hovering
  const chartData = useMemo(() => {
    const motorTempData = historicalData.motorTemp || [];
    const currentData = historicalData.current || [];
    const outsideTempData = historicalData.outsideTemp || [];
    const insideTempData = historicalData.insideTemp || [];
    const deltaTData = historicalData.deltaT || [];
    const fanActiveData = historicalData.fanActive || [];
    const isCoolingData = historicalData.isCooling || [];
    const isHeatingData = historicalData.isHeating || [];
    const hasWaterData = historicalData.hasWater || [];
    const pumpActiveData = historicalData.pumpActive || [];
    const fanSpeedData = historicalData.fanSpeed || [];
    
    // Always use current time as the rightmost point (end of graph)
    const now = Date.now();
    let startTime: number;
    let intervalMs: number; // Interval between data points
    
    switch (selectedPeriod) {
      case '24h':
        startTime = now - 24 * 60 * 60 * 1000;
        intervalMs = 3 * 60 * 1000; // 3 minute intervals
        break;
      case '7d':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        intervalMs = 10 * 60 * 1000; // 10 minute intervals
        break;
      case '30d':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        intervalMs = 60 * 60 * 1000; // 1 hour intervals (FIXED: was showing daily)
        break;
      case '1y':
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day intervals
        break;
      default:
        startTime = now - 24 * 60 * 60 * 1000;
        intervalMs = 3 * 60 * 1000;
    }
    
    // Generate complete date range from startTime to now (always full period)
    const completeTimestamps: number[] = [];
    let currentTime = startTime;
    const endTime = now;
    
    while (currentTime <= endTime) {
      completeTimestamps.push(currentTime);
      currentTime += intervalMs;
    }
    
    // Ensure latest timestamp is included
    if (completeTimestamps[completeTimestamps.length - 1] !== endTime) {
      completeTimestamps.push(endTime);
    }
    
    // Create maps for quick lookup by timestamp (round to nearest interval for matching)
    const roundToInterval = (ts: number) => {
      return Math.round(ts / intervalMs) * intervalMs;
    };
    
    const motorTempMap = new Map(motorTempData.map(p => [roundToInterval(p.timestamp), p.value]));
    const currentMap = new Map(currentData.map(p => [roundToInterval(p.timestamp), p.value]));
    const outsideTempMap = new Map(outsideTempData.map(p => [roundToInterval(p.timestamp), p.value]));
    const insideTempMap = new Map(insideTempData.map(p => [roundToInterval(p.timestamp), p.value]));
    const deltaTMap = new Map(deltaTData.map(p => [roundToInterval(p.timestamp), p.value]));
    const fanActiveMap = new Map(fanActiveData.map(p => [roundToInterval(p.timestamp), p.value]));
    const isCoolingMap = new Map(isCoolingData.map(p => [roundToInterval(p.timestamp), p.value]));
    const isHeatingMap = new Map(isHeatingData.map(p => [roundToInterval(p.timestamp), p.value]));
    const hasWaterMap = new Map(hasWaterData.map(p => [roundToInterval(p.timestamp), p.value]));
    const pumpActiveMap = new Map(pumpActiveData.map(p => [roundToInterval(p.timestamp), p.value]));
    const fanSpeedMap = new Map(fanSpeedData.map(p => [roundToInterval(p.timestamp), p.value]));
    
    // Format time based on selected period
    const formatTime = (timestamp: number): string => {
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      if (selectedPeriod === '24h') {
        return `${hours}:${minutes}`;
      } else if (selectedPeriod === '7d') {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
      } else if (selectedPeriod === '30d') {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`; // Show hours for 30d
      } else { // 1y
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${month}/${day}/${year}`;
      }
    };
    
    // Helper function to interpolate missing numeric values between known data points
    // Only interpolates if gap is within reasonable threshold (e.g., 5 minutes for 24h view)
    const getInterpolatedValue = (
      map: Map<number, number>,
      timestamp: number,
      sortedTimestamps: number[],
      maxGapMs: number
    ): number | null => {
      // First check if we have an exact match
      const roundedTs = roundToInterval(timestamp);
      const exactValue = map.get(roundedTs);
      if (exactValue != null) {
        return exactValue;
      }

      // Find the previous and next known values
      let prevTs: number | null = null;
      let prevValue: number | null = null;
      let nextTs: number | null = null;
      let nextValue: number | null = null;

      // Search backwards for previous value
      for (let i = sortedTimestamps.length - 1; i >= 0; i--) {
        const ts = sortedTimestamps[i];
        if (ts < timestamp) {
          const value = map.get(roundToInterval(ts));
          if (value != null) {
            prevTs = ts;
            prevValue = value;
            break;
          }
        }
      }

      // Search forwards for next value
      for (let i = 0; i < sortedTimestamps.length; i++) {
        const ts = sortedTimestamps[i];
        if (ts > timestamp) {
          const value = map.get(roundToInterval(ts));
          if (value != null) {
            nextTs = ts;
            nextValue = value;
            break;
          }
        }
      }

      // If we have both previous and next values, check if gap is reasonable
      if (prevTs != null && nextTs != null && prevValue != null && nextValue != null) {
        const gapToPrev = timestamp - prevTs;
        const gapToNext = nextTs - timestamp;
        const totalGap = nextTs - prevTs;

        // Only interpolate if total gap is within threshold
        if (totalGap <= maxGapMs) {
          // Linear interpolation
          const ratio = gapToPrev / totalGap;
          const interpolated = prevValue + (nextValue - prevValue) * ratio;
          return interpolated;
        }
      }

      // If we only have previous value and gap is reasonable, use forward-fill
      if (prevTs != null && prevValue != null) {
        const gapToPrev = timestamp - prevTs;
        if (gapToPrev <= maxGapMs) {
          return prevValue;
        }
      }

      // If we only have next value and gap is reasonable, use backward-fill
      if (nextTs != null && nextValue != null) {
        const gapToNext = nextTs - timestamp;
        if (gapToNext <= maxGapMs) {
          return nextValue;
        }
      }

      return null; // Gap too large, don't interpolate
    };

    // Helper function for forward-filling boolean/status values (carry last known value forward)
    const getForwardFilledValue = (
      map: Map<number, number>,
      timestamp: number,
      sortedTimestamps: number[],
      maxGapMs: number
    ): number | null => {
      // First check if we have an exact match
      const roundedTs = roundToInterval(timestamp);
      const exactValue = map.get(roundedTs);
      if (exactValue != null) {
        return exactValue;
      }

      // Find the previous known value
      for (let i = sortedTimestamps.length - 1; i >= 0; i--) {
        const ts = sortedTimestamps[i];
        if (ts < timestamp) {
          const value = map.get(roundToInterval(ts));
          if (value != null) {
            const gapToPrev = timestamp - ts;
            // Only forward-fill if gap is reasonable
            if (gapToPrev <= maxGapMs) {
              return value;
            }
            break;
          }
        }
      }

      return null; // No previous value or gap too large
    };

    // Determine max gap threshold based on period (5 minutes for 24h, proportionally longer for others)
    let maxGapMs: number;
    switch (selectedPeriod) {
      case '24h':
        maxGapMs = 5 * 60 * 1000; // 5 minutes
        break;
      case '7d':
        maxGapMs = 20 * 60 * 1000; // 20 minutes
        break;
      case '30d':
        maxGapMs = 2 * 60 * 60 * 1000; // 2 hours
        break;
      case '1y':
        maxGapMs = 12 * 60 * 60 * 1000; // 12 hours
        break;
      default:
        maxGapMs = 5 * 60 * 1000;
    }

    // Get sorted timestamps from all data sources for interpolation lookup
    const allTimestamps = new Set<number>();
    [motorTempData, currentData, outsideTempData, insideTempData, deltaTData].forEach(data => {
      data.forEach(p => allTimestamps.add(roundToInterval(p.timestamp)));
    });
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Combine all datasets by timestamp, using interpolation for missing values
    const combinedData = completeTimestamps.map(timestamp => {
      const roundedTs = roundToInterval(timestamp);
      
      // Get values with interpolation for numeric fields
      const motorTemp = getInterpolatedValue(motorTempMap, timestamp, sortedTimestamps, maxGapMs) ?? motorTempMap.get(roundedTs);
      const current = getInterpolatedValue(currentMap, timestamp, sortedTimestamps, maxGapMs) ?? currentMap.get(roundedTs);
      const outsideTemp = getInterpolatedValue(outsideTempMap, timestamp, sortedTimestamps, maxGapMs) ?? outsideTempMap.get(roundedTs);
      const insideTemp = getInterpolatedValue(insideTempMap, timestamp, sortedTimestamps, maxGapMs) ?? insideTempMap.get(roundedTs);
      const deltaT = getInterpolatedValue(deltaTMap, timestamp, sortedTimestamps, maxGapMs) ?? deltaTMap.get(roundedTs);
      const fanSpeed = getInterpolatedValue(fanSpeedMap, timestamp, sortedTimestamps, maxGapMs) ?? fanSpeedMap.get(roundedTs);
      
      // For boolean/status values, use forward-fill if gap is reasonable
      const fanOn = fanActiveMap.get(roundedTs) ?? 
        (getForwardFilledValue(fanActiveMap, timestamp, sortedTimestamps, maxGapMs) ?? null);
      const coolOn = isCoolingMap.get(roundedTs) ?? 
        (getForwardFilledValue(isCoolingMap, timestamp, sortedTimestamps, maxGapMs) ?? null);
      const heatOn = isHeatingMap.get(roundedTs) ?? 
        (getForwardFilledValue(isHeatingMap, timestamp, sortedTimestamps, maxGapMs) ?? null);
      const waterOn = hasWaterMap.get(roundedTs) ?? 
        (getForwardFilledValue(hasWaterMap, timestamp, sortedTimestamps, maxGapMs) ?? null);
      const pumpOn = pumpActiveMap.get(roundedTs) ?? 
        (getForwardFilledValue(pumpActiveMap, timestamp, sortedTimestamps, maxGapMs) ?? null);
      
      // Convert to display values - use 0 only if we truly have no data (not interpolated)
      // For boolean values (fanActive, isCooling, isHeating, hasWater, pumpActive), use null if not present (won't show line)
      // Positioning: Fan/Cool/Heat at 120°C, Pump at 115°C, Water/Pump at 0°C
      return {
        time: formatTime(timestamp),
        timestamp, // Keep for sorting
        motorTemp: motorTemp != null ? parseFloat(motorTemp.toFixed(1)) : null,
        current: current != null ? parseFloat(current.toFixed(1)) : null,
        outsideTemp: outsideTemp != null ? parseFloat(outsideTemp.toFixed(1)) : null,
        insideTemp: insideTemp != null ? parseFloat(insideTemp.toFixed(1)) : null,
        deltaT: deltaT != null ? parseFloat(deltaT.toFixed(1)) : null,
        fanSpeed: fanSpeed != null ? Math.max(0, Math.min(100, parseFloat(fanSpeed.toFixed(1)))) : null, // 0-100%, null for heatpumps
        fanActive: fanOn != null && fanOn > 0 ? 120 : null, // At top of graph (120°C) - evaporative/AC only
        isCooling: coolOn != null && coolOn > 0 ? 120 : null, // At top of graph (120°C) - evaporative/AC only
        isHeating: heatOn != null && heatOn > 0 ? 120 : null, // At top of graph (120°C) - heatpump only
        fanAndCool: (fanOn != null && fanOn > 0 && coolOn != null && coolOn > 0) ? 120 : null, // At top of graph (120°C)
        pumpActive: pumpOn != null && pumpOn > 0 ? 115 : null, // Just below cool/fan (115°C)
        hasWater: waterOn != null && waterOn > 0 ? 0 : null, // At base of graph (0°C) - For evap: water, For heatpump: pump
        fanStatus: (fanOn != null && fanOn > 0) ? 'ON' : 'OFF',
        coolStatus: (coolOn != null && coolOn > 0) ? 'ON' : 'OFF',
        heatStatus: (heatOn != null && heatOn > 0) ? 'ON' : 'OFF',
        pumpStatus: (pumpOn != null && pumpOn > 0) ? 'ON' : 'OFF',
        waterStatus: (waterOn != null && waterOn > 0) ? 'FULL' : 'EMPTY'
      };
    });
    
    // Sort by timestamp to ensure correct order
    const sortedData = combinedData.sort((a, b) => a.timestamp - b.timestamp);
    
    // Apply moving average smoothing for longer periods (7d, 30d, 1y) to reduce jagged lines
    if (selectedPeriod !== '24h') {
      // Determine window size based on period (larger window for longer periods)
      let windowSize: number;
      switch (selectedPeriod) {
        case '7d':
          windowSize = 3; // Average over 3 data points (~30 minutes)
          break;
        case '30d':
          windowSize = 5; // Average over 5 data points (~5 hours)
          break;
        case '1y':
          windowSize = 7; // Average over 7 data points (~7 days)
          break;
        default:
          windowSize = 3;
      }
      
      // Apply moving average to numeric values only (not boolean status lines)
      const smoothedData = sortedData.map((point, index) => {
        const start = Math.max(0, index - Math.floor(windowSize / 2));
        const end = Math.min(sortedData.length - 1, index + Math.floor(windowSize / 2));
        const window = sortedData.slice(start, end + 1);
        
        // Calculate averages for numeric values
        const numericFields = ['motorTemp', 'current', 'outsideTemp', 'insideTemp', 'deltaT', 'fanSpeed'] as const;
        const smoothed: any = { ...point };
        
        numericFields.forEach(field => {
          if (field === 'fanSpeed' && point[field] === null) {
            // Keep fanSpeed as null for heatpumps
            return;
          }
          
          const values = window
            .map(p => p[field])
            .filter(v => v != null && typeof v === 'number');
          
          if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            smoothed[field] = parseFloat((sum / values.length).toFixed(1));
          }
        });
        
        return smoothed;
      });
      
      return smoothedData;
    }
    
    return sortedData;
  }, [historicalData, selectedPeriod]);

  const handleSetpointUpdate = async () => {
    const setpoint = parseFloat(newSetpoint);
    if (isNaN(setpoint) || setpoint < 0 || setpoint > 75) {
      toast({
        title: 'Invalid Setpoint',
        description: 'Please enter a value between 0 and 75°C',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('machines')
        .update({ temperature_setpoint: setpoint })
        .eq('id', machine.id);

      if (error) throw error;

      toast({
        title: 'Setpoint Updated',
        description: `Temperature setpoint set to ${setpoint}°C`,
      });
      setEditingSetpoint(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleLocationUpdate = async () => {
    try {
      const { error } = await supabase
        .from('machines')
        .update({ location: newLocation })
        .eq('id', machine.id);

      if (error) throw error;

      toast({
        title: 'Location Updated',
        description: 'Machine location has been updated',
      });
      setShowLocationDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Close button - Fixed position, always visible */}
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onClose}
        className="fixed top-4 right-4 z-[60] w-14 h-14 rounded-full bg-white hover:bg-[#8FB83D]/10 text-[#8FB83D] border-2 border-[#8FB83D] shadow-lg hover:scale-110 transition-all"
      >
        <X className="h-8 w-8" />
      </Button>
      
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-card border-[0.1875rem] border-[#8FB83D]">
        <CardHeader className="flex flex-row items-center justify-between border-b-[0.1875rem] border-[#8FB83D] hud-header">
          <div>
            <CardTitle className="text-[1.5rem] font-semibold" style={{ color: '#8FB83D' }}>{machine.name}</CardTitle>
              {(machine.location || locationFallback) && (
                <p className="text-[0.875rem] text-muted-foreground mt-[0.25rem]">
                  {machine.location || locationFallback}
                </p>
              )}
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => {
                setNewLocation(machine.location || '');
                setShowLocationDialog(true);
              }}
              className="p-0 h-auto text-[0.75rem]"
              style={{ color: '#8FB83D' }}
            >
              Change Location
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-[1.5rem]">
          <div className="space-y-[1.5rem]">
            {/* Machine Visual & API Key - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-[1.5rem]">
              <div className="flex justify-center items-start">
                {getMachineComponent()}
              </div>
              <div>
                <ApiKeyManager machineId={machine.id} mode="assign" />
              </div>
            </div>
            
            {/* System Status & Current Readings - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[1.5rem]">
              {/* System Status */}
              <Card className="bg-card h-full border-[0.1875rem] border-[#8FB83D]">
                <CardHeader className="border-b-[0.1875rem] border-[#8FB83D]">
                  <CardTitle className="text-[1.125rem] font-semibold" style={{ color: '#8FB83D' }}>System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-[0.75rem] pt-[1rem]">
                  <StatusLight status={machine.isConnected ? 'active' : 'inactive'} label="Connected" />
                  
                  {machine.type === 'evaporative' && (
                    <>
                      {machine.isConnected ? (
                        <>
                          <StatusLight status={machine.fanActive ? 'active' : 'inactive'} label="Fan" />
                          <StatusLight status={machine.isCooling ? 'active' : 'inactive'} label="Cooling" />
                          <StatusLight status={machine.hasWater ? 'active' : 'error'} label="Water Level" />
                        </>
                      ) : (
                        <>
                          <StatusLight status="inactive" label="Fan" />
                          <StatusLight status="inactive" label="Cooling" />
                          <StatusLight status="inactive" label="Water Level" />
                        </>
                      )}
                    </>
                  )}
                  
                  {machine.type === 'airconditioner' && (
                    <>
                      <StatusLight status={machine.fanActive ? 'active' : 'inactive'} label="Fan" />
                      <StatusLight status={machine.isCooling ? 'active' : 'inactive'} label="Cooling" />
                    </>
                  )}
                  
                  {machine.type === 'heatpump' && (
                    <>
                      <StatusLight status={machine.hasWater ? 'active' : 'inactive'} label="Pump" />
                      <StatusLight status={machine.hasHeat ? 'active' : 'inactive'} label="Heat" />
                    </>
                  )}
                  
                  <StatusLight
                    status={
                      machine.isConnected 
                        ? (machine.motorStatus === 'critical' || machine.motorStatus === 'warning' ? 'error' : 'active')
                        : 'inactive'
                    }
                    label={machine.type === 'heatpump' ? 'Compressor Status' : 'Motor Status'}
                  />
                </CardContent>
              </Card>

              {/* Current Readings */}
              <Card className="bg-card h-full border-[0.1875rem] border-[#8FB83D]">
                <CardHeader className="border-b-[0.1875rem] border-[#8FB83D]">
                  <CardTitle className="text-[1.125rem] font-semibold" style={{ color: '#8FB83D' }}>Current Readings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-[0.5rem] pt-[1rem]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{labels.outside}:</span>
                    <span className="font-semibold text-foreground">
                      {machine.isConnected ? `${machine.outsideTemp.toFixed(1)}°C` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{labels.inside}:</span>
                    <span className="font-semibold text-foreground">
                      {machine.isConnected ? `${machine.insideTemp.toFixed(1)}°C` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{labels.motor}:</span>
                    <span className="font-semibold text-foreground">
                      {machine.isConnected ? `${machine.motorTemp.toFixed(1)}°C` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delta T:</span>
                    <span className="font-semibold" style={{ color: '#8FB83D' }}>
                      {machine.isConnected ? `${machine.deltaT.toFixed(1)}°C` : 'N/A'}
                    </span>
                  </div>
                  
                  {machine.type === 'heatpump' && (
                    <div className="flex justify-between items-center border-t border-border pt-2">
                      <span className="text-muted-foreground">Setpoint:</span>
                      {editingSetpoint ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            value={newSetpoint}
                            onChange={(e) => setNewSetpoint(e.target.value)}
                            className="w-20 h-8 border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all"
                            min="0"
                            max="75"
                          />
                          <Button size="sm" onClick={handleSetpointUpdate}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingSetpoint(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <span className="font-semibold text-accent">{machine.temperatureSetpoint?.toFixed(0) || 55}°C</span>
                          <Button size="sm" variant="outline" onClick={() => setEditingSetpoint(true)}>Edit</Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Voltage:</span>
                    <span className="font-semibold text-foreground">
                      {machine.isConnected ? `${machine.voltage.toFixed(1)}V` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{labels.current}:</span>
                    <span className="font-semibold text-foreground">
                      {machine.isConnected ? `${machine.current.toFixed(2)}A` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Power:</span>
                    <span className="font-semibold text-primary">
                      {machine.isConnected ? `${machine.power.toFixed(1)}W` : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Historical Graph */}
            <Card className="bg-card border-[0.1875rem] border-[#8FB83D]">
              <CardHeader className="border-b-[0.1875rem] border-[#8FB83D] flex flex-row items-center justify-between">
                <CardTitle className="text-[1.125rem] font-semibold" style={{ color: '#8FB83D' }}>Historical Data</CardTitle>
                <div className="flex gap-2">
                  {(['24h', '7d', '30d', '1y'] as Period[]).map(period => (
                    <Button
                      key={period}
                      size="sm"
                      variant={selectedPeriod === period ? 'default' : 'outline'}
                      onClick={() => setSelectedPeriod(period)}
                      disabled={loadingHistoricalData}
                      className={`min-w-[60px] border-[3px] ${
                        selectedPeriod === period 
                          ? 'border-[#8FB83D] bg-[#8FB83D] text-white' 
                          : 'border-[#8FB83D] bg-background hover:bg-[#8FB83D]/10'
                      }`}
                      style={{ color: selectedPeriod === period ? 'white' : '#8FB83D' }}
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingHistoricalData ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <p className="text-muted-foreground">Loading historical data...</p>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <p className="text-muted-foreground">No historical data available for the selected period</p>
                  </div>
                ) : (
                  <HistoricalChart 
                    chartData={chartData}
                    machineType={machine.type}
                    temperatureSetpoint={machine.temperatureSetpoint}
                  />
                )}
              </CardContent>
            </Card>

            {/* Notification Recipients Panel */}
            <NotificationRecipientsPanel 
              machineId={machine.id} 
              machineName={machine.name}
            />

            {/* Alert Thresholds Editor */}
            <AlertThresholdsEditor 
              machineId={machine.id}
              machineType={machine.type}
            />
          </div>
        </CardContent>
      </Card>

      {/* Location Change Confirmation Dialog */}
      <AlertDialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <AlertDialogContent className="bg-card border-[0.1875rem] border-[#8FB83D]">
          <AlertDialogHeader className="border-b-[0.1875rem] border-[#8FB83D] pb-[1rem]">
            <AlertDialogTitle className="text-[1.25rem] font-semibold" style={{ color: '#8FB83D' }}>Change Machine Location</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              Are you sure you want to change the location information for this machine?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="location" className="font-semibold" style={{ color: '#8FB83D' }}>New Location</Label>
            <Input
              id="location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Enter machine location"
              className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all text-foreground"
            />
          </div>
          <AlertDialogFooter className="border-t-[3px] border-[#8FB83D] pt-4">
            <AlertDialogCancel className="border-[3px] border-[#8FB83D]">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLocationUpdate}
              className="text-white border-[3px] border-[#8FB83D]"
              style={{ backgroundColor: '#8FB83D' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7aa332'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8FB83D'}
            >
              Update Location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MachineDetailView;

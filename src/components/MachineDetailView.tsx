import React, { useEffect, useState, useMemo, memo, useCallback, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MachineStatus, MachineHistoricalData } from '@/types/machine';
import { StatusLight } from './StatusLight';
import { FanComponent } from './FanComponent';
import { HeatPumpComponent } from './HeatPumpComponent';
import { AirConditionerComponent } from './AirConditionerComponent';
import MachineOnSiteSetup from './MachineOnSiteSetup';
import { NotificationRecipientsPanel } from './NotificationRecipientsPanel';
import { AlertThresholdsEditor } from './AlertThresholdsEditor';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { X } from 'lucide-react';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getProcessingTable, type MachineType } from '@/lib/machineConfig';
import { useAuth } from '@/contexts/AuthContext';
import { canManageMachines } from '@/lib/accountRoles';
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
  /** Prefetched 24h series from useMachineData (Machines dashboard); detail view then loads the wide buffer for the time slider. */
  historicalData: MachineHistoricalData;
  onClose: () => void;
  /** Refreshed after API key assign so ESP panel shows Bearer hint without full page reload */
  onMachineApiKeyUpdated?: () => void;
  /** Render inside ERF fullscreen top layer (parent is the fullscreen element). */
  stackAboveFullscreen?: boolean;
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
            <span className="text-muted-foreground">{machineType === 'heatpump' ? 'Geyser:' : 'Ambient Temp:'}</span>
            <span className="font-semibold text-foreground">{formatValue(data.outsideTemp, '°C')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{machineType === 'heatpump' ? 'Outlet:' : 'Duct Temp:'}</span>
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
            {machineType === 'heatpump' ? (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Heating:</span>
                  <span className={`font-semibold ${data.isHeating != null ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {data.isHeating != null ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Contactor (GPIO5):</span>
                  <span className={`font-semibold ${data.hasWater != null ? 'text-[#8FB83D]' : 'text-muted-foreground'}`}>
                    {data.hasWater != null ? 'ON' : 'OFF'}
                  </span>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
  temperatureSetpoint,
  selectedPeriod,
  hiddenLines,
}: {
  chartData: any[];
  machineType: string;
  temperatureSetpoint?: number;
  selectedPeriod: Period;
  hiddenLines: Set<string>;
}) => {
  const tooltipContent = useCallback((props: any) => {
    return <CustomTooltip {...props} machineType={machineType} />;
  }, [machineType]);

  const formatXAxisTick = useCallback((value: number) => {
    const d = new Date(value);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(-2);

    // 24h mode is a 7-day wide page.
    // - show time-only on regular ticks
    // - show date-only at day boundaries (00:00)
    if (selectedPeriod === '24h') {
      if (hh === '00' && mm === '00') return `${month}/${day}`;
      return `${hh}:${mm}`;
    }
    if (selectedPeriod === '7d') return `${month}/${day} ${hh}:${mm}`;
    if (selectedPeriod === '30d') return `${month}/${day}`;
    return `${month}/${day}/${year}`;
  }, [selectedPeriod]);

  const xTicks = useMemo(() => {
    if (!chartData.length) return undefined;
    if (selectedPeriod !== '24h') return undefined;
    // 3-hour ticks across the full 7-day wide page, aligned to local time boundaries.
    const min = chartData[0].timestamp;
    const max = chartData[chartData.length - 1].timestamp;
    const step = 3 * 60 * 60 * 1000;
    const startDate = new Date(min);
    startDate.setMinutes(0, 0, 0);
    // move to the next hour boundary if we're not already exactly on one
    if (startDate.getTime() < min) {
      startDate.setHours(startDate.getHours() + 1);
    }
    // then move to the next 3-hour boundary
    while (startDate.getHours() % 3 !== 0) {
      startDate.setHours(startDate.getHours() + 1);
    }
    const start = startDate.getTime();
    const ticks: number[] = [];
    for (let t = start; t <= max; t += step) ticks.push(t);
    return ticks;
  }, [chartData, selectedPeriod]);

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
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax'] as any}
            stroke="hsl(var(--muted-foreground))"
            // Never allow 24h mode to fall back to "every tick" (too dense).
            // If custom ticks aren't ready yet, preserveStartEnd.
            interval={selectedPeriod === '24h' ? 'preserveStartEnd' : 'preserveStartEnd'}
            ticks={selectedPeriod === '24h' ? (xTicks as any) : undefined}
            minTickGap={selectedPeriod === '24h' ? 8 : 8}
            tickFormatter={formatXAxisTick}
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
            name="Heating"
            stroke="#F59E0B" 
            strokeWidth={9}
            dot={false}
            connectNulls={false}
            hide={hiddenLines.has('isHeating')}
          />
        )}
        
        {/* Pump Line - Just Below Cool/Fan (at 115°C) */}
        {machineType !== 'heatpump' && (
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
        )}
        {/* Tank/Pump Line - At Base of Graph (300% thicker) */}
        {/* For evaporative: shows water level, For heatpump: shows pump status (GPIO5) */}
        <Line 
          yAxisId="temp"
          type="stepAfter" 
          dataKey="hasWater" 
          name={machineType === 'heatpump' ? 'Contactor (GPIO5)' : 'Tank'}
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
  onClose,
  onMachineApiKeyUpdated,
  stackAboveFullscreen = false,
}) => {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  const { user } = useAuth();
  const machineManagement = canManageMachines(user?.role);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Lock page scroll (Sites ERF / dashboard layout scrolls behind the overlay otherwise).
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    scrollContainerRef.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Diagnostic: confirm the component is actually mounting and getting the right machine.
  const didLogMountRef = useRef(false);
  if (!didLogMountRef.current) {
    didLogMountRef.current = true;
    console.warn('[MachineDetailView] MOUNTED for machine', {
      id: initialMachine?.id,
      type: initialMachine?.type,
      manufacturer: initialMachine?.manufacturer,
      initialHistoricalDataKeys: initialHistoricalData ? Object.keys(initialHistoricalData) : null,
      initialMotorCount: initialHistoricalData?.motorTemp?.length ?? null,
    });
  }

  const [machine, setMachine] = useState<MachineStatus>(initialMachine);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('24h');
  const [historicalData, setHistoricalData] = useState<MachineHistoricalData>(initialHistoricalData);
  const [loadingHistoricalData, setLoadingHistoricalData] = useState(false);
  // When in 24h mode, allow shifting the 24h window back across the last 7 days (max 6 days back)
  const [hoursBack, setHoursBack] = useState(0); // 0 = ends "now", 144 = ends 6 days ago
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  const [editingSetpoint, setEditingSetpoint] = useState(false);
  const [newSetpoint, setNewSetpoint] = useState(initialMachine.temperatureSetpoint?.toString() || '55');
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [newLocation, setNewLocation] = useState(initialMachine.location || '');
  const [locationFallback, setLocationFallback] = useState<string | null>(null);

  const refreshMachineApiKeyFromDb = useCallback(async () => {
    const { data, error } = await supabase.from("machines").select("api_key").eq("id", machine.id).maybeSingle();
    if (!error && data) {
      const row = data as { api_key: string | null };
      setMachine((prev) => ({ ...prev, apiKey: row.api_key ?? null }));
    }
    onMachineApiKeyUpdated?.();
  }, [machine.id, onMachineApiKeyUpdated]);

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
  
  // Note: Expanded machine view fetches latest reading once on open.
  // We intentionally do NOT subscribe/poll here to avoid network spam.

  // Load historical data when period changes
  useEffect(() => {
    let ignore = false;
    const loadHistoricalData = async () => {
      // Map display view -> buffer period we fetch from the RPC.
      // - 24h view: 7 days @ 3-minute buckets
      // - 7d view: 30 days @ 10-minute buckets
      // - 30d view: 1 year @ 1-hour buckets
      const effectivePeriod =
        selectedPeriod === '24h'
          ? ('7d_3m' as any)
          : selectedPeriod === '7d'
            ? ('30d_10m' as any)
            : selectedPeriod === '30d'
              ? ('1y_1h' as any)
              : selectedPeriod;

      console.warn('[MachineDetailView] ▶ Fetching historical buffer', {
        machineId: machine.id,
        selectedPeriod,
        effectivePeriod,
      });

      setLoadingHistoricalData(true);
      try {
        const data = await fetchHistoricalData(machine.id, effectivePeriod);
        if (ignore) return;

        const motorCount = data.motorTemp?.length ?? 0;
        const first = data.motorTemp?.[0]?.timestamp;
        const last = data.motorTemp?.[motorCount - 1]?.timestamp;
        console.warn('[MachineDetailView] ◀ Buffer loaded', {
          machineId: machine.id,
          effectivePeriod,
          motorCount,
          firstMotorTs: first ? new Date(first).toISOString() : null,
          lastMotorTs: last ? new Date(last).toISOString() : null,
        });

        setHistoricalData(data);
      } catch (error) {
        console.error('[MachineDetailView] Error loading historical data:', error);
        if (!ignore) {
          toastRef.current({
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
  }, [machine.id, selectedPeriod]);

  // Reset slider when switching away from 24h, and keep it in bounds.
  useEffect(() => {
    if (selectedPeriod !== '24h' && selectedPeriod !== '7d' && selectedPeriod !== '30d') {
      setHoursBack(0);
      return;
    }
    // When switching views, snap back to "Now" so the graph doesn't appear stale.
    setHoursBack(0);
    const max = selectedPeriod === '24h' ? 144 : selectedPeriod === '7d' ? 23 * 24 : 335 * 24;
    setHoursBack((h) => Math.max(0, Math.min(max, h)));
  }, [selectedPeriod]);

  // When opening a different machine, always start at "Now".
  useEffect(() => {
    setHoursBack(0);
  }, [machine.id]);

  // Track viewport width so we can size the wide 7-day page.
  useLayoutEffect(() => {
    const el = viewportEl;
    if (!el) return;

    const update = () => setViewportWidth(el.clientWidth || 0);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewportEl]);

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
        motor: 'Motor Temp',
        outside: 'Geyser',
        inside: 'Outlet',
        current: 'Motor Amps',
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

  const historicalRangeSummary = useMemo(() => {
    const series = [
      historicalData.motorTemp || [],
      historicalData.outsideTemp || [],
      historicalData.insideTemp || [],
      historicalData.current || [],
      historicalData.deltaT || [],
    ];
    let minTs: number | null = null;
    let maxTs: number | null = null;
    let total = 0;
    for (const arr of series) {
      for (const p of arr) {
        const t = (p as any)?.timestamp;
        if (typeof t === 'number' && Number.isFinite(t)) {
          if (maxTs == null || t > maxTs) maxTs = t;
          if (minTs == null || t < minTs) minTs = t;
          total++;
        }
      }
    }
    return { minTs, maxTs, total };
  }, [historicalData]);

  const newestHistoricalTimestamp = historicalRangeSummary.maxTs;
  const oldestHistoricalTimestamp = historicalRangeSummary.minTs;

  const seriesLegendItems = useMemo(() => {
    const items: { key: string; label: string; color: string; visibleWhen?: (t: string) => boolean }[] = [
      { key: 'outsideTemp', label: selectedPeriod === '24h' || machine.type === 'heatpump' ? labels.outside : 'Ambient Temp', color: '#000000' },
      { key: 'motorTemp', label: selectedPeriod === '24h' || machine.type === 'heatpump' ? labels.motor : 'Motor Temp', color: '#EAB308' },
      { key: 'insideTemp', label: selectedPeriod === '24h' || machine.type === 'heatpump' ? labels.inside : 'Duct Temp', color: '#F97316' },
      { key: 'current', label: selectedPeriod === '24h' || machine.type === 'heatpump' ? labels.current : 'Motor Amps', color: '#EC4899' },
      { key: 'fanSpeed', label: 'Fan Speed', color: '#166534', visibleWhen: (t) => t !== 'heatpump' },
      { key: 'fanActive', label: 'Fan', color: '#EF4444', visibleWhen: (t) => t !== 'heatpump' },
      { key: 'isCooling', label: 'Cool', color: '#3B82F6', visibleWhen: (t) => t !== 'heatpump' },
      { key: 'fanAndCool', label: 'Fan+Cool', color: '#9333EA', visibleWhen: (t) => t !== 'heatpump' },
      { key: 'isHeating', label: 'Heating', color: '#F59E0B', visibleWhen: (t) => t === 'heatpump' },
      { key: 'pumpActive', label: 'Pump', color: '#10B981', visibleWhen: (t) => t !== 'heatpump' },
      { key: 'hasWater', label: machine.type === 'heatpump' ? 'Contactor (GPIO5)' : 'Tank', color: '#4B5563' },
    ];
    return items.filter((i) => (i.visibleWhen ? i.visibleWhen(machine.type) : true));
  }, [machine.type, labels, selectedPeriod]);

  const toggleSeries = useCallback((key: string) => {
    setHiddenLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Memoize chart data to prevent graph resets when hovering
  const chartData = useMemo(() => {
    // We use the server's ACTUAL timestamps as the chart grid, not a client-generated
    // grid. This avoids any rounding/alignment/timezone mismatches that were causing
    // the recent part of the chart to appear empty even when data existed.
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

    // Gap threshold: dropped posts bridged up to this many ms, longer gaps become breaks.
    let maxGapMs: number;
    switch (selectedPeriod) {
      case '24h':
        maxGapMs = 20 * 60 * 1000; break;
      case '7d':
        maxGapMs = 20 * 60 * 1000; break;
      case '30d':
        maxGapMs = 2 * 60 * 60 * 1000; break;
      case '1y':
        maxGapMs = 12 * 60 * 60 * 1000; break;
      default:
        maxGapMs = 20 * 60 * 1000;
    }

    // Build per-field maps keyed by actual server timestamp (no rounding).
    const motorTempMap = new Map(motorTempData.map(p => [p.timestamp, p.value]));
    const currentMap = new Map(currentData.map(p => [p.timestamp, p.value]));
    const outsideTempMap = new Map(outsideTempData.map(p => [p.timestamp, p.value]));
    const insideTempMap = new Map(insideTempData.map(p => [p.timestamp, p.value]));
    const deltaTMap = new Map(deltaTData.map(p => [p.timestamp, p.value]));
    const fanActiveMap = new Map(fanActiveData.map(p => [p.timestamp, p.value]));
    const isCoolingMap = new Map(isCoolingData.map(p => [p.timestamp, p.value]));
    const isHeatingMap = new Map(isHeatingData.map(p => [p.timestamp, p.value]));
    const hasWaterMap = new Map(hasWaterData.map(p => [p.timestamp, p.value]));
    const pumpActiveMap = new Map(pumpActiveData.map(p => [p.timestamp, p.value]));
    const fanSpeedMap = new Map(fanSpeedData.map(p => [p.timestamp, p.value]));

    // Union of all server timestamps, sorted ascending.
    const tsSet = new Set<number>();
    [
      motorTempData, currentData, outsideTempData, insideTempData, deltaTData,
      fanActiveData, isCoolingData, isHeatingData, hasWaterData, pumpActiveData,
      fanSpeedData,
    ].forEach(arr => arr.forEach(p => tsSet.add(p.timestamp)));
    const sortedTs = Array.from(tsSet).sort((a, b) => a - b);

    if (sortedTs.length === 0) return [] as any[];

    const formatTime = (ts: number): string => {
      const d = new Date(ts);
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const year = d.getFullYear().toString().slice(-2);
      if (selectedPeriod === '24h') return `${hh}:${mm}`;
      if (selectedPeriod === '7d' || selectedPeriod === '30d') return `${month}/${day} ${hh}:${mm}`;
      return `${month}/${day}/${year}`;
    };

    // Forward-fill helper for boolean-like fields: find most recent value at or
    // before ts, within maxGapMs. Returns null otherwise.
    // Uses a binary search so this stays fast for thousands of points.
    const findPrevIndex = (ts: number): number => {
      let lo = 0, hi = sortedTs.length - 1, res = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (sortedTs[mid] <= ts) { res = mid; lo = mid + 1; }
        else { hi = mid - 1; }
      }
      return res;
    };

    const forwardFill = (map: Map<number, number>, ts: number): number | null => {
      let idx = findPrevIndex(ts);
      while (idx >= 0) {
        const t = sortedTs[idx];
        if (ts - t > maxGapMs) return null;
        const v = map.get(t);
        if (v != null) return v;
        idx--;
      }
      return null;
    };

    // Build one point per server timestamp.
    const points: any[] = [];
    for (let i = 0; i < sortedTs.length; i++) {
      const ts = sortedTs[i];

      const motorTemp = motorTempMap.get(ts);
      const current = currentMap.get(ts);
      const outsideTemp = outsideTempMap.get(ts);
      const insideTemp = insideTempMap.get(ts);
      const deltaT = deltaTMap.get(ts);
      const fanSpeed = fanSpeedMap.get(ts);

      // Boolean-ish fields: use exact value if available, otherwise forward-fill
      // up to maxGapMs so that step lines stay continuous across sparse posts.
      const fanOn = fanActiveMap.get(ts) ?? forwardFill(fanActiveMap, ts);
      const coolOn = isCoolingMap.get(ts) ?? forwardFill(isCoolingMap, ts);
      const heatOn = isHeatingMap.get(ts) ?? forwardFill(isHeatingMap, ts);
      const waterOn = hasWaterMap.get(ts) ?? forwardFill(hasWaterMap, ts);
      const pumpOn = pumpActiveMap.get(ts) ?? forwardFill(pumpActiveMap, ts);

      points.push({
        time: formatTime(ts),
        timestamp: ts,
        motorTemp: motorTemp != null ? parseFloat(motorTemp.toFixed(1)) : null,
        current: current != null ? parseFloat(current.toFixed(1)) : null,
        outsideTemp: outsideTemp != null ? parseFloat(outsideTemp.toFixed(1)) : null,
        insideTemp: insideTemp != null ? parseFloat(insideTemp.toFixed(1)) : null,
        deltaT: deltaT != null ? parseFloat(deltaT.toFixed(1)) : null,
        fanSpeed: fanSpeed != null
          ? Math.max(0, Math.min(100, parseFloat(fanSpeed.toFixed(1))))
          : null,
        fanActive: fanOn != null && fanOn > 0 ? 120 : null,
        isCooling: coolOn != null && coolOn > 0 ? 120 : null,
        isHeating: heatOn != null && heatOn > 0 ? 120 : null,
        fanAndCool: (fanOn != null && fanOn > 0 && coolOn != null && coolOn > 0) ? 120 : null,
        pumpActive: pumpOn != null && pumpOn > 0 ? 115 : null,
        hasWater: waterOn != null && waterOn > 0 ? 0 : null,
        fanStatus: (fanOn != null && fanOn > 0) ? 'ON' : 'OFF',
        coolStatus: (coolOn != null && coolOn > 0) ? 'ON' : 'OFF',
        heatStatus: (heatOn != null && heatOn > 0) ? 'ON' : 'OFF',
        pumpStatus: (pumpOn != null && pumpOn > 0) ? 'ON' : 'OFF',
        waterStatus: (waterOn != null && waterOn > 0) ? 'FULL' : 'EMPTY',
      });

      // Insert an all-null break point for large gaps so the line visibly breaks
      // (Recharts connectNulls={false} will stop drawing). Small gaps are drawn
      // as straight interpolating segments, which matches our "up to 20 minutes"
      // bridging behaviour.
      if (i + 1 < sortedTs.length) {
        const nextTs = sortedTs[i + 1];
        if (nextTs - ts > maxGapMs) {
          const mid = ts + Math.floor((nextTs - ts) / 2);
          points.push({
            time: formatTime(mid),
            timestamp: mid,
            motorTemp: null,
            current: null,
            outsideTemp: null,
            insideTemp: null,
            deltaT: null,
            fanSpeed: null,
            fanActive: null,
            isCooling: null,
            isHeating: null,
            fanAndCool: null,
            pumpActive: null,
            hasWater: null,
            fanStatus: 'OFF',
            coolStatus: 'OFF',
            heatStatus: 'OFF',
            pumpStatus: 'OFF',
            waterStatus: 'EMPTY',
          });
        }
      }
    }

    const sortedData = points;
    
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

  const widePageWidth = useMemo(() => {
    if (selectedPeriod !== '24h' && selectedPeriod !== '7d' && selectedPeriod !== '30d') return undefined;
    if (!viewportWidth) return undefined;
    const targetDays =
      selectedPeriod === '24h' ? 7 :
      selectedPeriod === '7d' ? 30 :
      365;

    // If the backend hasn't been migrated yet (e.g. period strings not supported),
    // we may only receive ~24h worth of data. Size the "wide page" to the actual
    // data span so the UI doesn't show empty days.
    const minTs = chartData.length ? chartData[0]?.timestamp : undefined;
    const maxTs = chartData.length ? chartData[chartData.length - 1]?.timestamp : undefined;
    const spanDays =
      typeof minTs === 'number' && typeof maxTs === 'number'
        ? Math.max(1, Math.ceil((maxTs - minTs) / (24 * 60 * 60 * 1000)))
        : targetDays;

    const availableDays = Math.min(targetDays, spanDays);
    const windowDays = selectedPeriod === '24h' ? 1 : selectedPeriod === '7d' ? 7 : 30;
    // wide page shown inside a fixed viewport; scale by buffer/window ratio
    const scale = Math.max(1, availableDays / windowDays);
    return Math.max(viewportWidth, viewportWidth * scale);
  }, [selectedPeriod, viewportWidth, chartData]);

  const wideTranslateX = useMemo(() => {
    if (selectedPeriod !== '24h' && selectedPeriod !== '7d' && selectedPeriod !== '30d') return 0;
    if (!widePageWidth || !viewportWidth) return 0;
    const maxShift = Math.max(0, widePageWidth - viewportWidth);
    const minTs = chartData.length ? chartData[0]?.timestamp : undefined;
    const maxTs = chartData.length ? chartData[chartData.length - 1]?.timestamp : undefined;
    if (typeof minTs !== 'number' || typeof maxTs !== 'number' || maxTs <= minTs) return 0;

    const windowMs =
      selectedPeriod === '24h'
        ? 24 * 60 * 60 * 1000
        : selectedPeriod === '7d'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

    // Target window end is "maxTs minus hoursBack"
    const desiredEnd = maxTs - hoursBack * 60 * 60 * 1000;
    const clampedEnd = Math.max(minTs + windowMs, Math.min(maxTs, desiredEnd));
    const clampedStart = clampedEnd - windowMs;

    // Convert the start time to a pixel offset across the total span.
    const spanMs = maxTs - minTs;
    // We only scroll across the "scrollable" span (span - window), not the full span.
    const scrollableMs = Math.max(1, spanMs - windowMs);
    const startRatio = (clampedStart - minTs) / scrollableMs; // 0..1 (clamped below)
    const clampedRatio = Math.max(0, Math.min(1, startRatio));
    return -clampedRatio * maxShift;
  }, [selectedPeriod, widePageWidth, viewportWidth, hoursBack, chartData]);

  const windowedChartData = useMemo(() => chartData, [chartData]);

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

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${machine.name} details`}
      className={cn("fixed inset-0", stackAboveFullscreen ? "z-[100]" : "z-50")}
    >
      <button
        type="button"
        aria-label="Close machine details"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className={cn(
          "fixed top-4 right-4 w-14 h-14 rounded-full bg-white hover:bg-[#8FB83D]/10 text-[#8FB83D] border-2 border-[#8FB83D] shadow-lg hover:scale-110 transition-all",
          stackAboveFullscreen ? "z-[110]" : "z-[60]",
        )}
      >
        <X className="h-8 w-8" />
      </Button>

      <div
        ref={scrollContainerRef}
        tabIndex={-1}
        className="relative z-[1] h-[100dvh] max-h-[100dvh] overflow-y-scroll overscroll-y-contain outline-none touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-16 sm:py-8 sm:pb-20">
      <Card className="w-full bg-card border-[0.1875rem] border-[#8FB83D]">
        <CardHeader className="flex flex-row items-center justify-between border-b-[0.1875rem] border-[#8FB83D] hud-header">
          <div>
            <CardTitle className="text-[1.5rem] font-semibold" style={{ color: '#8FB83D' }}>{machine.name}</CardTitle>
              {(machine.location || locationFallback) && (
                <p className="text-[0.875rem] text-muted-foreground mt-[0.25rem]">
                  {machine.location || locationFallback}
                </p>
              )}
            {machineManagement && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setNewLocation(machine.location || "");
                  setShowLocationDialog(true);
                }}
                className="p-0 h-auto text-[0.75rem]"
                style={{ color: "#8FB83D" }}
              >
                Change Location
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-[1.5rem]">
          <div className="space-y-[1.5rem]">
            {/* Machine visual — full width */}
            <div className="flex justify-center items-start">
              {getMachineComponent()}
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
                      <StatusLight status={machine.hasWater ? 'active' : 'inactive'} label="Contactor (GPIO5)" />
                      <StatusLight status={machine.hasHeat ? 'active' : 'inactive'} label="Heating" />
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
                      {machineManagement && editingSetpoint ? (
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
                          {machineManagement && (
                            <Button size="sm" variant="outline" onClick={() => setEditingSetpoint(true)}>
                              Edit
                            </Button>
                          )}
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
                  <div className="hidden md:flex flex-col items-end text-[0.6875rem] text-muted-foreground mr-2 leading-tight">
                    <span>Machine: {machine.id.slice(0, 8)}… • Points: {historicalRangeSummary.total}</span>
                    <span>
                      Range:{' '}
                      {oldestHistoricalTimestamp
                        ? new Date(oldestHistoricalTimestamp).toLocaleString()
                        : '—'}
                      {' → '}
                      {newestHistoricalTimestamp
                        ? new Date(newestHistoricalTimestamp).toLocaleString()
                        : '—'}
                    </span>
                  </div>
                  {(['24h', '7d', '30d'] as Period[]).map((period) => (
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
                ) : windowedChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <p className="text-muted-foreground">No historical data available for the selected period</p>
                  </div>
                ) : (
                  <>
                    {selectedPeriod === '24h' || selectedPeriod === '7d' || selectedPeriod === '30d' ? (
                      <div ref={setViewportEl} className="relative overflow-hidden">
                        <div
                          className="will-change-transform transition-transform duration-300 ease-out"
                          style={{
                            width: widePageWidth ? `${widePageWidth}px` : undefined,
                            transform: `translateX(${wideTranslateX}px)`,
                          }}
                        >
                          <HistoricalChart
                            chartData={windowedChartData}
                            machineType={machine.type}
                            temperatureSetpoint={machine.temperatureSetpoint}
                            selectedPeriod={selectedPeriod}
                            hiddenLines={hiddenLines}
                          />
                        </div>
                      </div>
                    ) : (
                      <HistoricalChart
                        chartData={windowedChartData}
                        machineType={machine.type}
                        temperatureSetpoint={machine.temperatureSetpoint}
                        selectedPeriod={selectedPeriod}
                        hiddenLines={hiddenLines}
                      />
                    )}

                    {/* Fixed legend (outside moving viewport) */}
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
                      {seriesLegendItems.map((item) => {
                        const isHidden = hiddenLines.has(item.key);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => toggleSeries(item.key)}
                            className={cn(
                              "flex items-center gap-2 rounded-md border px-2 py-1 transition-opacity",
                              isHidden ? "opacity-40" : "opacity-100",
                              "hover:opacity-70",
                            )}
                            style={{ borderColor: item.color }}
                          >
                            <span className="inline-block h-0.5 w-6" style={{ backgroundColor: item.color }} />
                            <span className="text-muted-foreground">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {(selectedPeriod === '24h' || selectedPeriod === '7d' || selectedPeriod === '30d') && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {selectedPeriod === '24h' ? '6 days back' : selectedPeriod === '7d' ? '23 days back' : '335 days back'}
                          </span>
                          <span className="text-foreground font-medium">
                            {selectedPeriod === '24h'
                              ? (hoursBack === 0 ? 'Viewing: Last 24h' : `Viewing: 24h ending ${hoursBack}h ago`)
                              : selectedPeriod === '7d'
                                ? (hoursBack === 0 ? 'Viewing: Last 7d' : `Viewing: 7d ending ${hoursBack}h ago`)
                                : (hoursBack === 0 ? 'Viewing: Last 30d' : `Viewing: 30d ending ${hoursBack}h ago`)}
                          </span>
                          <span>Now</span>
                        </div>
                        <Slider
                          // Render right-to-left: right = now (0h back), left = oldest buffer
                          value={[
                            (selectedPeriod === '24h' ? 144 : selectedPeriod === '7d' ? 23 * 24 : 335 * 24) - hoursBack
                          ]}
                          min={0}
                          max={selectedPeriod === '24h' ? 144 : selectedPeriod === '7d' ? 23 * 24 : 335 * 24}
                          step={1}
                          onValueChange={(v) => {
                            const max = selectedPeriod === '24h' ? 144 : selectedPeriod === '7d' ? 23 * 24 : 335 * 24;
                            const next = max - (v[0] ?? max);
                            setHoursBack(next);
                          }}
                          className="select-none"
                          trackClassName="h-1.5"
                          rangeClassName="bg-transparent"
                          thumbClassName="h-4 w-10 rounded-md"
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {machineManagement ? (
              <>
                <NotificationRecipientsPanel machineId={machine.id} machineName={machine.name} />
                <AlertThresholdsEditor machineId={machine.id} machineType={machine.type} />
                <MachineOnSiteSetup
                  machineId={machine.id}
                  machineApiKey={machine.apiKey ?? null}
                  onKeysUpdated={refreshMachineApiKeyFromDb}
                />
              </>
            ) : (
              <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                View-only access. Alert settings, notification recipients, and ESP setup are managed by your installer.
              </p>
            )}
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
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};

export default MachineDetailView;

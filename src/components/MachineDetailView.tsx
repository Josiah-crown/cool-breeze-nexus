import React, { useEffect, useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { toast as sonnerToast } from 'sonner';
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

const MachineDetailView: React.FC<MachineDetailViewProps> = ({ 
  machine, 
  historicalData,
  onClose 
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('24h');
  const [editingSetpoint, setEditingSetpoint] = useState(false);
  const [newSetpoint, setNewSetpoint] = useState(machine.temperatureSetpoint?.toString() || '55');
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [newLocation, setNewLocation] = useState(machine.location || '');
  const [locationFallback, setLocationFallback] = useState<string | null>(null);

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
    const size = 'w-[480px] h-[480px]';
    switch (machine.type) {
      case 'evaporative':
        return <FanComponent isSpinning={machine.fanActive} size={size} />;
      case 'heatpump':
        return <HeatPumpComponent isActive={machine.isOn} size={size} />;
      case 'airconditioner':
        return <AirConditionerComponent isActive={machine.isCooling} size={size} />;
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

  const formatChartData = () => {
    const motorTempData = historicalData.motorTemp || [];
    const currentData = historicalData.current || [];
    const outsideTempData = historicalData.outsideTemp || [];
    const insideTempData = historicalData.insideTemp || [];
    const deltaTData = historicalData.deltaT || [];
    const fanActiveData = historicalData.fanActive || [];
    const isCoolingData = historicalData.isCooling || [];
    const hasWaterData = historicalData.hasWater || [];
    
    // Combine all datasets with matching timestamps
    const combinedData = motorTempData.map((tempPoint, index) => {
      const date = new Date(tempPoint.timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      const fanOn = fanActiveData[index]?.value || 0;
      const coolOn = isCoolingData[index]?.value || 0;
      const waterOn = hasWaterData[index]?.value || 0;
      
      return {
        time: `${hours}:${minutes}`,
        motorTemp: parseFloat(tempPoint.value.toFixed(1)),
        current: currentData[index] ? parseFloat(currentData[index].value.toFixed(1)) : 0,
        outsideTemp: outsideTempData[index] ? parseFloat(outsideTempData[index].value.toFixed(1)) : 0,
        insideTemp: insideTempData[index] ? parseFloat(insideTempData[index].value.toFixed(1)) : 0,
        deltaT: deltaTData[index] ? parseFloat(deltaTData[index].value.toFixed(1)) : 0,
        fanActive: fanOn > 0 ? 30 : null,
        isCooling: coolOn > 0 ? 30 : null,
        fanAndCool: (fanOn > 0 && coolOn > 0) ? 30 : null,
        hasWater: waterOn > 0 ? 20 : null,
        fanStatus: fanOn > 0 ? 'ON' : 'OFF',
        coolStatus: coolOn > 0 ? 'ON' : 'OFF',
        waterStatus: waterOn > 0 ? 'FULL' : 'EMPTY'
      };
    });
    
    return combinedData;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border-2 border-accent p-3 rounded-lg shadow-lg">
          <p className="text-accent font-semibold mb-2">{data.time}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Delta T:</span>
              <span className="font-semibold text-foreground">{data.deltaT}°C</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Motor Temp:</span>
              <span className="font-semibold text-foreground">{data.motorTemp}°C</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Ambient Temp:</span>
              <span className="font-semibold text-foreground">{data.outsideTemp}°C</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Duct Temp:</span>
              <span className="font-semibold text-foreground">{data.insideTemp}°C</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Motor Amps:</span>
              <span className="font-semibold text-foreground">{data.current}A</span>
            </div>
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
                <span className="text-muted-foreground">Water:</span>
                <span className={`font-semibold ${data.waterStatus === 'FULL' ? 'text-green-500' : 'text-muted-foreground'}`}>{data.waterStatus}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

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
        className="fixed top-4 right-4 z-[60] w-14 h-14 rounded-full bg-white hover:bg-green-50 text-green-500 border-2 border-green-500 shadow-lg hover:scale-110 transition-all"
      >
        <X className="h-8 w-8" />
      </Button>
      
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-card border-[3px] border-accent">
        <CardHeader className="flex flex-row items-center justify-between border-b-[3px] border-accent hud-header">
          <div>
            <CardTitle className="text-2xl text-accent">{machine.name}</CardTitle>
              {(machine.location || locationFallback) && (
                <p className="text-sm text-muted-foreground mt-1">
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
              className="p-0 h-auto text-xs"
            >
              Change Location
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Machine Visual & API Key - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
              <div className="flex justify-center items-start">
                {getMachineComponent()}
              </div>
              <div>
                <ApiKeyManager machineId={machine.id} mode="assign" />
              </div>
            </div>
            
            {/* System Status & Current Readings - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* System Status */}
              <Card className="bg-card h-full border-[3px] border-accent">
                <CardHeader className="border-b-[3px] border-accent">
                  <CardTitle className="text-lg text-accent">System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <StatusLight status={machine.isOn ? 'active' : 'inactive'} label="Power" />
                  
                  {machine.type === 'evaporative' && (
                    <>
                      <StatusLight status={machine.fanActive ? 'active' : 'inactive'} label="Fan" />
                      <StatusLight status={machine.isCooling ? 'active' : 'inactive'} label="Cooling" />
                      <StatusLight status={machine.hasWater ? 'active' : 'error'} label="Water Level" />
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
                      <StatusLight status={machine.hasPump ? 'active' : 'inactive'} label="Pump" />
                      <StatusLight status={machine.hasHeat ? 'active' : 'inactive'} label="Heat" />
                    </>
                  )}
                  
                  <StatusLight
                    status={
                      machine.motorTemp < 70 ? 'active' :
                      machine.motorTemp < 80 ? 'warning' : 'error'
                    }
                    label={machine.type === 'heatpump' ? 'Compressor Status' : 'Motor Status'}
                  />
                </CardContent>
              </Card>

              {/* Current Readings */}
              <Card className="bg-card h-full border-[3px] border-accent">
                <CardHeader className="border-b-[3px] border-accent">
                  <CardTitle className="text-lg text-accent">Current Readings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{labels.outside}:</span>
                    <span className="font-semibold text-foreground">{machine.outsideTemp.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{labels.inside}:</span>
                    <span className="font-semibold text-foreground">{machine.insideTemp.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{labels.motor}:</span>
                    <span className="font-semibold text-foreground">{machine.motorTemp.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delta T:</span>
                    <span className="font-semibold text-accent">{machine.deltaT.toFixed(1)}°C</span>
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
                    <span className="font-semibold text-foreground">{machine.voltage.toFixed(1)}V</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{labels.current}:</span>
                    <span className="font-semibold text-foreground">{machine.current.toFixed(2)}A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Power:</span>
                    <span className="font-semibold text-primary">{machine.power.toFixed(1)}W</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Historical Graph */}
            <Card className="bg-card border-[3px] border-accent">
              <CardHeader className="border-b-[3px] border-accent flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-accent">Historical Data</CardTitle>
                <div className="flex gap-2">
                  {(['24h', '7d', '30d', '1y'] as Period[]).map(period => (
                    <Button
                      key={period}
                      size="sm"
                      variant={selectedPeriod === period ? 'default' : 'outline'}
                      onClick={() => setSelectedPeriod(period)}
                      className={`min-w-[60px] border-[3px] ${
                        selectedPeriod === period 
                          ? 'border-accent bg-accent text-accent-foreground' 
                          : 'border-accent bg-background text-accent hover:bg-accent/10'
                      }`}
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={formatChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      yAxisId="temp"
                      stroke="hsl(var(--muted-foreground))" 
                      label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
                      domain={[0, 120]}
                    />
                    <YAxis 
                      yAxisId="current"
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))" 
                      label={{ value: `Current (A)`, angle: 90, position: 'insideRight' }}
                      domain={[0, 40]}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    {/* Free Flow Lines */}
                    <Line 
                      yAxisId="temp"
                      type="monotone" 
                      dataKey="outsideTemp" 
                      name="Ambient Temp"
                      stroke="#000000" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      yAxisId="temp"
                      type="monotone" 
                      dataKey="motorTemp" 
                      name="Motor Temp"
                      stroke="#EAB308" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      yAxisId="temp"
                      type="monotone" 
                      dataKey="insideTemp" 
                      name="Duct Temp"
                      stroke="#F97316" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      yAxisId="current"
                      type="monotone" 
                      dataKey="current" 
                      name="Motor Amps"
                      stroke="#EC4899" 
                      strokeWidth={2}
                      dot={false}
                    />
                    
                    {/* ON/OFF State Lines */}
                    <Line 
                      yAxisId="temp"
                      type="stepAfter" 
                      dataKey="fanActive" 
                      name="Fan"
                      stroke="#EF4444" 
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line 
                      yAxisId="temp"
                      type="stepAfter" 
                      dataKey="isCooling" 
                      name="Cool"
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line 
                      yAxisId="temp"
                      type="stepAfter" 
                      dataKey="fanAndCool" 
                      name="Fan+Cool"
                      stroke="#9333EA" 
                      strokeWidth={4}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line 
                      yAxisId="temp"
                      type="stepAfter" 
                      dataKey="hasWater" 
                      name="Tank"
                      stroke="#4B5563" 
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                    />
                    
                    {/* Setpoint Reference Line for Heat Pump */}
                    {machine.type === 'heatpump' && machine.temperatureSetpoint && (
                      <ReferenceLine 
                        yAxisId="temp"
                        y={machine.temperatureSetpoint} 
                        stroke="hsl(var(--accent))" 
                        strokeDasharray="5 5"
                        label="Setpoint"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
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
        <AlertDialogContent className="bg-card border-[3px] border-accent">
          <AlertDialogHeader className="border-b-[3px] border-accent pb-4">
            <AlertDialogTitle className="text-xl text-accent">Change Machine Location</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              Are you sure you want to change the location information for this machine?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="location" className="text-accent font-semibold">New Location</Label>
            <Input
              id="location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="Enter machine location"
              className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all text-foreground"
            />
          </div>
          <AlertDialogFooter className="border-t-[3px] border-accent pt-4">
            <AlertDialogCancel className="border-[3px] border-accent">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLocationUpdate}
              className="bg-accent hover:bg-accent/90 text-accent-foreground border-[3px] border-accent"
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

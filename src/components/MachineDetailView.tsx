import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MachineStatus, MachineHistoricalData } from '@/types/machine';
import StatusLight from './StatusLight';
import FanComponent from './FanComponent';
import HeatPumpComponent from './HeatPumpComponent';
import AirConditionerComponent from './AirConditionerComponent';
import ApiKeyManager from './ApiKeyManager';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface MachineDetailViewProps {
  machine: MachineStatus;
  historicalData: MachineHistoricalData;
  onClose: () => void;
}

const MachineDetailView: React.FC<MachineDetailViewProps> = ({ 
  machine, 
  historicalData,
  onClose 
}) => {
  const getMachineComponent = () => {
    const size = 'w-80 h-80';
    switch (machine.type) {
      case 'fan':
        return <FanComponent isSpinning={machine.fanActive} size={size} />;
      case 'heatpump':
        return <HeatPumpComponent isActive={machine.isOn} size={size} />;
      case 'airconditioner':
        return <AirConditionerComponent isActive={machine.isCooling} size={size} />;
    }
  };

  const formatChartData = (data: { timestamp: number; value: number }[]) => {
    return data.map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString(),
      value: d.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-card">
        <CardHeader className="flex flex-row items-center justify-between border-b-[10px] border-accent/70 hud-header">
          <CardTitle className="text-2xl text-accent">{machine.name}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6 text-accent" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Machine Visual & Status */}
            <div className="space-y-6 lg:col-span-2">
              <div className="flex justify-center">
                {getMachineComponent()}
              </div>
              
              <Card className="bg-card">
                <CardHeader className="border-b-[10px] border-accent/70">
                  <CardTitle className="text-lg text-accent">System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatusLight status={machine.isOn ? 'active' : 'inactive'} label="Power" />
                  <StatusLight status={machine.hasWater ? 'active' : 'error'} label="Water Level" />
                  <StatusLight status={machine.isCooling ? 'active' : 'inactive'} label="Cooling Active" />
                  <StatusLight status={machine.fanActive ? 'active' : 'inactive'} label="Fan Running" />
                  <StatusLight
                    status={
                      machine.motorTemp < 70 ? 'active' :
                      machine.motorTemp < 80 ? 'warning' : 'error'
                    }
                    label="Motor Status"
                  />
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader className="border-b-[10px] border-accent/70">
                  <CardTitle className="text-lg text-accent">Current Readings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outside Temp:</span>
                    <span className="font-semibold text-foreground">{machine.outsideTemp.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inside Temp:</span>
                    <span className="font-semibold text-foreground">{machine.insideTemp.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Motor Temp:</span>
                    <span className="font-semibold text-foreground">{machine.motorTemp.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delta T:</span>
                    <span className="font-semibold text-accent">{machine.deltaT.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Voltage:</span>
                    <span className="font-semibold text-foreground">{machine.voltage.toFixed(1)}V</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-semibold text-foreground">{machine.current.toFixed(2)}A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Power:</span>
                    <span className="font-semibold text-primary">{machine.power.toFixed(1)}W</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Historical Charts & API Keys */}
            <div className="space-y-6">
              {/* API Key Management */}
              <ApiKeyManager machineId={machine.id} mode="assign" />
              {/* Power Usage Chart */}
              {machine.isOn && (
                <Card className="bg-card">
                  <CardHeader className="border-b-[10px] border-accent/70">
                    <CardTitle className="text-lg text-accent">Electrical Usage History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={formatChartData(historicalData.power)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Delta T Chart */}
              {machine.isCooling && (
                <Card className="bg-card">
                  <CardHeader className="border-b-[10px] border-accent/70">
                    <CardTitle className="text-lg text-accent">Delta T Efficiency History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={formatChartData(historicalData.deltaT)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--accent))" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Motor Temperature Chart */}
              <Card className="bg-card">
                <CardHeader className="border-b-[10px] border-accent/70">
                  <CardTitle className="text-lg text-accent">Motor Temperature History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={formatChartData(historicalData.motorTemp)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--warning))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MachineDetailView;

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MachineStatus, MachineHistoricalData } from '@/types/machine';
import StatusLight from './StatusLight';
import FanComponent from './FanComponent';
import HeatPumpComponent from './HeatPumpComponent';
import AirConditionerComponent from './AirConditionerComponent';
import CircularGauge from './CircularGauge';
import PowerBar from './PowerBar';
import MetricDisplay from './MetricDisplay';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Zap, Thermometer, Wind, Droplet } from 'lucide-react';
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
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-panel to-card">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <CardTitle className="text-2xl text-foreground">{machine.name}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Machine Visual & Gauges */}
            <div className="space-y-6">
              <div className="flex justify-center">
                {getMachineComponent()}
              </div>
              
              {/* Circular Gauges */}
              <div className="grid grid-cols-2 gap-4">
                <CircularGauge
                  value={machine.motorTemp}
                  max={100}
                  label="Motor Temp"
                  unit="°C"
                  size={140}
                  warningThreshold={0.7}
                  criticalThreshold={0.85}
                />
                <CircularGauge
                  value={machine.deltaT}
                  max={20}
                  label="Delta T"
                  unit="°C"
                  size={140}
                  warningThreshold={0.8}
                  criticalThreshold={0.95}
                />
              </div>

              {/* Power Bar */}
              <PowerBar
                value={machine.power / 1000}
                max={2}
                label="Power"
                unit="kW"
              />
              
              {/* Status Lights */}
              <Card className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))]">
                <CardHeader>
                  <CardTitle className="text-lg">System Status</CardTitle>
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
            </div>

            {/* Right: Metrics & Charts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <MetricDisplay
                  label="Outside"
                  value={machine.outsideTemp}
                  unit="°C"
                  icon={Thermometer}
                />
                <MetricDisplay
                  label="Inside"
                  value={machine.insideTemp}
                  unit="°C"
                  icon={Thermometer}
                />
                <MetricDisplay
                  label="Voltage"
                  value={machine.voltage}
                  unit="V"
                  icon={Zap}
                  highlight
                />
                <MetricDisplay
                  label="Current"
                  value={machine.current}
                  unit="A"
                  icon={Zap}
                />
                <MetricDisplay
                  label="Speed"
                  value={machine.fanActive ? "240" : "0"}
                  unit="rpm"
                  icon={Wind}
                />
                <MetricDisplay
                  label="Water"
                  value={machine.hasWater ? "OK" : "LOW"}
                  icon={Droplet}
                />
              </div>
              {/* Power Usage Chart */}
              {machine.isOn && (
                <Card className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))]">
                  <CardHeader>
                    <CardTitle className="text-lg">Electrical Usage History</CardTitle>
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
                <Card className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))]">
                  <CardHeader>
                    <CardTitle className="text-lg">Delta T Efficiency History</CardTitle>
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
              <Card className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))]">
                <CardHeader>
                  <CardTitle className="text-lg">Motor Temperature History</CardTitle>
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

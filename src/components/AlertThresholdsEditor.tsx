import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, Thermometer, Zap, Clock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertConfig {
  id?: string;
  machine_id: string;
  motor_temp_warning: number;
  motor_temp_critical: number;
  compressor_temp_critical: number;
  motor_amps_warning: number;
  compressor_amps_warning: number;
  delta_t_min_cooling: number;
  delta_t_min_heating: number;
  delta_t_max_heating: number;
  setpoint_tolerance: number;
  duration_motor_temp_critical: number;
  duration_cooling_ineffective: number;
  duration_fan_failure: number;
  duration_motor_overcurrent: number;
  duration_low_water: number;
  duration_dump_valve: number;
  duration_pump_failure: number;
  duration_heating_failure: number;
  duration_heating_excessive: number;
  duration_setpoint_deviation: number;
  reminder_interval_hours: number;
  send_recovery_emails: boolean;
}

interface AlertThresholdsEditorProps {
  machineId: string;
  machineType: 'evaporative' | 'airconditioner' | 'heatpump';
}

export const AlertThresholdsEditor: React.FC<AlertThresholdsEditorProps> = ({ machineId, machineType }) => {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [machineId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_alert_config')
        .select('*')
        .eq('machine_id', machineId)
        .single();

      if (error) throw error;
      setConfig(data);
    } catch (error: any) {
      console.error('Error fetching alert config:', error);
      toast.error('Failed to load alert configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('machine_alert_config')
        .update({
          motor_temp_warning: config.motor_temp_warning,
          motor_temp_critical: config.motor_temp_critical,
          compressor_temp_critical: config.compressor_temp_critical,
          motor_amps_warning: config.motor_amps_warning,
          compressor_amps_warning: config.compressor_amps_warning,
          delta_t_min_cooling: config.delta_t_min_cooling,
          delta_t_min_heating: config.delta_t_min_heating,
          delta_t_max_heating: config.delta_t_max_heating,
          setpoint_tolerance: config.setpoint_tolerance,
          duration_motor_temp_critical: config.duration_motor_temp_critical,
          duration_cooling_ineffective: config.duration_cooling_ineffective,
          duration_fan_failure: config.duration_fan_failure,
          duration_motor_overcurrent: config.duration_motor_overcurrent,
          duration_low_water: config.duration_low_water,
          duration_dump_valve: config.duration_dump_valve,
          duration_pump_failure: config.duration_pump_failure,
          duration_heating_failure: config.duration_heating_failure,
          duration_heating_excessive: config.duration_heating_excessive,
          duration_setpoint_deviation: config.duration_setpoint_deviation,
          reminder_interval_hours: config.reminder_interval_hours,
          send_recovery_emails: config.send_recovery_emails,
          updated_at: new Date().toISOString()
        })
        .eq('machine_id', machineId);

      if (error) throw error;
      toast.success('Alert thresholds saved successfully!');
    } catch (error: any) {
      console.error('Error saving alert config:', error);
      toast.error('Failed to save alert thresholds');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-[3px] border-accent">
        <CardHeader className="border-b-[3px] border-accent">
          <CardTitle className="text-lg flex items-center gap-2 text-accent">
            <AlertTriangle className="h-5 w-5" />
            Alert Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-center text-muted-foreground">
          Loading configuration...
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className="bg-card border-[3px] border-accent">
        <CardHeader className="border-b-[3px] border-accent">
          <CardTitle className="text-lg flex items-center gap-2 text-accent">
            <AlertTriangle className="h-5 w-5" />
            Alert Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-center text-destructive">
          Failed to load configuration
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-[3px] border-accent">
      <CardHeader className="border-b-[3px] border-accent py-3">
        <CardTitle className="text-lg flex items-center gap-2 text-accent">
          <AlertTriangle className="h-5 w-5" />
          Alert Thresholds
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Customize when this machine triggers alerts. Each alert has its own threshold + duration.
        </p>
      </CardHeader>
      <CardContent className="p-3">
        {/* 2-Column Grid on Wide Screens */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:divide-x xl:divide-accent/30">
          {/* LEFT COLUMN */}
          <div className="space-y-3 xl:pr-4">
            {/* TEMPERATURE ALERTS */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                Temperature Alerts
              </div>
              <Separator className="my-1" />
          
          {(machineType === 'evaporative' || machineType === 'airconditioner') && (
            <div className="space-y-1.5">
              {/* Motor Temp Critical */}
              <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
                <Label htmlFor="motor_temp_critical" className="text-xs self-center">
                  🔴 Motor Overheating (Critical)
                </Label>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Temp (°C)</p>
                  <Input
                    id="motor_temp_critical"
                    type="number"
                    step="1"
                    value={config.motor_temp_critical}
                    onChange={(e) => setConfig({ ...config, motor_temp_critical: parseFloat(e.target.value) })}
                    className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                  <Input
                    type="number"
                    value={config.duration_motor_temp_critical}
                    onChange={(e) => setConfig({ ...config, duration_motor_temp_critical: parseInt(e.target.value) })}
                    className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                  />
                </div>
              </div>
            </div>
          )}
          
          {machineType === 'heatpump' && (
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
              <Label htmlFor="compressor_temp_critical" className="text-xs self-center">
                🔴 Compressor Overheating (Critical)
              </Label>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Temp (°C)</p>
                <Input
                  id="compressor_temp_critical"
                  type="number"
                  step="1"
                  value={config.compressor_temp_critical}
                  onChange={(e) => setConfig({ ...config, compressor_temp_critical: parseFloat(e.target.value) })}
                  className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                <Input
                  type="number"
                  value={config.duration_motor_temp_critical}
                  onChange={(e) => setConfig({ ...config, duration_motor_temp_critical: parseInt(e.target.value) })}
                  className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                />
              </div>
            </div>
              )}
            </div>

            {/* CURRENT ALERTS */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                Current Alerts
              </div>
              <Separator className="my-1" />
          
          <div className="space-y-1.5">
            {/* Motor/Compressor Overcurrent */}
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
              <Label className="text-xs self-center">
                🟡 {machineType === 'evaporative' ? 'Motor' : 'Compressor'} Overcurrent (Warning)
              </Label>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Amps (A)</p>
                <Input
                  type="number"
                  step="1"
                  value={machineType === 'evaporative' ? config.motor_amps_warning : config.compressor_amps_warning}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    [machineType === 'evaporative' ? 'motor_amps_warning' : 'compressor_amps_warning']: parseFloat(e.target.value) 
                  })}
                  className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                <Input
                  type="number"
                  value={config.duration_motor_overcurrent}
                  onChange={(e) => setConfig({ ...config, duration_motor_overcurrent: parseInt(e.target.value) })}
                  className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                />
              </div>
            </div>

            {/* Fan Failure */}
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
              <Label className="text-xs self-center">
                🔴 Fan Failure (No Current)
              </Label>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Amps (A)</p>
                <Input
                  type="number"
                  value="0"
                  disabled
                  className="h-8 text-sm border-2 border-accent bg-muted/20 px-2 text-muted-foreground"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                <Input
                  type="number"
                  value={config.duration_fan_failure}
                  onChange={(e) => setConfig({ ...config, duration_fan_failure: parseInt(e.target.value) })}
                  className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                />
              </div>
            </div>
            {/* End Fan Failure */}
          </div>
          {/* End space-y-1.5 for Current Alerts */}
        </div>
        {/* End CURRENT ALERTS */}
      </div>
      {/* END LEFT COLUMN */}

      {/* RIGHT COLUMN */}
      <div className="space-y-3 xl:pl-4">
        {/* EFFICIENCY ALERTS (Delta T) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
            <Thermometer className="h-3.5 w-3.5 text-blue-500" />
            Efficiency Alerts (Delta T)
          </div>
          <Separator className="my-1" />
          
          <div className="space-y-1.5">
            {/* Ineffective Cooling/Heating */}
            {(machineType === 'evaporative' || machineType === 'airconditioner') && (
              <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
                <Label className="text-xs self-center">
                  🟡 Ineffective Cooling (Warning)
                </Label>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Min ΔT (°C)</p>
                  <Input
                    type="number"
                    step="0.5"
                    value={config.delta_t_min_cooling}
                    onChange={(e) => setConfig({ ...config, delta_t_min_cooling: parseFloat(e.target.value) })}
                    className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                  <Input
                    type="number"
                    value={config.duration_cooling_ineffective}
                    onChange={(e) => setConfig({ ...config, duration_cooling_ineffective: parseInt(e.target.value) })}
                    className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                  />
                </div>
              </div>
            )}
            
            {machineType === 'heatpump' && (
              <>
                <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
                  <Label className="text-xs self-center">
                    🟡 Ineffective Heating (Warning)
                  </Label>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Min ΔT (°C)</p>
                    <Input
                      type="number"
                      step="0.5"
                      value={config.delta_t_min_heating}
                      onChange={(e) => setConfig({ ...config, delta_t_min_heating: parseFloat(e.target.value) })}
                      className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                    <Input
                      type="number"
                      value={config.duration_heating_failure}
                      onChange={(e) => setConfig({ ...config, duration_heating_failure: parseInt(e.target.value) })}
                      className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
                  <Label className="text-xs self-center">
                    🟡 Excessive Heating (Delta T Too High)
                  </Label>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Max ΔT (°C)</p>
                    <Input
                      type="number"
                      step="0.5"
                      value={config.delta_t_max_heating}
                      onChange={(e) => setConfig({ ...config, delta_t_max_heating: parseFloat(e.target.value) })}
                      className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                    <Input
                      type="number"
                      value={config.duration_heating_excessive}
                      onChange={(e) => setConfig({ ...config, duration_heating_excessive: parseInt(e.target.value) })}
                      className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
                  <Label className="text-xs self-center">
                    🔵 Setpoint Not Reached (Info)
                  </Label>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Tolerance (±°C)</p>
                    <Input
                      type="number"
                      step="0.5"
                      value={config.setpoint_tolerance}
                      onChange={(e) => setConfig({ ...config, setpoint_tolerance: parseFloat(e.target.value) })}
                      className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                    <Input
                      type="number"
                      value={config.duration_setpoint_deviation}
                      onChange={(e) => setConfig({ ...config, duration_setpoint_deviation: parseInt(e.target.value) })}
                      className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          {/* End space-y-1.5 for Efficiency Alerts */}
        </div>
        {/* End EFFICIENCY ALERTS */}

        {/* WATER SYSTEM ALERTS (Evaporative Cooler Only) */}
        {machineType === 'evaporative' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
                  <svg className="h-3.5 w-3.5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78.165 1.626.942 1.875.777.25 1.626-.165 1.875-.942l.818-2.552c.25-.78-.165-1.626-.942-1.875-.777-.25-1.626.165-1.875.942zM15 13a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Water System Alerts
                </div>
            <Separator className="my-1" />
            
            <div className="space-y-1.5">
              {/* Low Water */}
              <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
                <Label className="text-xs self-center">
                  🟡 Low Water While Cooling (Warning)
                </Label>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Tank Level</p>
                  <Input
                    type="text"
                    value="< Full"
                    disabled
                    className="h-8 text-sm border-2 border-accent bg-muted/20 px-2 text-muted-foreground"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                  <Input
                    type="number"
                    value={config.duration_low_water}
                    onChange={(e) => setConfig({ ...config, duration_low_water: parseInt(e.target.value) })}
                    className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                  />
                </div>
              </div>

              {/* Dump Valve Stuck */}
              <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
                <Label className="text-xs self-center">
                  🟡 Dump Valve Stuck Closed (Warning)
                </Label>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Valve State</p>
                  <Input
                    type="text"
                    value="OFF"
                    disabled
                    className="h-8 text-sm border-2 border-accent bg-muted/20 px-2 text-muted-foreground"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                  <Input
                    type="number"
                    value={config.duration_dump_valve}
                    onChange={(e) => setConfig({ ...config, duration_dump_valve: parseInt(e.target.value) })}
                    className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                  />
                </div>
              </div>

              {/* Pump Failure */}
              <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-end">
                <Label className="text-xs self-center">
                  🟡 Pump Not Running (Warning)
                </Label>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Pump State</p>
                  <Input
                    type="text"
                    value="OFF"
                    disabled
                    className="h-8 text-sm border-2 border-accent bg-muted/20 px-2 text-muted-foreground"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">After (min)</p>
                  <Input
                    type="number"
                    value={config.duration_pump_failure}
                    onChange={(e) => setConfig({ ...config, duration_pump_failure: parseInt(e.target.value) })}
                    className="h-8 text-sm border-2 border-accent bg-accent/10 px-2"
                  />
                </div>
            </div>
            {/* End Pump Failure */}
          </div>
        </div>
      )}
      </div>
      {/* END RIGHT COLUMN */}
    </div>
    {/* END 2-COLUMN GRID */}

    {/* EMAIL SETTINGS (Full Width at Bottom) */}
    <div className="space-y-3 pt-4 mt-4 border-t-2 border-accent/30">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase">
        <Mail className="h-3.5 w-3.5 text-accent" />
        Email Notification Settings
      </div>
      <Separator className="my-1" />
      
      {/* Reminder Interval */}
      <div className="bg-accent/5 border-2 border-accent rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label className="text-sm font-medium">⏰ Reminder Emails</Label>
            <p className="text-xs text-muted-foreground mt-1">
              If an alert is still active, re-send email every:
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={config.reminder_interval_hours}
              onChange={(e) => setConfig({ ...config, reminder_interval_hours: parseInt(e.target.value) })}
              className="h-8 w-16 text-sm border-2 border-accent bg-background px-2 text-center"
            />
            <span className="text-xs text-muted-foreground">hours</span>
          </div>
        </div>
      </div>
      
      {/* Recovery Emails */}
      <div className="bg-accent/5 border-2 border-border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label htmlFor="send_recovery_emails" className="text-sm font-medium cursor-pointer">
              ✅ "All Clear" Recovery Emails
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Send email when alert is resolved (e.g., motor cooled down)
            </p>
          </div>
          <Switch
            id="send_recovery_emails"
            checked={config.send_recovery_emails}
            onCheckedChange={(checked) => setConfig({ ...config, send_recovery_emails: checked })}
            className="scale-110"
          />
        </div>
      </div>
    </div>

    {/* Save Buttons */}
    <div className="flex justify-end gap-2 pt-2 border-t border-accent">
      <Button
        variant="outline"
        onClick={fetchConfig}
        disabled={saving}
        className="h-8 text-xs"
      >
        Reset
      </Button>
      <Button
        onClick={handleSave}
        disabled={saving}
        className="h-8 text-xs bg-accent text-accent-foreground border-2 border-accent hover:bg-accent/90"
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  </CardContent>
</Card>
);
};


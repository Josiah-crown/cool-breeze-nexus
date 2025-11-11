/**
 * Device Provisioning Component
 * 
 * Allows Super Admin to:
 * 1. Generate new device credentials
 * 2. Download custom Arduino .ino file
 * 3. View provisioned devices
 * 4. Track device status
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Download, Plus, RefreshCw, Copy, CheckCircle2, AlertCircle } from 'lucide-react';

interface Device {
  id: string;
  serial_number: string;
  api_key: string;
  device_name: string;
  status: string;
  manufactured_at: string;
  wifi_ap_name: string;
  wifi_ap_password: string;
}

interface Company {
  id: string;
  name: string;
}

export function DeviceProvisioning() {
  // State
  const [deviceName, setDeviceName] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string>('');
  
  // Generated device
  const [generatedDevice, setGeneratedDevice] = useState<Device | null>(null);

  // Load companies on mount
  useState(() => {
    loadCompanies();
    loadDevices();
  });

  async function loadCompanies() {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    
    if (data) setCompanies(data);
  }

  async function loadDevices() {
    const { data } = await supabase
      .from('device_provisioning_summary')
      .select('*')
      .order('manufactured_at', { ascending: false })
      .limit(20);
    
    if (data) setDevices(data);
  }

  async function generateDevice() {
    setLoading(true);
    
    try {
      // Call Supabase function to generate device
      const { data, error } = await supabase.rpc('create_provisioned_device', {
        p_device_name: deviceName || null,
        p_company_id: selectedCompany || null
      });

      if (error) throw error;

      // Refresh device list
      await loadDevices();
      
      // Set generated device
      setGeneratedDevice(data);
      
      // Clear form
      setDeviceName('');
      setSelectedCompany('');
      
    } catch (error) {
      console.error('Error generating device:', error);
      alert('Failed to generate device. See console for details.');
    } finally {
      setLoading(false);
    }
  }

  function downloadArduinoCode(device: Device) {
    // Generate Arduino code with pre-filled credentials
    const arduinoCode = generateArduinoCode(device);
    
    // Create blob and download
    const blob = new Blob([arduinoCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${device.serial_number}.ino`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Device Provisioning</h1>
          <p className="text-muted-foreground">Generate and manage HVAC monitoring devices</p>
        </div>
        <Button onClick={loadDevices} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Device</CardTitle>
          <CardDescription>
            Generate unique credentials for a new HVAC monitoring device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name (Optional)</Label>
              <Input
                id="deviceName"
                placeholder="e.g., Factory Floor AC Unit 3"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Assign to Company (Optional)</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger id="company">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={generateDevice} disabled={loading} className="w-full">
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Generate Device Credentials
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Device Result */}
      {generatedDevice && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Device Generated Successfully
            </CardTitle>
            <CardDescription>
              Download the Arduino code and upload to ESP32 device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Download the Arduino code now. You can also access it later from the device list below.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <div className="flex gap-2">
                  <Input value={generatedDevice.serial_number} readOnly />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedDevice.serial_number, 'serial')}
                  >
                    {copiedText === 'serial' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input value={generatedDevice.api_key} readOnly className="font-mono text-xs" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedDevice.api_key, 'api')}
                  >
                    {copiedText === 'api' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>WiFi AP Name</Label>
                <Input value={generatedDevice.wifi_ap_name} readOnly />
              </div>

              <div className="space-y-2">
                <Label>WiFi AP Password</Label>
                <Input value={generatedDevice.wifi_ap_password} readOnly />
              </div>
            </div>

            <Button onClick={() => downloadArduinoCode(generatedDevice)} className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Download Arduino Code (.ino)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Devices</CardTitle>
          <CardDescription>
            Last 20 provisioned devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Number</TableHead>
                <TableHead>Device Name</TableHead>
                <TableHead>WiFi Credentials</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Manufactured</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-mono text-sm">
                    {device.serial_number}
                  </TableCell>
                  <TableCell>{device.device_name || '—'}</TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div>AP: <span className="font-mono">{device.wifi_ap_name}</span></div>
                      <div>PW: <span className="font-mono">{device.wifi_ap_password}</span></div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                      {device.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(device.manufactured_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadArduinoCode(device)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Code
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// ARDUINO CODE GENERATOR
// ============================================

function generateArduinoCode(device: Device): string {
  // Get Supabase credentials from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

  return `/*
 * IoT Nexus HVAC Monitor - ESP32 Firmware
 * 
 * AUTO-GENERATED CODE - DO NOT MANUALLY EDIT CREDENTIALS
 * 
 * Device Information:
 * Serial Number: ${device.serial_number}
 * Generated: ${new Date().toISOString()}
 * 
 * WiFi Configuration Portal:
 * AP Name: ${device.wifi_ap_name}
 * AP Password: ${device.wifi_ap_password}
 * Configuration URL: http://192.168.4.1
 * 
 * IMPORTANT: Upload this code to the ESP32 device, then
 * connect to the WiFi AP above to configure the device's
 * WiFi credentials for your customer's network.
 */

// ===========================
// DEVICE CREDENTIALS
// ===========================

// CRITICAL: These values are unique to this device
const char* API_KEY = "${device.api_key}";
const char* SUPABASE_URL = "${supabaseUrl}";
const char* SUPABASE_ANON_KEY = "${supabaseAnonKey}";
const char* MACHINE_UUID = "${device.id}";

// ===========================
// REST OF FIRMWARE CODE
// ===========================

// Copy the entire hvac_monitor_wifi.ino code below this line
// (Everything after the configuration section)

// ... [rest of firmware code here] ...
`;
}

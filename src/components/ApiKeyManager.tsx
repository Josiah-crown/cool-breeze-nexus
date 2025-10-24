import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Copy, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  key: string;
  created_at: string;
  description: string | null;
  is_active: boolean;
}

interface ApiKeyManagerProps {
  machineId?: string;
  mode: 'admin' | 'assign';
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ machineId, mode }) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [pasteKey, setPasteKey] = useState('');

  useEffect(() => {
    fetchApiKeys();
  }, [machineId, mode]);

  const fetchApiKeys = async () => {
    try {
      let query = supabase.from('api_keys').select('*');
      
      if (mode === 'admin') {
        // Show unassigned keys for admin
        query = query.is('machine_id', null);
      } else if (machineId) {
        // Show keys assigned to this machine
        query = query.eq('machine_id', machineId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    try {
      const newKey = `esp32_${crypto.randomUUID().replace(/-/g, '')}`;
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('api_keys')
        .insert({
          key: newKey,
          machine_id: null, // Unassigned until pasted into machine
          created_by: user.id,
          description: description || null,
        });

      if (error) throw error;

      toast.success('API key generated successfully');
      setDescription('');
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate API key');
    }
  };

  const assignApiKey = async () => {
    if (!pasteKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    if (!machineId) {
      toast.error('No machine selected');
      return;
    }

    try {
      // Check if key exists and is unassigned
      const { data: existingKey, error: fetchError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key', pasteKey.trim())
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!existingKey) {
        toast.error('Invalid API key');
        return;
      }

      if (existingKey.machine_id) {
        toast.error('This API key is already assigned to another machine');
        return;
      }

      // Assign the key to this machine
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({ machine_id: machineId })
        .eq('id', existingKey.id);

      if (updateError) throw updateError;

      toast.success('API key assigned successfully');
      setPasteKey('');
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign API key');
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('API key deleted');
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete API key');
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const maskKey = (key: string) => {
    return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
  };

  if (mode === 'assign') {
    // Machine detail view - paste and assign mode
    return (
      <Card className="bg-white border-[15px] border-accent/70">
        <CardHeader className="border-b-[15px] border-accent/70">
          <CardTitle className="text-lg text-accent">ESP32 Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Input
              placeholder="Paste API Key here"
              value={pasteKey}
              onChange={(e) => setPasteKey(e.target.value)}
              className="bg-background text-foreground font-mono text-sm"
            />
            <Button onClick={assignApiKey} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Assign API Key to Machine
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API key assigned yet</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-accent">Assigned Key:</p>
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="flex items-center gap-2 p-2 bg-background rounded border border-accent/20">
                  <code className="flex-1 text-xs font-mono text-accent break-all">
                    {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleKeyVisibility(apiKey.id)}
                  >
                    {visibleKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(apiKey.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded">
            <p className="font-semibold text-accent">ESP32 Implementation:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Include API key in HTTP header: <code className="bg-background px-1">X-API-Key: your_key</code></li>
              <li>Send data to: <code className="bg-background px-1">POST /machines/update</code></li>
              <li>Get your API key from the super admin dashboard</li>
              <li>Store securely in ESP32 EEPROM or SPIFFS</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Admin mode - generate and manage unassigned keys
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-background text-foreground"
        />
        <Button onClick={generateApiKey} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Generate New API Key
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : apiKeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No unassigned API keys</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Unassigned Keys:</p>
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="flex items-center gap-2 p-3 bg-card rounded border border-border">
              <div className="flex-1">
                <code className="text-xs font-mono break-all text-foreground">
                  {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                </code>
                {apiKey.description && (
                  <p className="text-xs text-muted-foreground mt-1">{apiKey.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleKeyVisibility(apiKey.id)}
              >
                {visibleKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(apiKey.key)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteApiKey(apiKey.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;

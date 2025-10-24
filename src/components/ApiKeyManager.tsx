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
  machineId: string;
  showInDetailView?: boolean;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ machineId, showInDetailView = false }) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchApiKeys();
  }, [machineId]);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false });

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
          machine_id: machineId,
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

  if (showInDetailView) {
    return (
      <Card className="bg-white border-[15px] border-accent/70">
        <CardHeader className="border-b-[15px] border-accent/70">
          <CardTitle className="text-lg text-accent">ESP32 API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background text-foreground"
            />
            <Button onClick={generateApiKey} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Generate New API Key
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys generated yet</p>
          ) : (
            <div className="space-y-2">
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

          <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded">
            <p className="font-semibold text-accent">ESP32 Implementation Rules:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Include API key in HTTP header: <code className="bg-background px-1">X-API-Key: your_key</code></li>
              <li>Send data to: <code className="bg-background px-1">POST /machines/update</code></li>
              <li>Keys are per-machine and cannot be shared</li>
              <li>Store securely in ESP32 EEPROM or SPIFFS</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Super admin dashboard view
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button onClick={generateApiKey} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Generate API Key for Machine
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : apiKeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No API keys for this machine</p>
      ) : (
        <div className="space-y-2">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="flex items-center gap-2 p-2 bg-card rounded border border-border">
              <code className="flex-1 text-xs font-mono break-all">
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

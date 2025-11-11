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

  // Fallback UUID generator for non-secure contexts (http://IP:port)
  const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      // Modern browsers in secure context
      return crypto.randomUUID();
    } else {
      // Fallback for non-secure contexts
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };

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
      const newKey = `esp32_${generateUUID().replace(/-/g, '')}`;
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
      
      // Reload page to refresh all API key lists
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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

      // First, unassign any old API key from this machine
      const { error: unassignError } = await supabase
        .from('api_keys')
        .update({ machine_id: null })
        .eq('machine_id', machineId);

      if (unassignError) throw unassignError;

      // Assign the new key to this machine in api_keys table
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({ machine_id: machineId })
        .eq('id', existingKey.id);

      if (updateError) throw updateError;

      // Also update the machines table with the API key
      const { error: machineUpdateError } = await supabase
        .from('machines')
        .update({ api_key: existingKey.key })
        .eq('id', machineId);

      if (machineUpdateError) throw machineUpdateError;

      toast.success('API key assigned successfully');
      setPasteKey('');
      fetchApiKeys();
      
      // Reload page to refresh all API key lists
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
      
      // Reload page to refresh all API key lists
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete API key');
    }
  };

  const copyToClipboard = async (key: string) => {
    try {
      // Try modern clipboard API first (requires secure context)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(key);
        toast.success('API key copied to clipboard');
      } else {
        // Fallback for non-secure contexts (http://IP:port)
        const textarea = document.createElement('textarea');
        textarea.value = key;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
          toast.success('API key copied to clipboard');
        } else {
          toast.error('Failed to copy. Please copy manually.');
        }
      }
    } catch (error) {
      toast.error('Failed to copy. Please copy manually.');
    }
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
      <Card className="bg-card border-[3px] border-accent">
        <CardHeader className="border-b-[3px] border-accent">
          <CardTitle className="text-lg text-accent">ESP32 Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Input
              placeholder="Paste API Key here"
              value={pasteKey}
              onChange={(e) => setPasteKey(e.target.value)}
              className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all text-foreground font-mono text-sm"
            />
            <Button onClick={assignApiKey} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Assign API Key to Machine
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : apiKeys.length === 0 ? (
            <div className="border-2 border-yellow-500/50 bg-yellow-500/10 rounded-lg p-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">No API Key Assigned</p>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                This machine cannot receive data from ESP32 until you assign an API key.
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                Generate a key in the admin panel, then paste it above.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-accent">Assigned Key:</p>
              </div>
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-background rounded border border-accent/20">
                    <code className="flex-1 text-xs font-mono text-accent break-all">
                      {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      title={visibleKeys.has(apiKey.id) ? "Hide key" : "Show key"}
                    >
                      {visibleKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(apiKey.key)}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy API Key
                  </Button>
                </div>
              ))}
              
              {/* Machine UUID - For ESP32 Configuration */}
              <div className="mt-4 pt-4 border-t border-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-accent">Machine UUID:</p>
                </div>
                <div className="flex items-center gap-2 p-2 bg-background rounded border border-accent/20">
                  <code className="flex-1 text-xs font-mono text-accent break-all">
                    {machineId}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(machineId || '')}
                    title="Copy UUID"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use this UUID when configuring your ESP32 device
                </p>
              </div>
            </div>
          )}

          <div className="text-xs space-y-1 bg-accent/10 border border-accent/20 p-3 rounded">
            <p className="font-semibold text-accent">ESP32 Implementation:</p>
            <ul className="list-disc list-inside space-y-1 text-foreground">
              <li>Include API key in HTTP header: <code className="bg-background text-foreground px-1 rounded">X-API-Key: your_key</code></li>
              <li>Send data to: <code className="bg-background text-foreground px-1 rounded">POST /machines/update</code></li>
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
          className="border-2 border-foreground bg-accent/10 hover:bg-accent/20 hover:border-transparent focus:border-green-500 focus:bg-accent/20 transition-all text-foreground"
        />
        <Button onClick={generateApiKey} className="w-full border-2 border-foreground">
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
            <div key={apiKey.id} className="space-y-2 p-3 bg-card rounded border border-border">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono break-all text-foreground">
                  {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleKeyVisibility(apiKey.id)}
                  title={visibleKeys.has(apiKey.id) ? "Hide key" : "Show key"}
                >
                  {visibleKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {apiKey.description && (
                <p className="text-xs text-muted-foreground">{apiKey.description}</p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(apiKey.key)}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground border-2 border-foreground"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Key
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteApiKey(apiKey.id)}
                  className="border-2 border-foreground"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;

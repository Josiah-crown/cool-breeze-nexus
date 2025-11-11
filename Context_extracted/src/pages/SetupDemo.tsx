import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SetupDemo = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSetup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-demo-data', {
        body: { setup_key: 'SETUP_DEMO_2025' }
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: 'Success!',
        description: 'Demo data has been created successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Setup Demo Data</CardTitle>
          <CardDescription>
            This will delete all existing users and machines and create a fresh demo dataset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSetup} disabled={loading} size="lg" className="w-full">
            {loading ? 'Setting up...' : 'Create Demo Data'}
          </Button>

          {result && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Account Information:</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium">Super Admin:</p>
                  <p>Email: {result.accounts.super_admin.email}</p>
                  <p>Password: {result.accounts.super_admin.password}</p>
                </div>

                <div>
                  <p className="font-medium">Company:</p>
                  <p>Email: {result.accounts.company.email}</p>
                  <p>Password: {result.accounts.company.password}</p>
                </div>

                <div>
                  <p className="font-medium">Installers:</p>
                  {result.accounts.installers.map((installer: any) => (
                    <div key={installer.email} className="ml-4">
                      <p>{installer.name}: {installer.email}</p>
                    </div>
                  ))}
                  <p className="ml-4 text-muted-foreground">Password: {result.accounts.installers[0].password}</p>
                </div>

                <div>
                  <p className="font-medium">Clients:</p>
                  {result.accounts.clients.map((client: any) => (
                    <div key={client.email} className="ml-4">
                      <p>{client.name}: {client.email} (Installer: {client.installer})</p>
                    </div>
                  ))}
                  <p className="ml-4 text-muted-foreground">Password: {result.accounts.clients[0].password}</p>
                </div>

                <div>
                  <p className="font-medium">Machines:</p>
                  <p>{result.machines}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupDemo;

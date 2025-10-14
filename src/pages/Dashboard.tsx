import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMachineData } from '@/hooks/useMachineData';
import MachineCard from '@/components/MachineCard';
import MachineDetailView from '@/components/MachineDetailView';
import { MachineStatus } from '@/types/machine';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { machines, historicalData } = useMachineData(user?.id || '', user?.role || '');
  const [selectedMachine, setSelectedMachine] = useState<MachineStatus | null>(null);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Machine Monitor Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user.name} ({user.role.replace('_', ' ')})
            </p>
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Machine Grid */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Your Machines</h2>
          <p className="text-muted-foreground">
            {machines.length} {machines.length === 1 ? 'machine' : 'machines'} available
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {machines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              onClick={() => setSelectedMachine(machine)}
            />
          ))}
        </div>

        {machines.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No machines found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Contact your administrator to add machines
            </p>
          </div>
        )}
      </main>

      {/* Detail View Modal */}
      {selectedMachine && (
        <MachineDetailView
          machine={selectedMachine}
          historicalData={historicalData[selectedMachine.id]}
          onClose={() => setSelectedMachine(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;

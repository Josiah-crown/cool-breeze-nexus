import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMachineData } from '@/hooks/useMachineData';
import MachineCard from '@/components/MachineCard';
import MachineDetailView from '@/components/MachineDetailView';
import { MachineStatus } from '@/types/machine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Users } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { machines, historicalData, users } = useMachineData(user?.id || '', user?.role || 'client');
  const [selectedMachine, setSelectedMachine] = useState<MachineStatus | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  // Get admins (for super admin view)
  const admins = useMemo(() => users.filter(u => u.role === 'admin'), [users]);
  
  // Get clients under selected admin or all clients
  const clients = useMemo(() => {
    if (user?.role === 'super_admin' && selectedUserId !== 'all') {
      return users.filter(u => u.role === 'client' && u.parentId === selectedUserId);
    }
    return users.filter(u => u.role === 'client');
  }, [users, selectedUserId, user?.role]);

  // Filter machines based on selected user
  const filteredMachines = useMemo(() => {
    if (selectedUserId === 'all') {
      return machines;
    }
    
    // If admin is selected, show their machines + their clients' machines
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (selectedUser?.role === 'admin') {
      const clientIds = users.filter(u => u.parentId === selectedUserId).map(u => u.id);
      return machines.filter(m => m.ownerId === selectedUserId || clientIds.includes(m.ownerId));
    }
    
    // Otherwise show machines for the selected user
    return machines.filter(m => m.ownerId === selectedUserId);
  }, [machines, selectedUserId, users]);

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
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Machines</h2>
            <p className="text-muted-foreground">
              {filteredMachines.length} {filteredMachines.length === 1 ? 'machine' : 'machines'} {selectedUserId !== 'all' ? 'for selected user' : 'total'}
            </p>
          </div>

          {/* User Filter Dropdowns */}
          {(user?.role === 'super_admin' || user?.role === 'admin') && (
            <div className="flex gap-3 items-center">
              <Users className="h-5 w-5 text-muted-foreground" />
              
              {user.role === 'super_admin' && (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {admins.map(admin => (
                      <SelectItem key={admin.id} value={admin.id}>
                        👤 {admin.name} (Admin)
                      </SelectItem>
                    ))}
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        👥 {client.name} (Client)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {user.role === 'admin' && clients.length > 0 && (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                    <SelectItem value={user.id}>My Machines</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMachines.map((machine) => {
            const owner = users.find(u => u.id === machine.ownerId);
            return (
              <MachineCard
                key={machine.id}
                machine={machine}
                onClick={() => setSelectedMachine(machine)}
                ownerName={owner?.name}
              />
            );
          })}
        </div>

        {filteredMachines.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No machines found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedUserId !== 'all' ? 'This user has no machines' : 'Contact your administrator to add machines'}
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

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMachineData } from '@/hooks/useMachineData';
import MachineCard from '@/components/MachineCard';
import MachineDetailView from '@/components/MachineDetailView';
import UserHierarchyView from '@/components/UserHierarchyView';
import { AddUserDialog } from '@/components/AddUserDialog';
import { AddMachineDialog } from '@/components/AddMachineDialog';
import { ChangeOwnerDialog } from '@/components/ChangeOwnerDialog';
import { MachineStatus } from '@/types/machine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Users, UserPlus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { machines, historicalData, users } = useMachineData(user?.id || '', user?.role || 'client');
  const [selectedMachine, setSelectedMachine] = useState<MachineStatus | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showAddMachineDialog, setShowAddMachineDialog] = useState(false);
  const [changeOwnerMachineId, setChangeOwnerMachineId] = useState<string | null>(null);
  
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleDeleteMachine = async (machineId: string) => {
    try {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', machineId);

      if (error) throw error;

      toast.success('Machine deleted successfully');
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete machine');
    }
  };

  const handleChangeOwner = (machineId: string) => {
    setChangeOwnerMachineId(machineId);
  };

  const selectedMachineForOwnerChange = machines.find(m => m.id === changeOwnerMachineId);

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
          <div className="flex gap-2">
            {(user.role === 'admin' || user.role === 'super_admin') && (
              <>
                <Button variant="outline" onClick={() => setShowAddUserDialog(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
                <Button variant="outline" onClick={() => setShowAddMachineDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Machine
                </Button>
              </>
            )}
            <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Machine Grid */}
      <main className="container mx-auto px-4 py-8">
        {user.role === 'super_admin' ? (
          /* Super Admin - Hierarchical View */
          <div>
            {/* Analytics Section */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border border-[hsl(var(--control-border))] rounded-lg p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Machines</p>
                  <p className="text-xl font-bold text-foreground mt-1">{machines.length}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border border-[hsl(var(--control-border))] rounded-lg p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">On</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.isOn).length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => !m.isOn).length}</span>
                  </p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border border-[hsl(var(--control-border))] rounded-lg p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connected</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.isConnected).length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => !m.isConnected).length}</span>
                  </p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border border-destructive/40 rounded-lg p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Not Working</p>
                  <p className="text-xl font-bold text-destructive mt-1">
                    {machines.filter(m => m.overallStatus === 'error').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  {selectedUserId === 'all' ? 'All Admins & Their Machines' : 'Your Machines'}
                </h2>
                <p className="text-muted-foreground">
                  {selectedUserId === 'all' 
                    ? 'Expand each admin to view their machines and clients'
                    : `${filteredMachines.length} ${filteredMachines.length === 1 ? 'machine' : 'machines'} assigned to you`
                  }
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[200px] bg-card">
                    <SelectValue placeholder="Filter machines" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Machines</SelectItem>
                    <SelectItem value={user.id}>My Machines</SelectItem>
                    {admins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {selectedUserId === 'all' ? (
              <>
                {/* Super Admin's Own Machines */}
                {filteredMachines.filter(m => m.ownerId === user.id).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Your Machines</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredMachines.filter(m => m.ownerId === user.id).map((machine) => {
                        const owner = users.find(u => u.id === machine.ownerId);
                        return (
                          <MachineCard
                            key={machine.id}
                            machine={machine}
                            onClick={() => setSelectedMachine(machine)}
                            ownerName={owner?.name}
                            onDelete={handleDeleteMachine}
                            onChangeOwner={handleChangeOwner}
                            showManagement={true}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Admin Hierarchy */}
                <UserHierarchyView
                  users={users}
                  machines={machines}
                  onMachineClick={setSelectedMachine}
                  onDeleteMachine={handleDeleteMachine}
                  onChangeOwner={handleChangeOwner}
                />
              </>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMachines.map((machine) => {
                    const owner = users.find(u => u.id === machine.ownerId);
                    return (
                      <MachineCard
                        key={machine.id}
                        machine={machine}
                        onClick={() => setSelectedMachine(machine)}
                        ownerName={owner?.name}
                        onDelete={handleDeleteMachine}
                        onChangeOwner={handleChangeOwner}
                        showManagement={true}
                      />
                    );
                  })}
                </div>
                {filteredMachines.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No machines found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Click "Add Machine" to create your first machine
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : user.role === 'admin' ? (
          /* Admin - View with Client Filter */
          <div>
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Machines</h2>
                <p className="text-muted-foreground">
                  {selectedUserId === 'all' 
                    ? 'All machines organized by owner'
                    : `${filteredMachines.length} ${filteredMachines.length === 1 ? 'machine' : 'machines'} for selected user`
                  }
                </p>
              </div>

              <div className="flex gap-3 items-center">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[200px] bg-card">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Machines</SelectItem>
                    <SelectItem value={user.id}>My Machines</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedUserId === 'all' ? (
              <>
                {/* Admin's Own Machines */}
                {filteredMachines.filter(m => m.ownerId === user.id).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-4">My Machines</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredMachines.filter(m => m.ownerId === user.id).map((machine) => {
                        const owner = users.find(u => u.id === machine.ownerId);
                        return (
                          <MachineCard
                            key={machine.id}
                            machine={machine}
                            onClick={() => setSelectedMachine(machine)}
                            ownerName={owner?.name}
                            onDelete={handleDeleteMachine}
                            onChangeOwner={handleChangeOwner}
                            showManagement={true}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Client Sections */}
                {clients.map((client) => {
                  const clientMachines = filteredMachines.filter(m => m.ownerId === client.id);
                  if (clientMachines.length === 0) return null;

                  return (
                    <div key={client.id} className="mb-8">
                      <h3 className="text-xl font-semibold text-foreground mb-4">{client.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clientMachines.map((machine) => {
                          const owner = users.find(u => u.id === machine.ownerId);
                          return (
                            <MachineCard
                              key={machine.id}
                              machine={machine}
                              onClick={() => setSelectedMachine(machine)}
                              ownerName={owner?.name}
                              onDelete={handleDeleteMachine}
                              onChangeOwner={handleChangeOwner}
                              showManagement={true}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {filteredMachines.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No machines found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Click "Add Machine" to create your first machine
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMachines.map((machine) => {
                    const owner = users.find(u => u.id === machine.ownerId);
                    return (
                      <MachineCard
                        key={machine.id}
                        machine={machine}
                        onClick={() => setSelectedMachine(machine)}
                        ownerName={owner?.name}
                        onDelete={handleDeleteMachine}
                        onChangeOwner={handleChangeOwner}
                        showManagement={user.role === 'admin'}
                      />
                    );
                  })}
                </div>

                {filteredMachines.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No machines found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedUserId !== 'all' ? 'This user has no machines' : 'Click "Add Machine" to create your first machine'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Client - Simple Grid View */
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">Your Machines</h2>
              <p className="text-muted-foreground">
                {machines.length} {machines.length === 1 ? 'machine' : 'machines'} available
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {machines.map((machine) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  onClick={() => setSelectedMachine(machine)}
                  onDelete={handleDeleteMachine}
                  onChangeOwner={handleChangeOwner}
                  showManagement={false}
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
      
      {/* Add User Dialog */}
      {(user.role === 'admin' || user.role === 'super_admin') && (
        <>
          <AddUserDialog
            open={showAddUserDialog}
            onOpenChange={setShowAddUserDialog}
            userRole={user.role}
            currentUserId={user.id}
            onUserAdded={handleRefresh}
          />
          <AddMachineDialog
            open={showAddMachineDialog}
            onOpenChange={setShowAddMachineDialog}
            ownerId={user.id}
            userRole={user.role}
            onMachineAdded={handleRefresh}
          />
        </>
      )}

      {/* Change Owner Dialog */}
      {changeOwnerMachineId && selectedMachineForOwnerChange && user && (
        <ChangeOwnerDialog
          open={!!changeOwnerMachineId}
          onOpenChange={(open) => !open && setChangeOwnerMachineId(null)}
          machineId={changeOwnerMachineId}
          machineName={selectedMachineForOwnerChange.name}
          currentOwnerId={selectedMachineForOwnerChange.ownerId}
          users={users}
          onOwnerChanged={handleRefresh}
          currentUserRole={user.role}
          currentUserId={user.id}
        />
      )}
    </div>
  );
};

export default Dashboard;

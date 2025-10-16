import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMachineData } from '@/hooks/useMachineData';
import MachineCard from '@/components/MachineCard';
import MachineDetailView from '@/components/MachineDetailView';
import UserHierarchyView from '@/components/UserHierarchyView';
import { AddUserDialog } from '@/components/AddUserDialog';
import { AddMachineDialog } from '@/components/AddMachineDialog';
import { ChangeOwnerDialog } from '@/components/ChangeOwnerDialog';
import { RenameMachineDialog } from '@/components/RenameMachineDialog';
import { ReassignClientDialog } from '@/components/ReassignClientDialog';
import { DeleteUserDialog } from '@/components/DeleteUserDialog';
import { DeleteOwnAccountDialog } from '@/components/DeleteOwnAccountDialog';
import { MachineStatus } from '@/types/machine';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LogOut, Users, UserPlus, Plus, Settings, Lock, Unlock } from 'lucide-react';
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
  const [renameMachineId, setRenameMachineId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [showDeleteOwnAccount, setShowDeleteOwnAccount] = useState(false);
  const [reassignClientId, setReassignClientId] = useState<string | null>(null);
  
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

  const handleRename = (machineId: string) => {
    setRenameMachineId(machineId);
  };

  const handleDeleteUser = (userId: string) => {
    setDeleteUserId(userId);
  };

  const handleReassignClient = (userId: string) => {
    setReassignClientId(userId);
  };

  const selectedMachineForOwnerChange = machines.find(m => m.id === changeOwnerMachineId);
  const selectedMachineForRename = machines.find(m => m.id === renameMachineId);
  const selectedUserForDeletion = users.find(u => u.id === deleteUserId);
  const selectedUserForReassignment = users.find(u => u.id === reassignClientId);

  // Get companies (for super admin view)
  const companies = useMemo(() => users.filter(u => u.role === 'company'), [users]);
  
  // Get installers and clients based on selected company or all
  const installers = useMemo(() => users.filter(u => u.role === 'installer'), [users]);
  const clients = useMemo(() => {
    if (user?.role === 'super_admin' && selectedUserId !== 'all') {
      // Filter clients based on selected company's installers
      const selectedCompanyInstallers = users.filter(u => u.role === 'installer' && u.parentId === selectedUserId);
      const installerIds = selectedCompanyInstallers.map(i => i.id);
      return users.filter(u => u.role === 'client' && installerIds.includes(u.parentId || ''));
    }
    return users.filter(u => u.role === 'client');
  }, [users, selectedUserId, user?.role]);

  // Filter machines based on selected user
  const filteredMachines = useMemo(() => {
    if (user?.role === 'installer' || user?.role === 'company') {
      // For installer/company, "all" shows everything, "unassigned" shows only their own machines
      if (selectedUserId === 'unassigned') {
        return machines.filter(m => m.ownerId === user.id);
      }
      // "all" or default shows all machines (own + hierarchy)
      return machines;
    }
    
    if (selectedUserId === 'all') {
      return machines;
    }
    
    // If company is selected (for super_admin), show their machines + their installers' + clients' machines
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (selectedUser?.role === 'company') {
      const installerIds = users.filter(u => u.role === 'installer' && u.parentId === selectedUserId).map(u => u.id);
      const clientIds = users.filter(u => u.role === 'client' && installerIds.includes(u.parentId || '')).map(u => u.id);
      return machines.filter(m => m.ownerId === selectedUserId || installerIds.includes(m.ownerId) || clientIds.includes(m.ownerId));
    }
    
    // Otherwise show machines for the selected user
    return machines.filter(m => m.ownerId === selectedUserId);
  }, [machines, selectedUserId, users, user?.role, user?.id]);

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
            {(user.role === 'installer' || user.role === 'company' || user.role === 'super_admin') && (
              <>
                <Button variant="outline" onClick={() => setShowAddUserDialog(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {user.role === 'company' ? 'Add Installer' : 'Add Client'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddMachineDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Machine
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setShowDeleteOwnAccount(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Account
            </Button>
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
              <div className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border border-[hsl(var(--control-border))] rounded-lg p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.overallStatus === 'good').length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => m.overallStatus === 'error').length}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  {selectedUserId === 'all' ? 'All Companies & Their Machines' : 'Your Machines'}
                </h2>
                <p className="text-muted-foreground">
                  {selectedUserId === 'all' 
                    ? 'Expand each company to view their machines, installers and clients'
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
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
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
                            onRename={handleRename}
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
                  onRename={handleRename}
                  onDeleteUser={handleDeleteUser}
                  onReassignClient={handleReassignClient}
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
                        onRename={handleRename}
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
        ) : user.role === 'company' ? (
          /* Company - Expandable View with Installer and Client Sections */
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
              <div className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border border-[hsl(var(--control-border))] rounded-lg p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.overallStatus === 'good').length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => m.overallStatus === 'error').length}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Machines</h2>
                <p className="text-muted-foreground">
                  {selectedUserId === 'all' 
                    ? 'All machines organized by owner'
                    : `${filteredMachines.length} unassigned ${filteredMachines.length === 1 ? 'machine' : 'machines'}`
                  }
                </p>
              </div>

              <div className="flex gap-3 items-center">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[200px] bg-card">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="all">Everything</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedUserId === 'all' ? (
              <Accordion type="multiple" className="space-y-4">
                {/* Unassigned Machines Section */}
                {filteredMachines.filter(m => m.ownerId === user.id).length > 0 && (
                  <AccordionItem value="unassigned" className="border border-border rounded-lg bg-card px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <h3 className="text-lg font-semibold text-foreground">Unassigned Machines</h3>
                        <span className="text-sm text-muted-foreground">
                          {filteredMachines.filter(m => m.ownerId === user.id).length} {filteredMachines.filter(m => m.ownerId === user.id).length === 1 ? 'machine' : 'machines'}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                        {filteredMachines.filter(m => m.ownerId === user.id).map((machine) => (
                          <MachineCard
                            key={machine.id}
                            machine={machine}
                            onClick={() => setSelectedMachine(machine)}
                            onDelete={handleDeleteMachine}
                            onChangeOwner={handleChangeOwner}
                            onRename={handleRename}
                            showManagement={true}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Client Sections */}
                {clients.map((client) => {
                  const clientMachines = filteredMachines.filter(m => m.ownerId === client.id);
                  if (clientMachines.length === 0) return null;

                  return (
                    <AccordionItem key={client.id} value={client.id} className="border border-border rounded-lg bg-card px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <h3 className="text-lg font-semibold text-foreground">{client.name}</h3>
                          <span className="text-sm text-muted-foreground">
                            {clientMachines.length} {clientMachines.length === 1 ? 'machine' : 'machines'}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
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
                                onRename={handleRename}
                                showManagement={true}
                              />
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
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
              </Accordion>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMachines.map((machine) => (
                    <MachineCard
                      key={machine.id}
                      machine={machine}
                      onClick={() => setSelectedMachine(machine)}
                      onDelete={handleDeleteMachine}
                      onChangeOwner={handleChangeOwner}
                      onRename={handleRename}
                      showManagement={true}
                    />
                  ))}
                </div>

                {filteredMachines.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No unassigned machines</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      All machines are assigned to clients
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Client - Simple Grid View */
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
              <div className="bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border border-[hsl(var(--control-border))] rounded-lg p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.overallStatus === 'good').length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => m.overallStatus === 'error').length}</span>
                  </p>
                </div>
              </div>
            </div>

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
      {(user.role === 'installer' || user.role === 'company' || user.role === 'super_admin') && (
        <>
          <AddUserDialog
            open={showAddUserDialog}
            onOpenChange={setShowAddUserDialog}
            userRole={user.role as 'installer' | 'company' | 'super_admin'}
            currentUserId={user.id}
            onUserAdded={handleRefresh}
          />
          <AddMachineDialog
            open={showAddMachineDialog}
            onOpenChange={setShowAddMachineDialog}
            ownerId={user.id}
            userRole={user.role === 'company' || user.role === 'installer' ? 'admin' : user.role}
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
          currentUserRole={user.role === 'company' || user.role === 'installer' ? 'admin' : user.role}
          currentUserId={user.id}
        />
      )}

      {/* Delete User Dialog */}
      {deleteUserId && selectedUserForDeletion && (
        <DeleteUserDialog
          open={!!deleteUserId}
          onOpenChange={(open) => !open && setDeleteUserId(null)}
          userId={deleteUserId}
          userName={selectedUserForDeletion.name}
          userRole={selectedUserForDeletion.role}
          onUserDeleted={handleRefresh}
        />
      )}

      {/* Delete Own Account Dialog */}
      <DeleteOwnAccountDialog
        open={showDeleteOwnAccount}
        onOpenChange={setShowDeleteOwnAccount}
      />

      {/* Reassign Client Dialog */}
      {reassignClientId && selectedUserForReassignment && (
        <ReassignClientDialog
          open={!!reassignClientId}
          onOpenChange={(open) => !open && setReassignClientId(null)}
          clientId={reassignClientId}
          clientName={selectedUserForReassignment.name}
          currentAdminId={selectedUserForReassignment.parentId || ''}
          onReassigned={handleRefresh}
        />
      )}

      {/* Rename Machine Dialog */}
      {renameMachineId && selectedMachineForRename && (
        <RenameMachineDialog
          machineId={renameMachineId}
          currentName={selectedMachineForRename.name}
          open={!!renameMachineId}
          onOpenChange={(open) => !open && setRenameMachineId(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
};

export default Dashboard;

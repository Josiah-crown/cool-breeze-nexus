import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMachineData } from '@/hooks/useMachineData';
import MachineCard from '@/components/MachineCard';
import MachineDetailView from '@/components/MachineDetailView';
import UserHierarchyView from '@/components/UserHierarchyView';
import { AddUserDialog } from '@/components/AddUserDialog';
import { AddMachineDialog } from '@/components/AddMachineDialog';
import { ChangeOwnerDialog } from '@/components/ChangeOwnerDialog';
import { RenameMachineDialog } from '@/components/RenameMachineDialog';
import { ChangeManufacturerDialog } from '@/components/ChangeManufacturerDialog';
import { ReassignClientDialog } from '@/components/ReassignClientDialog';
import { DeleteUserDialog } from '@/components/DeleteUserDialog';
import { DeleteOwnAccountDialog } from '@/components/DeleteOwnAccountDialog';
import ApiKeyManager from '@/components/ApiKeyManager';
import { MachineStatus } from '@/types/machine';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LogOut, Users, UserPlus, Plus, Settings, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { machines, historicalData, users, refetch } = useMachineData(user?.id || '', user?.role || 'client');
  const [selectedMachine, setSelectedMachine] = useState<MachineStatus | null>(null);
  
  // Keep selectedMachine in sync with updated machines data
  useEffect(() => {
    if (selectedMachine && machines.length > 0) {
      const updatedMachine = machines.find(m => m.id === selectedMachine.id);
      if (updatedMachine) {
        console.log('🔄 Dashboard: Updating selectedMachine with fresh data:', {
          id: updatedMachine.id,
          fanActive: updatedMachine.fanActive,
          isCooling: updatedMachine.isCooling,
        });
        setSelectedMachine(updatedMachine);
      }
    }
  }, [machines, selectedMachine?.id]);
  
  // Set up real-time updates for machines
  useEffect(() => {
    if (!user) return;
    
    console.log('📡 Dashboard: Setting up real-time subscription for machines');
    
    // Subscribe to machines table updates
    const channel = supabase
      .channel('dashboard-machines-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'machines',
        },
        (payload) => {
          console.log('📨 Dashboard: Machine update received:', payload.new);
          // Refetch machine data when any machine is updated
          refetch();
        }
      )
      .subscribe((status) => {
        console.log('📡 Dashboard: Subscription status:', status);
      });
    
    // Also poll periodically to catch any missed updates
    const pollInterval = setInterval(() => {
      console.log('🔄 Dashboard: Polling for machine updates...');
      refetch();
    }, 10000); // Poll every 10 seconds
    
    return () => {
      console.log('🧹 Dashboard: Cleaning up subscription and polling');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user, refetch]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showAddMachineDialog, setShowAddMachineDialog] = useState(false);
  const [changeOwnerMachineId, setChangeOwnerMachineId] = useState<string | null>(null);
  const [renameMachineId, setRenameMachineId] = useState<string | null>(null);
  const [changeManufacturerMachineId, setChangeManufacturerMachineId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [showDeleteOwnAccount, setShowDeleteOwnAccount] = useState(false);
  const [reassignClientId, setReassignClientId] = useState<string | null>(null);
  
  const handleRefresh = () => {
    refetch();
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

  const handleChangeManufacturer = (machineId: string) => {
    try {
      console.log('handleChangeManufacturer called with machineId:', machineId);
      const machine = machines.find(m => m.id === machineId);
      if (!machine) {
        console.error('Machine not found:', machineId);
        toast.error('Machine not found');
        return;
      }
      console.log('Setting changeManufacturerMachineId to:', machineId, 'Machine:', machine);
      setChangeManufacturerMachineId(machineId);
    } catch (error) {
      console.error('Error in handleChangeManufacturer:', error);
      toast.error('Failed to open Change Manufacturer dialog');
    }
  };

  const handleDeleteUser = (userId: string) => {
    setDeleteUserId(userId);
  };

  const handleReassignClient = (userId: string) => {
    setReassignClientId(userId);
  };

  const selectedMachineForOwnerChange = machines.find(m => m.id === changeOwnerMachineId);
  const selectedMachineForRename = machines.find(m => m.id === renameMachineId);
  const selectedMachineForManufacturerChange = machines.find(m => m.id === changeManufacturerMachineId);
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
      <header className="border-b border-border backdrop-blur-sm relative overflow-hidden flex" style={{ backgroundColor: '#8FB83D' }}>
        {/* Logo section - entire left section #303329 */}
        <div className="flex items-center flex-shrink-0" style={{ backgroundColor: '#303329', padding: '16px 24px', minWidth: '200px' }}>
          <img src="/3.png" alt="IOTnexus Logo" className="h-24 w-auto object-contain" />
        </div>
        {/* Rest of header content */}
        <div className="flex-1 px-[80px] py-4 flex items-center justify-between gap-4">
          {/* Centered heading */}
          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-accent-foreground">Machine Monitor Dashboard</h1>
              <p className="text-sm text-accent-foreground/80">
                Welcome, {user.name} ({user.role.replace('_', ' ')})
              </p>
            </div>
          </div>
          {/* Buttons on the right */}
          <div className="flex gap-2 flex-shrink-0">
          {(user.role === 'installer' || user.role === 'company' || user.role === 'super_admin') && (
            <>
              <Button variant="outline" className="btn-nav" onClick={() => setShowAddUserDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                {user.role === 'company' ? 'Add Installer' : 'Add Client'}
              </Button>
              <Button variant="outline" className="btn-nav" onClick={() => setShowAddMachineDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Machine
              </Button>
            </>
          )}
          <Button variant="outline" className="btn-nav" onClick={() => setShowDeleteOwnAccount(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Account
          </Button>
          <Button variant="outline" className="btn-nav" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
        </div>
      </header>

      {/* Machine Grid */}
      <main className="w-full px-[80px] py-8">
        {user.role === 'super_admin' ? (
          <div>
            {/* Responsive Layout Container */}
            <div className="flex flex-col xl:flex-row gap-6 items-start">
              {/* Main Content Area - Analytics, Companies and Machines */}
              <div className="flex-1 w-full min-w-0">
                {/* Analytics Section */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Machines</p>
                  <p className="text-xl font-bold text-foreground mt-1">{machines.length}</p>
                </div>
              </div>
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">On</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.isOn).length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => !m.isOn).length}</span>
                  </p>
                </div>
              </div>
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connected</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.isConnected).length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => !m.isConnected).length}</span>
                  </p>
                </div>
              </div>
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
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
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter machines" />
                      </SelectTrigger>
                      <SelectContent>
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
                     <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
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
                            onChangeManufacturer={handleChangeManufacturer}
                            showManagement={true}
                            onNotificationChange={refetch}
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
                  onChangeManufacturer={handleChangeManufacturer}
                  onDeleteUser={handleDeleteUser}
                  onReassignClient={handleReassignClient}
                  onNotificationChange={refetch}
                />
              </>
            ) : (
              <div>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
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
                        onChangeManufacturer={handleChangeManufacturer}
                        showManagement={true}
                        onNotificationChange={refetch}
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
              
              {/* API Key Management for Super Admin - Right Sidebar on wide screens */}
              <div className="w-full xl:w-[400px] xl:sticky xl:top-4 flex-shrink-0">
                <Card className="bg-card border-border backdrop-blur-sm relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                  <CardHeader className="border-b border-border relative z-10">
                    <CardTitle className="text-lg text-foreground">ESP32 API Key Management</CardTitle>
                    <p className="text-sm text-muted-foreground">Generate API keys that installers can assign to machines</p>
                  </CardHeader>
                  <CardContent className="pt-4 relative z-10">
                    <ApiKeyManager mode="admin" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : user.role === 'company' ? (
          <div>
            {/* Analytics Section */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Machines</p>
                  <p className="text-xl font-bold text-foreground mt-1">{machines.length}</p>
                </div>
              </div>
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">On</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.isOn).length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => !m.isOn).length}</span>
                  </p>
                </div>
              </div>
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connected</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.isConnected).length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => !m.isConnected).length}</span>
                  </p>
                </div>
              </div>
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
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
                <h2 className="text-xl font-semibold text-foreground mb-2">Your Organization</h2>
                <p className="text-muted-foreground">
                  {selectedUserId === 'all' 
                    ? 'View all installers, clients, and machines'
                    : `${filteredMachines.length} unassigned ${filteredMachines.length === 1 ? 'machine' : 'machines'}`
                  }
                </p>
              </div>

              <div className="flex gap-3 items-center">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everything</SelectItem>
                    <SelectItem value="unassigned">My Machines Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedUserId === 'all' ? (
              <>
                {/* Company's Own Machines */}
                {machines.filter(m => m.ownerId === user.id).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Your Machines</h3>
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                      {machines.filter(m => m.ownerId === user.id).map((machine) => (
                        <MachineCard
                          key={machine.id}
                          machine={machine}
                          onClick={() => setSelectedMachine(machine)}
                          onDelete={handleDeleteMachine}
                          onChangeOwner={handleChangeOwner}
                          onRename={handleRename}
                          onChangeManufacturer={handleChangeManufacturer}
                          showManagement={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Company Hierarchy - Only pass installers and clients under this company */}
                <UserHierarchyView
                  users={users.filter(u => {
                    if (u.role === 'installer' && u.companyId === user.id) return true;
                    if (u.role === 'client') {
                      // Include clients whose installer belongs to this company
                      const installer = users.find(inst => inst.id === u.parentId);
                      return installer?.companyId === user.id;
                    }
                    return false;
                  })}
                  machines={machines}
                  onMachineClick={setSelectedMachine}
                  onDeleteMachine={handleDeleteMachine}
                  onChangeOwner={handleChangeOwner}
                  onRename={handleRename}
                  onChangeManufacturer={handleChangeManufacturer}
                  onDeleteUser={handleDeleteUser}
                  onReassignClient={handleReassignClient}
                  onNotificationChange={refetch}
                />
              </>
            ) : (
              <>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {filteredMachines.map((machine) => (
                    <MachineCard
                      key={machine.id}
                      machine={machine}
                      onClick={() => setSelectedMachine(machine)}
                      onDelete={handleDeleteMachine}
                      onChangeOwner={handleChangeOwner}
                      onRename={handleRename}
                      onChangeManufacturer={handleChangeManufacturer}
                      showManagement={true}
                    />
                  ))}
                </div>

                {filteredMachines.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No unassigned machines</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      All machines are assigned to installers/clients
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : user.role === 'installer' ? (
          <div>
            {/* Analytics Section */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Machines</p>
                  <p className="text-xl font-bold text-foreground mt-1">{machines.length}</p>
                </div>
              </div>
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">On</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.isOn).length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => !m.isOn).length}</span>
                  </p>
                </div>
              </div>
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connected</p>
                  <p className="text-xl font-bold mt-1">
                    <span className="text-green-500">{machines.filter(m => m.isConnected).length}</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-red-500">{machines.filter(m => !m.isConnected).length}</span>
                  </p>
                </div>
              </div>
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:via-white/10 before:to-transparent before:pointer-events-none">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center z-10">
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
                <h2 className="text-xl font-semibold text-foreground mb-2">Your Clients & Machines</h2>
                <p className="text-muted-foreground">
                  {selectedUserId === 'all' 
                    ? 'View all clients and their machines'
                    : `${filteredMachines.length} unassigned ${filteredMachines.length === 1 ? 'machine' : 'machines'}`
                  }
                </p>
              </div>

              <div className="flex gap-3 items-center">
                <Users className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everything</SelectItem>
                    <SelectItem value="unassigned">My Machines Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedUserId === 'all' ? (
              <>
                {/* Installer's Own Machines */}
                {machines.filter(m => m.ownerId === user.id).length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Your Machines</h3>
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                      {machines.filter(m => m.ownerId === user.id).map((machine) => (
                        <MachineCard
                          key={machine.id}
                          machine={machine}
                          onClick={() => setSelectedMachine(machine)}
                          onDelete={handleDeleteMachine}
                          onChangeOwner={handleChangeOwner}
                          onRename={handleRename}
                          onChangeManufacturer={handleChangeManufacturer}
                          showManagement={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Installer Hierarchy - Only show clients under this installer */}
                <UserHierarchyView
                  users={users.filter(u => u.role === 'client' && u.parentId === user.id)}
                  machines={machines}
                  onMachineClick={setSelectedMachine}
                  onDeleteMachine={handleDeleteMachine}
                  onChangeOwner={handleChangeOwner}
                  onRename={handleRename}
                  onChangeManufacturer={handleChangeManufacturer}
                  onDeleteUser={handleDeleteUser}
                  onReassignClient={handleReassignClient}
                  onNotificationChange={refetch}
                />
              </>
            ) : (
              <>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {filteredMachines.map((machine) => (
                    <MachineCard
                      key={machine.id}
                      machine={machine}
                      onClick={() => setSelectedMachine(machine)}
                      onDelete={handleDeleteMachine}
                      onChangeOwner={handleChangeOwner}
                      onRename={handleRename}
                      onChangeManufacturer={handleChangeManufacturer}
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
          <div>
            {/* Analytics Section */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                <div className="relative text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Machines</p>
                  <p className="text-xl font-bold text-foreground mt-1">{machines.length}</p>
                </div>
              </div>
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
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
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
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
              <div className="hud-button bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] border-2 border-[hsl(var(--control-border))] p-3 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 hud-button border border-primary/20 pointer-events-none" style={{ margin: '2px' }} />
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

            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {machines.map((machine) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  onClick={() => setSelectedMachine(machine)}
                  onDelete={handleDeleteMachine}
                  onChangeOwner={handleChangeOwner}
                  onRename={handleRename}
                  onChangeManufacturer={handleChangeManufacturer}
                  showManagement={true}
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
            userRole={user.role as 'super_admin' | 'installer' | 'company' | 'client'}
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

      {/* Change Manufacturer Dialog */}
      {changeManufacturerMachineId && selectedMachineForManufacturerChange && (
        <ChangeManufacturerDialog
          open={!!changeManufacturerMachineId}
          onOpenChange={(open) => {
            if (!open) {
              setChangeManufacturerMachineId(null);
            }
          }}
          machineId={changeManufacturerMachineId}
          machineName={selectedMachineForManufacturerChange.name}
          machineType={selectedMachineForManufacturerChange.type}
          currentManufacturer={selectedMachineForManufacturerChange.manufacturer || null}
          onSuccess={() => {
            refetch();
            setChangeManufacturerMachineId(null);
          }}
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

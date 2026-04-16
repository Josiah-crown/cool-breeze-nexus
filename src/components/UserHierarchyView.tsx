import React, { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserHierarchy } from '@/hooks/useMachineData';
import { MachineStatus } from '@/types/machine';
import MachineCard from './MachineCard';
import { Building2, User, Trash2, UserCog, Lock } from 'lucide-react';

interface UserHierarchyViewProps {
  users: UserHierarchy[];
  machines: MachineStatus[];
  onMachineClick: (machine: MachineStatus) => void;
  onDeleteMachine?: (machineId: string) => void;
  onChangeOwner?: (machineId: string) => void;
  onRename?: (machineId: string) => void;
  onChangeManufacturer?: (machineId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onReassignClient?: (userId: string) => void;
  onNotificationChange?: () => void;
}

const UserHierarchyView: React.FC<UserHierarchyViewProps> = ({ users, machines, onMachineClick, onDeleteMachine, onChangeOwner, onRename, onChangeManufacturer, onDeleteUser, onReassignClient, onNotificationChange }) => {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [expandedInstaller, setExpandedInstaller] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const companyRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});
  const installerRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});
  const clientRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});
  const companies = users.filter(u => u.role === 'company');
  const topLevelInstallers = users.filter(u => u.role === 'installer');
  const topLevelClients = users.filter(u => u.role === 'client');
  // ALWAYS define ALL display arrays at top level (Rules of Hooks - must be unconditional)
  const displayCompanies = React.useMemo(() => {
    const arr = [...companies];
    if (expandedCompany) {
      arr.sort((a, b) => (a.id === expandedCompany ? -1 : b.id === expandedCompany ? 1 : 0));
    }
    return arr;
  }, [companies, expandedCompany]);

  const displayInstallers = React.useMemo(() => {
    const arr = [...topLevelInstallers];
    if (expandedInstaller) {
      arr.sort((a, b) => (a.id === expandedInstaller ? -1 : b.id === expandedInstaller ? 1 : 0));
    }
    return arr;
  }, [topLevelInstallers, expandedInstaller]);

  const displayClients = React.useMemo(() => {
    const arr = [...topLevelClients];
    if (expandedClient) {
      arr.sort((a, b) => (a.id === expandedClient ? -1 : b.id === expandedClient ? 1 : 0));
    }
    return arr;
  }, [topLevelClients, expandedClient]);

  // Check if company or any of their installers/clients have failing machines
  const hasFailingMachines = (companyId: string) => {
    const companyMachines = machines.filter(m => m.ownerId === companyId);
    const installers = users.filter(u => u.role === 'installer' && u.parentId === companyId);
    const installerIds = installers.map(i => i.id);
    const installerMachines = machines.filter(m => installerIds.includes(m.ownerId));
    const clients = users.filter(u => u.role === 'client' && installerIds.includes(u.parentId || ''));
    const clientIds = clients.map(c => c.id);
    const clientMachines = machines.filter(m => clientIds.includes(m.ownerId));
    
    const allMachines = [...companyMachines, ...installerMachines, ...clientMachines];
    return allMachines.some(m => m.overallStatus === 'error');
  };

  // Check if installer or any of their clients have failing machines
  const installerHasFailingMachines = (installerId: string) => {
    const installerMachines = machines.filter(m => m.ownerId === installerId);
    const clients = users.filter(u => u.role === 'client' && u.parentId === installerId);
    const clientIds = clients.map(c => c.id);
    const clientMachines = machines.filter(m => clientIds.includes(m.ownerId));
    
    const allMachines = [...installerMachines, ...clientMachines];
    return allMachines.some(m => m.overallStatus === 'error');
  };

  // Check if a specific client has failing machines
  const clientHasFailingMachines = (clientId: string) => {
    const clientMachines = machines.filter(m => m.ownerId === clientId);
    return clientMachines.some(m => m.overallStatus === 'error');
  };

  // If no companies and no installers (i.e., logged in as installer), show clients at top level
  if (companies.length === 0 && topLevelInstallers.length === 0 && topLevelClients.length > 0) {

    return (
      <div className="grid gap-4 items-start transition-all duration-700 ease-in-out" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 18.75rem), 1fr))' }}>
        {displayClients.map(client => {
          const isExpanded = expandedClient === client.id;
          const clientMachines = machines.filter(m => m.ownerId === client.id);
          const clientHasFailing = clientHasFailingMachines(client.id);

          return (
            <div
              key={client.id}
              ref={(el) => (clientRefs.current[client.id] = el)}
              className="transition-all duration-700 ease-in-out"
              style={{
                gridColumn: isExpanded ? '1 / -1' : 'auto',
                width: '100%'
              }}
            >
              <Accordion
                key={`client-accordion-${client.id}-${expandedClient}`}
                type="single"
                collapsible
                className="h-full"
                value={expandedClient === client.id ? client.id : ""}
                onValueChange={(value) => {
                  const isOpening = value && value.length > 0;
                  setExpandedClient(isOpening ? value : null);
                  if (isOpening && clientRefs.current[value]) {
                    setTimeout(() => {
                      clientRefs.current[value]?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                      });
                    }, 50);
                  }
                }}
              >
                <AccordionItem
                  value={client.id}
                  className={`rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] backdrop-blur-sm shadow-xl h-full relative group ${
                    clientHasFailing 
                      ? 'border-2 border-destructive/60 shadow-[0_0_20px_hsl(var(--destructive)/0.2)]' 
                      : 'border border-border'
                  }`}
                >
                  {/* Lock dropdown for client management */}
                  {(onDeleteUser || onReassignClient) && (
                    <div className="absolute top-4 right-4 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onReassignClient && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onReassignClient(client.id);
                              }}
                            >
                              <UserCog className="mr-2 h-4 w-4" />
                              Reassign Client
                            </DropdownMenuItem>
                          )}
                          {onDeleteUser && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteUser(client.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Client
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  <AccordionTrigger 
                    className="px-6 py-4 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%] [&>svg]:text-foreground transition-all duration-300 hover:shadow-md rounded-md [&[data-state=open]]:bg-[#8FB83D] [&[data-state=open]]:text-white" 
                    style={{ color: '#8FB83D', borderColor: '#8FB83D' }}
                  >
                    <div className="flex items-center gap-3 flex-1 pr-12">
                      <User className="h-5 w-5 text-[#8FB83D] group-data-[state=open]:text-black" />
                      <div className="text-left flex-1">
                        <h3 className="text-lg font-semibold text-foreground group-data-[state=open]:text-black">{client.name}</h3>
                        <p className="text-sm text-muted-foreground group-data-[state=open]:text-black/70">
                          {clientMachines.length} machines
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-1 pb-1">
                    {clientMachines.length > 0 ? (
                      <div className="grid gap-3 mt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))' }}>
                        {clientMachines.map(machine => (
                          <MachineCard
                            key={machine.id}
                            machine={machine}
                            onClick={() => onMachineClick(machine)}
                            ownerName={client.name}
                            onDelete={onDeleteMachine}
                            onChangeOwner={onChangeOwner}
                            onRename={onRename}
                            onChangeManufacturer={onChangeManufacturer}
                            showManagement={true}
                            onNotificationChange={onNotificationChange}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No machines for this client
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          );
        })}
      </div>
    );
  }

  // If no companies (i.e., logged in as company), show installers at top level
  if (companies.length === 0 && topLevelInstallers.length > 0) {
    return (
      <div className="grid gap-4 items-start transition-all duration-700 ease-in-out" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 21.875rem), 1fr))' }}>
        {displayInstallers.map(installer => {
          const isExpanded = expandedInstaller === installer.id;
          const installerMachines = machines.filter(m => m.ownerId === installer.id);
          const clients = users.filter(u => u.role === 'client' && u.parentId === installer.id);
          const clientIds = clients.map(c => c.id);
          const clientMachines = machines.filter(m => clientIds.includes(m.ownerId));
          const totalMachineCount = installerMachines.length + clientMachines.length;
          const installerHasFailing = installerHasFailingMachines(installer.id);

          return (
            <div
              key={installer.id}
              ref={(el) => (installerRefs.current[installer.id] = el)}
              className="transition-all duration-700 ease-in-out"
              style={{
                gridColumn: isExpanded ? '1 / -1' : 'auto',
                width: '100%'
              }}
            >
              <Accordion
                key={`installer-accordion-${installer.id}-${expandedInstaller}`}
                type="single"
                collapsible
                className="h-full"
                value={expandedInstaller === installer.id ? installer.id : ""}
                onValueChange={(value) => {
                  const isOpening = value && value.length > 0;
                  setExpandedInstaller(isOpening ? value : null);
                  if (isOpening && installerRefs.current[value]) {
                    setTimeout(() => {
                      installerRefs.current[value]?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                      });
                    }, 50);
                  }
                }}
              >
                <AccordionItem
                  value={installer.id}
                  className={`rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] backdrop-blur-sm shadow-xl h-full relative group ${
                    installerHasFailing 
                      ? 'border-2 border-destructive/60 shadow-[0_0_20px_hsl(var(--destructive)/0.2)]' 
                      : 'border border-border'
                  }`}
                >
                  {/* Lock dropdown for installer management */}
                  {(onDeleteUser || onReassignClient) && (
                    <div className="absolute top-4 right-4 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onReassignClient && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onReassignClient(installer.id);
                              }}
                            >
                              <UserCog className="mr-2 h-4 w-4" />
                              Reassign Installer
                            </DropdownMenuItem>
                          )}
                          {onDeleteUser && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteUser(installer.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Installer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  <AccordionTrigger 
                    className="px-6 py-4 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%] [&>svg]:text-foreground transition-all duration-300 hover:shadow-md rounded-md [&[data-state=open]]:bg-[#8FB83D] [&[data-state=open]]:text-white" 
                    style={{ color: '#8FB83D', borderColor: '#8FB83D' }}
                  >
                    <div className="flex items-center gap-3 flex-1 pr-12">
                      <User className="h-5 w-5 text-[#8FB83D] group-data-[state=open]:text-black" />
                      <div className="text-left flex-1">
                        <h3 className="text-lg font-semibold text-foreground group-data-[state=open]:text-black">{installer.name}</h3>
                        <p className="text-sm text-muted-foreground group-data-[state=open]:text-black/70">
                          {totalMachineCount} machines • {clients.length} clients
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-1 pb-1">
                    <div className="space-y-2">
                      <Accordion type="single" collapsible className="space-y-1">
                        {/* Installer's own machines */}
                        {installerMachines.length > 0 && (
                          <AccordionItem
                            value={`${installer.id}-machines`}
                            className="border border-border rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] shadow-lg mx-[3px] group"
                          >
                            <AccordionTrigger 
                              className="px-4 py-3 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%] [&>svg]:text-foreground transition-all duration-300 hover:shadow-md rounded-md [&[data-state=open]]:bg-[#8FB83D] [&[data-state=open]]:text-white" 
                              style={{ color: '#8FB83D', borderColor: '#8FB83D' }}
                            >
                              <div className="flex items-center gap-2 pr-12">
                                <User className="h-4 w-4 transition-colors text-[#8FB83D] group-data-[state=open]:text-black" />
                                <div className="text-left">
                                  <span className="font-medium text-foreground transition-colors group-data-[state=open]:text-black">Uncategorized</span>
                                  <span className="text-sm text-muted-foreground ml-2 group-data-[state=open]:text-black/70">
                                    ({installerMachines.length})
                                  </span>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-1 pb-1">
                              <div className="grid gap-3 mt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))' }}>
                                {installerMachines.map(machine => (
                                  <MachineCard
                                    key={machine.id}
                                    machine={machine}
                                    onClick={() => onMachineClick(machine)}
                                    ownerName={installer.name}
                                    onDelete={onDeleteMachine}
                                    onChangeOwner={onChangeOwner}
                                    onRename={onRename}
                                    showManagement={true}
                                    onNotificationChange={onNotificationChange}
                                  />
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>

                      {/* Clients under this installer - Grid Layout */}
                      <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 18.75rem), 1fr))' }}>
                        {clients.sort((a, b) => (a.id === expandedClient ? -1 : b.id === expandedClient ? 1 : 0)).map(client => {
                          const clientMachines = machines.filter(m => m.ownerId === client.id);
                          const clientHasFailing = clientHasFailingMachines(client.id);
                          const isClientExpanded = expandedClient === client.id;
                          
                          return (
                            <div
                              key={client.id}
                              ref={(el) => (clientRefs.current[client.id] = el)}
                              style={{
                                gridColumn: isClientExpanded ? '1 / -1' : 'auto',
                              }}
                            >
                              <Accordion
                                key={`client-accordion-${client.id}-${expandedClient}`}
                                type="single"
                                collapsible
                                value={expandedClient === client.id ? client.id : ""}
                                onValueChange={(value) => {
                                  const isOpening = value && value.length > 0;
                                  setExpandedClient(isOpening ? value : null);
                                  if (isOpening && clientRefs.current[value]) {
                                    setTimeout(() => {
                                      clientRefs.current[value]?.scrollIntoView({ 
                                        behavior: 'smooth', 
                                        block: 'start' 
                                      });
                                    }, 50);
                                  }
                                }}
                              >
                                <AccordionItem
                                  value={client.id}
                                  className={`rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] shadow-lg relative group ${
                                    clientHasFailing 
                                      ? 'border-2 border-destructive/60 shadow-[0_0_10px_hsl(var(--destructive)/0.1)]'
                                      : 'border border-border'
                                  }`}
                                >
                                  {/* Lock dropdown for client management */}
                                  {(onDeleteUser || onReassignClient) && (
                                    <div className="absolute top-3 right-3 z-10">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                                          <Lock className="h-3 w-3 text-muted-foreground" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          {onReassignClient && (
                                            <DropdownMenuItem 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onReassignClient(client.id);
                                              }}
                                            >
                                              <UserCog className="mr-2 h-4 w-4" />
                                              Reassign Client
                                            </DropdownMenuItem>
                                          )}
                                          {onDeleteUser && (
                                            <DropdownMenuItem 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteUser(client.id);
                                              }}
                                              className="text-destructive"
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete Client
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                                  
                                  <AccordionTrigger 
                              className="px-4 py-3 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%] [&>svg]:text-foreground transition-all duration-300 hover:shadow-md rounded-md [&[data-state=open]]:bg-[#8FB83D] [&[data-state=open]]:text-white" 
                              style={{ color: '#8FB83D', borderColor: '#8FB83D' }}
                            >
                                    <div className="flex items-center gap-2 pr-12">
                                      <User className="h-4 w-4 transition-colors text-muted-foreground group-data-[state=open]:text-black" />
                                      <div className="text-left">
                                        <span className="font-medium text-foreground transition-colors group-data-[state=open]:text-black">{client.name}</span>
                                        <span className="text-sm text-muted-foreground ml-2 group-data-[state=open]:text-black/70">
                                          ({clientMachines.length})
                                        </span>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  
                                  <AccordionContent className="px-1 pb-1">
                                    {clientMachines.length > 0 ? (
                                      <div className="grid gap-3 mt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))' }}>
                                        {clientMachines.map(machine => (
                                          <MachineCard
                                            key={machine.id}
                                            machine={machine}
                                            onClick={() => onMachineClick(machine)}
                                            ownerName={client.name}
                                            onDelete={onDeleteMachine}
                                            onChangeOwner={onChangeOwner}
                                            onRename={onRename}
                                            showManagement={true}
                                            onNotificationChange={onNotificationChange}
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground text-center py-2">
                                        No machines for this client
                                      </p>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </div>
                          );
                        })}
                      </div>

                      {installerMachines.length === 0 && clients.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No machines or clients for this installer
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          );
        })}
      </div>
    );
  }

  // Standard company hierarchy view (for super_admin)
  return (
    <div className="grid gap-4 items-start transition-all duration-700 ease-in-out" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 25rem), 1fr))' }}>
      {displayCompanies.map(company => {
        const isExpanded = expandedCompany === company.id;
        const companyMachines = machines.filter(m => m.ownerId === company.id);
        const installers = users.filter(u => u.role === 'installer' && u.parentId === company.id);
        const installerIds = installers.map(i => i.id);
        const allClientsUnderCompany = users.filter(u => u.role === 'client' && installerIds.includes(u.parentId || ''));
        const totalClientsCount = allClientsUnderCompany.length;
        
        // Calculate total machines under company jurisdiction
        const installerMachines = machines.filter(m => installerIds.includes(m.ownerId));
        const clientIds = allClientsUnderCompany.map(c => c.id);
        const clientMachines = machines.filter(m => clientIds.includes(m.ownerId));
        const totalMachinesCount = companyMachines.length + installerMachines.length + clientMachines.length;
        
        const hasFailing = hasFailingMachines(company.id);

        return (
          <div 
            key={company.id} 
            ref={(el) => (companyRefs.current[company.id] = el)}
            className="transition-all duration-700 ease-in-out"
            style={{
              gridColumn: isExpanded ? '1 / -1' : 'auto',
              width: '100%'
            }}
          >
            <Accordion 
              key={`company-accordion-${company.id}-${expandedCompany}`}
              type="single"
              collapsible
              className="h-full"
              value={expandedCompany === company.id ? company.id : ""}
              onValueChange={(value) => {
                const isOpening = value && value.length > 0;
                setExpandedCompany(isOpening ? value : null);
                if (isOpening && companyRefs.current[value]) {
                  setTimeout(() => {
                    companyRefs.current[value]?.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'start' 
                    });
                  }, 50);
                }
              }}
            >
              <AccordionItem 
                value={company.id}
                className={`rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] backdrop-blur-sm shadow-xl h-full relative group ${
                  hasFailing 
                    ? 'border-2 border-destructive/60 shadow-[0_0_20px_hsl(var(--destructive)/0.2)]' 
                    : 'border border-border'
                }`}
              >
            {/* Lock dropdown for company management */}
            {(onDeleteUser || onReassignClient) && (
              <div className="absolute top-4 right-4 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onDeleteUser && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteUser(company.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Company
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <AccordionTrigger 
              className="px-6 py-4 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%] [&>svg]:text-foreground transition-all duration-300 hover:shadow-md rounded-md [&[data-state=open]]:bg-[#8FB83D] [&[data-state=open]]:text-white" 
              style={{ color: '#8FB83D', borderColor: '#8FB83D' }}
            >
              <div className="flex items-center gap-3 flex-1 pr-12">
                <Building2 className="h-5 w-5 text-[#8FB83D] group-data-[state=open]:text-black" />
                <div className="text-left flex-1">
                  <h3 className="text-lg font-semibold text-foreground group-data-[state=open]:text-black">{company.name}</h3>
                  <p className="text-sm text-muted-foreground group-data-[state=open]:text-black/70">
                    {totalMachinesCount} machines • {installers.length} installers • {totalClientsCount} clients
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-1 pb-1">
              <div className="space-y-2">
                <Accordion type="single" collapsible className="space-y-1">
                {/* Company's own machines */}
                {companyMachines.length > 0 && (
                  <AccordionItem
                    value={`${company.id}-machines`}
                    className="border border-border rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] shadow-lg mx-[3px] group"
                  >
                                  <AccordionTrigger 
                              className="px-4 py-3 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%] [&>svg]:text-foreground transition-all duration-300 hover:shadow-md rounded-md [&[data-state=open]]:bg-[#8FB83D] [&[data-state=open]]:text-white" 
                              style={{ color: '#8FB83D', borderColor: '#8FB83D' }}
                            >
                      <div className="flex items-center gap-2 pr-12">
                        <Building2 className="h-4 w-4 transition-colors text-[#8FB83D] group-data-[state=open]:text-black" />
                        <div className="text-left">
                          <span className="font-medium text-foreground transition-colors group-data-[state=open]:text-black">{company.name}'s Machines</span>
                          <span className="text-sm text-muted-foreground ml-2 group-data-[state=open]:text-black/70">
                            ({companyMachines.length})
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-1 pb-1">
                      <div className="grid gap-3 mt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))' }}>
                        {companyMachines.map(machine => (
                          <MachineCard
                            key={machine.id}
                            machine={machine}
                            onClick={() => onMachineClick(machine)}
                            ownerName={company.name}
                            onDelete={onDeleteMachine}
                            onChangeOwner={onChangeOwner}
                            onRename={onRename}
                            onChangeManufacturer={onChangeManufacturer}
                            showManagement={true}
                            onNotificationChange={onNotificationChange}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}


                {/* Installers under this company - Grid Layout */}
                </Accordion>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 21.875rem), 1fr))' }}>
                {installers.sort((a, b) => (a.id === expandedInstaller ? -1 : b.id === expandedInstaller ? 1 : 0)).map(installer => {
                  const installerMachines = machines.filter(m => m.ownerId === installer.id);
                  const clients = users.filter(u => u.role === 'client' && u.parentId === installer.id);
                  const clientIds = clients.map(c => c.id);
                  const clientMachines = machines.filter(m => clientIds.includes(m.ownerId));
                  const totalMachineCount = installerMachines.length + clientMachines.length;
                  const installerHasFailing = installerHasFailingMachines(installer.id);
                  
                  const isInstallerExpanded = expandedInstaller === installer.id;
                  
                  return (
                    <div
                      key={installer.id}
                      ref={(el) => (installerRefs.current[installer.id] = el)}
                      style={{
                        gridColumn: isInstallerExpanded ? '1 / -1' : 'auto',
                      }}
                    >
                    <Accordion
                      key={`installer-accordion-${installer.id}-${expandedInstaller}`}
                      type="single"
                      collapsible
                      value={expandedInstaller === installer.id ? installer.id : ""}
                      onValueChange={(value) => {
                        const isOpening = value && value.length > 0;
                        setExpandedInstaller(isOpening ? value : null);
                        if (isOpening && installerRefs.current[value]) {
                          setTimeout(() => {
                            installerRefs.current[value]?.scrollIntoView({ 
                              behavior: 'smooth', 
                              block: 'start' 
                            });
                          }, 50);
                        }
                      }}
                    >
                    <AccordionItem
                      value={installer.id}
                      className={`rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] shadow-lg relative group ${
                        installerHasFailing 
                          ? 'border-2 border-destructive/60 shadow-[0_0_15px_hsl(var(--destructive)/0.15)]' 
                          : 'border border-border'
                      }`}
                    >
                      {/* Lock dropdown for installer management */}
                      {(onDeleteUser || onReassignClient) && (
                        <div className="absolute top-3 right-3 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onReassignClient && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReassignClient(installer.id);
                                  }}
                                >
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Reassign Installer
                                </DropdownMenuItem>
                              )}
                              {onDeleteUser && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteUser(installer.id);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Installer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      
                                  <AccordionTrigger 
                              className="px-4 py-3 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%] [&>svg]:text-foreground transition-all duration-300 hover:shadow-md rounded-md [&[data-state=open]]:bg-[#8FB83D] [&[data-state=open]]:text-white" 
                              style={{ color: '#8FB83D', borderColor: '#8FB83D' }}
                            >
                        <div className="flex items-center gap-2 flex-1 pr-12">
                          <User className="h-4 w-4 transition-colors text-accent group-data-[state=open]:text-black" />
                          <div className="text-left flex-1">
                            <span className="font-medium text-foreground transition-colors group-data-[state=open]:text-black">{installer.name}</span>
                            <span className="text-sm text-muted-foreground ml-2 group-data-[state=open]:text-black/70">
                              ({totalMachineCount} machines • {clients.length} clients)
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      
                      <AccordionContent className="px-1 pb-1">
                        <div className="space-y-2">
                          <Accordion type="single" collapsible className="space-y-1">
                            {/* Installer's own machines */}
                            {installerMachines.length > 0 && (
                              <AccordionItem
                                value={`${installer.id}-machines`}
                                className="border border-border rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] shadow-lg mx-[2px] group"
                              >
                                <AccordionTrigger 
                              className="px-4 py-3 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%] [&>svg]:text-foreground transition-all duration-300 hover:shadow-md rounded-md [&[data-state=open]]:bg-[#8FB83D] [&[data-state=open]]:text-white" 
                              style={{ color: '#8FB83D', borderColor: '#8FB83D' }}
                            >
                                  <div className="flex items-center gap-2 pr-12">
                                    <User className="h-4 w-4 transition-colors text-muted-foreground group-data-[state=open]:text-black" />
                                    <div className="text-left">
                                      <span className="font-medium text-foreground transition-colors group-data-[state=open]:text-black">Uncategorized</span>
                                      <span className="text-sm text-muted-foreground ml-2 group-data-[state=open]:text-black/70">
                                        ({installerMachines.length})
                                      </span>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-1 pb-1">
                                  <div className="grid gap-3 mt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))' }}>
                                    {installerMachines.map(machine => (
                                      <MachineCard
                                        key={machine.id}
                                        machine={machine}
                                        onClick={() => onMachineClick(machine)}
                                        ownerName={installer.name}
                                        onDelete={onDeleteMachine}
                                        onChangeOwner={onChangeOwner}
                                        onRename={onRename}
                                        showManagement={true}
                                        onNotificationChange={onNotificationChange}
                                      />
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            )}

                            {/* Clients under this installer - Grid Layout */}
                            </Accordion>
                            <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 18.75rem), 1fr))' }}>
                            {clients.sort((a, b) => (a.id === expandedClient ? -1 : b.id === expandedClient ? 1 : 0)).map(client => {
                              const clientMachines = machines.filter(m => m.ownerId === client.id);
                              const clientHasFailing = clientHasFailingMachines(client.id);
                              const isClientExpanded = expandedClient === client.id;
                              
                              return (
                                <div
                                  key={client.id}
                                  ref={(el) => (clientRefs.current[client.id] = el)}
                                  style={{
                                    gridColumn: isClientExpanded ? '1 / -1' : 'auto',
                                  }}
                                >
                                <Accordion
                                  key={`client-accordion-${client.id}-${expandedClient}`}
                                  type="single"
                                  collapsible
                                  value={expandedClient === client.id ? client.id : ""}
                                  onValueChange={(value) => {
                                    const isOpening = value && value.length > 0;
                                    setExpandedClient(isOpening ? value : null);
                                    if (isOpening && clientRefs.current[value]) {
                                      setTimeout(() => {
                                        clientRefs.current[value]?.scrollIntoView({ 
                                          behavior: 'smooth', 
                                          block: 'start' 
                                        });
                                      }, 50);
                                    }
                                  }}
                                >
                                <AccordionItem
                                  value={client.id}
                                  className={`rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] shadow-lg relative group ${
                                    clientHasFailing 
                                      ? 'border-2 border-destructive/60 shadow-[0_0_10px_hsl(var(--destructive)/0.1)]'
                                      : 'border border-border'
                                  }`}
                                >
                                  {/* Lock dropdown for client management */}
                                  {(onDeleteUser || onReassignClient) && (
                                    <div className="absolute top-3 right-3 z-10">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                                          <Lock className="h-3 w-3 text-muted-foreground" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          {onReassignClient && (
                                            <DropdownMenuItem 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onReassignClient(client.id);
                                              }}
                                            >
                                              <UserCog className="mr-2 h-4 w-4" />
                                              Reassign Client
                                            </DropdownMenuItem>
                                          )}
                                          {onDeleteUser && (
                                            <DropdownMenuItem 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteUser(client.id);
                                              }}
                                              className="text-destructive"
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete Client
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                                  
                                  <AccordionTrigger 
                              className="px-4 py-3 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%] [&>svg]:text-foreground transition-all duration-300 hover:shadow-md rounded-md [&[data-state=open]]:bg-[#8FB83D] [&[data-state=open]]:text-white" 
                              style={{ color: '#8FB83D', borderColor: '#8FB83D' }}
                            >
                                    <div className="flex items-center gap-2 pr-12">
                                      <User className="h-4 w-4 transition-colors text-muted-foreground group-data-[state=open]:text-black" />
                                      <div className="text-left">
                                        <span className="font-medium text-foreground transition-colors group-data-[state=open]:text-black">{client.name}</span>
                                        <span className="text-sm text-muted-foreground ml-2 group-data-[state=open]:text-black/70">
                                          ({clientMachines.length})
                                        </span>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  
                                  <AccordionContent className="px-1 pb-1">
                                    {clientMachines.length > 0 ? (
                                      <div className="grid gap-3 mt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))' }}>
                                        {clientMachines.map(machine => (
                                          <MachineCard
                                            key={machine.id}
                                            machine={machine}
                                            onClick={() => onMachineClick(machine)}
                                            ownerName={client.name}
                                            onDelete={onDeleteMachine}
                                            onChangeOwner={onChangeOwner}
                                            onRename={onRename}
                                            showManagement={true}
                                            onNotificationChange={onNotificationChange}
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground text-center py-2">
                                        No machines for this client
                                      </p>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                                </Accordion>
                                </div>
                              );
                            })}
                            </div>


                          {installerMachines.length === 0 && clients.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No machines or clients for this installer
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    </Accordion>
                    </div>
                  );
                })}
                </div>

              {companyMachines.length === 0 && installers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No machines or installers for this company
                </p>
              )}
              </div>
            </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        );
      })}
    </div>
  );
};

export default UserHierarchyView;
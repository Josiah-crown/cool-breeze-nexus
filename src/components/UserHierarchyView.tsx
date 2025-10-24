import React from 'react';
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
  onDeleteUser?: (userId: string) => void;
  onReassignClient?: (userId: string) => void;
}

const UserHierarchyView: React.FC<UserHierarchyViewProps> = ({ users, machines, onMachineClick, onDeleteMachine, onChangeOwner, onRename, onDeleteUser, onReassignClient }) => {
  const companies = users.filter(u => u.role === 'company');

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {companies.map(company => {
        const companyMachines = machines.filter(m => m.ownerId === company.id);
        const installers = users.filter(u => u.role === 'installer' && u.parentId === company.id);
        const hasFailing = hasFailingMachines(company.id);

        return (
          <div key={company.id} className="h-full">
            <Accordion type="multiple" className="h-full">
              <AccordionItem 
                value={company.id}
                className={`border-2 rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] backdrop-blur-sm shadow-xl h-full relative ${
                  hasFailing 
                    ? 'border-destructive/60 shadow-[0_0_20px_hsl(var(--destructive)/0.2)]' 
                    : 'border-[hsl(var(--control-border))]'
                }`}
              >
            {/* Lock dropdown for company management */}
            {(onDeleteUser || onReassignClient) && (
              <div className="absolute top-4 right-4 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    {onDeleteUser && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteUser(company.id);
                        }}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Company
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <AccordionTrigger className="px-6 py-4 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%]">
              <div className="flex items-center gap-3 flex-1 pr-12">
                <Building2 className="h-5 w-5 text-primary" />
                <div className="text-left flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{company.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {companyMachines.length} machines • {installers.length} installers
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-1 gap-3">
                <Accordion type="multiple" className="space-y-3">
                {/* Company's own machines */}
                {companyMachines.length > 0 && (
                  <AccordionItem
                    value={`${company.id}-machines`}
                    className="border-2 border-[hsl(var(--control-border))] rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] shadow-lg"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%]">
                      <div className="flex items-center gap-2 pr-12">
                        <Building2 className="h-4 w-4 text-primary" />
                        <div className="text-left">
                          <span className="font-medium text-foreground">{company.name}'s Machines</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({companyMachines.length})
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {companyMachines.map(machine => (
                          <MachineCard
                            key={machine.id}
                            machine={machine}
                            onClick={() => onMachineClick(machine)}
                            ownerName={company.name}
                            onDelete={onDeleteMachine}
                            onChangeOwner={onChangeOwner}
                            onRename={onRename}
                            showManagement={true}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}


                {/* Installers under this company */}
                {installers.map(installer => {
                  const installerMachines = machines.filter(m => m.ownerId === installer.id);
                  const clients = users.filter(u => u.role === 'client' && u.parentId === installer.id);
                  const installerHasFailing = installerHasFailingMachines(installer.id);
                  
                  return (
                    <AccordionItem
                      key={installer.id}
                      value={installer.id}
                      className={`border-2 rounded-xl bg-gradient-to-br from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] shadow-lg relative ${
                        installerHasFailing 
                          ? 'border-destructive/60 shadow-[0_0_15px_hsl(var(--destructive)/0.15)]' 
                          : 'border-[hsl(var(--control-border))]'
                      }`}
                    >
                      {/* Lock dropdown for installer management */}
                      {(onDeleteUser || onReassignClient) && (
                        <div className="absolute top-3 right-3 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              {onReassignClient && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReassignClient(installer.id);
                                  }}
                                  className="cursor-pointer"
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
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Installer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      
                      <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:absolute [&>svg]:left-[75%]">
                        <div className="flex items-center gap-2 flex-1 pr-12">
                          <User className="h-4 w-4 text-accent" />
                          <div className="text-left flex-1">
                            <span className="font-medium text-foreground">{installer.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({installerMachines.length} machines • {clients.length} clients)
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                          {/* Installer's own machines */}
                          {installerMachines.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-2">{installer.name}'s Machines</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Clients under this installer */}
                          {clients.map(client => {
                            const clientMachines = machines.filter(m => m.ownerId === client.id);
                            const clientHasFailing = clientHasFailingMachines(client.id);
                            
                            return (
                              <div key={client.id} className={`border-2 rounded-lg p-3 ${
                                clientHasFailing 
                                  ? 'border-destructive/60 shadow-[0_0_10px_hsl(var(--destructive)/0.1)]'
                                  : 'border-border'
                              } relative`}>
                                {/* Lock dropdown for client management */}
                                {(onDeleteUser || onReassignClient) && (
                                  <div className="absolute top-2 right-2 z-10">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger className="p-1 hover:bg-accent rounded-md transition-colors">
                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-card border-border">
                                        {onReassignClient && (
                                          <DropdownMenuItem 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onReassignClient(client.id);
                                            }}
                                            className="cursor-pointer"
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
                                            className="cursor-pointer text-destructive focus:text-destructive"
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Client
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 mb-2 pr-8">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm font-medium text-foreground">{client.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({clientMachines.length} machines)
                                  </span>
                                </div>
                                
                                {clientMachines.length > 0 ? (
                                  <div className="grid grid-cols-1 gap-2">
                                    {clientMachines.map(machine => (
                                      <MachineCard
                                        key={machine.id}
                                        machine={machine}
                                        onClick={() => onMachineClick(machine)}
                                        ownerName={client.name}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    No machines for this client
                                  </p>
                                )}
                              </div>
                            );
                          })}

                          {installerMachines.length === 0 && clients.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No machines or clients for this installer
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

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
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { UserHierarchy } from '@/hooks/useMachineData';
import { MachineStatus } from '@/types/machine';
import MachineCard from './MachineCard';
import { Building2, User } from 'lucide-react';

interface UserHierarchyViewProps {
  users: UserHierarchy[];
  machines: MachineStatus[];
  onMachineClick: (machine: MachineStatus) => void;
}

const UserHierarchyView: React.FC<UserHierarchyViewProps> = ({ users, machines, onMachineClick }) => {
  const admins = users.filter(u => u.role === 'admin');

  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {admins.map(admin => {
        const adminMachines = machines.filter(m => m.ownerId === admin.id);
        const clients = users.filter(u => u.role === 'client' && u.parentId === admin.id);

        return (
          <AccordionItem 
            key={admin.id} 
            value={admin.id}
            className="border-2 border-primary/20 rounded-lg bg-card/50 backdrop-blur-sm"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-foreground">{admin.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {adminMachines.length} machines • {clients.length} clients
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <Accordion type="multiple" className="space-y-3">
                {/* Admin's own machines */}
                {adminMachines.length > 0 && (
                  <AccordionItem
                    value={`${admin.id}-machines`}
                    className="border border-border rounded-md bg-card"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <div className="text-left">
                          <span className="font-medium text-foreground">{admin.name}'s Machines</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({adminMachines.length})
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {adminMachines.map(machine => (
                          <MachineCard
                            key={machine.id}
                            machine={machine}
                            onClick={() => onMachineClick(machine)}
                            ownerName={admin.name}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}


                {/* Clients under this admin */}
                {clients.map(client => {
                  const clientMachines = machines.filter(m => m.ownerId === client.id);
                  
                  return (
                    <AccordionItem
                      key={client.id}
                      value={client.id}
                      className="border border-border rounded-md bg-card"
                    >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-accent" />
                              <div className="text-left">
                                <span className="font-medium text-foreground">{client.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({clientMachines.length} machines)
                                </span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            {clientMachines.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
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
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No machines for this client
                              </p>
                            )}
                          </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              {adminMachines.length === 0 && clients.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No machines or clients for this admin
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export default UserHierarchyView;

import React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MachineStatus } from "@/types/machine";
import type { UserHierarchy } from "@/hooks/useMachineData";
import MachineCard from "@/components/MachineCard";
import { useSiteMachineGroups } from "@/hooks/useSiteMachineGroups";

type Props = {
  machines: MachineStatus[];
  users: UserHierarchy[];
  onMachineClick: (m: MachineStatus) => void;
  onDeleteMachine?: (id: string) => void;
  onChangeOwner?: (id: string) => void;
  onRename?: (id: string) => void;
  onChangeManufacturer?: (id: string) => void;
  onNotificationChange?: () => void;
};

const DashboardSiteMachineSections: React.FC<Props> = ({
  machines,
  users,
  onMachineClick,
  onDeleteMachine,
  onChangeOwner,
  onRename,
  onChangeManufacturer,
  onNotificationChange,
}) => {
  const machineIds = machines.map((m) => m.id);
  const { groups, unassignedMachineIds, loading, error } = useSiteMachineGroups(machineIds);

  const machineById = React.useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines]);

  const renderMachineGrid = (ids: string[]) => {
    const list = ids.map((id) => machineById.get(id)).filter(Boolean) as MachineStatus[];
    if (list.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-3 px-2">
          No machines placed on this site yet. Pin machines on a building floorplan under Sites.
        </p>
      );
    }
    return (
      <div className="grid gap-3 sm:gap-4 pt-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))" }}>
        {list.map((machine) => {
          const owner = users.find((u) => u.id === machine.ownerId);
          return (
            <MachineCard
              key={machine.id}
              machine={machine}
              onClick={() => onMachineClick(machine)}
              ownerName={owner?.name}
              onDelete={onDeleteMachine}
              onChangeOwner={onChangeOwner}
              onRename={onRename}
              onChangeManufacturer={onChangeManufacturer}
              showManagement
              onNotificationChange={onNotificationChange}
            />
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-6">Loading sites…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error} — showing all machines without site grouping.
        <div className="mt-4 grid gap-3 sm:gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr))" }}>
          {machines.map((machine) => {
            const owner = users.find((u) => u.id === machine.ownerId);
            return (
              <MachineCard
                key={machine.id}
                machine={machine}
                onClick={() => onMachineClick(machine)}
                ownerName={owner?.name}
                onDelete={onDeleteMachine}
                onChangeOwner={onChangeOwner}
                onRename={onRename}
                onChangeManufacturer={onChangeManufacturer}
                showManagement
                onNotificationChange={onNotificationChange}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const sitesWithMachines = groups.filter((g) => g.machineIds.length > 0);
  const showEmptySites = groups.filter((g) => g.machineIds.length === 0 && machines.length > 0);

  return (
    <div className="space-y-4">
      {sitesWithMachines.map((g) => (
        <Collapsible key={g.siteId} defaultOpen className="group rounded-xl border border-border bg-card/60 shadow-sm">
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
              "hover:bg-muted/60 rounded-t-xl [&[data-state=open]]:bg-muted/80",
            )}
          >
            <div className="flex min-w-0 items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8FB83D]" />
              <div className="min-w-0">
                <div className="truncate font-semibold text-foreground">{g.siteName}</div>
                {g.siteAddress ? (
                  <div className="truncate text-xs text-muted-foreground">{g.siteAddress}</div>
                ) : null}
                <div className="text-xs text-muted-foreground">{g.machineIds.length} machines</div>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border px-3 pb-3">{renderMachineGrid(g.machineIds)}</CollapsibleContent>
        </Collapsible>
      ))}

      {unassignedMachineIds.length > 0 ? (
        <Collapsible defaultOpen className="group rounded-xl border border-dashed border-border bg-muted/20 shadow-sm">
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
              "hover:bg-muted/60 rounded-t-xl [&[data-state=open]]:bg-muted/80",
            )}
          >
            <div>
              <div className="font-semibold text-foreground">Not on a site map</div>
              <div className="text-xs text-muted-foreground">
                {unassignedMachineIds.length} machines — assign pins under Sites → Building → Floorplan
              </div>
            </div>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border px-3 pb-3">{renderMachineGrid(unassignedMachineIds)}</CollapsibleContent>
        </Collapsible>
      ) : null}

      {sitesWithMachines.length === 0 && unassignedMachineIds.length === 0 && machines.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No machines found</p>
          <p className="mt-2 text-sm">Use Add machine to create your first device.</p>
        </div>
      ) : null}

      {showEmptySites.length > 0 && (
        <p className="text-xs text-muted-foreground px-1">
          {showEmptySites.length} site{showEmptySites.length === 1 ? "" : "s"} have no pinned machines yet.
        </p>
      )}
    </div>
  );
};

export default DashboardSiteMachineSections;

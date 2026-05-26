import React, { useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MachineStatus } from "@/types/machine";
import type { UserHierarchy } from "@/hooks/useMachineData";
import MachineCard from "@/components/MachineCard";
import SortableMachineGrid from "@/components/SortableMachineGrid";
import { useSiteMachineGroups } from "@/hooks/useSiteMachineGroups";
import { useDashboardCardOrder } from "@/hooks/useDashboardCardOrder";
import {
  DASHBOARD_UNASSIGNED_GROUP_KEY,
  siteDashboardGroupKey,
} from "@/lib/dashboardCardOrder";

type Props = {
  machines: MachineStatus[];
  users: UserHierarchy[];
  onMachineClick: (m: MachineStatus) => void;
  onDeleteMachine?: (id: string) => void;
  onChangeOwner?: (id: string) => void;
  onRename?: (id: string) => void;
  onChangeManufacturer?: (id: string) => void;
  onNotificationChange?: () => void;
  showMachineManagement?: boolean;
};

const GRID_STYLE: React.CSSProperties = {
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 19.5rem), 1fr))",
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
  showMachineManagement = false,
}) => {
  const machineIds = machines.map((m) => m.id);
  const { groups, unassignedMachineIds, loading, error } = useSiteMachineGroups(machineIds);

  const groupKeys = useMemo(() => {
    const keys = groups.map((g) => siteDashboardGroupKey(g.siteId));
    if (unassignedMachineIds.length > 0) keys.push(DASHBOARD_UNASSIGNED_GROUP_KEY);
    return keys;
  }, [groups, unassignedMachineIds.length]);

  const { getOrderMap, saveOrder } = useDashboardCardOrder(groupKeys);

  const machineById = React.useMemo(() => new Map(machines.map((m) => [m.id, m])), [machines]);

  const cardProps = {
    machinesById: machineById,
    users,
    canReorder: showMachineManagement,
    onOrderSaved: saveOrder,
    onMachineClick,
    onDeleteMachine,
    onChangeOwner,
    onRename,
    onChangeManufacturer,
    onNotificationChange,
    showMachineManagement,
  };

  const emptySiteMessage = (
    <p className="text-sm text-muted-foreground py-3 px-2">
      No machines on this site yet. Go to Sites → select the site → Add machine to plan → tap the ERF image.
    </p>
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground py-6">Loading sites…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error} — showing all machines without site grouping.
        <div className="mt-4 grid gap-3 sm:gap-4 pt-2" style={GRID_STYLE}>
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
          <CollapsibleContent className="border-t border-border px-3 pb-3">
            <SortableMachineGrid
              groupKey={siteDashboardGroupKey(g.siteId)}
              machineIds={g.machineIds}
              orderByMachineId={getOrderMap(siteDashboardGroupKey(g.siteId))}
              emptyMessage={emptySiteMessage}
              {...cardProps}
            />
          </CollapsibleContent>
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
                {unassignedMachineIds.length} machines — place on the site ERF under Dashboard → Sites
              </div>
            </div>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border px-3 pb-3">
            <SortableMachineGrid
              groupKey={DASHBOARD_UNASSIGNED_GROUP_KEY}
              machineIds={unassignedMachineIds}
              orderByMachineId={getOrderMap(DASHBOARD_UNASSIGNED_GROUP_KEY)}
              {...cardProps}
            />
          </CollapsibleContent>
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

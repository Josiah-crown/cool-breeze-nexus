import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import MachineCard from "@/components/MachineCard";
import type { MachineStatus } from "@/types/machine";
import type { UserHierarchy } from "@/hooks/useMachineData";
import { applyDashboardCardOrder, type DashboardCardGroupKey } from "@/lib/dashboardCardOrder";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const GRID_STYLE: React.CSSProperties = {
  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 19.5rem), 1fr))",
};

type Props = {
  groupKey: DashboardCardGroupKey;
  machineIds: string[];
  machinesById: Map<string, MachineStatus>;
  users: UserHierarchy[];
  orderByMachineId: Map<string, number>;
  canReorder: boolean;
  onOrderSaved: (groupKey: DashboardCardGroupKey, orderedIds: string[]) => Promise<void>;
  onMachineClick: (m: MachineStatus) => void;
  onDeleteMachine?: (id: string) => void;
  onChangeOwner?: (id: string) => void;
  onRename?: (id: string) => void;
  onChangeManufacturer?: (id: string) => void;
  onNotificationChange?: () => void;
  showMachineManagement?: boolean;
  emptyMessage?: React.ReactNode;
};

const SortableMachineGrid: React.FC<Props> = ({
  groupKey,
  machineIds,
  machinesById,
  users,
  orderByMachineId,
  canReorder,
  onOrderSaved,
  onMachineClick,
  onDeleteMachine,
  onChangeOwner,
  onRename,
  onChangeManufacturer,
  onNotificationChange,
  showMachineManagement = false,
  emptyMessage,
}) => {
  const sortedIds = useMemo(
    () => applyDashboardCardOrder(machineIds, orderByMachineId),
    [machineIds, orderByMachineId],
  );

  const [localIds, setLocalIds] = useState(sortedIds);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const orderAtDragStartRef = useRef<string[]>([]);
  const localIdsRef = useRef(sortedIds);
  const didDragRef = useRef(false);

  useEffect(() => {
    setLocalIds(sortedIds);
    localIdsRef.current = sortedIds;
  }, [sortedIds]);

  useEffect(() => {
    localIdsRef.current = localIds;
  }, [localIds]);

  const persistOrder = useCallback(
    async (nextIds: string[]) => {
      setSaving(true);
      try {
        await onOrderSaved(groupKey, nextIds);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to save card order";
        toast.error(msg);
        setLocalIds(sortedIds);
      } finally {
        setSaving(false);
      }
    },
    [groupKey, onOrderSaved, sortedIds],
  );

  const reorder = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setLocalIds((prev) => {
      const fromIndex = prev.indexOf(fromId);
      const toIndex = prev.indexOf(toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromId);
      return next;
    });
  }, []);

  const handleDragStart = (e: React.DragEvent, machineId: string) => {
    if (!canReorder || saving) return;
    if (!(e.target as HTMLElement).closest("[data-drag-handle]")) {
      e.preventDefault();
      return;
    }
    didDragRef.current = false;
    orderAtDragStartRef.current = [...localIds];
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", machineId);
    setDragId(machineId);
  };

  const handleDragEnd = () => {
    const start = orderAtDragStartRef.current;
    const current = localIdsRef.current;
    setDragId(null);
    setDropTargetId(null);
    if (!canReorder) return;
    const changed =
      current.length !== start.length || current.some((id, i) => id !== start[i]);
    if (changed) {
      didDragRef.current = true;
      void persistOrder(current);
    }
  };

  const list = localIds.map((id) => machinesById.get(id)).filter(Boolean) as MachineStatus[];

  if (list.length === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null;
  }

  return (
    <div className="space-y-2">
      {canReorder ? (
        <p className="px-1 text-xs text-muted-foreground">
          Drag cards by the grip handle to set display order. Clients see this layout but cannot change it.
          {saving ? " Saving…" : null}
        </p>
      ) : null}
      <div className="grid gap-3 sm:gap-4 pt-2" style={GRID_STYLE}>
        {localIds.map((machineId) => {
          const machine = machinesById.get(machineId);
          if (!machine) return null;
          const owner = users.find((u) => u.id === machine.ownerId);
          const isDragging = dragId === machineId;
          const isDropTarget = dropTargetId === machineId && dragId !== machineId;

          return (
            <div
              key={machineId}
              draggable={canReorder && !saving}
              onDragStart={(e) => handleDragStart(e, machineId)}
              onDragEnd={() => void handleDragEnd()}
              onDragOver={(e) => {
                if (!canReorder || !dragId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dropTargetId !== machineId) setDropTargetId(machineId);
                if (dragId !== machineId) reorder(dragId, machineId);
              }}
              onDragLeave={() => {
                if (dropTargetId === machineId) setDropTargetId(null);
              }}
              className={cn(
                "relative rounded-xl transition-shadow",
                isDragging && "opacity-60 ring-2 ring-primary ring-offset-2",
                isDropTarget && "ring-2 ring-[#8FB83D]/70 ring-offset-1",
              )}
            >
              {canReorder ? (
                <div
                  data-drag-handle
                  className="absolute left-2 top-2 z-20 flex cursor-grab items-center rounded-md border border-border bg-card/95 p-1 text-muted-foreground shadow-sm active:cursor-grabbing"
                  title="Drag to reorder"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Drag to reorder {machine.name}</span>
                </div>
              ) : null}
              <MachineCard
                machine={machine}
                onClick={() => {
                  if (didDragRef.current) {
                    didDragRef.current = false;
                    return;
                  }
                  onMachineClick(machine);
                }}
                ownerName={owner?.name}
                onDelete={onDeleteMachine}
                onChangeOwner={onChangeOwner}
                onRename={onRename}
                onChangeManufacturer={onChangeManufacturer}
                showManagement={showMachineManagement}
                onNotificationChange={onNotificationChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SortableMachineGrid;

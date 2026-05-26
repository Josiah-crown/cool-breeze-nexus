import React, { useMemo, useRef } from "react";
import type { OutlinePointPct } from "@/lib/siteErfOutline";
import { pointerMovedBeyondTap } from "@/lib/erfCanvasPointer";
import { displayPositionForMachinePins, machinePinAccent, machineTypeIcon } from "@/lib/siteErfMachine";
import type { MachineType } from "@/types/machine";

export type SiteMachinePin = {
  id: string;
  machine_id: string;
  building_id: string | null;
  x_pct: number;
  y_pct: number;
};

type SiteErfMachinePinsProps = {
  pins: SiteMachinePin[];
  machineMetaById: Record<string, { name: string; type?: MachineType | string }>;
  orderedBuildingIds: string[];
  highlightedMachineId?: string | null;
  placingMachineId?: string | null;
  machineDragId?: string | null;
  machineDragPreview?: OutlinePointPct | null;
  placementPreview?: OutlinePointPct | null;
  placementPreviewBuildingId?: string | null;
  dragPreviewBuildingId?: string | null;
  hoverEnabled?: boolean;
  canDragPins?: boolean;
  onMachineClick?: (machineId: string) => void;
  onMachineHover?: (machineId: string, buildingId: string | null) => void;
  onMachineHoverEnd?: () => void;
  onPinPointerDown?: (evt: React.PointerEvent, machineId: string, x_pct: number, y_pct: number) => void;
  onPinDragStart?: (evt: React.DragEvent, machineId: string) => void;
  onPinDragEnd?: (evt: React.DragEvent, machineId: string) => void;
};

function MachinePinMarker({
  machineId,
  name,
  machineType,
  x_pct,
  y_pct,
  buildingId,
  orderedBuildingIds,
  isHighlighted,
  isDragging,
  isPlacing,
  isPlacementPreview = false,
  canDragPins,
  onMachineClick,
  hoverEnabled,
  onHover,
  onHoverEnd,
  onPointerDown,
  onDragStart,
  onDragEnd,
}: {
  machineId: string;
  name: string;
  machineType?: MachineType | string;
  x_pct: number;
  y_pct: number;
  buildingId: string | null;
  orderedBuildingIds: string[];
  isHighlighted: boolean;
  isDragging: boolean;
  isPlacing: boolean;
  isPlacementPreview?: boolean;
  canDragPins: boolean;
  onMachineClick?: (machineId: string) => void;
  hoverEnabled: boolean;
  onHover?: (machineId: string, buildingId: string | null) => void;
  onHoverEnd?: () => void;
  onPointerDown?: (evt: React.PointerEvent) => void;
  onDragStart?: (evt: React.DragEvent) => void;
  onDragEnd?: (evt: React.DragEvent) => void;
}) {
  const accent = machinePinAccent(buildingId, orderedBuildingIds);
  const Icon = machineTypeIcon(machineType);
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);

  const openFromTap = (e: React.SyntheticEvent) => {
    if (!onMachineClick) return;
    e.stopPropagation();
    onMachineClick(machineId);
  };

  return (
    <div
      data-erf-machine-pin={isPlacementPreview ? undefined : true}
      data-erf-placement-preview={isPlacementPreview ? true : undefined}
      data-erf-machine-hit={isPlacementPreview ? undefined : true}
      draggable={canDragPins && !isPlacementPreview}
      role={onMachineClick ? "button" : undefined}
      tabIndex={onMachineClick ? 0 : undefined}
      className={[
        "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center p-1",
        isPlacementPreview ? "pointer-events-none" : "pointer-events-auto",
        canDragPins
          ? "touch-none"
          : "touch-manipulation",
        canDragPins
          ? isDragging
            ? "cursor-grabbing z-20"
            : "cursor-grab active:cursor-grabbing"
          : "cursor-pointer z-20",
      ].join(" ")}
      style={{ left: `${x_pct}%`, top: `${y_pct}%` }}
      title={canDragPins ? `${name} — drag to reposition` : `${name} — tap to view live readings`}
      onPointerEnter={hoverEnabled ? () => onHover?.(machineId, buildingId) : undefined}
      onPointerLeave={hoverEnabled ? () => onHoverEnd?.() : undefined}
      onPointerDown={
        canDragPins
          ? onPointerDown
          : onMachineClick
            ? (e) => {
                tapStartRef.current = { x: e.clientX, y: e.clientY };
                e.stopPropagation();
              }
            : undefined
      }
      onPointerUp={
        !canDragPins && onMachineClick
          ? (e) => {
              const start = tapStartRef.current;
              tapStartRef.current = null;
              if (!start || pointerMovedBeyondTap(start, { x: e.clientX, y: e.clientY })) return;
              openFromTap(e);
            }
          : undefined
      }
      onDragStart={canDragPins ? onDragStart : undefined}
      onDragEnd={canDragPins ? onDragEnd : undefined}
      onKeyDown={
        onMachineClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onMachineClick(machineId);
              }
            }
          : undefined
      }
    >
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-lg border-2 bg-white shadow-md sm:h-8 sm:w-8",
          !isDragging && "transition-transform",
          isDragging ? "z-30 scale-105 ring-2 ring-primary ring-offset-1 shadow-lg" : "",
          !isDragging && (isHighlighted || isPlacing) ? "scale-110 ring-2 ring-offset-1" : "",
        ].join(" ")}
        style={{
          borderColor: accent.stroke,
          ...(!isDragging && (isHighlighted || isPlacing)
            ? { outlineColor: accent.stroke, boxShadow: `0 0 0 2px ${accent.stroke}44` }
            : {}),
        }}
      >
        <Icon className="h-4 w-4" style={{ color: accent.strokeDark }} aria-hidden />
      </div>
      {isHighlighted && !isDragging && (
        <span className="mt-0.5 max-w-[7rem] truncate rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-[#0D2211] shadow-sm">
          {name}
        </span>
      )}
    </div>
  );
}

const SiteErfMachinePins: React.FC<SiteErfMachinePinsProps> = ({
  pins,
  machineMetaById,
  orderedBuildingIds,
  highlightedMachineId = null,
  placingMachineId = null,
  machineDragId = null,
  machineDragPreview = null,
  placementPreview = null,
  placementPreviewBuildingId = null,
  dragPreviewBuildingId = null,
  hoverEnabled = true,
  canDragPins = true,
  onMachineClick,
  onMachineHover,
  onMachineHoverEnd,
  onPinPointerDown,
  onPinDragStart,
  onPinDragEnd,
}) => {
  const displayPositions = useMemo(() => displayPositionForMachinePins(pins), [pins]);

  return (
    <>
      {pins.map((p) => {
        const meta = machineMetaById[p.machine_id];
        const isDragging = machineDragId === p.machine_id;
        const stored = displayPositions.get(p.id) || { x_pct: p.x_pct, y_pct: p.y_pct };
        const pos = isDragging && machineDragPreview ? machineDragPreview : stored;
        const previewBuildingId =
          isDragging && machineDragPreview ? dragPreviewBuildingId : p.building_id;

        return (
          <MachinePinMarker
            key={p.id}
            machineId={p.machine_id}
            name={meta?.name || "Machine"}
            machineType={meta?.type}
            x_pct={pos.x_pct}
            y_pct={pos.y_pct}
            buildingId={previewBuildingId}
            orderedBuildingIds={orderedBuildingIds}
            isHighlighted={highlightedMachineId === p.machine_id}
            isDragging={isDragging}
            isPlacing={placingMachineId === p.machine_id}
            hoverEnabled={hoverEnabled && !placingMachineId && !isDragging}
            canDragPins={canDragPins}
            onMachineClick={onMachineClick}
            onHover={onMachineHover}
            onHoverEnd={onMachineHoverEnd}
            onPointerDown={(e) => onPinPointerDown?.(e, p.machine_id, p.x_pct, p.y_pct)}
            onDragStart={(e) => onPinDragStart?.(e, p.machine_id)}
            onDragEnd={(e) => onPinDragEnd?.(e, p.machine_id)}
          />
        );
      })}

      {placingMachineId && placementPreview && (
        <MachinePinMarker
          machineId={placingMachineId}
          name={machineMetaById[placingMachineId]?.name || "Machine"}
          machineType={machineMetaById[placingMachineId]?.type}
          x_pct={placementPreview.x_pct}
          y_pct={placementPreview.y_pct}
          buildingId={placementPreviewBuildingId}
          orderedBuildingIds={orderedBuildingIds}
          isHighlighted
          isDragging={false}
          isPlacing
          isPlacementPreview
          canDragPins={false}
          hoverEnabled={false}
        />
      )}
    </>
  );
};

export default SiteErfMachinePins;

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  OUTLINE_MIN_CORNERS,
  type OutlinePointPct,
  buildingOutlineColor,
  isNearOutlinePoint,
  outlineToSvgPoints,
  parsePolygonPct,
  rectToOutlinePolygon,
} from "@/lib/siteErfOutline";

function mutedFill(fill: string) {
  return fill.replace(/,\s*[\d.]+\)$/, ", 0.28)");
}

function highlightFill(fill: string) {
  return fill.replace(/,\s*[\d.]+\)$/, ", 0.62)");
}

export type BuildingOutlineShape = {
  id: string;
  building_id: string;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  label_override: string | null;
  polygon_pct?: unknown;
};

type SiteErfOutlineLayerProps = {
  shapes: BuildingOutlineShape[];
  draftPoints: OutlinePointPct[];
  hoverPoint: OutlinePointPct | null;
  placingBuildingId: string | null;
  orderedBuildingIds: string[];
  highlightedBuildingId?: string | null;
  onBuildingHover?: (buildingId: string) => void;
  onBuildingHoverEnd?: () => void;
  canCloseDraft?: boolean;
  onFinishOutline?: () => void;
  /** When true, building hit polygons are hidden so ERF taps reach the canvas (e.g. machine place mode). */
  suppressBuildingHits?: boolean;
};

function resolvePolygon(shape: BuildingOutlineShape): OutlinePointPct[] {
  const parsed = parsePolygonPct(shape.polygon_pct);
  if (parsed) return parsed;
  return rectToOutlinePolygon(shape.x_pct, shape.y_pct, shape.w_pct, shape.h_pct);
}

function CornerDot({ fill, stroke, isFirst, readyToClose }: { fill: string; stroke: string; isFirst?: boolean; readyToClose?: boolean }) {
  return (
    <span
      className={[
        "block h-2 w-2 shrink-0 rounded-full border border-white shadow-sm",
        isFirst && readyToClose ? "ring-2 ring-offset-1" : "",
      ].join(" ")}
      style={{
        backgroundColor: fill,
        borderColor: stroke,
        ...(isFirst && readyToClose ? { outlineColor: stroke } : {}),
      }}
    />
  );
}

const SiteErfOutlineLayer: React.FC<SiteErfOutlineLayerProps> = ({
  shapes,
  draftPoints,
  hoverPoint,
  placingBuildingId,
  orderedBuildingIds,
  highlightedBuildingId = null,
  onBuildingHover,
  onBuildingHoverEnd,
  canCloseDraft = false,
  onFinishOutline,
  suppressBuildingHits = false,
}) => {
  const buildingHoverEnabled = !placingBuildingId && !suppressBuildingHits && shapes.length > 0;
  const draftColor = useMemo(
    () => (placingBuildingId ? buildingOutlineColor(placingBuildingId, orderedBuildingIds) : null),
    [placingBuildingId, orderedBuildingIds],
  );

  const snapActive =
    canCloseDraft && hoverPoint != null && draftPoints.length >= OUTLINE_MIN_CORNERS && isNearOutlinePoint(hoverPoint, draftPoints[0], 6);

  const draftLines: OutlinePointPct[] =
    hoverPoint && draftPoints.length > 0 ? [...draftPoints, hoverPoint] : draftPoints;

  const draftPreviewPolygon =
    draftPoints.length >= OUTLINE_MIN_CORNERS ? outlineToSvgPoints(draftPoints) : null;

  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {shapes.map((s) => {
          const pts = resolvePolygon(s);
          const c = buildingOutlineColor(s.building_id, orderedBuildingIds);
          const isHighlighted = highlightedBuildingId === s.building_id;
          const dimOthers = highlightedBuildingId != null && !isHighlighted;
          return (
            <polygon
              key={s.id}
              points={outlineToSvgPoints(pts)}
              fill={isHighlighted ? highlightFill(c.fill) : dimOthers ? mutedFill(c.fill) : c.fill}
              stroke={c.stroke}
              strokeWidth={isHighlighted ? 1.15 : 0.55}
              vectorEffect="non-scaling-stroke"
              style={isHighlighted ? { filter: "drop-shadow(0 0 2px rgba(255,255,255,0.85))" } : undefined}
            />
          );
        })}

        {draftPreviewPolygon && draftColor && (
          <polygon
            points={draftPreviewPolygon}
            fill={snapActive ? draftColor.fill : mutedFill(draftColor.fill)}
            stroke={draftColor.stroke}
            strokeWidth={0.5}
            strokeDasharray={snapActive ? undefined : "1 0.6"}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {draftPoints.length >= 2 && draftColor && (
          <polyline
            points={outlineToSvgPoints(draftLines)}
            fill="none"
            stroke={draftColor.stroke}
            strokeWidth={0.65}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {canCloseDraft && draftPoints.length >= OUTLINE_MIN_CORNERS && draftColor && (
          <line
            x1={draftPoints[draftPoints.length - 1].x_pct}
            y1={draftPoints[draftPoints.length - 1].y_pct}
            x2={draftPoints[0].x_pct}
            y2={draftPoints[0].y_pct}
            stroke={snapActive ? "#FFFFFF" : draftColor.strokeDark}
            strokeWidth={snapActive ? 0.5 : 0.4}
            strokeDasharray={snapActive ? undefined : "0.6 0.5"}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {buildingHoverEnabled && (
        <svg
          className="absolute inset-0 z-[5] h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {shapes.map((s) => {
            const pts = resolvePolygon(s);
            return (
              <polygon
                key={`hit-${s.id}`}
                data-erf-building-hit
                points={outlineToSvgPoints(pts)}
                fill="transparent"
                stroke="transparent"
                className="cursor-pointer"
                onPointerEnter={() => onBuildingHover?.(s.building_id)}
                onPointerLeave={() => onBuildingHoverEnd?.()}
              />
            );
          })}
        </svg>
      )}

      {placingBuildingId &&
        draftColor &&
        draftPoints.map((p, i) => {
          const isFirst = i === 0;
          const readyToClose = isFirst && canCloseDraft;

          if (readyToClose) {
            return (
              <button
                key={`corner-${i}`}
                type="button"
                data-erf-outline-ui
                aria-label="Close shape — first corner"
                className="absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full"
                style={{ left: `${p.x_pct}%`, top: `${p.y_pct}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onFinishOutline?.();
                }}
              >
                <CornerDot fill={draftColor.stroke} stroke={draftColor.strokeDark} isFirst readyToClose />
              </button>
            );
          }

          return (
            <div
              key={`corner-${i}`}
              className="pointer-events-none absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${p.x_pct}%`, top: `${p.y_pct}%` }}
            >
              <CornerDot fill={draftColor.stroke} stroke={draftColor.strokeDark} />
            </div>
          );
        })}

      {placingBuildingId && (
        <div className="absolute left-3 top-3 z-20 max-w-[min(100%,20rem)] rounded-lg border border-black/10 bg-white/95 px-3 py-2 text-xs text-[#1A2B1C] shadow-sm">
          <div className="font-semibold text-[#1A2B1C]">Draw building outline</div>
          <div className="mt-1 flex items-center gap-2 text-[#1A2B1C]/85">
            <span
              className="h-3 w-3 shrink-0 rounded-sm border border-black/15"
              style={{ backgroundColor: draftColor?.fill, boxShadow: `inset 0 0 0 1px ${draftColor?.stroke}` }}
            />
            <span>Tap corners, then Finish or tap the first dot again.</span>
          </div>
          {draftPoints.length > 0 && (
            <div className="mt-1 text-[#1A2B1C]/75">
              {draftPoints.length} corner{draftPoints.length === 1 ? "" : "s"}
              {canCloseDraft ? " · ready to close" : " · need at least 3 corners"}
            </div>
          )}
          {canCloseDraft && onFinishOutline && (
            <Button
              type="button"
              size="sm"
              className="mt-2 h-8 w-full"
              style={{ backgroundColor: draftColor?.stroke, color: "#fff" }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onFinishOutline();
              }}
            >
              Finish building outline
            </Button>
          )}
        </div>
      )}
    </>
  );
};

export default SiteErfOutlineLayer;

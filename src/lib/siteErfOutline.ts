export type OutlinePointPct = { x_pct: number; y_pct: number };

export const OUTLINE_SNAP_THRESHOLD_PCT = 3;
export const OUTLINE_MIN_CORNERS = 3;

/** High-visibility on aerial / ERF imagery */
export const OUTLINE_STROKE = "#B8F04A";
export const OUTLINE_STROKE_DARK = "#5A7A18";
export const OUTLINE_FILL = "rgba(184, 240, 74, 0.42)";
export const OUTLINE_FILL_SAVED = "rgba(184, 240, 74, 0.38)";

export function isNearOutlinePoint(a: OutlinePointPct, b: OutlinePointPct, threshold = OUTLINE_SNAP_THRESHOLD_PCT) {
  return Math.hypot(a.x_pct - b.x_pct, a.y_pct - b.y_pct) <= threshold;
}

export function bboxFromOutlinePoints(points: OutlinePointPct[]) {
  const xs = points.map((p) => p.x_pct);
  const ys = points.map((p) => p.y_pct);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x_pct: minX,
    y_pct: minY,
    w_pct: Math.max(0.5, maxX - minX),
    h_pct: Math.max(0.5, maxY - minY),
  };
}

export function parsePolygonPct(raw: unknown): OutlinePointPct[] | null {
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const pts = raw
    .map((p) => {
      if (!p || typeof p !== "object") return null;
      const x = Number((p as { x_pct?: unknown }).x_pct);
      const y = Number((p as { y_pct?: unknown }).y_pct);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x_pct: x, y_pct: y };
    })
    .filter(Boolean) as OutlinePointPct[];
  return pts.length >= 3 ? pts : null;
}

export function rectToOutlinePolygon(x_pct: number, y_pct: number, w_pct: number, h_pct: number): OutlinePointPct[] {
  return [
    { x_pct, y_pct },
    { x_pct: x_pct + w_pct, y_pct },
    { x_pct: x_pct + w_pct, y_pct: y_pct + h_pct },
    { x_pct, y_pct: y_pct + h_pct },
  ];
}

export function outlineToSvgPoints(points: OutlinePointPct[]) {
  return points.map((p) => `${p.x_pct},${p.y_pct}`).join(" ");
}

export function outlineCentroid(points: OutlinePointPct[]): OutlinePointPct {
  const n = points.length;
  let x = 0;
  let y = 0;
  points.forEach((p) => {
    x += p.x_pct;
    y += p.y_pct;
  });
  return { x_pct: x / n, y_pct: y / n };
}

export function pointInPolygon(point: OutlinePointPct, polygon: OutlinePointPct[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x_pct;
    const yi = polygon[i].y_pct;
    const xj = polygon[j].x_pct;
    const yj = polygon[j].y_pct;
    const intersect =
      yi > point.y_pct !== yj > point.y_pct &&
      point.x_pct < ((xj - xi) * (point.y_pct - yi)) / (yj - yi + 0.0001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export type BuildingShapeForMatch = {
  building_id: string;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  polygon_pct?: unknown;
};

export function polygonFromBuildingShape(shape: BuildingShapeForMatch): OutlinePointPct[] {
  const parsed = parsePolygonPct(shape.polygon_pct);
  if (parsed) return parsed;
  return rectToOutlinePolygon(shape.x_pct, shape.y_pct, shape.w_pct, shape.h_pct);
}

/** Prefer building containing the point; otherwise nearest building centroid. */
export function nearestBuildingIdForPoint(point: OutlinePointPct, shapes: BuildingShapeForMatch[]): string | null {
  if (shapes.length === 0) return null;

  let containing: string | null = null;
  for (const s of shapes) {
    if (pointInPolygon(point, polygonFromBuildingShape(s))) {
      containing = s.building_id;
    }
  }
  if (containing) return containing;

  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const s of shapes) {
    const c = outlineCentroid(polygonFromBuildingShape(s));
    const d = Math.hypot(point.x_pct - c.x_pct, point.y_pct - c.y_pct);
    if (d < bestDist) {
      bestDist = d;
      bestId = s.building_id;
    }
  }
  return bestId;
}

export type BuildingOutlineColor = {
  stroke: string;
  fill: string;
  strokeDark: string;
};

/** Distinct fills on ERF imagery — one colour per building (legend in Buildings list). */
export const BUILDING_OUTLINE_PALETTE: BuildingOutlineColor[] = [
  { stroke: "#E53935", fill: "rgba(229, 57, 53, 0.48)", strokeDark: "#B71C1C" },
  { stroke: "#1E88E5", fill: "rgba(30, 136, 229, 0.48)", strokeDark: "#0D47A1" },
  { stroke: "#43A047", fill: "rgba(67, 160, 71, 0.48)", strokeDark: "#1B5E20" },
  { stroke: "#FB8C00", fill: "rgba(251, 140, 0, 0.48)", strokeDark: "#E65100" },
  { stroke: "#8E24AA", fill: "rgba(142, 36, 170, 0.48)", strokeDark: "#4A148C" },
  { stroke: "#00ACC1", fill: "rgba(0, 172, 193, 0.48)", strokeDark: "#006064" },
  { stroke: "#F4511E", fill: "rgba(244, 81, 30, 0.48)", strokeDark: "#BF360C" },
  { stroke: "#3949AB", fill: "rgba(57, 73, 171, 0.48)", strokeDark: "#1A237E" },
  { stroke: "#C0CA33", fill: "rgba(192, 202, 51, 0.48)", strokeDark: "#827717" },
  { stroke: "#D81B60", fill: "rgba(216, 27, 96, 0.48)", strokeDark: "#880E4F" },
];

function hashBuildingId(buildingId: string) {
  let h = 0;
  for (let i = 0; i < buildingId.length; i++) {
    h = (h * 31 + buildingId.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Stable colour from site building order (preferred) or id hash. */
export function buildingOutlineColor(buildingId: string, orderedBuildingIds: string[]): BuildingOutlineColor {
  const idx = orderedBuildingIds.indexOf(buildingId);
  const i = idx >= 0 ? idx : hashBuildingId(buildingId);
  return BUILDING_OUTLINE_PALETTE[i % BUILDING_OUTLINE_PALETTE.length];
}

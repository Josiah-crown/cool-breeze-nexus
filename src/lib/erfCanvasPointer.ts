/** Tap vs drag threshold (px) — touch and mouse */
export const ERF_TAP_MOVE_THRESHOLD_PX = 12;

export function pointerMovedBeyondTap(
  start: { x: number; y: number },
  end: { x: number; y: number },
  threshold = ERF_TAP_MOVE_THRESHOLD_PX,
) {
  return Math.hypot(end.x - start.x, end.y - start.y) > threshold;
}

export function outlineSnapThresholdPct(pointerType: string) {
  return pointerType === "touch" ? 8 : 5;
}

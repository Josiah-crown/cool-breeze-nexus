import { useState, useEffect, useRef } from 'react';

interface UseZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
}

export function useZoom(options: UseZoomOptions = {}) {
  const { minZoom = 0.25, maxZoom = 5.0, initialZoom = 1.0 } = options;
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPinchDistance = useRef<number | null>(null);
  const lastTouchTime = useRef<number>(0);

  // Pinch zoom detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        lastPinchDistance.current = distance;
        lastTouchTime.current = Date.now();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistance.current !== null) {
        e.preventDefault(); // Prevent default pinch zoom
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        
        const scale = distance / lastPinchDistance.current;
        setZoomLevel(prev => {
          const newZoom = prev * scale;
          return Math.max(minZoom, Math.min(maxZoom, newZoom));
        });
        
        lastPinchDistance.current = distance;
      }
    };

    const handleTouchEnd = () => {
      lastPinchDistance.current = null;
    };

    // Wheel zoom for desktop (Ctrl + wheel or pinch on trackpad)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoomLevel(prev => {
          const newZoom = prev * delta;
          return Math.max(minZoom, Math.min(maxZoom, newZoom));
        });
      }
    };

    // Ctrl+0 or Cmd+0 to reset zoom to 100%
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoomLevel(initialZoom);
      } else if (e.key === 'Escape') {
        setZoomLevel(initialZoom);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [minZoom, maxZoom, initialZoom]);

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(maxZoom, prev * 1.2));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(minZoom, prev / 1.2));
  };

  const resetZoom = () => {
    setZoomLevel(initialZoom);
  };

  return {
    zoomLevel,
    setZoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    containerRef,
  };
}

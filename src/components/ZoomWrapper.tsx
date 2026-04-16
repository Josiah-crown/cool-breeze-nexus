import { useZoom } from '@/hooks/useZoom';
import { useEffect } from 'react';

interface ZoomWrapperProps {
  children: React.ReactNode;
}

export const ZoomWrapper: React.FC<ZoomWrapperProps> = ({ children }) => {
  const { zoomLevel, containerRef } = useZoom({
    minZoom: 0.25,
    maxZoom: 5.0,
    initialZoom: 1.0,
  });

  // Apply CSS zoom property - behaves exactly like browser zoom with reflow
  useEffect(() => {
    if (containerRef.current) {
      // CSS zoom property triggers reflow and recalculation of layouts
      // Components will resize and reflow just like with Ctrl+/- browser zoom
      containerRef.current.style.zoom = zoomLevel.toString();
    }
  }, [zoomLevel, containerRef]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: '100vh',
        transition: 'zoom 0.1s ease-out',
      }}
    >
      {children}
    </div>
  );
};

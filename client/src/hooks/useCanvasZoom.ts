import { useState, useCallback, useRef, useEffect } from "react";

interface CanvasTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

interface UseCanvasZoomReturn {
  transform: CanvasTransform;
  zoom: (delta: number, centerX?: number, centerY?: number) => void;
  pan: (dx: number, dy: number) => void;
  reset: () => void;
  fitToScreen: (containerWidth: number, containerHeight: number, contentWidth: number, contentHeight: number) => void;
  setTransform: (t: CanvasTransform) => void;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const ZOOM_SPEED = 0.1;

export function useCanvasZoom(initialScale = 1): UseCanvasZoomReturn {
  const [transform, setTransform] = useState<CanvasTransform>({
    scale: initialScale,
    translateX: 0,
    translateY: 0,
  });

  const zoom = useCallback((delta: number, centerX = 0, centerY = 0) => {
    setTransform((prev) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + delta * ZOOM_SPEED));
      const scaleDiff = newScale - prev.scale;

      // Zoom towards center point
      const newTranslateX = prev.translateX - centerX * scaleDiff;
      const newTranslateY = prev.translateY - centerY * scaleDiff;

      return {
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      };
    });
  }, []);

  const pan = useCallback((dx: number, dy: number) => {
    setTransform((prev) => ({
      ...prev,
      translateX: prev.translateX + dx,
      translateY: prev.translateY + dy,
    }));
  }, []);

  const reset = useCallback(() => {
    setTransform({
      scale: initialScale,
      translateX: 0,
      translateY: 0,
    });
  }, [initialScale]);

  const fitToScreen = useCallback(
    (containerWidth: number, containerHeight: number, contentWidth: number, contentHeight: number) => {
      const scaleX = containerWidth / contentWidth;
      const scaleY = containerHeight / contentHeight;
      const newScale = Math.min(scaleX, scaleY, MAX_SCALE) * 0.9; // 90% to add padding

      const translateX = (containerWidth - contentWidth * newScale) / 2;
      const translateY = (containerHeight - contentHeight * newScale) / 2;

      setTransform({
        scale: newScale,
        translateX,
        translateY,
      });
    },
    []
  );

  return {
    transform,
    zoom,
    pan,
    reset,
    fitToScreen,
    setTransform,
  };
}

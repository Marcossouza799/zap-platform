import { useState, useCallback } from "react";

export interface DragItem {
  id: string;
  type: string;
  index: number;
  data?: Record<string, any>;
}

export interface DropZone {
  id: string;
  index: number;
  isOver: boolean;
}

interface UseDragDropReturn {
  draggedItem: DragItem | null;
  dropZones: Map<string, DropZone>;
  isDragging: boolean;
  
  // Actions
  startDrag: (item: DragItem) => void;
  endDrag: () => void;
  setDropZoneOver: (zoneId: string, isOver: boolean) => void;
  handleDrop: (zoneId: string, onReorder: (from: number, to: number) => void) => void;
  
  // Helpers
  isItemDragging: (itemId: string) => boolean;
  isZoneOver: (zoneId: string) => boolean;
}

export function useDragDrop(): UseDragDropReturn {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dropZones, setDropZones] = useState<Map<string, DropZone>>(new Map());
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = useCallback((item: DragItem) => {
    setDraggedItem(item);
    setIsDragging(true);
  }, []);

  const endDrag = useCallback(() => {
    setDraggedItem(null);
    setIsDragging(false);
    setDropZones(new Map());
  }, []);

  const setDropZoneOver = useCallback((zoneId: string, isOver: boolean) => {
    setDropZones(prev => {
      const newZones = new Map(prev);
      const zone = newZones.get(zoneId);
      if (zone) {
        newZones.set(zoneId, { ...zone, isOver });
      }
      return newZones;
    });
  }, []);

  const handleDrop = useCallback(
    (zoneId: string, onReorder: (from: number, to: number) => void) => {
      if (draggedItem) {
        const zone = dropZones.get(zoneId);
        if (zone) {
          onReorder(draggedItem.index, zone.index);
        }
      }
      endDrag();
    },
    [draggedItem, dropZones, endDrag]
  );

  const isItemDragging = useCallback(
    (itemId: string) => draggedItem?.id === itemId,
    [draggedItem]
  );

  const isZoneOver = useCallback(
    (zoneId: string) => dropZones.get(zoneId)?.isOver ?? false,
    [dropZones]
  );

  return {
    draggedItem,
    dropZones,
    isDragging,
    startDrag,
    endDrag,
    setDropZoneOver,
    handleDrop,
    isItemDragging,
    isZoneOver,
  };
}

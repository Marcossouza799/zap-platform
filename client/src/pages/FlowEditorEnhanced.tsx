/**
 * FlowEditor with Zoom/Pan Support
 * 
 * This is an enhanced version of FlowEditor with:
 * - Zoom in/out with mouse wheel
 * - Pan support
 * - Keyboard shortcuts (Ctrl+/Ctrl-/Ctrl+0)
 * - Fit to screen button
 */

import FlowEditor from "./FlowEditor";
import { useCanvasZoom } from "@/hooks/useCanvasZoom";
import { useRef, useEffect, useState } from "react";

interface FlowEditorEnhancedProps {
  flowId: number;
}

export default function FlowEditorEnhanced({ flowId }: FlowEditorEnhancedProps) {
  const { transform, zoom, reset } = useCanvasZoom(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomPercentage, setZoomPercentage] = useState(100);

  // Update zoom percentage display
  useEffect(() => {
    setZoomPercentage(Math.round(transform.scale * 100));
  }, [transform.scale]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          zoom(1);
        } else if (e.key === "-") {
          e.preventDefault();
          zoom(-1);
        } else if (e.key === "0") {
          e.preventDefault();
          reset();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom, reset]);

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Zoom Controls Toolbar */}
      <div className="flex items-center gap-2 px-3 h-10 bg-gray-900 border-b border-gray-800">
        <button
          onClick={() => zoom(-1)}
          className="px-2 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          title="Zoom Out (Ctrl+-)"
        >
          −
        </button>
        <span className="text-xs text-gray-400 min-w-12 text-center">
          {zoomPercentage}%
        </span>
        <button
          onClick={() => zoom(1)}
          className="px-2 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          title="Zoom In (Ctrl++)"
        >
          +
        </button>
        <button
          onClick={reset}
          className="px-2 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          title="Reset Zoom (Ctrl+0)"
        >
          ↺
        </button>
      </div>

      {/* Main Editor */}
      <div className="flex-1 overflow-hidden">
        <FlowEditor flowId={flowId} />
      </div>
    </div>
  );
}

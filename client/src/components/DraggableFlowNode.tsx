import { ReactNode, useRef, useEffect } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { DragItem } from "@/hooks/useDragDrop";

interface DraggableFlowNodeProps {
  id: string;
  index: number;
  type: string;
  title: string;
  description?: string;
  isDragging: boolean;
  isDropOver: boolean;
  onDragStart: (item: DragItem) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDelete?: () => void;
  children?: ReactNode;
  icon?: ReactNode;
  color?: string;
}

export function DraggableFlowNode({
  id,
  index,
  type,
  title,
  description,
  isDragging,
  isDropOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onDelete,
  children,
  icon,
  color = "#378add",
}: DraggableFlowNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ id, index, type }));
    
    // Create custom drag image
    if (nodeRef.current) {
      const img = new Image();
      img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E";
      e.dataTransfer.setDragImage(img, 0, 0);
    }

    onDragStart({ id, index, type });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    onDragEnd();
  };

  return (
    <div
      ref={nodeRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="zap-card transition-all"
      style={{
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? "scale(0.95)" : "scale(1)",
        borderLeft: `4px solid ${color}`,
        background: isDropOver ? "#0a1a1a" : "#0c0f18",
        cursor: "grab",
        userSelect: "none",
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Drop indicator */}
      {isDropOver && (
        <div
          style={{
            position: "absolute",
            top: -2,
            left: 0,
            right: 0,
            height: 2,
            background: "#25d366",
            borderRadius: "1px",
          }}
        />
      )}

      {/* Header with drag handle */}
      <div className="flex items-start gap-3 mb-3">
        <button
          draggable
          onDragStart={handleDragStart}
          className="flex-shrink-0 p-1 rounded hover:bg-gray-800 transition-colors"
          style={{
            cursor: "grab",
            color: "#5a5f7a",
            marginTop: 2,
          }}
          title="Arrastar para reorganizar"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {icon && <span style={{ color }}>{icon}</span>}
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#dde0ec" }}>
              {title}
            </h4>
            <span
              style={{
                fontSize: 10,
                color: "#5a5f7a",
                background: "#141720",
                padding: "2px 6px",
                borderRadius: 3,
              }}
            >
              #{index + 1}
            </span>
          </div>
          {description && (
            <p style={{ fontSize: 11, color: "#5a5f7a", margin: 0 }}>
              {description}
            </p>
          )}
        </div>

        {onDelete && (
          <button
            onClick={onDelete}
            className="flex-shrink-0 p-1 rounded hover:bg-red-900/20 transition-colors"
            style={{ color: "#ef4444", cursor: "pointer" }}
            title="Deletar nó"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      {children && <div className="mt-3">{children}</div>}

      {/* Type badge */}
      <div
        style={{
          fontSize: 10,
          color: "#5a5f7a",
          marginTop: 8,
          paddingTop: 8,
          borderTop: "1px solid #141720",
        }}
      >
        Tipo: <span style={{ color }}>{type}</span>
      </div>
    </div>
  );
}

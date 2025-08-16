// src/employee-app/inventory/components/DraggableItemCard.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ItemCard from './ItemCard';
import { InventoryItem, CustomCategory } from '../../types';

interface DraggableItemCardProps {
  item: InventoryItem;
  onUpdateCount: (itemId: number | string) => void;
  onReportWaste: (itemId: number | string) => void;
  showQuickActions?: boolean;
  customCategories?: CustomCategory[];
}

const DraggableItemCard: React.FC<DraggableItemCardProps> = ({
  item,
  onUpdateCount,
  onReportWaste,
  showQuickActions = true,
  customCategories = []
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id.toString() });

  const [touchHoldActive, setTouchHoldActive] = useState(false);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Touch hold delay in milliseconds
  const TOUCH_HOLD_DELAY = 500;
  const TOUCH_MOVE_THRESHOLD = 10; // pixels

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle single touch
    if (e.touches.length !== 1) return;

    const target = e.target as HTMLElement;
    
    // Don't start drag if touching a button or interactive element
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('input') || target.closest('select')) {
      return;
    }

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    
    // Start the hold timer
    touchTimeoutRef.current = setTimeout(() => {
      setTouchHoldActive(true);
      // Prevent scrolling once hold is activated
      if (e.currentTarget) {
        (e.currentTarget as HTMLElement).style.touchAction = 'none';
      }
    }, TOUCH_HOLD_DELAY);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Don't start drag if clicking a button or interactive element
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('input') || target.closest('select')) {
      return; // Let the button handle the click normally
    }

    // For non-button areas, allow DndKit to handle the mouse event
    if (listeners?.onMouseDown) {
      listeners.onMouseDown(e as any);
    }
  }, [listeners]);

  // Cleanup effect to ensure body styles are restored
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      // Multi-touch detected - allow scrolling and cancel hold
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
        touchTimeoutRef.current = null;
      }
      setTouchHoldActive(false);
      return;
    }

    const touch = e.touches[0];
    const startPos = touchStartRef.current;
    
    if (startPos) {
      const deltaX = Math.abs(touch.clientX - startPos.x);
      const deltaY = Math.abs(touch.clientY - startPos.y);
      
      // If user moves finger before hold completes, cancel the hold
      if (!touchHoldActive && (deltaX > TOUCH_MOVE_THRESHOLD || deltaY > TOUCH_MOVE_THRESHOLD)) {
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
          touchTimeoutRef.current = null;
        }
        // If mostly vertical movement, allow scrolling
        if (deltaY > deltaX * 1.5) {
          return;
        }
      }
    }

    // If touch hold is active, prevent default to block scrolling
    if (touchHoldActive) {
      e.preventDefault();
      e.stopPropagation();
      // Also prevent body scrolling during drag
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  }, [touchHoldActive]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clean up
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
    
    setTouchHoldActive(false);
    touchStartRef.current = null;
    
    // Restore touch action and scrolling
    if (e.currentTarget) {
      (e.currentTarget as HTMLElement).style.touchAction = '';
    }
    
    // Restore body scrolling
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }, []);

  // Create custom listeners that properly handle button interactions
  const customListeners = {
    // Exclude the original DndKit mouse events to prevent interference
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
    // Keep other listeners that don't interfere with button clicks
    ...(listeners && listeners.onKeyDown && {
      onKeyDown: listeners.onKeyDown as React.KeyboardEventHandler<HTMLDivElement>,
    }),
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: touchHoldActive ? 'none' : 'pan-y', // Allow vertical scrolling by default
    userSelect: touchHoldActive ? 'none' : 'auto', // Prevent text selection during drag
    // Additional CSS properties for better mobile interaction
    WebkitTouchCallout: touchHoldActive ? 'none' : 'default',
    WebkitUserSelect: touchHoldActive ? 'none' : 'auto',
    MozUserSelect: touchHoldActive ? 'none' : 'auto',
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${touchHoldActive ? 'select-none' : ''} ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...customListeners}
    >
      <ItemCard
        item={item}
        onUpdateCount={onUpdateCount}
        onReportWaste={onReportWaste}
        showQuickActions={showQuickActions}
        customCategories={customCategories}
      />
    </div>
  );
};

export default DraggableItemCard;
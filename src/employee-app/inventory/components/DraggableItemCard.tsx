// src/employee-app/inventory/components/DraggableItemCard.tsx
import React, { useRef, useState, useCallback } from 'react';
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
  const TOUCH_HOLD_DELAY = 400; // Reduced for better responsiveness
  const TOUCH_MOVE_THRESHOLD = 10; // pixels
  const VERTICAL_SCROLL_THRESHOLD = 15; // pixels - threshold for detecting vertical scroll intent
  const VERTICAL_SCROLL_RATIO = 2.0; // ratio for vertical vs horizontal movement to detect scroll

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
        if (deltaY > deltaX * VERTICAL_SCROLL_RATIO) {
          return;
        }
      }
      
      // Even if touch hold is active, check for strong vertical scroll intent
      if (touchHoldActive && deltaY > VERTICAL_SCROLL_THRESHOLD && deltaY > deltaX * VERTICAL_SCROLL_RATIO) {
        // User is trying to scroll vertically - cancel drag and allow scrolling
        setTouchHoldActive(false);
        if (e.currentTarget) {
          (e.currentTarget as HTMLElement).style.touchAction = 'pan-y';
        }
        return; // Don't prevent default - allow scrolling
      }
    }

    // If touch hold is active, prevent default to block scrolling
    if (touchHoldActive) {
      e.preventDefault();
      e.stopPropagation();
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
    
    // Restore touch action to allow vertical scrolling
    if (e.currentTarget) {
      (e.currentTarget as HTMLElement).style.touchAction = 'pan-y';
    }
  }, []);

  // Create custom listeners that include our touch handling
  const customListeners = {
    ...listeners,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: touchHoldActive ? 'none' : 'pan-y', // Allow vertical scrolling by default, disable only during active drag
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
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
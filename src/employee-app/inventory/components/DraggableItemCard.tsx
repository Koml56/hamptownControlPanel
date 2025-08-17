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

  // Helper function to check if target is a button or interactive element
  const isInteractiveElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    
    // Find the closest button element
    const closestButton = target.closest('button');
    
    // If we're not inside any button, allow dragging
    if (!closestButton) {
      return !!(
        target.closest('[role="button"]') || 
        target.closest('input') || 
        target.closest('select') ||
        target.closest('a') ||
        target.closest('[tabindex]') ||
        target.hasAttribute('onclick')
      );
    }
    
    // If we are inside a button, check if it's one of the action buttons within the card
    // These should prevent dragging: "Update Count" and "Report Waste" buttons
    const buttonText = closestButton.textContent?.trim() || '';
    const isActionButton = buttonText.includes('Update Count') || 
                          buttonText.includes('Report Waste') ||
                          !!closestButton.closest('.card-buttons');
    
    // Only prevent dragging for actual action buttons, not the card wrapper
    return isActionButton;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle single touch
    if (e.touches.length !== 1) return;

    const target = e.target as HTMLElement;
    
    // Don't start drag if touching a button or interactive element
    if (isInteractiveElement(target)) {
      // Don't call stopPropagation() - let button handle this normally
      return;
    }

    // Call dnd-kit handler first if it exists
    if (listeners?.onTouchStart) {
      listeners.onTouchStart(e);
    }

    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    
    // Start the hold timer - don't call preventDefault() immediately
    touchTimeoutRef.current = setTimeout(() => {
      setTouchHoldActive(true);
      // Prevent scrolling once hold is activated
      if (e.currentTarget) {
        (e.currentTarget as HTMLElement).style.touchAction = 'none';
      }
    }, TOUCH_HOLD_DELAY);
  }, [isInteractiveElement, listeners]);

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

    // Don't handle if touching interactive elements - let them handle it normally
    if (isInteractiveElement(e.target)) {
      return;
    }

    // Call dnd-kit handler
    if (listeners?.onTouchMove) {
      listeners.onTouchMove(e);
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

    // Only prevent default during actual drag movement, not on initial touch
    if (touchHoldActive) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [touchHoldActive, isInteractiveElement, listeners]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Don't handle if touching interactive elements - let them handle it normally
    if (isInteractiveElement(e.target)) {
      return;
    }

    // Call dnd-kit handler
    if (listeners?.onTouchEnd) {
      listeners.onTouchEnd(e);
    }

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
  }, [isInteractiveElement, listeners]);

  // Mouse event handlers to prevent drag on button clicks
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    console.log('🖱️ Custom mouse down handler called', e.target, isInteractiveElement(e.target));
    
    // Don't start drag if clicking on a button or interactive element
    if (isInteractiveElement(e.target)) {
      console.log('🔘 Interactive element detected, preventing drag');
      return;
    }

    console.log('📦 Non-interactive element, calling dnd-kit handler');
    // Call dnd-kit handler
    if (listeners?.onMouseDown) {
      listeners.onMouseDown(e);
    }
  }, [isInteractiveElement, listeners]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Don't handle if moving over interactive elements
    if (isInteractiveElement(e.target)) {
      return;
    }

    // Call dnd-kit handler
    if (listeners?.onMouseMove) {
      listeners.onMouseMove(e);
    }
  }, [isInteractiveElement, listeners]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Don't handle if releasing over interactive elements
    if (isInteractiveElement(e.target)) {
      return;
    }

    // Call dnd-kit handler
    if (listeners?.onMouseUp) {
      listeners.onMouseUp(e);
    }
  }, [isInteractiveElement, listeners]);

  // Pointer event handlers (dnd-kit might use these instead of mouse events)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    console.log('👆 Custom pointer down handler called', e.target, isInteractiveElement(e.target));
    
    // Don't start drag if clicking on a button or interactive element
    if (isInteractiveElement(e.target)) {
      console.log('🔘 Interactive element detected, preventing pointer drag');
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    console.log('📦 Non-interactive element, calling dnd-kit pointer handler');
    // Call dnd-kit handler
    if (listeners?.onPointerDown) {
      listeners.onPointerDown(e);
    }
  }, [isInteractiveElement, listeners]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Don't handle if moving over interactive elements
    if (isInteractiveElement(e.target)) {
      return;
    }

    // Call dnd-kit handler
    if (listeners?.onPointerMove) {
      listeners.onPointerMove(e);
    }
  }, [isInteractiveElement, listeners]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Don't handle if releasing over interactive elements
    if (isInteractiveElement(e.target)) {
      return;
    }

    // Call dnd-kit handler
    if (listeners?.onPointerUp) {
      listeners.onPointerUp(e);
    }
  }, [isInteractiveElement, listeners]);

  // Create custom listeners with conditional handling to prevent button interference
  const customListeners = {
    ...listeners,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
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
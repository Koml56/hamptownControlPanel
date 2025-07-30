// src/employee-app/inventory/components/ScrollPicker.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ScrollPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const ScrollPicker: React.FC<ScrollPickerProps> = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startTranslateY, setStartTranslateY] = useState(0);

  // Generate values array
  const values: number[] = [];
  for (let i = min; i <= max; i += step) {
    values.push(i);
  }

  const itemHeight = 48; // Height of each item in pixels
  const containerHeight = 192; // Total height of the picker

  // Calculate translate Y for a given value
  const getTranslateY = useCallback((targetValue: number) => {
    const index = values.indexOf(targetValue);
    if (index === -1) return 0;
    
    const centerOffset = containerHeight / 2 - itemHeight / 2;
    return centerOffset - index * itemHeight;
  }, [values, containerHeight, itemHeight]);

  // Get value from translate Y
  const getValueFromTranslateY = useCallback((translateY: number) => {
    const centerOffset = containerHeight / 2 - itemHeight / 2;
    const index = Math.round((centerOffset - translateY) / itemHeight);
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }, [values, containerHeight, itemHeight]);

  // Clamp translate Y to valid bounds
  const clampTranslateY = useCallback((translateY: number) => {
    const centerOffset = containerHeight / 2 - itemHeight / 2;
    const maxTranslateY = centerOffset;
    const minTranslateY = centerOffset - itemHeight * (values.length - 1);
    return Math.max(minTranslateY, Math.min(maxTranslateY, translateY));
  }, [values.length, containerHeight, itemHeight]);

  // Update position when value changes externally
  useEffect(() => {
    if (listRef.current && !isDragging) {
      const translateY = getTranslateY(value);
      listRef.current.style.transform = `translateY(${translateY}px)`;
    }
  }, [value, isDragging, getTranslateY]);

  // Handle mouse/touch start
  const handleStart = useCallback((clientY: number, event?: Event) => {
    // Prevent default behavior and stop propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setIsDragging(true);
    setStartY(clientY);
    
    if (listRef.current) {
      const style = window.getComputedStyle(listRef.current);
      const matrix = new DOMMatrix(style.transform);
      setStartTranslateY(matrix.m42);
      listRef.current.style.transition = 'none';
    }
  }, []);

  // Handle mouse/touch move
  const handleMove = useCallback((clientY: number, event?: Event) => {
    if (!isDragging || !listRef.current) return;
    
    // Prevent default behavior and stop propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const deltaY = clientY - startY;
    const newTranslateY = clampTranslateY(startTranslateY + deltaY);
    listRef.current.style.transform = `translateY(${newTranslateY}px)`;
  }, [isDragging, startY, startTranslateY, clampTranslateY]);

  // Handle mouse/touch end
  const handleEnd = useCallback((event?: Event) => {
    if (!isDragging || !listRef.current) return;
    
    // Prevent default behavior and stop propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setIsDragging(false);
    listRef.current.style.transition = 'transform 0.3s ease-in-out';
    
    // Snap to nearest value
    const style = window.getComputedStyle(listRef.current);
    const matrix = new DOMMatrix(style.transform);
    const currentTranslateY = matrix.m42;
    const newValue = getValueFromTranslateY(currentTranslateY);
    const snapTranslateY = getTranslateY(newValue);
    
    listRef.current.style.transform = `translateY(${snapTranslateY}px)`;
    onChange(newValue);
  }, [isDragging, getValueFromTranslateY, getTranslateY, onChange]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientY, e.nativeEvent);
  }, [handleStart]);

  // Global mouse event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY, e);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      handleEnd(e);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Touch events with proper prevention
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientY, e.nativeEvent);
    }
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 1 && isDragging) {
      handleMove(e.touches[0].clientY, e.nativeEvent);
    }
  }, [isDragging, handleMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    handleEnd(e.nativeEvent);
  }, [handleEnd]);

  // Prevent context menu on long press
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Note: Text selection is prevented via CSS properties instead of onSelectStart

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="relative h-48 overflow-hidden bg-white border-2 border-gray-200 rounded-xl touch-none select-none"
        style={{ 
          height: `${containerHeight}px`,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {/* Gradient overlays */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
        
        {/* Center highlight */}
        <div 
          className="absolute left-0 right-0 border-t border-b border-gray-300 pointer-events-none z-10"
          style={{ 
            top: `${containerHeight / 2 - itemHeight / 2}px`,
            height: `${itemHeight}px`
          }}
        />
        
        {/* Values list */}
        <div 
          ref={listRef}
          className="absolute left-0 right-0 transition-transform duration-300 ease-in-out touch-none select-none"
          style={{ 
            transform: `translateY(${getTranslateY(value)}px)`,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          {values.map((val, index) => {
            const isActive = val === value;
            return (
              <div
                key={val}
                className={`flex items-center justify-center transition-all duration-200 touch-none select-none ${
                  isActive 
                    ? 'text-black font-semibold text-xl' 
                    : 'text-gray-400 text-lg'
                }`}
                style={{ 
                  height: `${itemHeight}px`,
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
              >
                {val}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Value display */}
      <div className="mt-2 text-center">
        <span className="text-sm text-gray-600">Selected: </span>
        <span className="font-semibold text-gray-800">{value}</span>
      </div>
    </div>
  );
};

export default ScrollPicker;

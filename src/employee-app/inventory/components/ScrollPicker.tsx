// src/employee-app/inventory/components/ScrollPicker.tsx
import React, { useRef, useEffect, useState } from 'react';

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
  const getTranslateY = (targetValue: number) => {
    const index = values.indexOf(targetValue);
    if (index === -1) return 0;
    
    const centerOffset = containerHeight / 2 - itemHeight / 2;
    return centerOffset - index * itemHeight;
  };

  // Get value from translate Y
  const getValueFromTranslateY = (translateY: number) => {
    const centerOffset = containerHeight / 2 - itemHeight / 2;
    const index = Math.round((centerOffset - translateY) / itemHeight);
    return values[Math.max(0, Math.min(index, values.length - 1))];
  };

  // Clamp translate Y to valid bounds
  const clampTranslateY = (translateY: number) => {
    const centerOffset = containerHeight / 2 - itemHeight / 2;
    const maxTranslateY = centerOffset;
    const minTranslateY = centerOffset - itemHeight * (values.length - 1);
    return Math.max(minTranslateY, Math.min(maxTranslateY, translateY));
  };

  // Update position when value changes externally
  useEffect(() => {
    if (listRef.current && !isDragging) {
      const translateY = getTranslateY(value);
      listRef.current.style.transform = `translateY(${translateY}px)`;
    }
  }, [value, isDragging]);

  // Handle mouse/touch start
  const handleStart = (clientY: number) => {
    setIsDragging(true);
    setStartY(clientY);
    
    if (listRef.current) {
      const style = window.getComputedStyle(listRef.current);
      const matrix = new DOMMatrix(style.transform);
      setStartTranslateY(matrix.m42);
      listRef.current.style.transition = 'none';
    }

    // Prevent body scroll on mobile
    document.body.style.overflow = 'hidden';
  };

  // Handle mouse/touch move
  const handleMove = (clientY: number) => {
    if (!isDragging || !listRef.current) return;
    
    const deltaY = clientY - startY;
    const newTranslateY = clampTranslateY(startTranslateY + deltaY);
    listRef.current.style.transform = `translateY(${newTranslateY}px)`;
  };

  // Handle mouse/touch end
  const handleEnd = () => {
    if (!isDragging || !listRef.current) return;
    
    setIsDragging(false);
    listRef.current.style.transition = 'transform 0.3s ease-in-out';
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Snap to nearest value
    const style = window.getComputedStyle(listRef.current);
    const matrix = new DOMMatrix(style.transform);
    const currentTranslateY = matrix.m42;
    const newValue = getValueFromTranslateY(currentTranslateY);
    const snapTranslateY = getTranslateY(newValue);
    
    listRef.current.style.transform = `translateY(${snapTranslateY}px)`;
    onChange(newValue);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    handleStart(e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleMove(e.clientY);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleEnd();
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startY, startTranslateY]);

  // Touch events with proper scroll prevention
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      e.stopPropagation();
      handleStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      e.stopPropagation();
      handleMove(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleEnd();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="relative overflow-hidden bg-white border-2 border-gray-200 rounded-xl touch-none select-none"
        style={{ height: `${containerHeight}px` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          className="absolute left-0 right-0 transition-transform duration-300 ease-in-out"
          style={{ transform: `translateY(${getTranslateY(value)}px)` }}
        >
          {values.map((val, index) => {
            const isActive = val === value;
            return (
              <div
                key={val}
                className={`flex items-center justify-center transition-all duration-200 user-select-none ${
                  isActive 
                    ? 'text-black font-semibold text-xl' 
                    : 'text-gray-400 text-lg'
                }`}
                style={{ height: `${itemHeight}px` }}
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

export default ScrollPicker; React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="relative h-48 overflow-hidden bg-white border-2 border-gray-200 rounded-xl"
        style={{ height: `${containerHeight}px` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          className="absolute left-0 right-0 transition-transform duration-300 ease-in-out"
          style={{ transform: `translateY(${getTranslateY(value)}px)` }}
        >
          {values.map((val, index) => {
            const isActive = val === value;
            return (
              <div
                key={val}
                className={`flex items-center justify-center transition-all duration-200 ${
                  isActive 
                    ? 'text-black font-semibold text-xl' 
                    : 'text-gray-400 text-lg'
                }`}
                style={{ height: `${itemHeight}px` }}
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

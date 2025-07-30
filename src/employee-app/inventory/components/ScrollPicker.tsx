// ScrollPicker.tsx - Mobile-optimized scroll picker component
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ScrollPickerProps {
  values: (string | number)[];
  selectedValue?: string | number;
  onValueChange: (value: string | number, index: number) => void;
  placeholder?: string;
  className?: string;
  itemHeight?: number;
  visibleItems?: number;
  infiniteScroll?: boolean;
  disabled?: boolean;
  label?: string;
}

interface TouchData {
  startY: number;
  currentY: number;
  isDragging: boolean;
  velocity: number;
  lastTime: number;
  lastY: number;
}

const ScrollPicker: React.FC<ScrollPickerProps> = ({
  values,
  selectedValue,
  onValueChange,
  placeholder = "Select value",
  className = "",
  itemHeight = 50,
  visibleItems = 5,
  infiniteScroll = false,
  disabled = false,
  label
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchDataRef = useRef<TouchData>({
    startY: 0,
    currentY: 0,
    isDragging: false,
    velocity: 0,
    lastTime: 0,
    lastY: 0
  });
  const momentumRef = useRef<number>();

  // Find current selected index
  const selectedIndex = selectedValue !== undefined 
    ? values.findIndex(val => val === selectedValue)
    : -1;

  const [currentIndex, setCurrentIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Calculate total height and container height
  const totalHeight = values.length * itemHeight;
  const containerHeight = visibleItems * itemHeight;
  const maxScroll = totalHeight - containerHeight;

  // Update current index when selectedValue changes
  useEffect(() => {
    if (selectedValue !== undefined) {
      const newIndex = values.findIndex(val => val === selectedValue);
      if (newIndex >= 0 && newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        scrollToIndex(newIndex, false);
      }
    }
  }, [selectedValue, values]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number, animated: boolean = true) => {
    if (!scrollRef.current) return;

    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
    const targetScroll = clampedIndex * itemHeight;
    
    if (animated) {
      scrollRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    } else {
      scrollRef.current.style.transition = 'none';
    }
    
    scrollRef.current.style.transform = `translateY(-${targetScroll}px)`;
    
    // Clear transition after animation
    if (animated) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.style.transition = 'none';
        }
      }, 300);
    }
  }, [values.length, itemHeight]);

  // Handle value selection
  const selectValue = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
    setCurrentIndex(clampedIndex);
    onValueChange(values[clampedIndex], clampedIndex);
    scrollToIndex(clampedIndex);
  }, [values, onValueChange, scrollToIndex]);

  // Get scroll position from transform
  const getScrollPosition = (): number => {
    if (!scrollRef.current) return 0;
    const transform = scrollRef.current.style.transform;
    const match = transform.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
    return match ? Math.abs(parseFloat(match[1])) : 0;
  };

  // Set scroll position with transform
  const setScrollPosition = (position: number) => {
    if (!scrollRef.current) return;
    const clampedPosition = Math.max(0, Math.min(position, maxScroll));
    scrollRef.current.style.transform = `translateY(-${clampedPosition}px)`;
  };

  // Handle momentum scrolling
  const handleMomentum = (velocity: number) => {
    if (Math.abs(velocity) < 0.1) return;

    const friction = 0.95;
    let currentVelocity = velocity;
    let currentPosition = getScrollPosition();

    const animate = () => {
      currentVelocity *= friction;
      currentPosition += currentVelocity;

      if (currentPosition < 0) {
        currentPosition = 0;
        currentVelocity = 0;
      } else if (currentPosition > maxScroll) {
        currentPosition = maxScroll;
        currentVelocity = 0;
      }

      setScrollPosition(currentPosition);

      if (Math.abs(currentVelocity) > 0.1) {
        momentumRef.current = requestAnimationFrame(animate);
      } else {
        // Snap to nearest item
        const nearestIndex = Math.round(currentPosition / itemHeight);
        selectValue(nearestIndex);
        setIsScrolling(false);
      }
    };

    momentumRef.current = requestAnimationFrame(animate);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    
    // Prevent event propagation to stop main page scrolling
    e.stopPropagation();
    
    const touch = e.touches[0];
    const touchData = touchDataRef.current;
    
    // Cancel any ongoing momentum
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
    }

    touchData.startY = touch.clientY;
    touchData.currentY = touch.clientY;
    touchData.lastY = touch.clientY;
    touchData.isDragging = true;
    touchData.velocity = 0;
    touchData.lastTime = Date.now();
    
    setIsScrolling(true);
    
    // Remove any transition during dragging
    if (scrollRef.current) {
      scrollRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;
    
    // Prevent default behavior and stop propagation
    e.preventDefault();
    e.stopPropagation();
    
    const touchData = touchDataRef.current;
    if (!touchData.isDragging) return;

    const touch = e.touches[0];
    const deltaY = touchData.lastY - touch.clientY;
    const currentTime = Date.now();
    const timeDelta = currentTime - touchData.lastTime;

    if (timeDelta > 0) {
      touchData.velocity = deltaY / timeDelta;
    }

    touchData.currentY = touch.clientY;
    touchData.lastY = touch.clientY;
    touchData.lastTime = currentTime;

    // Update scroll position
    const currentPosition = getScrollPosition();
    const newPosition = currentPosition + deltaY;
    setScrollPosition(newPosition);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled) return;
    
    // Prevent event propagation
    e.stopPropagation();
    
    const touchData = touchDataRef.current;
    if (!touchData.isDragging) return;

    touchData.isDragging = false;

    // Apply momentum if there's enough velocity
    const absVelocity = Math.abs(touchData.velocity);
    if (absVelocity > 0.1) {
      handleMomentum(touchData.velocity * 10); // Amplify velocity for better feel
    } else {
      // Snap to nearest item
      const currentPosition = getScrollPosition();
      const nearestIndex = Math.round(currentPosition / itemHeight);
      selectValue(nearestIndex);
      setIsScrolling(false);
    }
  };

  // Mouse event handlers for desktop support
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    const touchData = touchDataRef.current;
    
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
    }

    touchData.startY = e.clientY;
    touchData.currentY = e.clientY;
    touchData.lastY = e.clientY;
    touchData.isDragging = true;
    touchData.velocity = 0;
    touchData.lastTime = Date.now();
    
    setIsScrolling(true);
    
    if (scrollRef.current) {
      scrollRef.current.style.transition = 'none';
    }
  };

  // Global mouse event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const touchData = touchDataRef.current;
      if (!touchData.isDragging || disabled) return;

      e.preventDefault();
      
      const deltaY = touchData.lastY - e.clientY;
      const currentTime = Date.now();
      const timeDelta = currentTime - touchData.lastTime;

      if (timeDelta > 0) {
        touchData.velocity = deltaY / timeDelta;
      }

      touchData.currentY = e.clientY;
      touchData.lastY = e.clientY;
      touchData.lastTime = currentTime;

      const currentPosition = getScrollPosition();
      const newPosition = currentPosition + deltaY;
      setScrollPosition(newPosition);
    };

    const handleMouseUp = () => {
      const touchData = touchDataRef.current;
      if (!touchData.isDragging || disabled) return;

      touchData.isDragging = false;

      const absVelocity = Math.abs(touchData.velocity);
      if (absVelocity > 0.1) {
        handleMomentum(touchData.velocity * 10);
      } else {
        const currentPosition = getScrollPosition();
        const nearestIndex = Math.round(currentPosition / itemHeight);
        selectValue(nearestIndex);
        setIsScrolling(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [disabled, selectValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current);
      }
    };
  }, []);

  // Handle click on specific item
  const handleItemClick = (index: number) => {
    if (disabled || isScrolling) return;
    selectValue(index);
  };

  // Calculate item opacity based on distance from center
  const getItemOpacity = (index: number): number => {
    const centerIndex = Math.floor(visibleItems / 2);
    const currentPosition = getScrollPosition();
    const currentScrollIndex = currentPosition / itemHeight;
    const distance = Math.abs(index - (currentScrollIndex + centerIndex));
    
    if (distance <= 1) return 1;
    if (distance <= 2) return 0.6;
    return 0.3;
  };

  // Calculate item scale based on distance from center
  const getItemScale = (index: number): number => {
    const centerIndex = Math.floor(visibleItems / 2);
    const currentPosition = getScrollPosition();
    const currentScrollIndex = currentPosition / itemHeight;
    const distance = Math.abs(index - (currentScrollIndex + centerIndex));
    
    if (distance <= 0.5) return 1;
    if (distance <= 1.5) return 0.95;
    return 0.9;
  };

  return (
    <div className={`scroll-picker ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div
        ref={containerRef}
        className={`relative bg-white border border-gray-300 rounded-lg overflow-hidden ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        }`}
        style={{
          height: containerHeight,
          touchAction: 'none', // Prevents browser scrolling
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Selection indicator */}
        <div
          className="absolute left-0 right-0 bg-blue-50 border-t border-b border-blue-200 pointer-events-none z-10"
          style={{
            top: Math.floor(visibleItems / 2) * itemHeight,
            height: itemHeight,
          }}
        />
        
        {/* Gradient overlays */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white to-transparent pointer-events-none z-20" />
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />
        
        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="relative"
          style={{
            paddingTop: Math.floor(visibleItems / 2) * itemHeight,
            paddingBottom: Math.floor(visibleItems / 2) * itemHeight,
          }}
        >
          {values.map((value, index) => (
            <div
              key={`${value}-${index}`}
              className={`flex items-center justify-center text-center transition-all duration-150 ${
                disabled ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${index === currentIndex ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
              style={{
                height: itemHeight,
                opacity: getItemOpacity(index),
                transform: `scale(${getItemScale(index)})`,
              }}
              onClick={() => handleItemClick(index)}
            >
              <span className="px-4 py-2 rounded-md transition-colors hover:bg-gray-50">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Selected value display */}
      <div className="mt-2 text-sm text-gray-600 text-center">
        Selected: <span className="font-medium text-gray-900">
          {selectedValue !== undefined ? selectedValue : placeholder}
        </span>
      </div>
    </div>
  );
};

export default ScrollPicker;

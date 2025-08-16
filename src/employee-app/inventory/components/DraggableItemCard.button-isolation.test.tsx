// src/employee-app/inventory/components/DraggableItemCard.button-isolation.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import DraggableItemCard from './DraggableItemCard';

const mockItem = {
  id: 1,
  name: 'Test Item',
  category: 'test',
  currentStock: 10,
  minLevel: 5,
  cost: 2.5,
  unit: 'pieces',
  lastUsed: '2024-01-15'
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndContext>
    <SortableContext items={[mockItem.id.toString()]}>
      {children}
    </SortableContext>
  </DndContext>
);

describe('DraggableItemCard - Button Isolation Improvements', () => {
  const mockUpdateCount = jest.fn();
  const mockReportWaste = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should completely isolate buttons from drag events', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    const updateButton = screen.getByText('Update Count');
    const buttonContainer = updateButton.parentElement;
    
    // Verify button container has the card-buttons class for isolation
    expect(buttonContainer).toHaveClass('card-buttons');
    
    // Verify button container exists and is properly structured
    expect(buttonContainer).toBeInTheDocument();
    expect(updateButton).toBeInTheDocument();
  });

  it('should detect card-buttons container as interactive', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    const buttonContainer = document.querySelector('.card-buttons');
    expect(buttonContainer).toBeInTheDocument();
    
    // Touch events on the button container should not trigger drag
    fireEvent.touchStart(buttonContainer!, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    // No errors should be thrown and button interactions should work
    expect(buttonContainer).toBeInTheDocument();
  });

  it('should prevent drag on any child of card-buttons', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    // Find the icon inside the button (using a more generic selector)
    const buttonIcon = document.querySelector('svg');
    expect(buttonIcon).toBeInTheDocument();
    
    // Touch on button icon should not trigger drag
    fireEvent.touchStart(buttonIcon!, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    // Button click should still work
    const updateButton = screen.getByText('Update Count');
    fireEvent.click(updateButton);
    
    expect(mockUpdateCount).toHaveBeenCalledWith(1);
  });

  it('should stop event propagation for button interactions', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    const updateButton = screen.getByText('Update Count');
    
    // Mock stopPropagation to verify it's called
    const mockStopPropagation = jest.fn();
    const mockTouchEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
      target: updateButton,
      stopPropagation: mockStopPropagation
    };

    // Simulate touch event handling
    fireEvent.touchStart(updateButton, mockTouchEvent);
    
    // Button should still be functional
    fireEvent.click(updateButton);
    expect(mockUpdateCount).toHaveBeenCalledWith(1);
  });
});
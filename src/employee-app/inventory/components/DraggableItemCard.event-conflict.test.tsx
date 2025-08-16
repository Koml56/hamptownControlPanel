// src/employee-app/inventory/components/DraggableItemCard.event-conflict.test.tsx
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

describe('DraggableItemCard - Event Conflict Analysis', () => {
  const mockUpdateCount = jest.fn();
  const mockReportWaste = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not prevent default or stop propagation for button clicks', () => {
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
    
    // Spy on event methods
    const preventDefaultSpy = jest.fn();
    const stopPropagationSpy = jest.fn();

    // Mock event with spies
    const mockEvent = {
      target: updateButton,
      currentTarget: updateButton,
      preventDefault: preventDefaultSpy,
      stopPropagation: stopPropagationSpy,
      clientX: 100,
      clientY: 100,
    };

    // Test mouse down event on button
    fireEvent.mouseDown(updateButton, mockEvent);

    // For buttons, preventDefault and stopPropagation should NOT be called
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(stopPropagationSpy).not.toHaveBeenCalled();
  });

  it('should handle touch events on buttons without interference', () => {
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
    
    // Create a touch event that should be allowed to bubble
    const touchEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
      target: updateButton,
      currentTarget: updateButton.closest('div'),
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };

    fireEvent.touchStart(updateButton, touchEvent);

    // For buttons, touch events should not be prevented
    expect(touchEvent.preventDefault).not.toHaveBeenCalled();
    expect(touchEvent.stopPropagation).not.toHaveBeenCalled();
  });

  it('should properly handle overlapping event listeners', () => {
    const { container } = render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    const cardElement = container.firstChild as HTMLElement;
    const updateButton = screen.getByText('Update Count');

    // Check that the card has the expected event listeners
    expect(cardElement).toBeInTheDocument();
    expect(updateButton).toBeInTheDocument();

    // Simulate the real-world scenario: mouse down on button
    fireEvent.mouseDown(updateButton);
    
    // Then try to click the button
    fireEvent.click(updateButton);
    
    // The button click should work
    expect(mockUpdateCount).toHaveBeenCalledWith(mockItem.id);
  });
});
// Test to reproduce button click issue
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

describe('Button Click Issue Reproduction', () => {
  const mockUpdateCount = jest.fn();
  const mockReportWaste = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow button clicks to work properly', () => {
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
    const reportWasteButton = screen.getByText('Report Waste');

    // Test normal click events
    fireEvent.click(updateButton);
    expect(mockUpdateCount).toHaveBeenCalledWith(1);

    fireEvent.click(reportWasteButton);
    expect(mockReportWaste).toHaveBeenCalledWith(1);

    // Test touch events on buttons (simulating mobile)
    jest.clearAllMocks();
    
    // Touch events should also work
    fireEvent.touchStart(updateButton);
    fireEvent.touchEnd(updateButton);
    fireEvent.click(updateButton); // Click usually follows touch events on mobile
    
    expect(mockUpdateCount).toHaveBeenCalledWith(1);
  });

  it('should handle touch-to-click sequence properly', () => {
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
    
    // Simulate mobile touch sequence
    const touchEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
      target: updateButton
    };
    
    fireEvent.touchStart(updateButton, touchEvent);
    fireEvent.touchEnd(updateButton, { changedTouches: [{ clientX: 100, clientY: 100 }] });
    
    // On mobile, a click event is typically synthesized after touchend
    fireEvent.click(updateButton);
    
    expect(mockUpdateCount).toHaveBeenCalledWith(1);
  });
});
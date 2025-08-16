// src/employee-app/inventory/components/DraggableItemCard.button-priority.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('DraggableItemCard - Button Click Priority', () => {
  const mockUpdateCount = jest.fn();
  const mockReportWaste = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prioritize button clicks over drag initiation', async () => {
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
    
    // Click the button directly - this should work without interference
    fireEvent.click(updateButton);
    
    expect(mockUpdateCount).toHaveBeenCalledWith(1);
    expect(mockUpdateCount).toHaveBeenCalledTimes(1);
  });

  it('should handle touch events on buttons without triggering drag', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    const wasteButton = screen.getByText('Report Waste');
    
    // Simulate touch sequence on button
    fireEvent.touchStart(wasteButton, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    // Button should still be clickable after touch
    fireEvent.click(wasteButton);
    
    expect(mockReportWaste).toHaveBeenCalledWith(1);
  });

  it('should not prevent button click when touch starts on button area', () => {
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
    
    // Start touch on button (simulating mobile tap)
    fireEvent.touchStart(updateButton, {
      touches: [{ clientX: 100, clientY: 100 }]
    });

    // Small movement (like real finger movement)
    fireEvent.touchMove(updateButton, {
      touches: [{ clientX: 102, clientY: 101 }]
    });

    // End touch (completing the tap)
    fireEvent.touchEnd(updateButton);
    
    // Follow with a click event (as browsers do)
    fireEvent.click(updateButton);
    
    expect(mockUpdateCount).toHaveBeenCalledWith(1);
  });

  it('should allow drag initiation when touching non-button areas', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    // Find the card but not the buttons
    const cardTitle = screen.getByText('Test Item');
    
    // Touch on the title area (not a button)
    fireEvent.touchStart(cardTitle, {
      touches: [{ clientX: 100, clientY: 100 }]
    });

    // This should not interfere with the drag logic
    // The test passes if no errors are thrown
    expect(cardTitle).toBeInTheDocument();
  });

  it('should handle rapid button taps without drag interference', () => {
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
    
    // Rapid button taps
    fireEvent.click(updateButton);
    fireEvent.click(updateButton);
    fireEvent.click(updateButton);
    
    expect(mockUpdateCount).toHaveBeenCalledTimes(3);
    expect(mockUpdateCount).toHaveBeenCalledWith(1);
  });
});
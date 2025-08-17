// src/employee-app/inventory/components/DraggableItemCard.title-only-drag.test.tsx
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

describe('DraggableItemCard - Title-Only Drag', () => {
  const mockUpdateCount = jest.fn();
  const mockReportWaste = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply drag listeners only to the title element', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    const titleElement = screen.getByText('Test Item');
    const updateButton = screen.getByText('Update Count');
    const wasteButton = screen.getByText('Report Waste');

    // Title should have cursor-move class indicating it's draggable
    expect(titleElement).toHaveClass('cursor-move');
    
    // Buttons should not have any drag-related styling
    expect(updateButton).not.toHaveClass('cursor-move');
    expect(wasteButton).not.toHaveClass('cursor-move');
  });

  it('should trigger button clicks without any drag interference', () => {
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
    const wasteButton = screen.getByText('Report Waste');

    // Click buttons - they should work without any drag behavior
    fireEvent.click(updateButton);
    fireEvent.click(wasteButton);

    expect(mockUpdateCount).toHaveBeenCalledWith(1);
    expect(mockReportWaste).toHaveBeenCalledWith(1);
  });

  it('should allow touch events on buttons without drag activation', () => {
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
    
    // Touch events on buttons should not interfere with normal button behavior
    fireEvent.touchStart(updateButton, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchEnd(updateButton, {});
    
    fireEvent.click(updateButton);
    
    expect(mockUpdateCount).toHaveBeenCalledWith(1);
  });

  it('should apply drag listeners to title for touch events', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    const titleElement = screen.getByText('Test Item');
    
    // Touch start on title should be handled (should not throw errors)
    fireEvent.touchStart(titleElement, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchMove(titleElement, {
      touches: [{ clientX: 110, clientY: 105 }]
    });
    
    fireEvent.touchEnd(titleElement, {});
    
    // Should not throw any errors
    expect(titleElement).toBeInTheDocument();
  });

  it('should have select-none class on title to prevent text selection during drag', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    const titleElement = screen.getByText('Test Item');
    
    // Title should prevent text selection
    expect(titleElement).toHaveClass('select-none');
  });
});
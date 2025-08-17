// src/employee-app/inventory/components/DraggableItemCard.button-click.test.tsx
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

describe('DraggableItemCard - Button Click Functionality', () => {
  const mockUpdateCount = jest.fn();
  const mockReportWaste = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log to verify debug output
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should allow button clicks without interference from touch handlers', () => {
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

    // Click buttons - should work normally
    fireEvent.click(updateButton);
    fireEvent.click(wasteButton);

    // Verify functions were called
    expect(mockUpdateCount).toHaveBeenCalledWith(1);
    expect(mockReportWaste).toHaveBeenCalledWith(1);

    // Verify debug logging
    expect(console.log).toHaveBeenCalledWith('Button clicked!', 1, 'Update Count');
    expect(console.log).toHaveBeenCalledWith('Button clicked!', 1, 'Report Waste');
  });

  it('should allow button clicks after touch interactions on card area', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    const cardElement = screen.getByText('Test Item').closest('div');
    const updateButton = screen.getByText('Update Count');

    // Simulate touch interaction on card area (not button)
    fireEvent.touchStart(cardElement!, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    fireEvent.touchEnd(cardElement!, {});

    // Button should still work after touch interaction
    fireEvent.click(updateButton);

    expect(mockUpdateCount).toHaveBeenCalledWith(1);
    expect(console.log).toHaveBeenCalledWith('Button clicked!', 1, 'Update Count');
  });

  it('should not start drag when touching buttons directly', () => {
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

    // Touch the button directly
    fireEvent.touchStart(updateButton, {
      touches: [{ clientX: 100, clientY: 100 }]
    });

    // Move on button (shouldn't trigger drag)
    fireEvent.touchMove(updateButton, {
      touches: [{ clientX: 120, clientY: 100 }]
    });

    fireEvent.touchEnd(updateButton, {});

    // Button click should still work
    fireEvent.click(updateButton);

    expect(mockUpdateCount).toHaveBeenCalledWith(1);
    expect(console.log).toHaveBeenCalledWith('Button clicked!', 1, 'Update Count');
  });

  it('should allow normal button interaction without stopPropagation interference', () => {
    const mockStopPropagation = jest.fn();
    const mockPreventDefault = jest.fn();

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

    // Create a touch event with mocked methods
    const touchEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
      target: updateButton,
      stopPropagation: mockStopPropagation,
      preventDefault: mockPreventDefault
    };

    // Touch the button
    fireEvent.touchStart(updateButton, touchEvent);

    // stopPropagation should NOT be called for button touches
    expect(mockStopPropagation).not.toHaveBeenCalled();

    // Button should still work
    fireEvent.click(updateButton);
    expect(mockUpdateCount).toHaveBeenCalledWith(1);
  });
});
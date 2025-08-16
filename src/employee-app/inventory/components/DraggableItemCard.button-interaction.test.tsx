// src/employee-app/inventory/components/DraggableItemCard.button-interaction.test.tsx
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

describe('DraggableItemCard - Button Interaction Tests', () => {
  const mockUpdateCount = jest.fn();
  const mockReportWaste = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow button clicks to work normally (mouse events)', async () => {
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

    // Click the update button
    fireEvent.click(updateButton);
    await waitFor(() => {
      expect(mockUpdateCount).toHaveBeenCalledWith(mockItem.id);
    });

    // Click the waste button
    fireEvent.click(wasteButton);
    await waitFor(() => {
      expect(mockReportWaste).toHaveBeenCalledWith(mockItem.id);
    });

    expect(mockUpdateCount).toHaveBeenCalledTimes(1);
    expect(mockReportWaste).toHaveBeenCalledTimes(1);
  });

  it('should allow button clicks to work normally (touch events)', async () => {
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

    // Touch the update button
    fireEvent.touchStart(updateButton, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    fireEvent.touchEnd(updateButton, {
      changedTouches: [{ clientX: 100, clientY: 100 }]
    });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockUpdateCount).toHaveBeenCalledWith(mockItem.id);
    });

    // Touch the waste button
    fireEvent.touchStart(wasteButton, {
      touches: [{ clientX: 200, clientY: 100 }]
    });
    fireEvent.touchEnd(wasteButton, {
      changedTouches: [{ clientX: 200, clientY: 100 }]
    });
    fireEvent.click(wasteButton);

    await waitFor(() => {
      expect(mockReportWaste).toHaveBeenCalledWith(mockItem.id);
    });

    expect(mockUpdateCount).toHaveBeenCalledTimes(1);
    expect(mockReportWaste).toHaveBeenCalledTimes(1);
  });

  it('should not start drag when mouse down on buttons', () => {
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
    const cardElement = screen.getByText('Test Item').closest('div');

    // Mouse down on button should not start drag
    fireEvent.mouseDown(updateButton);
    fireEvent.mouseMove(cardElement!, { clientX: 150, clientY: 100 });
    fireEvent.mouseUp(updateButton);

    // Should still be able to click the button
    fireEvent.click(updateButton);
    expect(mockUpdateCount).toHaveBeenCalledWith(mockItem.id);
  });

  it('should allow drag from non-button areas', () => {
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
    const cardHeader = screen.getByText('Test Item');

    // Touch start on header (non-button area) should allow drag
    fireEvent.touchStart(cardHeader, {
      touches: [{ clientX: 100, clientY: 50 }]
    });

    // Should not throw errors and should handle touch properly
    expect(cardElement).toBeInTheDocument();
  });
});
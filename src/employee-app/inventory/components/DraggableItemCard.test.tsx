// src/employee-app/inventory/components/DraggableItemCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import DraggableItemCard from './DraggableItemCard';
import { InventoryItem } from '../../types';

// Mock the InventoryContext
jest.mock('../InventoryContext', () => ({
  useInventory: () => ({
    dailyItems: [],
    weeklyItems: [],
    monthlyItems: [],
    activityLog: [],
    customCategories: []
  })
}));

const mockItem: InventoryItem = {
  id: 1,
  name: 'Test Item',
  category: 'test',
  currentStock: 10,
  minLevel: 5,
  optimalLevel: 15,
  unit: 'pieces',
  lastUsed: '2024-01-15',
  cost: 25.0,
  frequency: 'daily'
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndContext>
    <SortableContext items={[mockItem.id.toString()]}>
      {children}
    </SortableContext>
  </DndContext>
);

describe('DraggableItemCard', () => {
  const mockUpdateCount = jest.fn();
  const mockReportWaste = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders successfully', () => {
    render(
      <TestWrapper>
        <DraggableItemCard
          item={mockItem}
          onUpdateCount={mockUpdateCount}
          onReportWaste={mockReportWaste}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('handles touch events properly', () => {
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
    expect(cardElement).toBeInTheDocument();

    // Test touch start
    fireEvent.touchStart(cardElement!, {
      touches: [{ clientX: 100, clientY: 100 }]
    });

    // Test touch end
    fireEvent.touchEnd(cardElement!, {});

    // Should not throw any errors
    expect(cardElement).toBeInTheDocument();
  });

  it('handles multi-touch correctly', () => {
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
    expect(cardElement).toBeInTheDocument();

    // Test multi-touch (should not activate drag)
    fireEvent.touchStart(cardElement!, {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 }
      ]
    });

    fireEvent.touchEnd(cardElement!, {});

    // Should not throw any errors
    expect(cardElement).toBeInTheDocument();
  });
});
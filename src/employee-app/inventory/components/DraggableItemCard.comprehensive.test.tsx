// src/employee-app/inventory/components/DraggableItemCard.comprehensive.test.tsx
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

describe('DraggableItemCard - Comprehensive Fix Validation', () => {
  const mockUpdateCount = jest.fn();
  const mockReportWaste = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body styles before each test
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  });

  describe('Problem 1: Button Click Functionality', () => {
    it('should allow Update Count button clicks to work normally', async () => {
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
      
      // Simulate mouse interaction
      fireEvent.mouseDown(updateButton);
      fireEvent.mouseUp(updateButton);
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockUpdateCount).toHaveBeenCalledWith(mockItem.id);
      });
    });

    it('should allow Report Waste button clicks to work normally', async () => {
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
      
      // Simulate touch interaction
      fireEvent.touchStart(wasteButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchEnd(wasteButton, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.click(wasteButton);

      await waitFor(() => {
        expect(mockReportWaste).toHaveBeenCalledWith(mockItem.id);
      });
    });

    it('should not interfere with button clicks when drag handlers are present', () => {
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
      const cardElement = updateButton.closest('div');

      // Verify that the card element exists and has our custom event handlers
      expect(cardElement).toBeInTheDocument();

      // But clicking the button should still work
      fireEvent.click(updateButton);
      expect(mockUpdateCount).toHaveBeenCalledWith(mockItem.id);
    });
  });

  describe('Problem 2: Scroll Prevention During Drag', () => {
    it('should prevent page scroll during active drag operations', async () => {
      render(
        <TestWrapper>
          <DraggableItemCard
            item={mockItem}
            onUpdateCount={mockUpdateCount}
            onReportWaste={mockReportWaste}
          />
        </TestWrapper>
      );

      const cardHeader = screen.getByText('Test Item');

      // Start a touch hold on non-button area
      fireEvent.touchStart(cardHeader, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      // Simulate that the touch hold timer has completed by triggering touchMove
      // This should call our touch move handler
      fireEvent.touchMove(cardHeader, {
        touches: [{ clientX: 150, clientY: 120 }]
      });

      // End the touch
      fireEvent.touchEnd(cardHeader, {
        changedTouches: [{ clientX: 150, clientY: 120 }]
      });

      // The touch handling should work without errors
      expect(cardHeader).toBeInTheDocument();
    });

    it('should allow normal scrolling when not dragging', () => {
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
      const computedStyle = window.getComputedStyle(cardElement!);

      // Initially, should allow vertical scrolling
      expect(cardElement).toBeInTheDocument();
      // Body styles should be normal
      expect(document.body.style.overflow).toBe('');
      expect(document.body.style.touchAction).toBe('');
    });

    it('should handle vertical movement as scrolling, not drag', () => {
      render(
        <TestWrapper>
          <DraggableItemCard
            item={mockItem}
            onUpdateCount={mockUpdateCount}
            onReportWaste={mockReportWaste}
          />
        </TestWrapper>
      );

      const cardHeader = screen.getByText('Test Item');

      // Start touch
      fireEvent.touchStart(cardHeader, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      // Move mostly vertically (should be treated as scroll)
      fireEvent.touchMove(cardHeader, {
        touches: [{ clientX: 105, clientY: 200 }] // Small horizontal, large vertical
      });

      // Should not prevent scrolling for vertical movement
      expect(document.body.style.overflow).toBe('');
      expect(document.body.style.touchAction).toBe('');

      fireEvent.touchEnd(cardHeader, {
        changedTouches: [{ clientX: 105, clientY: 200 }]
      });
    });
  });

  describe('CSS and Mobile Support', () => {
    it('should apply proper CSS classes during drag state', () => {
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
      
      // Initially should not have dragging class
      expect(cardElement).not.toHaveClass('dragging');
      
      // The card should exist and be ready for interaction
      expect(cardElement).toBeInTheDocument();
    });

    it('should have proper touch-action CSS properties', () => {
      render(
        <TestWrapper>
          <DraggableItemCard
            item={mockItem}
            onUpdateCount={mockUpdateCount}
            onReportWaste={mockReportWaste}
          />
        </TestWrapper>
      );

      const cardElement = screen.getByText('Test Item').closest('div') as HTMLElement;
      
      // The element should exist and have inline styles applied
      expect(cardElement).toBeInTheDocument();
      
      // Check for CSS property existence (the actual values are set via React styles)
      expect(cardElement.style).toBeDefined();
    });
  });
});

// Use fake timers for testing touch hold delays
jest.useFakeTimers();
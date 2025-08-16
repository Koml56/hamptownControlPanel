// src/employee-app/inventory/components/StockCountHistoryView.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StockCountHistoryView from './StockCountHistoryView';
import { useInventory } from '../InventoryContext';
import { InventoryContextType } from '../types';
import type { InventoryItem, StockCountSnapshot, StockCountHistoryEntry } from '../../types';

// Mock the InventoryContext
jest.mock('../InventoryContext', () => ({
  useInventory: jest.fn()
}));

// Mock the stockUtils
jest.mock('../stockUtils', () => ({
  getStockStatus: jest.fn((currentStock: number, minLevel: number) => {
    if (currentStock === 0) return 'out';
    if (currentStock <= minLevel * 0.5) return 'critical';
    if (currentStock <= minLevel) return 'low';
    return 'ok';
  })
}));

const mockUseInventory = useInventory as jest.MockedFunction<typeof useInventory>;

describe('StockCountHistoryView', () => {
  const mockDailyItems: InventoryItem[] = [
    {
      id: '1',
      name: 'Milk',
      category: 'dairy',
      currentStock: 10,
      minLevel: 5,
      unit: 'liters',
      cost: 2.5,
      lastUsed: '2024-01-15',
      optimalLevel: 15
    }
  ];

  const mockWeeklyItems: InventoryItem[] = [
    {
      id: '2',
      name: 'Chicken',
      category: 'meat',
      currentStock: 3,
      minLevel: 2,
      unit: 'kg',
      cost: 15.0,
      lastUsed: '2024-01-14',
      optimalLevel: 8
    }
  ];

  const mockMonthlyItems: InventoryItem[] = [
    {
      id: '3',
      name: 'Oregano',
      category: 'spices',
      currentStock: 0,
      minLevel: 1,
      unit: 'bottles',
      cost: 5.0,
      lastUsed: '2024-01-10',
      optimalLevel: 3
    }
  ];

  const mockStockCountSnapshots: StockCountHistoryEntry[] = [
    {
      snapshotId: 'daily_20240115',
      date: '2024-01-15',
      frequency: 'daily',
      snapshot: {
        date: '2024-01-15',
        frequency: 'daily' as const,
        timestamp: '2024-01-15T23:59:59Z',
        totalItems: 3,
        totalValue: 70,
        itemCounts: {
          '1': {
            
            itemName: 'Milk',
            category: 'dairy',
            frequency: 'daily' as const,
            currentStock: 12,
            minLevel: 5,
            unit: 'liters',
            unitCost: 2.5,
            totalValue: 30,
            lastCountDate: '2024-01-15',
            countedBy: 'John Doe',
            optimalLevel: 15
          },
          '2': {
            
            itemName: 'Chicken',
            category: 'meat',
            frequency: 'weekly' as const,
            currentStock: 5,
            minLevel: 2,
            unit: 'kg',
            unitCost: 15.0,
            totalValue: 75,
            lastCountDate: '2024-01-15',
            countedBy: 'Jane Smith',
            optimalLevel: 8
          }
        },
        summary: {
          dailyItemsCount: 1,
          weeklyItemsCount: 1,
          monthlyItemsCount: 1,
          totalInventoryValue: 105,
          outOfStockItems: 0,
          criticalStockItems: 0,
          lowStockItems: 0
        }
      } as StockCountSnapshot
    },
    {
      snapshotId: 'weekly_20240114',
      date: '2024-01-14',
      frequency: 'weekly',
      snapshot: {
        date: '2024-01-14',
        frequency: 'weekly' as const,
        timestamp: '2024-01-14T23:59:59Z',
        totalItems: 1,
        totalValue: 30,
        itemCounts: {
          '2': {
            
            itemName: 'Chicken',
            category: 'meat',
            frequency: 'weekly' as const,
            currentStock: 4,
            minLevel: 2,
            unit: 'kg',
            unitCost: 15.0,
            totalValue: 60,
            lastCountDate: '2024-01-14',
            countedBy: 'Bob Wilson',
            optimalLevel: 8
          }
        },
        summary: {
          dailyItemsCount: 0,
          weeklyItemsCount: 1,
          monthlyItemsCount: 0,
          totalInventoryValue: 60,
          outOfStockItems: 0,
          criticalStockItems: 0,
          lowStockItems: 0
        }
      } as StockCountSnapshot
    }
  ];

  const defaultMockContext: InventoryContextType = {
    dailyItems: mockDailyItems,
    weeklyItems: mockWeeklyItems,
    monthlyItems: mockMonthlyItems,
    databaseItems: [],
    activityLog: [],
    customCategories: [],
    stockCountSnapshots: mockStockCountSnapshots,
    dailyInventorySnapshots: [],
    employees: [{ id: 1, name: 'John Doe', role: 'Manager', mood: 5, lastUpdated: '2024-01-15', lastMoodDate: '2024-01-15', points: 100 }],
    currentUser: { id: 1, name: 'John Doe' },
    selectedItems: new Set(),
    currentTab: 'stock-history' as const,
    isAdmin: true, // NEW: Mock admin state
    
    // Mock functions
    setDailyItems: jest.fn(),
    setWeeklyItems: jest.fn(),
    setMonthlyItems: jest.fn(),
    setDatabaseItems: jest.fn(),
    setActivityLog: jest.fn(),
    setCustomCategories: jest.fn(),
    setStockCountSnapshots: jest.fn(),
    setDailyInventorySnapshots: jest.fn(),
    addActivityEntry: jest.fn(),
    updateItemStock: jest.fn(),
    reportWaste: jest.fn(),
    importFromExcel: jest.fn(),
    addManualItem: jest.fn(),
    assignToCategory: jest.fn(),
    unassignFromCategory: jest.fn(),
    cleanupDuplicates: jest.fn(),
    deleteItems: jest.fn(),
    toggleItemSelection: jest.fn(),
    selectMultipleItems: jest.fn(),
    clearSelection: jest.fn(),
    switchTab: jest.fn(),
    addCustomCategory: jest.fn(),
    updateCustomCategory: jest.fn(),
    deleteCustomCategory: jest.fn(),
    createStockSnapshot: jest.fn().mockResolvedValue([{ success: true }]),
    quickSave: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInventory.mockReturnValue(defaultMockContext);
  });

  describe('Basic Rendering', () => {
    test('renders main heading and components', () => {
      render(<StockCountHistoryView />);
      
      expect(screen.getByText('Stock Count History')).toBeInTheDocument();
      expect(screen.getByText('View complete inventory snapshots for any historical date')).toBeInTheDocument();
    });

    test('displays date selector with today as default', () => {
      render(<StockCountHistoryView />);
      
      const today = new Date().toISOString().split('T')[0];
      const dateInput = screen.getByDisplayValue(today);
      expect(dateInput).toBeInTheDocument();
    });

    test('shows available snapshot dates in dropdown', () => {
      render(<StockCountHistoryView />);
      
      // Should show options for dates with snapshots
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('2024-01-14')).toBeInTheDocument();
    });
  });

  describe('Historical Data Display', () => {
    test('displays historical snapshot data when available', () => {
      render(<StockCountHistoryView />);
      
      // Select date with snapshot
      const dateSelect = screen.getByRole('combobox', { name: /select date/i }) || 
                         screen.getByDisplayValue('2024-01-15');
      fireEvent.change(dateSelect, { target: { value: '2024-01-15' } });
      
      // Should show historical data
      expect(screen.getByText('Milk')).toBeInTheDocument();
      expect(screen.getByText('Chicken')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    test('shows current data when no historical snapshot available', () => {
      render(<StockCountHistoryView />);
      
      // Select today's date (no snapshot)
      const today = new Date().toISOString().split('T')[0];
      const dateInput = screen.getByDisplayValue(today);
      fireEvent.change(dateInput, { target: { value: today } });
      
      // Should show current inventory data
      expect(screen.getByText('Milk')).toBeInTheDocument();
      expect(screen.getByText('Chicken')).toBeInTheDocument();
      expect(screen.getByText('Oregano')).toBeInTheDocument();
    });

    test('combines multiple snapshots for same date', () => {
      // Add another snapshot for the same date
      const multipleSnapshots: StockCountHistoryEntry[] = [
        ...mockStockCountSnapshots,
        {
          snapshotId: 'monthly_20240115',
          date: '2024-01-15',
          frequency: 'monthly',
          snapshot: {
            date: '2024-01-15',
            frequency: 'monthly' as const,
            timestamp: '2024-01-15T23:59:59Z',
            totalItems: 1,
            totalValue: 15,
            itemCounts: {
              '3': {
                
                itemName: 'Oregano',
                category: 'spices',
                frequency: 'monthly' as const,
                currentStock: 3,
                minLevel: 1,
                unit: 'bottles',
                unitCost: 5.0,
                totalValue: 15,
                lastCountDate: '2024-01-15',
                countedBy: 'Alice Johnson',
                optimalLevel: 3
              }
            },
            summary: {
              dailyItemsCount: 0,
              weeklyItemsCount: 0,
              monthlyItemsCount: 1,
              totalInventoryValue: 15,
              outOfStockItems: 0,
              criticalStockItems: 0,
              lowStockItems: 0
            }
          } as StockCountSnapshot
        }
      ];
      
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        stockCountSnapshots: multipleSnapshots
      });
      
      render(<StockCountHistoryView />);
      
      // Should combine and show all items
      expect(screen.getByText('Milk')).toBeInTheDocument();
      expect(screen.getByText('Chicken')).toBeInTheDocument();
      expect(screen.getByText('Oregano')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    test('filters items by search term', () => {
      render(<StockCountHistoryView />);
      
      const searchInput = screen.getByPlaceholderText(/search items/i);
      fireEvent.change(searchInput, { target: { value: 'milk' } });
      
      expect(screen.getByText('Milk')).toBeInTheDocument();
      expect(screen.queryByText('Chicken')).not.toBeInTheDocument();
    });

    test('filters items by frequency', () => {
      render(<StockCountHistoryView />);
      
      // Select date with snapshot
      const dateSelect = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
      fireEvent.change(dateSelect, { target: { value: '2024-01-15' } });
      
      const frequencyFilter = screen.getByDisplayValue('All Frequencies');
      fireEvent.change(frequencyFilter, { target: { value: 'daily' } });
      
      expect(screen.getByText('Milk')).toBeInTheDocument();
      expect(screen.queryByText('Chicken')).not.toBeInTheDocument();
    });

    test('combines search and frequency filters', () => {
      render(<StockCountHistoryView />);
      
      // Select date with snapshot
      const dateSelect = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
      fireEvent.change(dateSelect, { target: { value: '2024-01-15' } });
      
      const searchInput = screen.getByPlaceholderText(/search items/i);
      fireEvent.change(searchInput, { target: { value: 'ch' } });
      
      const frequencyFilter = screen.getByDisplayValue('All Frequencies');
      fireEvent.change(frequencyFilter, { target: { value: 'weekly' } });
      
      expect(screen.getByText('Chicken')).toBeInTheDocument();
      expect(screen.queryByText('Milk')).not.toBeInTheDocument();
    });
  });

  describe('Summary Statistics', () => {
    test('calculates and displays summary statistics', () => {
      render(<StockCountHistoryView />);
      
      // Select date with snapshot data
      const dateSelect = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
      fireEvent.change(dateSelect, { target: { value: '2024-01-15' } });
      
      // Should show summary stats based on filtered data
      expect(screen.getByText(/Total Items:/)).toBeInTheDocument();
      expect(screen.getByText(/Total Value:/)).toBeInTheDocument();
    });

    test('updates statistics when filters change', () => {
      render(<StockCountHistoryView />);
      
      // Select date with snapshot
      const dateSelect = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
      fireEvent.change(dateSelect, { target: { value: '2024-01-15' } });
      
      // Filter to daily items only
      const frequencyFilter = screen.getByDisplayValue('All Frequencies');
      fireEvent.change(frequencyFilter, { target: { value: 'daily' } });
      
      // Statistics should update to reflect only daily items
      expect(screen.getByText(/Total Items: 1/)).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    // Mock URL.createObjectURL and document.createElement for download tests
    beforeEach(() => {
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      const mockLink = {
        click: jest.fn(),
        href: '',
        download: ''
      };
      
      jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') return mockLink as any;
        return document.createElement(tagName);
      });
    });

    test('exports data as CSV', () => {
      render(<StockCountHistoryView />);
      
      const csvButton = screen.getByText('Export CSV');
      fireEvent.click(csvButton);
      
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'text/csv' })
      );
    });

    test('exports data as JSON', () => {
      render(<StockCountHistoryView />);
      
      const jsonButton = screen.getByText('Export JSON');
      fireEvent.click(jsonButton);
      
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'application/json' })
      );
    });

    test('exports filtered data only', () => {
      render(<StockCountHistoryView />);
      
      // Apply filter
      const searchInput = screen.getByPlaceholderText(/search items/i);
      fireEvent.change(searchInput, { target: { value: 'milk' } });
      
      const csvButton = screen.getByText('Export CSV');
      fireEvent.click(csvButton);
      
      // Should only export filtered results
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Comparison Features', () => {
    test('enables comparison mode', () => {
      render(<StockCountHistoryView />);
      
      const comparisonButton = screen.getByText('Compare Dates');
      fireEvent.click(comparisonButton);
      
      expect(screen.getByText('Comparison Date:')).toBeInTheDocument();
    });

    test('selects comparison date', () => {
      render(<StockCountHistoryView />);
      
      const comparisonButton = screen.getByText('Compare Dates');
      fireEvent.click(comparisonButton);
      
      const comparisonDateSelect = screen.getByRole('combobox', { name: /comparison date/i });
      fireEvent.change(comparisonDateSelect, { target: { value: '2024-01-14' } });
      
      expect(screen.getByText('2024-01-14')).toBeInTheDocument();
    });

    test('disables comparison mode', () => {
      render(<StockCountHistoryView />);
      
      const comparisonButton = screen.getByText('Compare Dates');
      fireEvent.click(comparisonButton);
      
      // Now click again to disable
      fireEvent.click(comparisonButton);
      
      expect(screen.queryByText('Comparison Date:')).not.toBeInTheDocument();
    });
  });

  describe('Snapshot Creation', () => {
    test('creates new snapshot', async () => {
      const mockCreateSnapshot = jest.fn().mockResolvedValue([{ success: true }]);
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        createStockSnapshot: mockCreateSnapshot
      });
      
      render(<StockCountHistoryView />);
      
      const createButton = screen.getByText('Create Snapshot');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockCreateSnapshot).toHaveBeenCalled();
      });
    });

    test('handles snapshot creation error', async () => {
      const mockCreateSnapshot = jest.fn().mockRejectedValue(new Error('Creation failed'));
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        createStockSnapshot: mockCreateSnapshot
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<StockCountHistoryView />);
      
      const createButton = screen.getByText('Create Snapshot');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error creating snapshot:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('handles empty snapshots gracefully', () => {
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        stockCountSnapshots: []
      });
      
      render(<StockCountHistoryView />);
      
      expect(screen.getByText('No historical data available')).toBeInTheDocument();
    });

    test('handles invalid snapshot data', () => {
      const invalidSnapshots: StockCountHistoryEntry[] = [
        {
          snapshotId: 'daily_20240115',
          date: '2024-01-15',
          frequency: 'daily',
          snapshot: null as any
        }
      ];
      
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        stockCountSnapshots: invalidSnapshots
      });
      
      render(<StockCountHistoryView />);
      
      // Should fall back to current data without crashing
      expect(screen.getByText('Stock Count History')).toBeInTheDocument();
    });

    test('handles missing item properties', () => {
      const snapshotsWithMissingData: StockCountHistoryEntry[] = [{
        snapshotId: 'daily_20240115',
        date: '2024-01-15',
        frequency: 'daily',
        snapshot: {
          date: '2024-01-15',
          frequency: 'daily' as const,
          timestamp: '2024-01-15T23:59:59Z',
          totalItems: 1,
          totalValue: 0,
          itemCounts: {
            '1': {
              
              itemName: 'Incomplete Item',
              category: 'unknown',
              frequency: 'daily' as const,
              currentStock: 0,
              minLevel: 0,
              unit: '',
              unitCost: 0,
              totalValue: 0,
              lastCountDate: '',
              countedBy: '',
              optimalLevel: 0
            }
          },
          summary: {
            dailyItemsCount: 1,
            weeklyItemsCount: 0,
            monthlyItemsCount: 0,
            totalInventoryValue: 0,
            outOfStockItems: 1,
            criticalStockItems: 0,
            lowStockItems: 0
          }
        } as StockCountSnapshot
      }];
      
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        stockCountSnapshots: snapshotsWithMissingData
      });
      
      render(<StockCountHistoryView />);
      
      expect(screen.getByText('Incomplete Item')).toBeInTheDocument();
      expect(screen.getByText('unknown')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('efficiently handles large datasets', () => {
      const largeMockSnapshots: StockCountHistoryEntry[] = Array.from({ length: 100 }, (_, i) => ({
        snapshotId: `daily_${String(i + 1).padStart(2, '0')}`,
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        frequency: 'daily' as const,
        snapshot: {
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          frequency: 'daily' as const,
          timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T23:59:59Z`,
          totalItems: 1,
          totalValue: 10,
          itemCounts: {
            [`${i}`]: {
              itemName: `Item ${i}`,
              category: 'test',
              frequency: 'daily' as const,
              currentStock: 10,
              minLevel: 5,
              unit: 'pieces',
              unitCost: 1,
              totalValue: 10,
              lastCountDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
              countedBy: 'Test User',
              optimalLevel: 15
            }
          },
          summary: {
            dailyItemsCount: 1,
            weeklyItemsCount: 0,
            monthlyItemsCount: 0,
            totalInventoryValue: 10,
            outOfStockItems: 0,
            criticalStockItems: 0,
            lowStockItems: 0
          }
        } as StockCountSnapshot
      }));
      
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        stockCountSnapshots: largeMockSnapshots
      });
      
      const { rerender } = render(<StockCountHistoryView />);
      
      // Should render without performance issues
      expect(screen.getByText('Stock Count History')).toBeInTheDocument();
      
      // Change filters multiple times
      const searchInput = screen.getByPlaceholderText(/search items/i);
      fireEvent.change(searchInput, { target: { value: 'Item 1' } });
      rerender(<StockCountHistoryView />);
      
      fireEvent.change(searchInput, { target: { value: 'Item 2' } });
      rerender(<StockCountHistoryView />);
      
      // Should still be responsive
      expect(screen.getByText('Stock Count History')).toBeInTheDocument();
    });
  });
});
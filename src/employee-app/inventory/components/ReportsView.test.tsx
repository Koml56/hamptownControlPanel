// src/employee-app/inventory/components/ReportsView.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportsView from './ReportsView';
import { useInventory } from '../InventoryContext';
import { InventoryContextType } from '../types';
import type { InventoryItem, ActivityLogEntry, StockCountSnapshot, StockCountHistoryEntry } from '../../types';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

describe('ReportsView', () => {
  const mockDailyItems: InventoryItem[] = [
    {
      id: '1',
      name: 'Test Daily Item',
      category: 'dairy',
      currentStock: 10,
      minLevel: 5,
      unit: 'pieces',
      cost: 2.5,
      lastUsed: '2024-01-15',
      optimalLevel: 15
    }
  ];

  const mockWeeklyItems: InventoryItem[] = [
    {
      id: '2',
      name: 'Test Weekly Item',
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
      name: 'Test Monthly Item',
      category: 'spices',
      currentStock: 0,
      minLevel: 1,
      unit: 'bottles',
      cost: 5.0,
      lastUsed: '2024-01-10',
      optimalLevel: 3
    }
  ];

  const mockActivityLog: ActivityLogEntry[] = [
    {
      id: '1',
      timestamp: '2024-01-15T10:30:00Z',
      type: 'count_update',
      item: 'Test Daily Item',
      quantity: 10,
      unit: 'pieces',
      employee: 'John Doe',
      notes: 'Regular count update'
    },
    {
      id: '2',
      timestamp: '2024-01-15T14:20:00Z',
      type: 'waste',
      item: 'Test Weekly Item',
      quantity: 2,
      unit: 'kg',
      employee: 'Jane Smith',
      reason: 'expired',
      notes: 'Found expired in storage'
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
            itemName: 'Test Daily Item',
            category: 'dairy',
            frequency: 'daily' as const,
            currentStock: 10,
            minLevel: 5,
            unit: 'pieces',
            unitCost: 2.5,
            totalValue: 25,
            lastCountDate: '2024-01-15',
            countedBy: 'John Doe',
            optimalLevel: 15
          }
        },
        summary: {
          dailyItemsCount: 1,
          weeklyItemsCount: 1,
          monthlyItemsCount: 1,
          totalInventoryValue: 70,
          outOfStockItems: 1,
          criticalStockItems: 0,
          lowStockItems: 1
        }
      } as StockCountSnapshot
    }
  ];

  const defaultMockContext: InventoryContextType = {
    dailyItems: mockDailyItems,
    weeklyItems: mockWeeklyItems,
    monthlyItems: mockMonthlyItems,
    databaseItems: [],
    activityLog: mockActivityLog,
    customCategories: [],
    stockCountSnapshots: mockStockCountSnapshots,
    dailyInventorySnapshots: [],
    historicalSnapshots: [],
    employees: [{ id: 1, name: 'John Doe', role: 'Manager', mood: 5, lastUpdated: '2024-01-15', lastMoodDate: '2024-01-15', points: 100 }],
    currentUser: { id: 1, name: 'John Doe' },
    selectedItems: new Set(),
    currentTab: 'analytics' as const,
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
    // Analytics functions
    createSnapshot: jest.fn(),
    getAnalyticsData: jest.fn().mockReturnValue({
      storageGrowth: [
        {
          date: '2024-01-15',
          totalValue: 100,
          totalItems: 5,
          dailyItems: 50,
          weeklyItems: 30,
          monthlyItems: 20
        }
      ],
      orderFrequency: [
        {
          item: 'Test Item',
          frequency: 5,
          lastOrdered: '2024-01-15',
          avgOrderQuantity: 10
        }
      ],
      wasteAnalysis: [
        {
          date: '2024-01-15',
          totalWaste: 2,
          wasteValue: 10,
          wasteByCategory: { dairy: 1, meat: 1 }
        }
      ],
      consumptionTrends: [
        {
          date: '2024-01-15',
          itemName: 'Test Item',
          consumed: 5,
          remaining: 10
        }
      ],
      performanceMetrics: {
        stockTurnoverRate: 2.5,
        wastePercentage: 5.0,
        orderAccuracy: 95.0,
        stockoutFrequency: 2
      }
    }),
    compareWithPreviousPeriod: jest.fn().mockReturnValue({
      currentPeriod: {
        totalValue: 100,
        totalItems: 5,
        averageStock: 10
      },
      previousPeriod: {
        totalValue: 90,
        totalItems: 4,
        averageStock: 9
      },
      percentageChanges: {
        totalValue: 11.1,
        totalItems: 25.0,
        averageStock: 11.1
      }
    }),
    reorderItems: jest.fn(),
    quickSave: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInventory.mockReturnValue(defaultMockContext);
  });

  describe('Basic Rendering', () => {
    test('renders main heading and components', () => {
      render(<ReportsView />);
      
      expect(screen.getByText('Advanced Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Comprehensive inventory analysis/)).toBeInTheDocument();
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      expect(screen.getByText('Critical Items')).toBeInTheDocument();
      expect(screen.getByText('Total Inventory Value')).toBeInTheDocument();
    });

    test('displays correct item counts', () => {
      render(<ReportsView />);
      
      // Total items should be sum of daily + weekly + monthly
      expect(screen.getByText('3')).toBeInTheDocument(); // Total items count
      expect(screen.getByText('Daily: 1 | Weekly: 1 | Monthly: 1')).toBeInTheDocument();
    });

    test('calculates and displays inventory value', () => {
      render(<ReportsView />);
      
      // Calculate expected total value: (10 * 2.5) + (3 * 15.0) + (0 * 5.0) = 70
      expect(screen.getByText('€70.00')).toBeInTheDocument();
    });
  });

  describe('Date Selection', () => {
    test('allows date selection and updates display', () => {
      render(<ReportsView />);
      
      const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
      expect(dateInput).toBeInTheDocument();
      
      // Change to a different date
      fireEvent.change(dateInput, { target: { value: '2024-01-14' } });
      expect(dateInput).toHaveValue('2024-01-14');
    });

    test('prevents selection of future dates', () => {
      render(<ReportsView />);
      
      const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
      expect(dateInput).toHaveAttribute('max', new Date().toISOString().split('T')[0]);
    });
  });

  describe('Comparison Features', () => {
    test('displays comparison mode selector', () => {
      render(<ReportsView />);
      
      const comparisonSelect = screen.getByDisplayValue('No Comparison');
      expect(comparisonSelect).toBeInTheDocument();
      
      // Check all comparison options are available
      expect(screen.getByRole('option', { name: 'vs Previous Day' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'vs Previous Week' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'vs Week Average' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '7-Day Trend' })).toBeInTheDocument();
    });

    test('shows comparison information when mode is selected', async () => {
      render(<ReportsView />);
      
      const comparisonSelect = screen.getByDisplayValue('No Comparison');
      fireEvent.change(comparisonSelect, { target: { value: 'previous-day' } });
      
      await waitFor(() => {
        expect(screen.getByText(/Comparing with/)).toBeInTheDocument();
      });
    });

    test('shows trend analysis when 7-day trend is selected', async () => {
      render(<ReportsView />);
      
      const comparisonSelect = screen.getByDisplayValue('No Comparison');
      fireEvent.change(comparisonSelect, { target: { value: 'trend-7-days' } });
      
      await waitFor(() => {
        expect(screen.getByText('7-Day Trend Analysis:')).toBeInTheDocument();
      });
    });
  });

  describe('Trend Analysis Panel', () => {
    test('toggles trend analysis panel', () => {
      render(<ReportsView />);
      
      const trendButton = screen.getByText('Trend Analysis');
      expect(trendButton).toBeInTheDocument();
      
      // Initially hidden
      expect(screen.queryByText('Advanced Trend Analysis')).not.toBeInTheDocument();
      
      // Click to show
      fireEvent.click(trendButton);
      expect(screen.getByText('Advanced Trend Analysis')).toBeInTheDocument();
      
      // Click to hide
      fireEvent.click(trendButton);
      expect(screen.queryByText('Advanced Trend Analysis')).not.toBeInTheDocument();
    });

    test('shows trend range selector in analysis panel', () => {
      render(<ReportsView />);
      
      const trendButton = screen.getByText('Trend Analysis');
      fireEvent.click(trendButton);
      
      expect(screen.getByDisplayValue('7 Days')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '30 Days' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '90 Days' })).toBeInTheDocument();
    });
  });

  describe('Stock Status Analysis', () => {
    test('correctly identifies critical items', () => {
      render(<ReportsView />);
      
      // Based on mock data, Monthly Item has 0 stock with min 1 = critical
      expect(screen.getByText('1')).toBeInTheDocument(); // Critical items count
    });

    test('displays stock status breakdown', () => {
      render(<ReportsView />);
      
      expect(screen.getByText('Stock Status Distribution')).toBeInTheDocument();
      expect(screen.getByText('Normal Stock')).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
      expect(screen.getByText('Critical Stock')).toBeInTheDocument();
    });
  });

  describe('Activity Analysis', () => {
    test('displays activity summary for selected date', () => {
      render(<ReportsView />);
      
      expect(screen.getByText("Today's Activity Summary")).toBeInTheDocument();
      expect(screen.getByText('Count Updates')).toBeInTheDocument();
      expect(screen.getByText('Waste Reports')).toBeInTheDocument();
      expect(screen.getByText('Manual Adds')).toBeInTheDocument();
    });

    test('shows activity log entries', () => {
      render(<ReportsView />);
      
      expect(screen.getByText('Test Daily Item')).toBeInTheDocument();
      expect(screen.getByText('Test Weekly Item')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    test('displays waste value calculation', () => {
      render(<ReportsView />);
      
      // Waste value should be calculated from activity log
      // 2 kg of Test Weekly Item at €15/kg = €30
      expect(screen.getByText('€30.00')).toBeInTheDocument();
    });
  });

  describe('Historical Data Integration', () => {
    test('shows historical data notice when viewing past dates', () => {
      render(<ReportsView />);
      
      const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
      
      expect(screen.getByText(/Historical Data Available/)).toBeInTheDocument();
    });

    test('uses current data when no historical snapshots available', () => {
      // Mock context with no snapshots
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        stockCountSnapshots: []
      });
      
      render(<ReportsView />);
      
      const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
      fireEvent.change(dateInput, { target: { value: '2024-01-10' } });
      
      expect(screen.getByText(/No Historical Data/)).toBeInTheDocument();
    });
  });

  describe('Critical Items Alert', () => {
    test('shows critical items alert when items are critical', () => {
      render(<ReportsView />);
      
      expect(screen.getByText('🚨 Critical Stock Alert')).toBeInTheDocument();
      expect(screen.getByText(/require immediate restocking/)).toBeInTheDocument();
      expect(screen.getByText('Test Monthly Item')).toBeInTheDocument();
    });

    test('hides critical items alert when no critical items', () => {
      // Mock context with no critical items
      const mockItemsNoCritical = mockMonthlyItems.map(item => ({
        ...item,
        currentStock: 5, // Above minimum
      }));
      
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        monthlyItems: mockItemsNoCritical
      });
      
      render(<ReportsView />);
      
      expect(screen.queryByText('🚨 Critical Stock Alert')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles empty activity log gracefully', () => {
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        activityLog: []
      });
      
      render(<ReportsView />);
      
      expect(screen.getByText('No inventory movements recorded')).toBeInTheDocument();
      expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
    });

    test('handles missing item data in activity log', () => {
      const activityWithMissingItem: ActivityLogEntry[] = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00Z',
          type: 'waste',
          item: 'Non-existent Item',
          quantity: 5,
          unit: 'pieces',
          employee: 'John Doe',
          reason: 'other'
        }
      ];
      
      mockUseInventory.mockReturnValue({
        ...defaultMockContext,
        activityLog: activityWithMissingItem
      });
      
      render(<ReportsView />);
      
      // Should not crash and should handle missing item gracefully
      expect(screen.getByText('Non-existent Item')).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    test('efficiently updates when date changes', () => {
      const { rerender } = render(<ReportsView />);
      
      const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
      
      // Change date multiple times
      fireEvent.change(dateInput, { target: { value: '2024-01-14' } });
      rerender(<ReportsView />);
      
      fireEvent.change(dateInput, { target: { value: '2024-01-13' } });
      rerender(<ReportsView />);
      
      // Should still render correctly without errors
      expect(screen.getByText('Daily Inventory Reports')).toBeInTheDocument();
    });
  });
});
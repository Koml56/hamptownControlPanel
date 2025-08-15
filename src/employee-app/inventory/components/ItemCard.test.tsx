// Test file for ItemCard custom category fix
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ItemCard from './ItemCard';
import { InventoryItem, CustomCategory } from '../../types';

const mockItem: InventoryItem = {
  id: 1,
  name: 'Test Item',
  category: 'custom-bakery',
  currentStock: 10,
  minLevel: 5,
  unit: 'pcs',
  lastUsed: '2024-01-01',
  cost: 2.50
};

const mockCustomCategories: CustomCategory[] = [
  {
    id: 'custom-bakery',
    name: 'Bakery Items',
    icon: '🥖',
    color: '#FFA500',
    createdAt: '2024-01-01',
    isDefault: false
  }
];

const mockDefaultItem: InventoryItem = {
  id: 2,
  name: 'Milk',
  category: 'dairy',
  currentStock: 8,
  minLevel: 3,
  unit: 'liters',
  lastUsed: '2024-01-01',
  cost: 1.50
};

describe('ItemCard Custom Category Fix', () => {
  const mockUpdateCount = jest.fn();
  const mockReportWaste = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays custom category icon and name correctly', () => {
    render(
      <ItemCard
        item={mockItem}
        onUpdateCount={mockUpdateCount}
        onReportWaste={mockReportWaste}
        customCategories={mockCustomCategories}
      />
    );

    // Should display custom icon (🥖) 
    expect(screen.getByText('🥖')).toBeInTheDocument();
    
    // Should display custom category name, not ID
    expect(screen.getByText('🥖 Bakery Items')).toBeInTheDocument();
    expect(screen.queryByText('custom-bakery')).not.toBeInTheDocument();
  });

  test('displays default category correctly', () => {
    render(
      <ItemCard
        item={mockDefaultItem}
        onUpdateCount={mockUpdateCount}
        onReportWaste={mockReportWaste}
        customCategories={mockCustomCategories}
      />
    );

    // Should display default dairy icon
    expect(screen.getByText('🥛')).toBeInTheDocument();
    
    // Should display default category name
    expect(screen.getByText('🥛 Dairy')).toBeInTheDocument();
  });

  test('works without customCategories prop', () => {
    render(
      <ItemCard
        item={mockDefaultItem}
        onUpdateCount={mockUpdateCount}
        onReportWaste={mockReportWaste}
      />
    );

    // Should still work with default categories
    expect(screen.getByText('🥛')).toBeInTheDocument();
  });

  test('handles unknown category gracefully', () => {
    const unknownItem: InventoryItem = {
      ...mockItem,
      category: 'unknown-category'
    };

    render(
      <ItemCard
        item={unknownItem}
        onUpdateCount={mockUpdateCount}
        onReportWaste={mockReportWaste}
        customCategories={mockCustomCategories}
      />
    );

    // Should display fallback icon for unknown categories
    expect(screen.getByText('📋')).toBeInTheDocument();
    
    // Should display the raw category as fallback
    expect(screen.getByText('unknown-category')).toBeInTheDocument();
  });
});
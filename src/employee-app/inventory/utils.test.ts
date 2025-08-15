// Test file for utils functions
import { getCategoryNameOnly, getCategoryIcon } from './utils';
import { CustomCategory } from '../types';

const mockCustomCategories: CustomCategory[] = [
  {
    id: 'custom-bakery',
    name: 'Bakery Items',
    icon: '🥖',
    color: '#FFA500',
    createdAt: '2024-01-01',
    isDefault: false
  },
  {
    id: 'custom-vegetables',
    name: 'Vegetables',
    icon: '🥬',
    color: '#10B981',
    createdAt: '2024-01-01',
    isDefault: false
  }
];

describe('getCategoryNameOnly', () => {
  test('returns custom category name without emoji', () => {
    const result = getCategoryNameOnly('custom-bakery', mockCustomCategories);
    expect(result).toBe('Bakery Items');
  });

  test('returns default category name without emoji', () => {
    const result = getCategoryNameOnly('dairy');
    expect(result).toBe('Dairy');
  });

  test('returns default meat category name without emoji', () => {
    const result = getCategoryNameOnly('meat');
    expect(result).toBe('Meat & Fish');
  });

  test('returns unknown category value as fallback', () => {
    const result = getCategoryNameOnly('unknown-category');
    expect(result).toBe('unknown-category');
  });

  test('handles empty custom categories array', () => {
    const result = getCategoryNameOnly('dairy', []);
    expect(result).toBe('Dairy');
  });

  test('handles undefined category', () => {
    const result = getCategoryNameOnly(undefined as any);
    expect(result).toBe(undefined);
  });
});

describe('getCategoryIcon', () => {
  test('returns correct icons for default categories', () => {
    expect(getCategoryIcon('meat')).toBe('🥩');
    expect(getCategoryIcon('dairy')).toBe('🥛');
    expect(getCategoryIcon('uncategorized')).toBe('❓');
  });

  test('returns correct icon for custom categories', () => {
    const result = getCategoryIcon('custom-bakery', mockCustomCategories);
    expect(result).toBe('🥖');
  });

  test('returns fallback icon for unknown categories', () => {
    const result = getCategoryIcon('unknown-category');
    expect(result).toBe('📋');
  });
});
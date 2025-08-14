// Test for custom category display functionality
import { getCategoryIcon, getCategoryDisplayName } from './utils';
import { CustomCategory } from '../types';

describe('Custom Category Display Fix', () => {
  const mockCustomCategories: CustomCategory[] = [
    {
      id: 'custom123',
      name: 'My Custom Category',
      icon: '🎯',
      color: '#FF6B6B',
      createdAt: '2024-01-01T00:00:00.000Z',
      isDefault: false
    },
    {
      id: 'supplies456',
      name: 'Kitchen Supplies',
      icon: '🍽️',
      color: '#4ECDC4',
      createdAt: '2024-01-01T00:00:00.000Z',
      isDefault: false
    }
  ];

  describe('getCategoryIcon with custom categories', () => {
    test('should return custom category icon when matching by ID', () => {
      const result = getCategoryIcon('custom123', mockCustomCategories);
      expect(result).toBe('🎯');
    });

    test('should return custom category icon when matching by name', () => {
      const result = getCategoryIcon('My Custom Category', mockCustomCategories);
      expect(result).toBe('🎯');
    });

    test('should return default category icon for known categories', () => {
      const result = getCategoryIcon('meat', mockCustomCategories);
      expect(result).toBe('🥩');
    });

    test('should return fallback icon for unknown categories', () => {
      const result = getCategoryIcon('unknown_category', mockCustomCategories);
      expect(result).toBe('📋');
    });

    test('should handle undefined category', () => {
      const result = getCategoryIcon(undefined, mockCustomCategories);
      expect(result).toBe('❓');
    });

    test('should handle empty custom categories array', () => {
      const result = getCategoryIcon('custom123', []);
      expect(result).toBe('📋');
    });

    test('should handle missing custom categories parameter', () => {
      const result = getCategoryIcon('custom123');
      expect(result).toBe('📋');
    });
  });

  describe('getCategoryDisplayName with custom categories', () => {
    test('should return custom category display name with icon when matching by ID', () => {
      const result = getCategoryDisplayName('custom123', mockCustomCategories);
      expect(result).toBe('🎯 My Custom Category');
    });

    test('should return default category display name with icon for known categories', () => {
      const result = getCategoryDisplayName('meat', mockCustomCategories);
      expect(result).toBe('🥩 Meat & Fish');
    });

    test('should return raw category value for unknown categories', () => {
      const result = getCategoryDisplayName('unknown_category', mockCustomCategories);
      expect(result).toBe('unknown_category');
    });

    test('should handle empty custom categories array', () => {
      const result = getCategoryDisplayName('custom123', []);
      expect(result).toBe('custom123');
    });

    test('should handle missing custom categories parameter', () => {
      const result = getCategoryDisplayName('custom123');
      expect(result).toBe('custom123');
    });
  });

  describe('category lookup priority', () => {
    test('custom categories should have priority over matching default category names', () => {
      const categoriesWithConflict: CustomCategory[] = [
        {
          id: 'meat_custom',
          name: 'meat', // Same name as default category
          icon: '🐟', // Different icon
          color: '#FF0000',
          createdAt: '2024-01-01T00:00:00.000Z',
          isDefault: false
        }
      ];

      // When looking up by name "meat", should find custom category first
      const result = getCategoryIcon('meat', categoriesWithConflict);
      expect(result).toBe('🐟'); // Custom icon, not default 🥩
    });

    test('default categories should work when no custom conflicts exist', () => {
      const result = getCategoryIcon('dairy', mockCustomCategories);
      expect(result).toBe('🥛'); // Default dairy icon
    });
  });
});
// Test for component category initialization
import React from 'react';
import { render } from '@testing-library/react';
import { getAllCategoryOptions } from './utils';
import { CustomCategory } from '../types';

describe('Component Category Initialization', () => {
  const mockCustomCategories: CustomCategory[] = [
    {
      id: 'custom123',
      name: 'Bread & Bakery',
      icon: '🍞',
      color: '#FFD700',
      createdAt: '2024-01-01T00:00:00.000Z',
      isDefault: false
    }
  ];

  describe('CategoryModal component initialization simulation', () => {
    test('should initialize with first available category option', () => {
      const allCategoryOptions = getAllCategoryOptions(mockCustomCategories);
      
      // Simulate the CategoryModal component initialization logic
      const defaultCategory = allCategoryOptions.length > 0 ? allCategoryOptions[0].value : 'meat';
      
      expect(defaultCategory).toBeTruthy();
      expect(defaultCategory).not.toBe('produce'); // Should not be the problematic value
      expect(allCategoryOptions.find(opt => opt.value === defaultCategory)).toBeDefined();
    });

    test('should have valid category options for dropdown', () => {
      const allCategoryOptions = getAllCategoryOptions(mockCustomCategories);
      
      expect(allCategoryOptions.length).toBeGreaterThan(0);
      
      // All options should be valid for select dropdown
      allCategoryOptions.forEach(option => {
        expect(option.value).toBeTruthy();
        expect(option.label).toBeTruthy();
        expect(option.label).toContain(option.icon);
        expect(option.value).not.toBe('produce'); // Ensure no 'produce' values
      });
    });
  });

  describe('DatabaseView ItemEditModal initialization simulation', () => {
    test('should initialize with assigned category or first available option', () => {
      const allCategoryOptions = getAllCategoryOptions(mockCustomCategories);
      
      // Test case 1: Item with assignedCategory
      const itemWithCategory = { assignedCategory: 'custom123' };
      const categoryWithAssigned = itemWithCategory.assignedCategory || 
        (allCategoryOptions.length > 0 ? allCategoryOptions[0].value : 'meat');
      
      expect(categoryWithAssigned).toBe('custom123');
      
      // Test case 2: Item without assignedCategory
      const itemWithoutCategory = { assignedCategory: null };
      const categoryWithoutAssigned = itemWithoutCategory.assignedCategory || 
        (allCategoryOptions.length > 0 ? allCategoryOptions[0].value : 'meat');
      
      expect(categoryWithoutAssigned).toBeTruthy();
      expect(categoryWithoutAssigned).not.toBe('produce');
      expect(allCategoryOptions.find(opt => opt.value === categoryWithoutAssigned)).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    test('should handle empty custom categories gracefully', () => {
      const allCategoryOptions = getAllCategoryOptions([]);
      const defaultCategory = allCategoryOptions.length > 0 ? allCategoryOptions[0].value : 'meat';
      
      expect(defaultCategory).toBeTruthy();
      expect(allCategoryOptions.find(opt => opt.value === defaultCategory)).toBeDefined();
    });

    test('should handle undefined custom categories gracefully', () => {
      const allCategoryOptions = getAllCategoryOptions();
      const defaultCategory = allCategoryOptions.length > 0 ? allCategoryOptions[0].value : 'meat';
      
      expect(defaultCategory).toBeTruthy();
      expect(allCategoryOptions.find(opt => opt.value === defaultCategory)).toBeDefined();
    });
  });
});
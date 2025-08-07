// stockUtils.test.ts - Tests for delivery date calculation
import { getNextDeliveryDate, formatExpectedDate } from './stockUtils';

describe('stockUtils', () => {
  describe('getNextDeliveryDate', () => {
    test('should return next Monday when ordered on Sunday', () => {
      // Sunday, March 3, 2024
      const sunday = new Date('2024-03-03');
      const nextDelivery = getNextDeliveryDate(sunday);
      
      // Should be Monday, March 4, 2024
      expect(nextDelivery.getDay()).toBe(1); // Monday
      expect(nextDelivery.getDate()).toBe(4);
    });

    test('should return next Wednesday when ordered on Monday', () => {
      // Monday, March 4, 2024
      const monday = new Date('2024-03-04');
      const nextDelivery = getNextDeliveryDate(monday);
      
      // Should be Wednesday, March 6, 2024
      expect(nextDelivery.getDay()).toBe(3); // Wednesday
      expect(nextDelivery.getDate()).toBe(6);
    });

    test('should return next Friday when ordered on Wednesday', () => {
      // Wednesday, March 6, 2024
      const wednesday = new Date('2024-03-06');
      const nextDelivery = getNextDeliveryDate(wednesday);
      
      // Should be Friday, March 8, 2024
      expect(nextDelivery.getDay()).toBe(5); // Friday
      expect(nextDelivery.getDate()).toBe(8);
    });

    test('should return next Monday when ordered on Friday', () => {
      // Friday, March 8, 2024
      const friday = new Date('2024-03-08');
      const nextDelivery = getNextDeliveryDate(friday);
      
      // Should be Monday, March 11, 2024
      expect(nextDelivery.getDay()).toBe(1); // Monday
      expect(nextDelivery.getDate()).toBe(11);
    });

    test('should return next Monday when ordered on Saturday', () => {
      // Saturday, March 9, 2024
      const saturday = new Date('2024-03-09');
      const nextDelivery = getNextDeliveryDate(saturday);
      
      // Should be Monday, March 11, 2024
      expect(nextDelivery.getDay()).toBe(1); // Monday
      expect(nextDelivery.getDate()).toBe(11);
    });
  });

  describe('formatExpectedDate', () => {
    test('should format date as DD.MM DayName', () => {
      // Friday, March 8, 2024
      const date = new Date('2024-03-08');
      const formatted = formatExpectedDate(date);
      
      expect(formatted).toBe('08.03 Friday');
    });

    test('should pad single digit days and months', () => {
      // Monday, March 4, 2024
      const date = new Date('2024-03-04');
      const formatted = formatExpectedDate(date);
      
      expect(formatted).toBe('04.03 Monday');
    });

    test('should handle year transitions', () => {
      // Wednesday, January 1, 2025
      const date = new Date('2025-01-01');
      const formatted = formatExpectedDate(date);
      
      expect(formatted).toBe('01.01 Wednesday');
    });
  });
});
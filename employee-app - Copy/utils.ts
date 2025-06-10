// utils.ts
import { MOOD_COLORS, PRIORITY_COLORS } from './constants';
import type { Priority } from './types';

export const getFormattedDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getMoodColor = (mood: number): string => {
  return MOOD_COLORS[mood - 1] || 'bg-gray-500';
};

export const getPriorityColor = (priority: Priority): string => {
  return PRIORITY_COLORS[priority];
};
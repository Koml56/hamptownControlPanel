// defaultData.ts
import type { Employee, Task, DailyDataMap, StoreItem } from './types';
import { getFormattedDate } from './utils';

export const getDefaultEmployees = (): Employee[] => [
  { id: 1, name: 'Luka', mood: 3, lastUpdated: 'Not updated', role: 'Cleaner', lastMoodDate: null, points: 0 },
  { id: 2, name: 'Safi', mood: 3, lastUpdated: 'Not updated', role: 'Cleaner', lastMoodDate: null, points: 0 },
  { id: 3, name: 'Ehsan', mood: 3, lastUpdated: 'Not updated', role: 'Cleaner', lastMoodDate: null, points: 0 },
  { id: 4, name: 'Oleksii', mood: 3, lastUpdated: 'Not updated', role: 'Manager', lastMoodDate: null, points: 0 }
];

export const getDefaultTasks = (): Task[] => [
  { id: 1, task: 'Water all plants', location: 'Dining Area', priority: 'medium', estimatedTime: '10 min', points: 5 },
  { id: 2, task: 'Refill toilet paper', location: 'Restroom', priority: 'high', estimatedTime: '5 min', points: 8 },
  { id: 3, task: 'Sweep the floor', location: 'Kitchen', priority: 'high', estimatedTime: '15 min', points: 10 },
  { id: 4, task: 'Wipe refrigerator surfaces', location: 'Kitchen', priority: 'medium', estimatedTime: '10 min', points: 7 },
  { id: 5, task: 'Light glass wipe', location: 'Kitchen (kylmävitrini)', priority: 'low', estimatedTime: '5 min', points: 3 },
  { id: 6, task: 'Refill takeaway & snack boxes', location: 'Kitchen', priority: 'medium', estimatedTime: '10 min', points: 6 },
  { id: 7, task: 'Stock napkins', location: 'Kitchen', priority: 'medium', estimatedTime: '5 min', points: 4 },
  { id: 8, task: 'Wipe and disinfect tables', location: 'Dining Area', priority: 'high', estimatedTime: '20 min', points: 12 },
  { id: 9, task: 'Clean table legs', location: 'Dining Area', priority: 'low', estimatedTime: '15 min', points: 8 },
  { id: 10, task: 'Vacuum the floor', location: 'Dining Area', priority: 'high', estimatedTime: '20 min', points: 15 },
  { id: 11, task: 'Clean sink and mirror', location: 'Restroom', priority: 'high', estimatedTime: '10 min', points: 9 },
  { id: 12, task: 'Clean inside the toilet', location: 'Restroom', priority: 'high', estimatedTime: '15 min', points: 12 },
  { id: 13, task: 'Replace towel roll', location: 'Restroom', priority: 'medium', estimatedTime: '5 min', points: 4 },
  { id: 14, task: 'Final disinfection (POS, Foodora, Wolt)', location: 'POS / Front', priority: 'high', estimatedTime: '10 min', points: 10 },
  { id: 15, task: 'Sweep the floor', location: 'Kitchen (Floor)', priority: 'high', estimatedTime: '15 min', points: 10 },
  { id: 16, task: 'Mop the floor (every 2 days)', location: 'Kitchen (Floor)', priority: 'high', estimatedTime: '20 min', points: 15 },
  { id: 17, task: 'Full grill cleaning', location: 'Kitchen', priority: 'high', estimatedTime: '45 min', points: 25 },
  { id: 18, task: 'Sanitize all surfaces', location: 'Kitchen', priority: 'high', estimatedTime: '25 min', points: 18 },
  { id: 19, task: 'Wipe dishwasher surface', location: 'Apu-Kitchen', priority: 'medium', estimatedTime: '10 min', points: 6 },
  { id: 20, task: 'Replace hood filter (every 3 days)', location: 'Kitchen', priority: 'medium', estimatedTime: '15 min', points: 8 },
  { id: 21, task: 'Cover all food containers', location: 'Storage', priority: 'high', estimatedTime: '10 min', points: 7 },
  { id: 22, task: 'Organize containers', location: 'Apu-Kitchen', priority: 'low', estimatedTime: '15 min', points: 5 }
];

export const getDefaultStoreItems = (): StoreItem[] => [
  { id: 1, name: 'Free Coffee', description: 'Get a free coffee from the kitchen', cost: 10, category: 'food', icon: '☕', available: true },
  { id: 2, name: 'Free Lunch', description: 'Get a free meal from the restaurant', cost: 50, category: 'food', icon: '🍽️', available: true },
  { id: 3, name: 'Free Meal for Friend', description: 'Bring a friend for a free meal', cost: 80, category: 'social', icon: '👥', available: true },
  { id: 4, name: '30min Break Extension', description: 'Extend your break by 30 minutes', cost: 25, category: 'break', icon: '⏰', available: true },
  { id: 5, name: 'Early Leave (1 hour)', description: 'Leave work 1 hour early', cost: 60, category: 'break', icon: '🚪', available: true },
  { id: 6, name: 'Free Snack', description: 'Get any snack from the kitchen', cost: 15, category: 'food', icon: '🍿', available: true },
  { id: 7, name: 'Choose Next Week Schedule', description: 'Pick your preferred shifts next week', cost: 100, category: 'reward', icon: '📅', available: true },
  { id: 8, name: 'Team Building Activity', description: 'Organize a fun team activity', cost: 150, category: 'social', icon: '🎉', available: true },
  { id: 9, name: 'Free Dessert', description: 'Get any dessert from the menu', cost: 20, category: 'food', icon: '🍰', available: true },
  { id: 10, name: 'Reserved Parking Spot', description: 'Get the best parking spot for a week', cost: 40, category: 'reward', icon: '🚗', available: true }
];

export const getEmptyDailyData = (): DailyDataMap => {
  const dates = Array.from({length: 30}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return getFormattedDate(date);
  });

  const dailyData: DailyDataMap = {};
  dates.forEach(date => {
    dailyData[date] = {
      completedTasks: [],
      employeeMoods: [],
      purchases: [],
      totalTasks: 22,
      completionRate: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0
    };
  });
  return dailyData;
};
// prep-utils.ts - Utility functions for prep list system with fixed regex
export const getDateString = (date: Date): string => {
  // Use local date to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const getWeekDates = (startDate: Date = new Date()): Date[] => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// FIXED: Proper regex patterns with explicit escaping
export const formatRecipeText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(new RegExp('\\*\\*(.*?)\\*\\*', 'g'), '<strong>$1</strong>')
    .replace(new RegExp('\\*(.*?)\\*', 'g'), '<em>$1</em>')
    .replace(new RegExp('\\n', 'g'), '<br/>');
};

export const getSelectionKey = (date: Date, prepId: number): string => {
  return `${getDateString(date)}-${prepId}`;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return getDateString(date) === getDateString(today);
};

export const isSameDate = (date1: Date, date2: Date): boolean => {
  return getDateString(date1) === getDateString(date2);
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const generateUniqueId = (): number => {
  return Date.now() + Math.random();
};

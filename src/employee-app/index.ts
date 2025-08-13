// index.ts - Main export file for employee-app module

// Types
export * from './types';

// Constants and Configuration
export * from './constants';

// Utilities
export * from './utils';

// Default Data
export * from './defaultData';

// Firebase Service
export { FirebaseService } from './firebaseService';

// Custom Hooks
export { useFirebaseData, useAuth } from './hooks';

// Business Logic Functions
export * from './moodFunctions';
export * from './taskFunctions';
export * from './adminFunctions';
export * from './migrationUtils';

// React Components
export { default as MoodTracker } from './MoodTracker';
export { default as TaskManager } from './TaskManager';
export { default as AdminPanel } from './AdminPanel';
export { default as DailyReports } from './DailyReports';
export { default as PrepListPrototype } from './PrepListPrototype';

// Main App Component
export { default as EmployeeApp } from './EmployeeApp';
export { default } from './EmployeeApp'; // Default export for easier importing

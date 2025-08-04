// constants.ts
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBBWLn8mFblzOqtbfaGS52aDhFWixSEn0Y",
  authDomain: "hamptown-panel.firebaseapp.com",
  databaseURL: "https://hamptown-panel-default-rtdb.firebaseio.com",
  projectId: "hamptown-panel",
  storageBucket: "hamptown-panel.firebasestorage.app",
  messagingSenderId: "937251959184",
  appId: "1:937251959184:web:b1afb3ed1eecd52fdcc315",
  measurementId: "G-50NK2PWM7E"
};

export const ADMIN_PASSWORD = '6969';

export const MOOD_EMOJIS = ['😫', '😔', '😐', '😊', '🤩'];
export const MOOD_LABELS = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

export const PRIORITY_COLORS = {
  high: 'border-red-400',
  medium: 'border-yellow-400',
  low: 'border-green-400'
} as const;

export const MOOD_COLORS = [
  'bg-red-500',
  'bg-orange-500', 
  'bg-yellow-500',
  'bg-green-500',
  'bg-blue-500'
];

export const DEFAULT_CUSTOM_ROLES = ['Cleaner', 'Manager', 'Supervisor'];
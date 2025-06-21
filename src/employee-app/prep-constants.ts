// prep-constants.ts - Constants for prep list system
import type { Category, TimeSlot, PriorityInfo } from ‘./prep-types’;

export const categories: Category[] = [
{ id: ‘all’, name: ‘All Items’, icon: ‘🍽️’ },
{ id: ‘majoneesit’, name: ‘Majoneesit’, icon: ‘🥄’ },
{ id: ‘proteiinit’, name: ‘Proteiinit’, icon: ‘🥩’ },
{ id: ‘kasvikset’, name: ‘Kasvikset’, icon: ‘🥗’ },
{ id: ‘marinointi’, name: ‘Marinointi & pikkelöinti’, icon: ‘🥒’ },
{ id: ‘kastikkeet’, name: ‘Kastikkeet’, icon: ‘🧂’ },
{ id: ‘muut’, name: ‘Muut’, icon: ‘🔧’ }
];

export const timeSlots: TimeSlot[] = [
{ id: ‘morning’, name: ‘Morning (6-10 AM)’, icon: ‘🌅’ },
{ id: ‘midday’, name: ‘Mid-day (10 AM-2 PM)’, icon: ‘☀️’ },
{ id: ‘afternoon’, name: ‘Afternoon (2-6 PM)’, icon: ‘🌤️’ },
{ id: ‘evening’, name: ‘Evening (6-10 PM)’, icon: ‘🌆’ }
];

export const priorities: PriorityInfo[] = [
{ id: ‘low’, name: ‘Low’, color: ‘bg-green-100 text-green-700’, icon: ‘🟢’ },
{ id: ‘medium’, name: ‘Medium’, color: ‘bg-yellow-100 text-yellow-700’, icon: ‘🟡’ },
{ id: ‘high’, name: ‘High’, color: ‘bg-red-100 text-red-700’, icon: ‘🔴’ }
];

export const PREP_STYLES = `
.priority-glow {
position: relative;
z-index: 0;
font-weight: 600;
border-radius: 0.25rem;
padding: 0.125rem 0.25rem;
}
.priority-glow::before {
content: “”;
position: absolute;
top: 50%;
left: 50%;
width: 110%;
height: 2em;
transform: translate(-50%, -50%);
border-radius: 0.375rem;
filter: blur(6px);
z-index: -1;
opacity: 0.3;
}
.priority-low {
color: #047857;
}
.priority-low::before {
box-shadow: 0 0 8px 4px rgba(5, 150, 105, 0.4);
}
.priority-medium {
color: #92400e;
}
.priority-medium::before {
box-shadow: 0 0 8px 4px rgba(202, 138, 4, 0.4);
}
.priority-high {
color: #b91c1c;
}
.priority-high::before {
box-shadow: 0 0 8px 4px rgba(185, 28, 28, 0.4);
}

.soft-dropdown {
backdrop-filter: blur(16px);
background: rgba(255, 255, 255, 0.95);
border: 1px solid rgba(255, 255, 255, 0.3);
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15),
0 0 0 1px rgba(255, 255, 255, 0.05),
inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.soft-button {
backdrop-filter: blur(8px);
border: 1px solid rgba(255, 255, 255, 0.2);
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05),
inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.soft-button:hover {
backdrop-filter: blur(12px);
box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1),
inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
`;

// MoodTracker.tsx
import React from 'react';
import { Users } from 'lucide-react';
import { MOOD_EMOJIS, MOOD_LABELS } from './constants';
import { getMoodColor, getFormattedDate } from './utils';
import { canUpdateMoodToday, getNextMoodUpdate, handleMoodUpdate, calculateAverageMood } from './moodFunctions';
import type { Employee, DailyDataMap, CurrentUser } from './types';

interface MoodTrackerProps {
  currentUser: CurrentUser;
  employees: Employee[];
  userMood: number;
  setUserMood: (mood: number) => void;
  setEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  setDailyData: (updater: (prev: DailyDataMap) => DailyDataMap) => void;
}

const MoodTracker: React.FC<MoodTrackerProps> = ({
  currentUser,
  employees,
  userMood,
  setUserMood,
  setEmployees,
  setDailyData
}) => {
  const averageMood = calculateAverageMood(employees);
  const canUpdate = canUpdateMoodToday(currentUser.id, employees);
  const nextUpdate = getNextMoodUpdate(currentUser.id, employees);

  const handleMoodSelection = (mood: number) => {
    const success = handleMoodUpdate(mood, currentUser.id, employees, setEmployees, setDailyData);
    if (success) {
      setUserMood(mood);
    }
  };

  return (
    <>
      {/* Mood Dashboard */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-gray-800 mb-2">{averageMood}</div>
          <div className="text-lg text-gray-600 mb-4">Team Average Mood</div>
          <div className="flex justify-center space-x-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full ${i <= Math.round(Number(averageMood)) ? 'bg-blue-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Rate Your Mood */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">How are you feeling today?</h3>
        
        {!canUpdate ? (
          <div className="text-center">
            <div className="text-6xl mb-4">{MOOD_EMOJIS[userMood-1]}</div>
            <div className="text-lg font-medium text-gray-700 mb-2">
              Today's Mood: {MOOD_LABELS[userMood-1]}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              {nextUpdate}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-700">
                ✨ You've already shared your mood today! Your well-being matters to us.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              {[1,2,3,4,5].map(mood => (
                <button
                  key={mood}
                  onClick={() => handleMoodSelection(mood)}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all hover:scale-105 ${
                    userMood === mood ? 'bg-blue-100 scale-110' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{MOOD_EMOJIS[mood-1]}</div>
                  <div className="text-xs text-gray-600">{MOOD_LABELS[mood-1]}</div>
                </button>
              ))}
            </div>
            <div className="text-center text-sm text-gray-500">
              Select how you're feeling today
            </div>
          </>
        )}
      </div>

      {/* Team Mood List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Team Mood
        </h3>
        <div className="space-y-3">
          {employees.map(emp => (
            <div key={emp.id} className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${getMoodColor(emp.mood)}`} />
                <div>
                  <div className="font-medium text-gray-800">{emp.name}</div>
                  <div className="text-xs text-gray-500">
                    {emp.lastUpdated}
                    {emp.lastMoodDate === getFormattedDate(new Date()) && 
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Today</span>
                    }
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-lg mr-2">{MOOD_EMOJIS[emp.mood-1]}</span>
                <span className="text-sm text-gray-600">{emp.mood}/5</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MoodTracker;
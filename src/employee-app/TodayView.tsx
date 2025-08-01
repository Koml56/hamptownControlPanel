// TodayView.tsx - FIXED: Enhanced UI for prep completions with loading states
import React, { useState } from 'react';
import { Check, ChefHat, Loader2 } from 'lucide-react';
import type { ScheduledPrep, Recipe } from './prep-types';
import { timeSlots, priorities } from './prep-constants';
import { getDateString } from './prep-utils';

interface TodayViewProps {
  scheduledPreps: ScheduledPrep[];
  onToggleCompletion: (scheduledPrepId: number) => Promise<void>;
  onShowRecipe: (recipe: Recipe, name: string) => void;
}

const TodayView: React.FC<TodayViewProps> = ({
  scheduledPreps,
  onToggleCompletion,
  onShowRecipe
}) => {
  // Track which prep items are currently being saved
  const [savingPreps, setSavingPreps] = useState<Set<number>>(new Set());

  // Get today's date string
  const todayDateString = getDateString(new Date());
  
  // Filter today's scheduled preps
  const todayScheduledPreps = scheduledPreps.filter(prep =>
    prep.scheduledDate === todayDateString
  );

  // Debug logging to see what's happening
  React.useEffect(() => {
    console.log('🔍 TodayView Debug Info:', {
      todayDateString,
      totalScheduledPreps: scheduledPreps.length,
      todayScheduledPreps: todayScheduledPreps.length,
      allScheduledDates: Array.from(new Set(scheduledPreps.map(p => p.scheduledDate))).sort(),
      sampleTodayPreps: todayScheduledPreps.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        scheduledDate: p.scheduledDate,
        completed: p.completed
      }))
    });
  }, [todayDateString, scheduledPreps.length, todayScheduledPreps.length]);

  const completedToday = todayScheduledPreps.filter(prep => prep.completed).length;
  const totalToday = todayScheduledPreps.length;

  // Enhanced completion toggle with loading state
  const handleToggleCompletion = async (prepId: number) => {
    if (savingPreps.has(prepId)) {
      console.log('⏳ Completion toggle already in progress for prep:', prepId);
      return; // Prevent double-clicks while saving
    }

    setSavingPreps(prev => new Set(prev).add(prepId));
    
    try {
      console.log('🔄 TodayView: Toggling completion for prep:', prepId);
      await onToggleCompletion(prepId);
      console.log('✅ TodayView: Completion toggle finished for prep:', prepId);
    } catch (error) {
      console.error('❌ TodayView: Completion toggle failed for prep:', prepId, error);
    } finally {
      setSavingPreps(prev => {
        const newSet = new Set(prev);
        newSet.delete(prepId);
        return newSet;
      });
    }
  };

  const renderPrepCard = (prep: ScheduledPrep) => {
    const priority = priorities.find(p => p.id === prep.priority);
    const isSaving = savingPreps.has(prep.id);

    return (
      <div key={prep.id} className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
        isSaving ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
      }`}>
        <div className="flex items-center space-x-3 select-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleCompletion(prep.id);
            }}
            disabled={isSaving}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              prep.completed 
                ? 'bg-green-500 border-green-500' 
                : isSaving
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-green-500'
            } ${isSaving ? 'cursor-wait' : 'cursor-pointer'} disabled:cursor-wait`}
            title={isSaving ? 'Saving...' : prep.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : prep.completed ? (
              <Check className="w-4 h-4 text-white" />
            ) : null}
          </button>
          
          <div className="flex-1">
            <div className={`font-medium flex items-center space-x-2 transition-all ${
              prep.completed ? 'line-through text-gray-500' : 'text-gray-800'
            }`}>
              <span>{prep.name}</span>
              {prep.hasRecipe && prep.recipe && (
                <button
                  onClick={() => onShowRecipe(prep.recipe!, prep.name)}
                  className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200 transition-colors"
                >
                  📖 Recipe
                </button>
              )}
              {isSaving && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  Saving...
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {prep.estimatedTime} • {prep.category}
              {prep.timeSlot && (
                <>
                  {' '} • {timeSlots.find(slot => slot.id === prep.timeSlot)?.name || prep.timeSlot}
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
            {priority?.name || 'Medium'}
          </span>
          {/* Removed '✅ Done' text after checkbox as requested */}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Today's Progress */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Progress</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalToday}</div>
            <div className="text-sm text-blue-700">Total Preps</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{completedToday}</div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0}%
            </div>
            <div className="text-sm text-purple-700">Complete</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        {totalToday > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{completedToday} of {totalToday} tasks</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${totalToday > 0 ? (completedToday / totalToday) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Today's Prep List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Today's Prep Tasks</h3>
          {savingPreps.size > 0 && (
            <div className="flex items-center text-blue-600 text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving {savingPreps.size} change{savingPreps.size !== 1 ? 's' : ''}...
            </div>
          )}
        </div>
        
        {todayScheduledPreps.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No prep tasks scheduled for today</p>
            <p className="text-sm">Use the "Plan Preps" tab to schedule tasks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Time Slot Tasks */}
            {timeSlots.map(timeSlot => {
              const slotPreps = todayScheduledPreps.filter(prep => prep.timeSlot === timeSlot.id);
              if (slotPreps.length === 0) return null;
              
              const slotCompleted = slotPreps.filter(prep => prep.completed).length;
              
              return (
                <div key={timeSlot.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700 flex items-center">
                      <span className="mr-2">{timeSlot.icon}</span>
                      {timeSlot.name}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {slotCompleted}/{slotPreps.length} completed
                    </span>
                  </div>
                  <div className="space-y-3">
                    {slotPreps.map(renderPrepCard)}
                  </div>
                </div>
              );
            })}
            
            {/* Anytime Tasks - Show Last */}
            {(() => {
              const anytimePreps = todayScheduledPreps.filter(prep => prep.timeSlot === '');
              if (anytimePreps.length === 0) return null;
              
              const anytimeCompleted = anytimePreps.filter(prep => prep.completed).length;
              
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700 flex items-center">
                      🕐 Anytime
                    </h4>
                    <span className="text-sm text-gray-500">
                      {anytimeCompleted}/{anytimePreps.length} completed
                    </span>
                  </div>
                  <div className="space-y-3">
                    {anytimePreps.map(renderPrepCard)}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Completion Summary */}
      {totalToday > 0 && completedToday === totalToday && (
        <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-xl p-6 text-white text-center">
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="text-xl font-bold mb-1">All Done!</h3>
          <p className="text-green-100">
            Great job! You've completed all {totalToday} prep tasks for today.
          </p>
        </div>
      )}
    </div>
  );
};

export default TodayView;

// WeekView.tsx - Component for displaying weekly prep tasks
import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { ScheduledPrep, Recipe } from './prep-types';
import { timeSlots, priorities } from './prep-constants';
import { getDateString, formatDate, getWeekDates } from './prep-utils';

interface WeekViewProps {
  scheduledPreps: ScheduledPrep[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  setActiveView: (view: string) => void;
  onToggleCompletion: (scheduledPrepId: number) => void;
  onShowRecipe: (recipe: Recipe, name: string) => void;
}

const WeekView: React.FC<WeekViewProps> = ({
  scheduledPreps,
  currentDate,
  setCurrentDate,
  selectedDate,
  setSelectedDate,
  setActiveView,
  onToggleCompletion,
  onShowRecipe
}) => {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const getWeekDatesFromCurrent = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{
        __html: `
          .priority-glow {
            position: relative;
            z-index: 0;
            font-weight: 600;
            border-radius: 0.25rem;
            padding: 0.125rem 0.25rem;
          }
          .priority-glow::before {
            content: "";
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
        `
      }} />

      {/* Week Navigation */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Week Overview</h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() - 7);
                setCurrentDate(newDate);
              }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              ← Previous Week
            </button>
            <button 
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() + 7);
                setCurrentDate(newDate);
              }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              Next Week →
            </button>
          </div>
        </div>
        
        {/* Week Calendar Grid */}
        <div className="space-y-3">
          {getWeekDatesFromCurrent().map((date, index) => {
            const datePreps = scheduledPreps.filter(prep => 
              prep.scheduledDate === getDateString(date)
            );
            const completed = datePreps.filter(prep => prep.completed).length;
            const isToday = getDateString(date) === getDateString(new Date());
            const isSelected = getDateString(date) === getDateString(selectedDate);
            const isExpanded = expandedDay === getDateString(date);
            
            return (
              <div 
                key={index} 
                className={`border rounded-xl transition-all duration-500 ease-in-out overflow-hidden ${
                  isExpanded ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                } ${
                  isToday ? 'ring-2 ring-blue-500' : 
                  isSelected && !isExpanded ? 'ring-2 ring-purple-500' :
                  isExpanded ? 'ring-2 ring-green-500 shadow-lg' :
                  'hover:shadow-md'
                }`}
              >
                {/* Day Header - Always Visible */}
                <div 
                  className={`flex items-center cursor-pointer transition-all duration-300 ${
                    isExpanded ? 'p-4 bg-white border-b' : 'p-4'
                  }`}
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedDay(null);
                    } else {
                      setExpandedDay(getDateString(date));
                    }
                  }}
                >
                  {/* Date Info */}
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="font-medium text-gray-800 text-sm">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-2xl font-bold ${
                        isToday ? 'text-blue-600' : 
                        isSelected && !isExpanded ? 'text-purple-600' :
                        isExpanded ? 'text-green-600' :
                        'text-gray-600'
                      }`}>
                        {date.getDate()}
                      </div>
                      {isToday && (
                        <div className="text-xs text-blue-600 font-medium">Today</div>
                      )}
                      {isSelected && !isToday && !isExpanded && (
                        <div className="text-xs text-purple-600 font-medium">Selected</div>
                      )}
                      {isExpanded && (
                        <div className="text-xs text-green-600 font-medium">Expanded</div>
                      )}
                    </div>
                    
                    {/* Quick Summary */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-600">
                          {completed}/{datePreps.length} tasks
                        </div>
                        {datePreps.length > 0 && (
                          <div className="flex-1 max-w-32">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  completed === datePreps.length ? 'bg-green-500' :
                                  completed > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                                }`}
                                style={{ width: `${(completed / datePreps.length) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Quick preview for collapsed state */}
                      {!isExpanded && datePreps.length > 0 && (
                        <div className="text-xs mt-1">
                          {datePreps.slice(0, 2).map((prep, idx) => {
                            return (
                              <span key={prep.id} className={`priority-glow priority-${prep.priority} ${idx > 0 ? 'ml-1' : ''}`}>
                                {prep.name}
                                {idx < Math.min(datePreps.length, 2) - 1 && ', '}
                              </span>
                            );
                          })}
                          {datePreps.length > 2 && <span className="text-gray-500 ml-1">+{datePreps.length - 2} more</span>}
                        </div>
                      )}
                      
                      {!isExpanded && datePreps.length === 0 && (
                        <div className="text-xs text-gray-400 mt-1 italic">
                          No preps scheduled
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Expand/Collapse Arrow */}
                  <div className={`transform transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : 'rotate-0'
                  }`}>
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                
                {/* Expanded Content */}
                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  {isExpanded && (
                    <div className="p-4 space-y-3 overflow-y-auto max-h-80">
                      {datePreps.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-gray-400 text-sm">No prep tasks scheduled</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(date);
                              setActiveView('plan');
                            }}
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                          >
                            Plan Preps for This Day
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Group by time slots */}
                          {(() => {
                            const anytimePreps = datePreps.filter(prep => prep.timeSlot === '');
                            const timeSlotGroups = timeSlots.map(slot => ({
                              slot,
                              preps: datePreps.filter(prep => prep.timeSlot === slot.id)
                            })).filter(group => group.preps.length > 0);
                            
                            return (
                              <>
                                {/* Time slot tasks first */}
                                {timeSlotGroups.map(({ slot, preps }) => (
                                  <div key={slot.id}>
                                    <h5 className="font-medium text-gray-700 text-sm mb-2 flex items-center">
                                      <span className="mr-2">{slot.icon}</span>
                                      {slot.name}
                                    </h5>
                                    <div className="space-y-2">
                                      {preps.map(prep => {
                                        const priority = priorities.find(p => p.id === prep.priority);
                                        return (
                                          <div key={prep.id} className={`p-3 rounded-lg border-l-4 transition-colors ${
                                            prep.completed ? 'bg-green-50 border-green-500' : 'bg-white border-gray-300 hover:bg-gray-50'
                                          }`}>
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center space-x-3">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleCompletion(prep.id);
                                                  }}
                                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                    prep.completed 
                                                      ? 'bg-green-500 border-green-500' 
                                                      : 'border-gray-300 hover:border-green-500'
                                                  }`}
                                                >
                                                  {prep.completed && <Check className="w-3 h-3 text-white" />}
                                                </button>
                                                <div>
                                                  <div className={`font-medium text-sm flex items-center space-x-2 priority-glow priority-${prep.priority} ${prep.completed ? 'line-through opacity-60' : ''}`}>
                                                    <span>{prep.name}</span>
                                                    {prep.hasRecipe && (
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          prep.recipe && onShowRecipe(prep.recipe, prep.name);
                                                        }}
                                                        className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full hover:bg-green-200 transition-colors"
                                                      >
                                                        📖
                                                      </button>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    {prep.estimatedTime} • {prep.category}
                                                  </div>
                                                </div>
                                              </div>
                                              <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {priority?.name || 'Medium'}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Anytime tasks last */}
                                {anytimePreps.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-gray-700 text-sm mb-2 flex items-center">
                                      🕐 Anytime
                                    </h5>
                                    <div className="space-y-2">
                                      {anytimePreps.map(prep => {
                                        const priority = priorities.find(p => p.id === prep.priority);
                                        return (
                                          <div key={prep.id} className={`p-3 rounded-lg border-l-4 transition-colors ${
                                            prep.completed ? 'bg-green-50 border-green-500' : 'bg-white border-gray-300 hover:bg-gray-50'
                                          }`}>
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center space-x-3">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleCompletion(prep.id);
                                                  }}
                                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                    prep.completed 
                                                      ? 'bg-green-500 border-green-500' 
                                                      : 'border-gray-300 hover:border-green-500'
                                                  }`}
                                                >
                                                  {prep.completed && <Check className="w-3 h-3 text-white" />}
                                                </button>
                                                <div>
                                                  <div className={`font-medium text-sm flex items-center space-x-2 priority-glow priority-${prep.priority} ${prep.completed ? 'line-through opacity-60' : ''}`}>
                                                    <span>{prep.name}</span>
                                                    {prep.hasRecipe && (
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          prep.recipe && onShowRecipe(prep.recipe, prep.name);
                                                        }}
                                                        className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full hover:bg-green-200 transition-colors"
                                                      >
                                                        📖
                                                      </button>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    {prep.estimatedTime} • {prep.category}
                                                  </div>
                                                </div>
                                              </div>
                                              <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {priority?.name || 'Medium'}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          
                          {/* Action buttons */}
                          <div className="flex gap-2 pt-2 border-t">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(date);
                                setActiveView('plan');
                              }}
                              className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                              Edit Preps
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedDay(null);
                              }}
                              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                            >
                              Collapse
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Week Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-600">
              {getWeekDatesFromCurrent().reduce((total, date) => {
                const datePreps = scheduledPreps.filter(prep => 
                  prep.scheduledDate === getDateString(date)
                );
                return total + datePreps.length;
              }, 0)}
            </div>
            <div className="text-sm text-blue-700">Total Tasks This Week</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-600">
              {getWeekDatesFromCurrent().reduce((total, date) => {
                const datePreps = scheduledPreps.filter(prep => 
                  prep.scheduledDate === getDateString(date) && prep.completed
                );
                return total + datePreps.length;
              }, 0)}
            </div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-purple-600">
              {(() => {
                const totalTasks = getWeekDatesFromCurrent().reduce((total, date) => {
                  const datePreps = scheduledPreps.filter(prep => 
                    prep.scheduledDate === getDateString(date)
                  );
                  return total + datePreps.length;
                }, 0);
                const completedTasks = getWeekDatesFromCurrent().reduce((total, date) => {
                  const datePreps = scheduledPreps.filter(prep => 
                    prep.scheduledDate === getDateString(date) && prep.completed
                  );
                  return total + datePreps.length;
                }, 0);
                return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
              })()}%
            </div>
            <div className="text-sm text-purple-700">Week Progress</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekView;

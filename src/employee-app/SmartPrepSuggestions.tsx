import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, Star, Zap, Brain, Target, Timer, Flame } from 'lucide-react';

interface PrepItem {
  id: number;
  name: string;
  category: string;
  estimatedTime: string;
  isCustom: boolean;
  hasRecipe: boolean;
  frequency: number;
  recipe: any;
}

interface ScheduledPrep {
  id: number;
  prepId: number;
  name: string;
  category: string;
  estimatedTime: string;
  isCustom: boolean;
  hasRecipe: boolean;
  recipe: any;
  scheduledDate: string;
  priority: 'low' | 'medium' | 'high';
  timeSlot: string;
  completed: boolean;
  assignedTo: number | null;
  notes: string;
}

interface PrepSelections {
  [key: string]: {
    priority: 'low' | 'medium' | 'high';
    timeSlot: string;
    selected: boolean;
  };
}

interface SmartPrepSuggestionsProps {
  currentDate: Date;
  selectedDate: Date;
  prepItems: PrepItem[];
  scheduledPreps: ScheduledPrep[];
  prepSelections: PrepSelections;
  selectedCategory: string;
  searchQuery: string;
  onToggleSelection: (prep: PrepItem) => void;
  onUpdateSelection: (prep: PrepItem, field: 'priority' | 'timeSlot', value: string, context?: string) => void;
  onShowRecipe: (recipe: any, name: string) => void;
  showPriorityOptions: number | string | null;
  showTimeOptions: number | string | null;
  assignmentStep: Record<number, string | null>;
  onShowPriorityOptions: (prepId: number | string | null) => void;
  onResetWorkflow: () => void;
}

interface PrepSuggestion {
  prep: PrepItem;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  lastCompleted?: string;
  daysSinceLastPrep: number;
  suggestedPriority: 'low' | 'medium' | 'high';
  suggestedTimeSlot: string;
  icon: string;
  score: number;
  completionRate: number;
  avgDaysBetween: number;
}

const SmartPrepSuggestions: React.FC<SmartPrepSuggestionsProps> = ({
  currentDate,
  selectedDate,
  prepItems,
  scheduledPreps,
  prepSelections,
  selectedCategory,
  searchQuery,
  onToggleSelection,
  onUpdateSelection,
  onShowRecipe,
  showPriorityOptions,
  showTimeOptions,
  assignmentStep,
  onShowPriorityOptions,
  onResetWorkflow
}) => {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestionMode, setSuggestionMode] = useState<'overdue' | 'smart' | 'all'>('smart');
  const [maxSuggestions, setMaxSuggestions] = useState(5);

  const priorities = [
    { id: 'low', name: 'Low', color: 'bg-green-100 text-green-700', icon: '🟢' },
    { id: 'medium', name: 'Medium', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
    { id: 'high', name: 'High', color: 'bg-red-100 text-red-700', icon: '🔴' }
  ];

  const timeSlots = [
    { id: 'morning', name: 'Morning (6-10 AM)', icon: '🌅' },
    { id: 'midday', name: 'Mid-day (10 AM-2 PM)', icon: '☀️' },
    { id: 'afternoon', name: 'Afternoon (2-6 PM)', icon: '🌤️' },
    { id: 'evening', name: 'Evening (6-10 PM)', icon: '🌆' }
  ];

  // Utility function to get date string
  const getDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if prep is selected
  const isPrepSelected = (prep: PrepItem): boolean => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
    return prepSelections[selectionKey]?.selected || false;
  };

  // Get prep selection details
  const getPrepSelection = (prep: PrepItem) => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
    return prepSelections[selectionKey] || { priority: 'medium' as const, timeSlot: '', selected: false };
  };

  // Enhanced suggestion algorithm
  const suggestions = useMemo((): PrepSuggestion[] => {
    const today = getDateString(currentDate);
    const selectedDateStr = getDateString(selectedDate);
    
    const allSuggestions = prepItems
      .filter(prep => {
        // Filter by category and search
        const matchesCategory = selectedCategory === 'all' || prep.category === selectedCategory;
        const matchesSearch = searchQuery === '' || 
          prep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prep.category.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Check if already scheduled for selected date
        const alreadyScheduled = scheduledPreps.some(sp => 
          sp.prepId === prep.id && sp.scheduledDate === selectedDateStr
        );
        
        return matchesCategory && matchesSearch && !alreadyScheduled;
      })
      .map(prep => {
        // Find all completions of this prep
        const completions = scheduledPreps
          .filter(sp => sp.prepId === prep.id && sp.completed)
          .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
        
        const lastCompleted = completions[0]?.scheduledDate;
        const daysSinceLastPrep = lastCompleted 
          ? Math.floor((new Date(today).getTime() - new Date(lastCompleted).getTime()) / (1000 * 60 * 60 * 24))
          : 999; // Never completed
        
        // Calculate completion rate
        const totalScheduled = scheduledPreps.filter(sp => sp.prepId === prep.id).length;
        const completionRate = totalScheduled > 0 ? (completions.length / totalScheduled) * 100 : 0;
        
        // Calculate average days between completions
        let avgDaysBetween = prep.frequency;
        if (completions.length > 1) {
          const daysBetween = [];
          for (let i = 0; i < completions.length - 1; i++) {
            const days = Math.floor(
              (new Date(completions[i].scheduledDate).getTime() - 
               new Date(completions[i + 1].scheduledDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            daysBetween.push(days);
          }
          avgDaysBetween = daysBetween.reduce((sum, days) => sum + days, 0) / daysBetween.length;
        }
        
        // Calculate urgency and score
        const targetFrequency = prep.frequency;
        const overdueDays = daysSinceLastPrep - targetFrequency;
        
        let urgency: 'low' | 'medium' | 'high' | 'critical';
        let score = 0;
        let reason = '';
        let icon = '';
        let suggestedPriority: 'low' | 'medium' | 'high' = 'medium';
        let suggestedTimeSlot = 'morning';
        
        if (daysSinceLastPrep === 999) {
          // Never done
          urgency = 'high';
          score = 90;
          reason = 'Never prepared before';
          icon = '🆕';
          suggestedPriority = 'high';
        } else if (overdueDays > prep.frequency) {
          // Critically overdue
          urgency = 'critical';
          score = 100 + overdueDays;
          reason = `${overdueDays} days overdue`;
          icon = '🚨';
          suggestedPriority = 'high';
          suggestedTimeSlot = 'morning'; // High priority in morning
        } else if (overdueDays > 0) {
          // Overdue
          urgency = 'high';
          score = 70 + overdueDays;
          reason = `${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} overdue`;
          icon = '⚠️';
          suggestedPriority = 'high';
        } else if (daysSinceLastPrep >= targetFrequency - 1) {
          // Due soon
          urgency = 'medium';
          score = 50 + (targetFrequency - daysSinceLastPrep);
          reason = 'Due soon';
          icon = '⏰';
          suggestedPriority = 'medium';
        } else if (completionRate < 60) {
          // Low completion rate
          urgency = 'medium';
          score = 40 + (60 - completionRate);
          reason = `Low completion rate (${Math.round(completionRate)}%)`;
          icon = '📉';
          suggestedPriority = 'medium';
        } else if (avgDaysBetween > prep.frequency * 1.5) {
          // Inconsistent preparation
          urgency = 'low';
          score = 30;
          reason = 'Inconsistent schedule';
          icon = '📊';
          suggestedPriority = 'low';
          suggestedTimeSlot = 'afternoon'; // Lower priority later
        } else {
          // Routine suggestion
          urgency = 'low';
          score = 20;
          reason = 'Routine preparation';
          icon = '✨';
          suggestedPriority = 'low';
          suggestedTimeSlot = 'afternoon';
        }
        
        // Boost score for high-frequency items
        if (prep.frequency <= 2) {
          score += 15;
        }
        
        // Boost score for items with recipes (more complex)
        if (prep.hasRecipe) {
          score += 10;
        }
        
        // Suggest time slot based on category
        if (prep.category === 'majoneesit' || prep.category === 'kastikkeet') {
          suggestedTimeSlot = 'morning'; // Sauces in morning
        } else if (prep.category === 'proteiinit') {
          suggestedTimeSlot = 'midday'; // Proteins for lunch prep
        } else if (prep.category === 'kasvikset') {
          suggestedTimeSlot = 'afternoon'; // Fresh vegetables later
        } else if (prep.category === 'marinointi') {
          suggestedTimeSlot = 'morning'; // Marinating takes time
        }
        
        return {
          prep,
          reason,
          urgency,
          lastCompleted,
          daysSinceLastPrep,
          suggestedPriority,
          suggestedTimeSlot,
          icon,
          score,
          completionRate,
          avgDaysBetween
        };
      })
      .filter(suggestion => {
        if (suggestionMode === 'overdue') {
          return suggestion.urgency === 'critical' || suggestion.urgency === 'high';
        } else if (suggestionMode === 'smart') {
          return suggestion.score >= 30; // Smart filtering
        }
        return true; // 'all' mode
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
    
    return allSuggestions;
  }, [prepItems, scheduledPreps, currentDate, selectedDate, selectedCategory, searchQuery, suggestionMode, maxSuggestions]);

  // Auto-apply suggestions (optional feature)
  const autoApplySuggestions = () => {
    suggestions.slice(0, 3).forEach(({ prep, suggestedPriority, suggestedTimeSlot }) => {
      if (!isPrepSelected(prep)) {
        onToggleSelection(prep);
        setTimeout(() => {
          onUpdateSelection(prep, 'priority', suggestedPriority, 'suggested');
          setTimeout(() => {
            onUpdateSelection(prep, 'timeSlot', suggestedTimeSlot, 'suggested');
          }, 100);
        }, 100);
      }
    });
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl overflow-hidden shadow-sm border border-orange-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 border-b border-orange-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center space-x-3 text-left hover:text-orange-600 transition-colors group"
          >
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-orange-800">
                Smart Prep Suggestions
              </h4>
              <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                {suggestions.length}
              </span>
            </div>
            <span className={`transform transition-transform duration-200 ${showSuggestions ? 'rotate-180' : 'rotate-0'}`}>
              <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </span>
          </button>
          
          {showSuggestions && (
            <div className="flex items-center space-x-2">
              {/* Mode selector */}
              <select
                value={suggestionMode}
                onChange={(e) => setSuggestionMode(e.target.value as 'overdue' | 'smart' | 'all')}
                className="text-xs bg-white border border-orange-300 rounded-lg px-2 py-1 text-orange-700 focus:ring-2 focus:ring-orange-500"
              >
                <option value="smart">Smart</option>
                <option value="overdue">Overdue Only</option>
                <option value="all">All</option>
              </select>
              
              {/* Auto-apply button */}
              <button
                onClick={autoApplySuggestions}
                className="flex items-center space-x-1 px-3 py-1 bg-orange-200 text-orange-800 rounded-lg hover:bg-orange-300 transition-colors text-xs font-medium"
                title="Auto-apply top 3 suggestions"
              >
                <Zap className="w-3 h-3" />
                <span>Auto-Apply</span>
              </button>
            </div>
          )}
        </div>
        
        {showSuggestions && (
          <div className="mt-2 text-xs text-orange-700">
            <span className="flex items-center space-x-1">
              <Lightbulb className="w-3 h-3" />
              <span>AI-powered suggestions based on prep frequency, completion history, and urgency</span>
            </span>
          </div>
        )}
      </div>

      {/* Suggestions List */}
      {showSuggestions && (
        <div className="bg-white p-4 space-y-3">
          {suggestions.map(({ prep, reason, urgency, daysSinceLastPrep, icon, score, completionRate, suggestedPriority, suggestedTimeSlot }) => {
            const isSelected = isPrepSelected(prep);
            const selection = getPrepSelection(prep);
            
            // Urgency colors
            const urgencyColors = {
              low: 'border-blue-300 bg-blue-50',
              medium: 'border-yellow-300 bg-yellow-50',
              high: 'border-orange-400 bg-orange-50',
              critical: 'border-red-400 bg-red-50'
            };
            
            const urgencyTextColors = {
              low: 'text-blue-800',
              medium: 'text-yellow-800',
              high: 'text-orange-800',
              critical: 'text-red-800'
            };

            return (
              <div 
                key={`suggested-${prep.id}`} 
                className={`rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  isSelected 
                    ? 'border-green-400 bg-green-50 shadow-sm' 
                    : urgencyColors[urgency]
                }`}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    {/* Left side - Selection and details */}
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <button
                        onClick={() => onToggleSelection(prep)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 mt-0.5 ${
                          isSelected 
                            ? 'bg-green-500 border-green-500' 
                            : urgency === 'critical'
                            ? 'border-red-400 hover:border-red-500'
                            : urgency === 'high'
                            ? 'border-orange-400 hover:border-orange-500'
                            : 'border-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm">{icon}</span>
                          <h5 className={`font-medium text-sm truncate ${
                            isSelected ? 'text-green-900' : urgencyTextColors[urgency]
                          }`}>
                            {prep.name}
                          </h5>
                          {prep.hasRecipe && (
                            <button
                              onClick={() => prep.recipe && onShowRecipe(prep.recipe, prep.name)}
                              className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full hover:bg-green-200 transition-colors"
                            >
                              📖
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 text-xs text-gray-600 mb-1">
                          <span>{prep.estimatedTime}</span>
                          <span>•</span>
                          <span>{prep.category}</span>
                          <span>•</span>
                          <span>Every {prep.frequency} days</span>
                        </div>
                        
                        <div className="flex items-center space-x-3 text-xs">
                          <span className={`font-medium ${urgencyTextColors[urgency]}`}>
                            {reason}
                          </span>
                          {completionRate > 0 && (
                            <span className="text-gray-500">
                              {Math.round(completionRate)}% completion rate
                            </span>
                          )}
                          <span className="text-gray-400">
                            Score: {score}
                          </span>
                        </div>
                        
                        {daysSinceLastPrep < 999 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Last done: {daysSinceLastPrep} days ago
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Right side - Priority/Time assignment */}
                    <div className="flex-shrink-0 ml-3">
                      <div className="relative">
                        <button
                          onClick={() => {
                            if (showPriorityOptions === `suggested-${prep.id}`) {
                              onResetWorkflow();
                            } else {
                              onShowPriorityOptions(`suggested-${prep.id}`);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap font-medium ${
                            isSelected 
                              ? priorities.find(p => p.id === selection.priority)?.color + ' shadow-sm'
                              : assignmentStep[prep.id] === 'timeSlot'
                              ? 'bg-green-100 text-green-700 shadow-sm'
                              : urgency === 'critical'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : urgency === 'high' 
                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {isSelected 
                            ? `${priorities.find(p => p.id === selection.priority)?.name}${selection.timeSlot ? ` • ${timeSlots.find(t => t.id === selection.timeSlot)?.name.split(' ')[0]}` : ' • Anytime'}`
                            : assignmentStep[prep.id] === 'timeSlot'
                            ? 'Choose time'
                            : `Click to assign (${suggestedPriority})`
                          }
                        </button>
                        
                        {/* Priority Dropdown */}
                        {showPriorityOptions === `suggested-${prep.id}` && (
                          <div className="dropdown-container absolute top-full right-0 mt-2 rounded-xl p-3 z-20 w-52 backdrop-filter backdrop-blur-lg bg-white/95 border border-white/30 shadow-xl">
                            <div className="space-y-3">
                              <div>
                                <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                  <Target className="w-4 h-4 mr-2 text-blue-500" />
                                  <span>Choose Priority</span>
                                  <span className="ml-auto text-xs text-green-600">
                                    Suggested: {suggestedPriority}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {priorities.map(priority => (
                                    <button
                                      key={priority.id}
                                      onClick={() => onUpdateSelection(prep, 'priority', priority.id, 'suggested')}
                                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 backdrop-filter backdrop-blur-sm border border-white/20 ${
                                        priority.color
                                      } ${
                                        priority.id === suggestedPriority ? 'ring-2 ring-green-400' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span>{priority.name}</span>
                                        <div className="flex items-center space-x-1">
                                          <span className="text-xs opacity-70">{priority.icon}</span>
                                          {priority.id === suggestedPriority && (
                                            <Star className="w-3 h-3 text-green-500" />
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Time Slot Dropdown */}
                        {showTimeOptions === `suggested-${prep.id}` && (
                          <div className="dropdown-container absolute top-full right-0 mt-2 rounded-xl p-3 z-20 w-64 backdrop-filter backdrop-blur-lg bg-white/95 border border-white/30 shadow-xl">
                            <div className="space-y-3">
                              <div>
                                <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                  <Timer className="w-4 h-4 mr-2 text-green-500" />
                                  <span>Choose Time Slot</span>
                                  <span className="ml-auto text-xs text-green-600">
                                    Suggested: {timeSlots.find(t => t.id === suggestedTimeSlot)?.name.split(' ')[0]}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <button
                                    onClick={() => onUpdateSelection(prep, 'timeSlot', '', 'suggested')}
                                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 bg-gray-50 text-gray-700 hover:bg-gray-100 backdrop-filter backdrop-blur-sm border border-white/20"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>Anytime</span>
                                      <span className="text-xs opacity-70">🕐</span>
                                    </div>
                                  </button>
                                  {timeSlots.map(slot => (
                                    <button
                                      key={slot.id}
                                      onClick={() => onUpdateSelection(prep, 'timeSlot', slot.id, 'suggested')}
                                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 bg-blue-50 text-blue-700 hover:bg-blue-100 backdrop-filter backdrop-blur-sm border border-white/20 ${
                                        slot.id === suggestedTimeSlot ? 'ring-2 ring-green-400' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span>{slot.name.split(' ')[0]}</span>
                                        <div className="flex items-center space-x-1">
                                          <span className="text-xs opacity-70">{slot.icon}</span>
                                          {slot.id === suggestedTimeSlot && (
                                            <Star className="w-3 h-3 text-green-500" />
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Summary */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <Brain className="w-3 h-3" />
                  <span>AI-powered suggestions</span>
                </span>
                <span className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Based on {scheduledPreps.length} historical data points</span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span>Show:</span>
                <select
                  value={maxSuggestions}
                  onChange={(e) => setMaxSuggestions(Number(e.target.value))}
                  className="bg-transparent border border-gray-300 rounded px-2 py-1 text-xs"
                >
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartPrepSuggestions;

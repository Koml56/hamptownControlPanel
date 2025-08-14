import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, TrendingUp, Star, Zap, Brain, Target, Timer, Shield, BookOpen, BarChart3 } from 'lucide-react';

interface PrepItem {
  id: number;
  name: string;
  category: string;
  estimatedTime: string;
  isCustom: boolean;
  hasRecipe: boolean;
  frequency: number; // Recommended frequency
  learnedFrequency?: number; // AI-calculated optimal frequency
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

interface LearningLogEntry {
  prepId: number;
  prepName: string;
  timestamp: string;
  recommendedFreq: number;
  learnedFreq: number;
  reason: string;
  confidence: number;
  dataPoints: number;
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
  learnedFrequency: number;
  frequencyConfidence: number;
  dayPatterns: Record<string, number>;
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionMode, setSuggestionMode] = useState<'overdue' | 'smart' | 'all'>('smart');
  const [maxSuggestions, setMaxSuggestions] = useState(5);
  const [showLearningLog, setShowLearningLog] = useState(false);
  const [learningLog, setLearningLog] = useState<LearningLogEntry[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Detect admin mode using same method as PrepListPrototype
  useEffect(() => {
    const checkAdminMode = () => {
      // Method 1: Check for "Admin Mode" badge in header (most reliable)
      const adminBadge = document.querySelector('.bg-red-100.text-red-700');
      const hasAdminBadge = adminBadge && adminBadge.textContent?.includes('Admin Mode');
      
      // Method 2: Check if admin/reports tabs are visible (only shown when admin)
      const tabsContainer = document.querySelector('.bg-white.border-b');
      const hasAdminTabs = tabsContainer && (
        tabsContainer.textContent?.includes('Admin Panel') || 
        tabsContainer.textContent?.includes('Daily Reports')
      );
      
      // Method 3: Check for admin logout button
      const logoutButton = document.querySelector('[title="Logout Admin"]');
      
      const isAdmin = hasAdminBadge || hasAdminTabs || !!logoutButton;
      setIsAdminMode(isAdmin);
      
      // Debug log for admin detection
      if (isAdmin !== isAdminMode) {
        console.log('🔧 Prep Suggestions: Admin mode detected:', { 
          hasAdminBadge: !!hasAdminBadge, 
          hasAdminTabs: !!hasAdminTabs, 
          hasLogoutButton: !!logoutButton,
          isAdmin
        });
      }
    };
    
    // Check immediately and then poll every second
    checkAdminMode();
    const interval = setInterval(checkAdminMode, 1000);
    
    return () => clearInterval(interval);
  }, [isAdminMode]);

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

  // Helper function to get priority color for visual indicators
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Helper function to get urgency priority color
  const getUrgencyPriorityColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

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

  // Calculate learned frequency and day patterns
  const calculateLearnedFrequency = (prepId: number, completions: ScheduledPrep[]) => {
    if (completions.length < 2) return { learnedFreq: 0, confidence: 0, dayPatterns: {} };

    // Calculate days between completions
    const daysBetween = [];
    const dayPatterns: Record<string, number> = {};
    
    for (let i = 0; i < completions.length - 1; i++) {
      const days = Math.floor(
        (new Date(completions[i].scheduledDate).getTime() - 
         new Date(completions[i + 1].scheduledDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      daysBetween.push(days);
    }

    // Track day-of-week patterns
    completions.forEach(completion => {
      const dayOfWeek = new Date(completion.scheduledDate).toLocaleDateString('en-US', { weekday: 'long' });
      dayPatterns[dayOfWeek] = (dayPatterns[dayOfWeek] || 0) + 1;
    });

    const avgDaysBetween = daysBetween.reduce((sum, days) => sum + days, 0) / daysBetween.length;
    
    // Confidence based on data points and consistency
    const variance = daysBetween.reduce((sum, days) => sum + Math.pow(days - avgDaysBetween, 2), 0) / daysBetween.length;
    const consistency = 1 / (1 + variance / avgDaysBetween); // 0-1 scale
    const dataConfidence = Math.min(completions.length / 10, 1); // More data = more confidence
    const confidence = (consistency * 0.7 + dataConfidence * 0.3) * 100;

    return {
      learnedFreq: Math.round(avgDaysBetween * 10) / 10,
      confidence: Math.round(confidence),
      dayPatterns
    };
  };

  // Enhanced suggestion algorithm with hybrid frequency
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
        
        // Calculate learned frequency and patterns
        const { learnedFreq, confidence, dayPatterns } = calculateLearnedFrequency(prep.id, completions);
        
        // Use learned frequency if we have enough confidence, otherwise use recommended
        const effectiveFrequency = (confidence > 60 && learnedFreq > 0) ? learnedFreq : prep.frequency;
        
        // Log learning updates
        if (isAdminMode && learnedFreq > 0 && Math.abs(learnedFreq - prep.frequency) > 0.5) {
          const logEntry: LearningLogEntry = {
            prepId: prep.id,
            prepName: prep.name,
            timestamp: new Date().toISOString(),
            recommendedFreq: prep.frequency,
            learnedFreq,
            reason: `Pattern analysis from ${completions.length} completions`,
            confidence,
            dataPoints: completions.length
          };
          
          setLearningLog(prev => {
            const exists = prev.some(entry => 
              entry.prepId === prep.id && 
              Math.abs(new Date(entry.timestamp).getTime() - new Date().getTime()) < 60000
            );
            return exists ? prev : [logEntry, ...prev.slice(0, 49)]; // Keep last 50 entries
          });
        }
        
        // Calculate completion rate
        const totalScheduled = scheduledPreps.filter(sp => sp.prepId === prep.id).length;
        const completionRate = totalScheduled > 0 ? (completions.length / totalScheduled) * 100 : 0;
        
        // Calculate urgency and score using effective frequency
        const targetFrequency = effectiveFrequency;
        const overdueDays = daysSinceLastPrep - targetFrequency;
        
        let urgency: 'low' | 'medium' | 'high' | 'critical';
        let score = 0;
        let reason = '';
        let icon = '';
        let suggestedPriority: 'low' | 'medium' | 'high' = 'medium';
        let suggestedTimeSlot = 'morning';
        
        if (daysSinceLastPrep === 999) {
          // Never done - removed "New" emoji
          urgency = 'high';
          score = 90;
          reason = 'Never prepared before';
          icon = '❓';
          suggestedPriority = 'high';
        } else if (overdueDays > targetFrequency) {
          // Critically overdue
          urgency = 'critical';
          score = 100 + overdueDays;
          reason = `${Math.round(overdueDays)} days overdue`;
          icon = '🚨';
          suggestedPriority = 'high';
          suggestedTimeSlot = 'morning'; // High priority in morning
        } else if (overdueDays > 0) {
          // Overdue
          urgency = 'high';
          score = 70 + overdueDays;
          reason = `${Math.round(overdueDays)} ${Math.round(overdueDays) === 1 ? 'day' : 'days'} overdue`;
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
        } else if (confidence > 60 && Math.abs(learnedFreq - prep.frequency) > 1) {
          // Frequency mismatch detected
          urgency = 'low';
          score = 35;
          reason = `Frequency analysis suggests ${Math.round(learnedFreq)} days`;
          icon = '🔍';
          suggestedPriority = 'low';
          suggestedTimeSlot = 'afternoon';
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
        if (effectiveFrequency <= 2) {
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
          avgDaysBetween: learnedFreq,
          learnedFrequency: learnedFreq,
          frequencyConfidence: confidence,
          dayPatterns
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
  }, [prepItems, scheduledPreps, currentDate, selectedDate, selectedCategory, searchQuery, suggestionMode, maxSuggestions, isAdminMode]);

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
                {isAdminMode && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">ADMIN</span>}
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
              {/* Admin Learning Log */}
              {isAdminMode && (
                <button
                  onClick={() => setShowLearningLog(!showLearningLog)}
                  className="flex items-center space-x-1 px-3 py-1 bg-purple-200 text-purple-800 rounded-lg hover:bg-purple-300 transition-colors text-xs font-medium"
                  title="View AI Learning Log"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Learning Log</span>
                </button>
              )}
              
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
              <span>AI-powered suggestions with hybrid frequency learning from {scheduledPreps.filter(sp => sp.completed).length} completions</span>
            </span>
          </div>
        )}
      </div>

      {/* Learning Log Modal */}
      {isAdminMode && showLearningLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">AI Learning Log</h3>
                  <p className="text-sm text-gray-600">Frequency optimization analysis</p>
                </div>
              </div>
              <button
                onClick={() => setShowLearningLog(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {learningLog.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No learning data yet. AI will start analyzing patterns as you complete more preps.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {learningLog.map((entry, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800">{entry.prepName}</h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.confidence > 80 ? 'bg-green-100 text-green-700' :
                            entry.confidence > 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {entry.confidence}% confidence
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Recommended:</span>
                          <div className="font-medium">Every {entry.recommendedFreq} days</div>
                        </div>
                        <div>
                          <span className="text-gray-600">AI Learned:</span>
                          <div className="font-medium text-blue-600">Every {entry.learnedFreq} days</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Data Points:</span>
                          <div className="font-medium">{entry.dataPoints} completions</div>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">{entry.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suggestions List */}
      {showSuggestions && (
        <div className="bg-white p-4 space-y-3">
          {suggestions.map(({ prep, reason, urgency, daysSinceLastPrep, icon, score, completionRate, suggestedPriority, suggestedTimeSlot, learnedFrequency, frequencyConfidence }) => {
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
                <div className="p-3 md:p-4">
                  {/* Mobile-optimized layout */}
                  <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
                    
                    {/* Header with priority indicator, name, and selection */}
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      {/* Priority color indicator */}
                      <div className="flex items-center space-x-2 flex-shrink-0 mt-0.5">
                        <div className={`w-3 h-3 rounded-full ${
                          isSelected 
                            ? getPriorityColor(selection.priority)
                            : getUrgencyPriorityColor(urgency)
                        }`}></div>
                        <button
                          onClick={() => onToggleSelection(prep)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
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
                      </div>
                      
                      {/* Prep details */}
                      <div className="flex-1 min-w-0">
                        {/* Name and recipe button */}
                        <div className="flex items-center justify-between mb-2">
                          <h5 className={`font-semibold text-base md:text-lg ${
                            isSelected ? 'text-green-900' : urgencyTextColors[urgency]
                          }`}>
                            {prep.name}
                          </h5>
                          {prep.hasRecipe && (
                            <button
                              onClick={() => prep.recipe && onShowRecipe(prep.recipe, prep.name)}
                              className="flex-shrink-0 text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200 transition-colors"
                            >
                              📖 Recipe
                            </button>
                          )}
                        </div>
                        
                        {/* Details line - stacked on mobile, inline on desktop */}
                        <div className="text-sm text-gray-600 space-y-1 md:space-y-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{prep.estimatedTime}</span>
                            <span>•</span>
                            <span className="capitalize">{prep.category}</span>
                            <span>•</span>
                            <span>Every {prep.frequency} days</span>
                          </div>
                          {learnedFrequency > 0 && frequencyConfidence > 60 && (
                            <div className="text-blue-600 text-xs">
                              AI learned: Every {learnedFrequency} days ({frequencyConfidence}% confidence)
                            </div>
                          )}
                        </div>
                        
                        {/* Status information */}
                        <div className="mt-2 space-y-1">
                          <div className={`text-sm font-medium ${urgencyTextColors[urgency]}`}>
                            {reason}
                          </div>
                          {daysSinceLastPrep < 999 && (
                            <div className="text-xs text-gray-500">
                              Last done: {daysSinceLastPrep} days ago
                            </div>
                          )}
                          {completionRate > 0 && (
                            <div className="text-xs text-gray-500">
                              {Math.round(completionRate)}% completion rate
                              {isAdminMode && ` (Score: ${score})`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action button - full width on mobile, compact on desktop */}
                    <div className="md:flex-shrink-0 md:ml-4">
                      <div className="relative">
                        <button
                          onClick={() => {
                            if (showPriorityOptions === `suggested-${prep.id}`) {
                              onResetWorkflow();
                            } else {
                              onShowPriorityOptions(`suggested-${prep.id}`);
                            }
                          }}
                          className={`w-full md:w-auto px-4 py-2 md:py-1.5 rounded-lg text-sm transition-colors font-medium ${
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
                            ? 'Choose Time Slot'
                            : `Assign ${suggestedPriority.charAt(0).toUpperCase() + suggestedPriority.slice(1)} Priority`
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
                  <span>Hybrid frequency learning</span>
                </span>
                <span className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Based on {scheduledPreps.filter(sp => sp.completed).length} completions</span>
                </span>
                {isAdminMode && (
                  <span className="flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>Admin mode active</span>
                  </span>
                )}
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

// PrepListPrototype.tsx - Properly integrated with Firebase
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, ChefHat, Check, Star, Trash2, Users, Search, X } from 'lucide-react';
import { getFormattedDate } from './utils';
import type { PrepItem, ScheduledPrep, PrepSelections, Priority, Recipe, CurrentUser, ConnectionStatus } from './types';

interface PrepListPrototypeProps {
  currentUser: CurrentUser;
  connectionStatus: ConnectionStatus;
  // Firebase data from main hooks
  prepItems: PrepItem[];
  scheduledPreps: ScheduledPrep[];
  prepSelections: PrepSelections;
  // Firebase setters from main hooks
  setPrepItems: (updater: (prev: PrepItem[]) => PrepItem[]) => void;
  setScheduledPreps: (updater: (prev: ScheduledPrep[]) => ScheduledPrep[]) => void;
  setPrepSelections: (updater: (prev: PrepSelections) => PrepSelections) => void;
  // Firebase actions
  quickSave: (field: string, data: any) => Promise<void>;
}

interface TimeSlot {
  id: string;
  name: string;
  icon: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface PriorityInfo {
  id: Priority;
  name: string;
  color: string;
  icon: string;
}

const PrepListPrototype: React.FC<PrepListPrototypeProps> = ({
  currentUser,
  connectionStatus,
  prepItems,
  scheduledPreps,
  prepSelections,
  setPrepItems,
  setScheduledPreps,
  setPrepSelections,
  quickSave
}) => {
  // UI State
  const [activeView, setActiveView] = useState('today');
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newPrepName, setNewPrepName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeData, setRecipeData] = useState<Recipe>({ ingredients: '', instructions: '' });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const categories: Category[] = [
    { id: 'all', name: 'All Items', icon: '🍽️' },
    { id: 'vegetables', name: 'Vegetables', icon: '🥗' },
    { id: 'proteins', name: 'Proteins', icon: '🥩' },
    { id: 'sauces', name: 'Sauces', icon: '🧂' },
    { id: 'breads', name: 'Breads', icon: '🍞' },
    { id: 'sides', name: 'Sides', icon: '🍟' },
    { id: 'desserts', name: 'Desserts', icon: '🍰' }
  ];

  const timeSlots: TimeSlot[] = [
    { id: 'morning', name: 'Morning (6-10 AM)', icon: '🌅' },
    { id: 'midday', name: 'Mid-day (10 AM-2 PM)', icon: '☀️' },
    { id: 'afternoon', name: 'Afternoon (2-6 PM)', icon: '🌤️' },
    { id: 'evening', name: 'Evening (6-10 PM)', icon: '🌆' }
  ];

  const priorities: PriorityInfo[] = [
    { id: 'low', name: 'Low', color: 'bg-green-100 text-green-700', icon: '🟢' },
    { id: 'medium', name: 'Medium', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
    { id: 'high', name: 'High', color: 'bg-red-100 text-red-700', icon: '🔴' }
  ];

  // Initialize with default prep items if empty
  useEffect(() => {
    if (prepItems.length === 0) {
      const defaultPreps: PrepItem[] = [
        { id: 1, name: 'Cut lettuce for salads', category: 'vegetables', estimatedTime: '15 min', isCustom: false, hasRecipe: false, recipe: null },
        { id: 2, name: 'Dice tomatoes', category: 'vegetables', estimatedTime: '10 min', isCustom: false, hasRecipe: false, recipe: null },
        { id: 3, name: 'Slice onions', category: 'vegetables', estimatedTime: '15 min', isCustom: false, hasRecipe: false, recipe: null },
        { id: 4, name: 'Prep cucumber slices', category: 'vegetables', estimatedTime: '10 min', isCustom: false, hasRecipe: false, recipe: null },
        { id: 5, name: 'Make coleslaw mix', category: 'vegetables', estimatedTime: '20 min', isCustom: false, hasRecipe: true, recipe: null },
        { id: 6, name: 'Marinate chicken breasts', category: 'proteins', estimatedTime: '30 min', isCustom: false, hasRecipe: true, recipe: null },
        { id: 7, name: 'Season burger patties', category: 'proteins', estimatedTime: '20 min', isCustom: false, hasRecipe: true, recipe: null },
        { id: 8, name: 'Mix ranch dressing', category: 'sauces', estimatedTime: '10 min', isCustom: false, hasRecipe: true, recipe: null },
        { id: 9, name: 'Prepare garlic aioli', category: 'sauces', estimatedTime: '15 min', isCustom: false, hasRecipe: true, recipe: null },
        { id: 10, name: 'Slice bread for sandwiches', category: 'breads', estimatedTime: '10 min', isCustom: false, hasRecipe: false, recipe: null }
      ];
      
      setPrepItems(() => defaultPreps);
      quickSave('prepItems', defaultPreps);
    }
  }, [prepItems.length, setPrepItems, quickSave]);

  // Utility functions
  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Check if prep is selected for current date
  const isPrepSelected = (prep: PrepItem): boolean => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
    return prepSelections[selectionKey]?.selected || false;
  };

  // Toggle prep selection
  const togglePrepSelection = (prep: PrepItem): void => {
    const selectionKey = `${getDateString(selectedDate)}-${prep.id}`;
    const isSelected = prepSelections[selectionKey]?.selected;
    
    if (isSelected) {
      // Remove selection
      setPrepSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[selectionKey];
        return newSelections;
      });
      
      // Remove from scheduled preps
      setScheduledPreps(prev => prev.filter(p => 
        !(p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate))
      ));
    } else {
      // Add selection with defaults
      setPrepSelections(prev => ({
        ...prev,
        [selectionKey]: { priority: 'medium', timeSlot: '', selected: true }
      }));
      
      // Add to scheduled preps
      const newScheduledPrep: ScheduledPrep = {
        id: Date.now(),
        prepId: prep.id,
        name: prep.name,
        category: prep.category,
        estimatedTime: prep.estimatedTime,
        isCustom: prep.isCustom,
        hasRecipe: prep.hasRecipe,
        recipe: prep.recipe,
        scheduledDate: getDateString(selectedDate),
        priority: 'medium',
        timeSlot: '',
        completed: false,
        assignedTo: null,
        notes: ''
      };
      setScheduledPreps(prev => [...prev, newScheduledPrep]);
    }
  };

  // Add custom prep
  const addCustomPrep = () => {
    if (!newPrepName.trim()) return;
    
    const customPrep: PrepItem = {
      id: Date.now(),
      name: newPrepName.trim(),
      category: selectedCategory === 'all' ? 'vegetables' : selectedCategory,
      estimatedTime: '20 min',
      isCustom: true,
      hasRecipe: showRecipeForm,
      recipe: showRecipeForm ? {
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions
      } : null
    };
    
    setPrepItems(prev => [...prev, customPrep]);
    setNewPrepName('');
    setShowAddCustom(false);
    setShowRecipeForm(false);
    setRecipeData({ ingredients: '', instructions: '' });
    
    // Auto-select the new custom prep
    togglePrepSelection(customPrep);
  };

  // Toggle prep completion (for today's view)
  const togglePrepCompletion = (scheduledPrepId: number): void => {
    setScheduledPreps(prev => prev.map(prep => 
      prep.id === scheduledPrepId 
        ? { ...prep, completed: !prep.completed }
        : prep
    ));
  };

  // Filter preps
  const filteredPreps = prepItems.filter(prep => {
    const matchesCategory = selectedCategory === 'all' || prep.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      prep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prep.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get today's scheduled preps
  const todayScheduledPreps = scheduledPreps.filter(prep => 
    prep.scheduledDate === getFormattedDate(new Date())
  );

  // Get selected date's scheduled preps
  const selectedDateScheduledPreps = scheduledPreps.filter(prep => 
    prep.scheduledDate === getDateString(selectedDate)
  );

  const completedToday = todayScheduledPreps.filter(prep => prep.completed).length;
  const totalToday = todayScheduledPreps.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <ChefHat className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Prep List Manager</h1>
              <p className="text-gray-600">Plan and track kitchen preparation tasks</p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {connectionStatus === 'connected' ? 'Synced' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('today')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeView === 'today' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Check className="w-4 h-4 mr-2" />
            Today's Preps
          </button>
          <button
            onClick={() => setActiveView('plan')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeView === 'plan' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Plan Preps
          </button>
          <button
            onClick={() => setActiveView('week')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              activeView === 'week' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Week View
          </button>
        </div>
      </div>

      {/* Today's Preps View */}
      {activeView === 'today' && (
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
          </div>

          {/* Today's Prep List */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Prep Tasks</h3>
            
            {todayScheduledPreps.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No prep tasks scheduled for today</p>
                <p className="text-sm">Use the "Plan Preps" tab to schedule tasks.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayScheduledPreps.map(prep => {
                  const priority = priorities.find(p => p.id === prep.priority);
                  const timeSlot = timeSlots.find(t => t.id === prep.timeSlot);
                  
                  return (
                    <div key={prep.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => togglePrepCompletion(prep.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            prep.completed 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {prep.completed && <Check className="w-4 h-4 text-white" />}
                        </button>
                        <div>
                          <div className={`font-medium ${prep.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            {prep.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {prep.estimatedTime} • {prep.category}
                            {prep.timeSlot && ` • ${timeSlot?.name || 'Scheduled'}`}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
                        {priority?.name || 'Medium'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plan Preps View */}
      {activeView === 'plan' && (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Date to Plan</h3>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={getDateString(selectedDate)}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-gray-600">
                Planning for: <strong>{formatDate(selectedDate)}</strong>
              </div>
            </div>
          </div>

          {/* Choose Prep Items */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Choose Prep Items</h3>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  showSearch ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </button>
            </div>

            {/* Search Bar */}
            {showSearch && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search prep items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 border-0 bg-transparent focus:outline-none"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    selectedCategory === category.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Prep Items List */}
            <div className="space-y-3">
              {filteredPreps.map(prep => {
                const isSelected = isPrepSelected(prep);

                return (
                  <div key={prep.id} className={`border rounded-lg p-4 transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <button
                          onClick={() => togglePrepSelection(prep)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected 
                              ? 'bg-blue-500 border-blue-500' 
                              : 'border-gray-300 hover:border-blue-500'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </button>
                        <div className="flex-1">
                          <h4 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                            {prep.name}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center space-x-2">
                            <span>{prep.estimatedTime}</span>
                            <span>•</span>
                            <span>{prep.category}</span>
                            {prep.isCustom && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">Custom</span>}
                            {prep.hasRecipe && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Has Recipe</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* No Results Message */}
            {filteredPreps.length === 0 && searchQuery && (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No prep items found matching "{searchQuery}"</p>
                <p className="text-sm">Try a different search term or browse categories above.</p>
              </div>
            )}

            {/* Add Custom Prep */}
            <div className="mt-6 pt-6 border-t">
              {!showAddCustom ? (
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="flex items-center px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Prep Item
                </button>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-800 mb-4">Add Custom Prep</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prep Name</label>
                      <input
                        type="text"
                        value={newPrepName}
                        onChange={(e) => setNewPrepName(e.target.value)}
                        placeholder="e.g., Prep special sauce"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={selectedCategory === 'all' ? 'vegetables' : selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {categories.slice(1).map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center mt-2">
                      <label className="flex items-center space-x-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={showRecipeForm}
                          onChange={(e) => setShowRecipeForm(e.target.checked)}
                          className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                        <span>Add Recipe</span>
                      </label>
                    </div>
                    {showRecipeForm && (
                      <div className="md:col-span-2 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
                          <textarea
                            value={recipeData.ingredients}
                            onChange={(e) => setRecipeData(prev => ({ ...prev, ingredients: e.target.value }))}
                            placeholder="List ingredients here..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                          <textarea
                            value={recipeData.instructions}
                            onChange={(e) => setRecipeData(prev => ({ ...prev, instructions: e.target.value }))}
                            placeholder="Enter cooking instructions..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={addCustomPrep}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Add Prep
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCustom(false);
                        setNewPrepName('');
                        setShowRecipeForm(false);
                        setRecipeData({ ingredients: '', instructions: '' });
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Preps for Selected Date */}
          {selectedDateScheduledPreps.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Scheduled for {formatDate(selectedDate).split(',')[0]}
              </h3>
              <div className="space-y-2">
                {selectedDateScheduledPreps.map(prep => {
                  const priority = priorities.find(p => p.id === prep.priority);
                  const timeSlot = timeSlots.find(t => t.id === prep.timeSlot);
                  
                  return (
                    <div key={prep.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{prep.timeSlot ? timeSlot?.icon : '🕐'}</span>
                        <div>
                          <div className="font-medium text-gray-800">{prep.name}</div>
                          <div className="text-sm text-gray-600">
                            {prep.timeSlot ? timeSlot?.name : 'Anytime'} • {prep.estimatedTime}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${priority?.color || 'bg-gray-100 text-gray-700'}`}>
                          {priority?.name || 'Medium'}
                        </span>
                        <button
                          onClick={() => {
                            // Remove from scheduled preps
                            setScheduledPreps(prev => prev.filter(p => 
                              !(p.prepId === prep.prepId && p.scheduledDate === prep.scheduledDate)
                            ));
                            // Remove from selections
                            const selectionKey = `${prep.scheduledDate}-${prep.prepId}`;
                            setPrepSelections(prev => {
                              const newSelections = { ...prev };
                              delete newSelections[selectionKey];
                              return newSelections;
                            });
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Week View */}
      {activeView === 'week' && (
        <div className="space-y-6">
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
              {getWeekDates().map((date, index) => {
                const datePreps = scheduledPreps.filter(prep => 
                  prep.scheduledDate === getDateString(date)
                );
                const completed = datePreps.filter(prep => prep.completed).length;
                const isToday = getDateString(date) === getFormattedDate(new Date());
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
                                const priority = priorities.find(p => p.id === prep.priority);
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
                    <div className={`transition-all duration-500 ease-in-out ${
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      {isExpanded && (
                        <div className="p-4 space-y-3">
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
                                    {/* Anytime tasks */}
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
                                                        togglePrepCompletion(prep.id);
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
                                                      <div className={`font-medium text-sm ${prep.completed ? 'line-through opacity-60' : ''}`}>
                                                        {prep.name}
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
                                    
                                    {/* Time slot tasks */}
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
                                                        togglePrepCompletion(prep.id);
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
                                                      <div className={`font-medium text-sm ${prep.completed ? 'line-through opacity-60' : ''}`}>
                                                        {prep.name}
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
                  {getWeekDates().reduce((total, date) => {
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
                  {getWeekDates().reduce((total, date) => {
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
                    const totalTasks = getWeekDates().reduce((total, date) => {
                      const datePreps = scheduledPreps.filter(prep => 
                        prep.scheduledDate === getDateString(date)
                      );
                      return total + datePreps.length;
                    }, 0);
                    const completedTasks = getWeekDates().reduce((total, date) => {
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
      )}
    </div>
  );
};

export default PrepListPrototype;

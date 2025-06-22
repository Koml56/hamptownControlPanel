// PrepListPrototype.tsx - Main component for prep list management - UPDATED to use saveToFirebase
import React, { useState, useEffect } from 'react';
import { Calendar, Check, ChefHat, Plus, Search, Users, X } from 'lucide-react';

// Types and constants
import type {
  PrepListPrototypeProps,
  PrepItem,
  ScheduledPrep,
  Recipe,
  Priority,
  PrepSelections
} from './prep-types';
import { categories, timeSlots, priorities, PREP_STYLES } from './prep-constants';
import { getDefaultPrepItems } from './prep-default-data';
import {
  getDateString,
  formatDate,
  getWeekDates,
  getSelectionKey,
  generateUniqueId
} from './prep-utils';

// Components
import TodayView from './TodayView';
import PrepItemCard from './PrepItemCard';
import RecipeModal from './RecipeModal';

const PrepListPrototype: React.FC<PrepListPrototypeProps> = ({
  currentUser,
  connectionStatus,
  prepItems,
  scheduledPreps,
  prepSelections,
  setPrepItems,
  setScheduledPreps,
  setPrepSelections,
  saveToFirebase
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
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedRecipeName, setSelectedRecipeName] = useState<string>('');
  const [showPriorityOptions, setShowPriorityOptions] = useState<number | string | null>(null);
  const [showTimeOptions, setShowTimeOptions] = useState<number | string | null>(null);
  const [assignmentStep, setAssignmentStep] = useState<Record<number, string | null>>({});
  const [showSuggestedPreps, setShowSuggestedPreps] = useState(true);
  const [movedPrepsNotification, setMovedPrepsNotification] = useState<number>(0);

  // Initialize with default prep items if empty
  useEffect(() => {
    if (prepItems.length === 0) {
      const defaultPreps = getDefaultPrepItems();
      setPrepItems(() => defaultPreps);
      saveToFirebase();
    }
  }, [prepItems.length, setPrepItems, saveToFirebase]);

  // Move incomplete preps from yesterday to today
  useEffect(() => {
    const moveIncompletePreps = () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const todayStr = getDateString(today);
      const yesterdayStr = getDateString(yesterday);

      const incompletePreps = scheduledPreps.filter(prep => 
        prep.scheduledDate === yesterdayStr && !prep.completed
      );
      
      if (incompletePreps.length > 0) {
        console.log(`🔄 Moving ${incompletePreps.length} incomplete preps from ${yesterdayStr} to ${todayStr}`);
        
        setMovedPrepsNotification(incompletePreps.length);
        setTimeout(() => setMovedPrepsNotification(0), 8000);
        
        const movedPreps = incompletePreps.map(prep => ({
          ...prep,
          id: generateUniqueId(),
          scheduledDate: todayStr
        }));
        
        setScheduledPreps(prev => [
          ...prev.filter(prep => 
            !(prep.scheduledDate === yesterdayStr && !prep.completed)
          ),
          ...movedPreps
        ]);
        
        const newSelections: PrepSelections = {};
        incompletePreps.forEach(prep => {
          const selectionKey = getSelectionKey(today, prep.prepId);
          newSelections[selectionKey] = {
            priority: prep.priority,
            timeSlot: prep.timeSlot,
            selected: true
          };
        });
        
        setPrepSelections(prev => ({ ...prev, ...newSelections }));
        saveToFirebase();
      }
    };

    const lastMoveCheck = localStorage.getItem('lastPrepMoveCheck');
    const todayStr = getDateString(new Date());

    if (lastMoveCheck !== todayStr) {
      moveIncompletePreps();
      localStorage.setItem('lastPrepMoveCheck', todayStr);
    }
  }, [scheduledPreps, setPrepSelections, setScheduledPreps, saveToFirebase]);

  // Auto-save when scheduledPreps change (e.g., when completing prep tasks)
  useEffect(() => {
    if (scheduledPreps.length > 0) {
      console.log('🔄 Prep data changed, triggering save…');
      saveToFirebase();
    }
  }, [scheduledPreps, saveToFirebase]);

  // Check if prep is selected for current date
  const isPrepSelected = (prep: PrepItem): boolean => {
    const selectionKey = getSelectionKey(selectedDate, prep.id);
    return prepSelections[selectionKey]?.selected || false;
  };

  // Get prep selection details
  const getPrepSelection = (prep: PrepItem) => {
    const selectionKey = getSelectionKey(selectedDate, prep.id);
    return prepSelections[selectionKey] || { priority: 'medium' as Priority, timeSlot: '', selected: false };
  };

  // Update prep selection with smart workflow
  const updatePrepSelection = (
    prep: PrepItem,
    field: 'priority' | 'timeSlot',
    value: string,
    context: string = 'main'
  ): void => {
    const selectionKey = getSelectionKey(selectedDate, prep.id);
    const currentSelection = prepSelections[selectionKey] || { priority: 'medium' as Priority, timeSlot: '', selected: false };

    if (field === 'priority') {
      setPrepSelections(prev => ({
        ...prev,
        [selectionKey]: { 
          ...prev[selectionKey], 
          priority: value as Priority,
          selected: currentSelection.selected
        }
      }));
      
      setAssignmentStep(prev => ({ ...prev, [prep.id]: 'timeSlot' }));
      setShowPriorityOptions(null);
      
      const timeSlotId = context === 'suggested' ? `suggested-${prep.id}` : prep.id;
      setShowTimeOptions(timeSlotId);
      
    } else if (field === 'timeSlot') {
      const updatedSelection = {
        priority: currentSelection.priority,
        timeSlot: value,
        selected: true
      };
      
      setPrepSelections(prev => ({
        ...prev,
        [selectionKey]: updatedSelection
      }));
      
      const existingScheduledPrep = scheduledPreps.find(p => 
        p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate)
      );
      
      if (existingScheduledPrep) {
        setScheduledPreps(prev => prev.map(p => 
          p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate)
            ? { ...p, priority: updatedSelection.priority, timeSlot: value }
            : p
        ));
      } else {
        const newScheduledPrep: ScheduledPrep = {
          id: generateUniqueId(),
          prepId: prep.id,
          name: prep.name,
          category: prep.category,
          estimatedTime: prep.estimatedTime,
          isCustom: prep.isCustom,
          hasRecipe: prep.hasRecipe,
          recipe: prep.recipe,
          scheduledDate: getDateString(selectedDate),
          priority: updatedSelection.priority,
          timeSlot: value,
          completed: false,
          assignedTo: null,
          notes: ''
        };
        setScheduledPreps(prev => [...prev, newScheduledPrep]);
      }
      
      setAssignmentStep(prev => ({ ...prev, [prep.id]: null }));
      setShowPriorityOptions(null);
      setShowTimeOptions(null);
    }
  };

  // Reset workflow when clicking outside
  const resetWorkflow = () => {
    setShowPriorityOptions(null);
    setShowTimeOptions(null);
    setAssignmentStep({});
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as HTMLElement;
      const isInsideDropdown = target.closest('.dropdown-container');
      if (!isInsideDropdown) {
        resetWorkflow();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Show recipe modal
  const showRecipe = (recipe: Recipe, name: string) => {
    setSelectedRecipe(recipe);
    setSelectedRecipeName(name);
    setShowRecipeModal(true);
  };

  // Toggle prep selection
  const togglePrepSelection = (prep: PrepItem): void => {
    const selectionKey = getSelectionKey(selectedDate, prep.id);
    const isSelected = prepSelections[selectionKey]?.selected;

    if (isSelected) {
      setPrepSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[selectionKey];
        return newSelections;
      });
      
      setScheduledPreps(prev => prev.filter(p => 
        !(p.prepId === prep.id && p.scheduledDate === getDateString(selectedDate))
      ));
    } else {
      setShowPriorityOptions(prep.id);
      setAssignmentStep(prev => ({ ...prev, [prep.id]: 'priority' }));
    }
    
    saveToFirebase();
  };

  // Add custom prep
  const addCustomPrep = (): void => {
    if (!newPrepName.trim()) return;
    
    const newPrepItem: PrepItem = {
      id: generateUniqueId(),
      name: newPrepName.trim(),
      category: 'other',
      estimatedTime: '15min',
      isCustom: true,
      hasRecipe: showRecipeForm,
      frequency: 1,
      recipe: showRecipeForm ? recipeData : null
    };
    
    setPrepItems(prev => [...prev, newPrepItem]);
    setNewPrepName('');
    setShowAddCustom(false);
    setShowRecipeForm(false);
    setRecipeData({ ingredients: '', instructions: '' });
    
    saveToFirebase();
  };

  // Filter preps
  const getFilteredPreps = (): PrepItem[] => {
    let filtered = prepItems;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prep => 
        prep.name.toLowerCase().includes(query) || 
        prep.category.toLowerCase().includes(query)
      );
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(prep => prep.category === selectedCategory);
    }
    
    return filtered;
  };

  // Get suggested preps
  const getSuggestedPreps = (): PrepItem[] => {
    const dateStr = getDateString(selectedDate);
    const day = selectedDate.getDay();
    
    return prepItems.filter(prep => {
      // Don't suggest already scheduled preps
      const alreadyScheduled = scheduledPreps.some(sp => 
        sp.prepId === prep.id && sp.scheduledDate === dateStr
      );
      
      if (alreadyScheduled) return false;
      
      // Suggestion logic based on frequency and day of week
      if (prep.frequency === 1) return true; // Daily preps
      if (prep.frequency === 2 && day % 2 === 0) return true; // Every other day
      if (prep.frequency === 7 && day === 1) return true; // Weekly on Monday
      
      return false;
    }).slice(0, 5); // Show top 5 suggestions
  };

  // Complete prep task
  const togglePrepCompletion = (prepId: number): void => {
    const dateStr = getDateString(new Date()); // Today's date
    
    setScheduledPreps(prev => prev.map(prep => 
      prep.id === prepId ? { ...prep, completed: !prep.completed } : prep
    ));
    
    saveToFirebase();
  };

  // Assign prep to user
  const assignPrepToUser = (prepId: number, userId: number | null): void => {
    setScheduledPreps(prev => prev.map(prep => 
      prep.id === prepId ? { ...prep, assignedTo: userId } : prep
    ));
    
    saveToFirebase();
  };

  // Update prep notes
  const updatePrepNotes = (prepId: number, notes: string): void => {
    setScheduledPreps(prev => prev.map(prep => 
      prep.id === prepId ? { ...prep, notes } : prep
    ));
    
    saveToFirebase();
  };

  // Delete prep item
  const deletePrepItem = (prepId: number): void => {
    setPrepItems(prev => prev.filter(p => p.id !== prepId));
    
    // Remove any scheduled instances
    setScheduledPreps(prev => prev.filter(p => p.prepId !== prepId));
    
    // Remove any selections
    setPrepSelections(prev => {
      const newSelections = { ...prev };
      Object.keys(newSelections).forEach(key => {
        if (key.endsWith(`-${prepId}`)) {
          delete newSelections[key];
        }
      });
      return newSelections;
    });
    
    saveToFirebase();
  };

  // Render prep list items - FIXED function
  const renderPrepItems = (items: PrepItem[], context: string = 'main'): JSX.Element[] => {
    return items.map(prep => (
      <PrepItemCard
        key={`${context}-${prep.id}`}
        prep={prep}
        isSelected={isPrepSelected(prep)}
        selection={getPrepSelection(prep)}
        onToggleSelection={() => togglePrepSelection(prep)}
        onUpdateSelection={(field, value) => updatePrepSelection(prep, field, value, context)}
        onShowRecipe={() => prep.hasRecipe && prep.recipe && showRecipe(prep.recipe, prep.name)}
        onDelete={() => prep.isCustom && deletePrepItem(prep.id)}
        showPriorityOptions={showPriorityOptions === prep.id || showPriorityOptions === `${context}-${prep.id}`}
        showTimeOptions={showTimeOptions === prep.id || showTimeOptions === `${context}-${prep.id}` || showTimeOptions === `suggested-${prep.id}`}
        assignmentStep={assignmentStep[prep.id]}
        priorities={priorities}
        timeSlots={timeSlots}
        context={context}
      />
    ));
  };

  // Render tab content
  const renderTabContent = (): JSX.Element => {
    if (activeView === 'today') {
      return (
        <TodayView
          currentUser={currentUser}
          scheduledPreps={scheduledPreps}
          onToggleCompletion={togglePrepCompletion}
          onAssignTo={assignPrepToUser}
          onUpdateNotes={updatePrepNotes}
          onShowRecipe={(recipe, name) => showRecipe(recipe, name)}
          saveToFirebase={saveToFirebase}
        />
      );
    }

    return (
      <div className="prep-list-container">
        {/* Filter controls */}
        <div className="filter-controls">
          <div className="category-filters">
            <button 
              className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`} 
              onClick={() => setSelectedCategory('all')}
            >
              All
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`} 
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
          
          <div className="search-container">
            {showSearch ? (
              <div className="search-input-container">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search preps..."
                  autoFocus
                  className="search-input"
                />
                <button 
                  className="search-clear-btn" 
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearch(false);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button className="search-btn" onClick={() => setShowSearch(true)}>
                <Search size={18} />
                <span>Search</span>
              </button>
            )}
          </div>
        </div>

        {/* Week date selector */}
        <div className="week-selector">
          {getWeekDates(selectedDate).map((date, index) => (
            <button
              key={index}
              className={`date-btn ${getDateString(date) === getDateString(selectedDate) ? 'active' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <span className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="date-num">{date.getDate()}</span>
            </button>
          ))}
        </div>

        {/* Suggested preps */}
        {showSuggestedPreps && getSuggestedPreps().length > 0 && (
          <div className="suggested-preps-section">
            <div className="section-header">
              <h3>
                <ChefHat size={16} />
                <span>Suggested for {formatDate(selectedDate)}</span>
              </h3>
              <button 
                className="close-btn" 
                onClick={() => setShowSuggestedPreps(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="suggested-preps-list">
              {renderPrepItems(getSuggestedPreps(), 'suggested')}
            </div>
          </div>
        )}

        {/* All preps list */}
        <div className="prep-items-list">
          {renderPrepItems(getFilteredPreps())}
        </div>

        {/* Add custom prep */}
        {showAddCustom ? (
          <div className="add-custom-form">
            <input
              type="text"
              value={newPrepName}
              onChange={(e) => setNewPrepName(e.target.value)}
              placeholder="Enter prep name..."
              className="custom-prep-input"
              autoFocus
            />
            
            <div className="recipe-toggle">
              <label>
                <input 
                  type="checkbox" 
                  checked={showRecipeForm}
                  onChange={() => setShowRecipeForm(!showRecipeForm)} 
                />
                Add Recipe
              </label>
            </div>
            
            {showRecipeForm && (
              <div className="recipe-form">
                <textarea
                  placeholder="Ingredients..."
                  value={recipeData.ingredients}
                  onChange={(e) => setRecipeData(prev => ({ ...prev, ingredients: e.target.value }))}
                  className="recipe-textarea"
                />
                <textarea
                  placeholder="Instructions..."
                  value={recipeData.instructions}
                  onChange={(e) => setRecipeData(prev => ({ ...prev, instructions: e.target.value }))}
                  className="recipe-textarea"
                />
              </div>
            )}
            
            <div className="form-actions">
              <button 
                className="cancel-btn" 
                onClick={() => {
                  setShowAddCustom(false);
                  setNewPrepName('');
                  setShowRecipeForm(false);
                  setRecipeData({ ingredients: '', instructions: '' });
                }}
              >
                Cancel
              </button>
              <button 
                className="add-btn" 
                onClick={addCustomPrep}
                disabled={!newPrepName.trim()}
              >
                Add Prep
              </button>
            </div>
          </div>
        ) : (
          <button className="add-custom-btn" onClick={() => setShowAddCustom(true)}>
            <Plus size={18} />
            <span>Add Custom Prep</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="prep-list-prototype" onClick={(e) => e.stopPropagation()}>
      {/* Status indicators */}
      <div className="status-bar">
        <div className={`connection-status ${connectionStatus}`}>
          {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
        </div>
        
        <div className="user-indicator">
          <Users size={16} />
          <span>{currentUser.name}</span>
        </div>
      </div>

      {/* Notification for moved preps */}
      {movedPrepsNotification > 0 && (
        <div className="notification">
          <span>{movedPrepsNotification} incomplete prep{movedPrepsNotification > 1 ? 's were' : ' was'} moved from yesterday to today</span>
          <button onClick={() => setMovedPrepsNotification(0)}><X size={16} /></button>
        </div>
      )}

      {/* Tab navigation */}
      <div className="tabs">
        <button 
          className={`tab-btn ${activeView === 'today' ? 'active' : ''}`}
          onClick={() => setActiveView('today')}
        >
          <Check size={18} />
          <span>Today's Preps</span>
        </button>
        <button 
          className={`tab-btn ${activeView === 'plan' ? 'active' : ''}`}
          onClick={() => setActiveView('plan')}
        >
          <Calendar size={18} />
          <span>Plan Ahead</span>
        </button>
      </div>

      {/* Main content */}
      <div className="main-content">
        {renderTabContent()}
      </div>

      {/* Recipe modal */}
      {showRecipeModal && selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          name={selectedRecipeName}
          onClose={() => setShowRecipeModal(false)}
        />
      )}

      {/* Add global styles for component */}
      <style jsx>{`
        .prep-list-prototype {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-width: 800px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .status-bar {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.8rem;
        }

        .connection-status {
          display: flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .connection-status.connected {
          background-color: #dcfce7;
          color: #166534;
        }

        .connection-status.connecting {
          background-color: #fef9c3;
          color: #854d0e;
        }

        .connection-status.error {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        .user-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 500;
        }

        .notification {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background-color: #eff6ff;
          color: #1e40af;
          font-size: 0.875rem;
        }

        .notification button {
          background: transparent;
          border: none;
          color: #1e40af;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          background-color: #f9fafb;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .tab-btn.active {
          border-bottom-color: #3b82f6;
          color: #3b82f6;
        }

        .main-content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .prep-list-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .filter-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .category-filters {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          max-width: 70%;
        }

        .category-btn {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }

        .category-btn.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .search-container {
          display: flex;
        }

        .search-input-container {
          display: flex;
          align-items: center;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.25rem 0.5rem;
        }

        .search-input {
          background: transparent;
          border: none;
          outline: none;
          padding: 0.25rem;
          width: 12rem;
        }

        .search-clear-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
        }

        .week-selector {
          display: flex;
          gap: 0.5rem;
          padding-bottom: 1rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
          overflow-x: auto;
        }

        .date-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem;
          min-width: 3.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .date-btn.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .day-name {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .date-num {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .suggested-preps-section {
          background: #eff6ff;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .section-header h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 1rem;
        }

        .close-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .suggested-preps-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .prep-items-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .add-custom-form {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .custom-prep-input {
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.25rem;
          font-size: 1rem;
        }

        .recipe-toggle {
          display: flex;
          align-items: center;
        }

        .recipe-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .recipe-textarea {
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          min-height: 5rem;
          resize: vertical;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .cancel-btn {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 0.25rem;
          cursor: pointer;
        }

        .add-btn {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          border: 1px solid #3b82f6;
          border-radius: 0.25rem;
          color: white;
          cursor: pointer;
        }

        .add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .add-custom-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #f3f4f6;
          border: 1px dashed #d1d5db;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-custom-btn:hover {
          background: #e5e7eb;
        }

        /* Utility classes */
        .dropdown-container {
          position: relative;
        }
      `}</style>
    </div>
  );
};

export default PrepListPrototype;

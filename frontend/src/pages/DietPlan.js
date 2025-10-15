import React, { useState } from 'react';
import './DietPlan.css';

const DietPlan = () => {
  const [metrics, setMetrics] = useState({
    calories: { enabled: true, target: '', isCustom: false },
    protein: { enabled: true, target: '', isCustom: false },
    waterIntake: { enabled: true, target: '', isCustom: false },
    meals: { enabled: true, target: '', isCustom: false },
    fruitsVegetables: { enabled: true, target: '', isCustom: false },
    sugars: { enabled: true, target: '', isCustom: false },
    fiber: { enabled: false, target: '', isCustom: false },
    sodium: { enabled: false, target: '', isCustom: false },
    cholesterol: { enabled: false, target: '', isCustom: false },
    calcium: { enabled: false, target: '', isCustom: false },
    vitaminD: { enabled: false, target: '', isCustom: false },
    iron: { enabled: false, target: '', isCustom: false },
    potassium: { enabled: false, target: '', isCustom: false }
  });
  
  const [showSummary, setShowSummary] = useState(false);
  const [savedPlan, setSavedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showHelp, setShowHelp] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(null);
  const [isListening, setIsListening] = useState(null);

  const handleToggle = (metricKey) => {
    setMetrics(prev => ({
      ...prev,
      [metricKey]: {
        ...prev[metricKey],
        enabled: !prev[metricKey].enabled
      }
    }));
  };

  const handleTargetChange = (metricKey, value) => {
    const isCustom = value === 'custom';
    setMetrics(prev => ({
      ...prev,
      [metricKey]: {
        ...prev[metricKey],
        target: isCustom ? '' : value,
        isCustom: isCustom
      }
    }));
  };
  
  const handleCustomValueChange = (metricKey, value) => {
    setMetrics(prev => ({
      ...prev,
      [metricKey]: {
        ...prev[metricKey],
        target: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const url = isEditing ? `/diet-plan/${savedPlan.id}` : '/diet-plan';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'save'} diet plan`);
      }
      
      const data = await response.json();
      setSavedPlan(data.dietPlan);
      setShowSummary(true);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateNew = () => {
    setShowConfirmation({
      message: 'Are you sure you want to create a new diet plan? Your current plan will remain saved.',
      onConfirm: () => {
        setShowSummary(false);
        setSavedPlan(null);
        setIsEditing(false);
        setMetrics({
          calories: { enabled: true, target: '', isCustom: false },
          protein: { enabled: true, target: '', isCustom: false },
          waterIntake: { enabled: true, target: '', isCustom: false },
          meals: { enabled: true, target: '', isCustom: false },
          fruitsVegetables: { enabled: true, target: '', isCustom: false },
          sugars: { enabled: true, target: '', isCustom: false },
          fiber: { enabled: false, target: '', isCustom: false },
          sodium: { enabled: false, target: '', isCustom: false },
          cholesterol: { enabled: false, target: '', isCustom: false },
          calcium: { enabled: false, target: '', isCustom: false },
          vitaminD: { enabled: false, target: '', isCustom: false },
          iron: { enabled: false, target: '', isCustom: false },
          potassium: { enabled: false, target: '', isCustom: false }
        });
        setShowConfirmation(null);
      },
      onCancel: () => setShowConfirmation(null)
    });
  };
  
  const toggleHelp = (key) => {
    setShowHelp(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // Convert spoken numbers to digits
  const wordsToNumber = (text) => {
    const lowerText = text.toLowerCase().trim();
    
    // Direct digit check
    const digitMatch = lowerText.match(/\d+/);
    if (digitMatch) {
      return digitMatch[0];
    }
    
    // Word to number conversion
    const numberWords = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
      'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000
    };
    
    // Try simple word match first
    if (numberWords[lowerText]) {
      return numberWords[lowerText].toString();
    }
    
    // Handle compound numbers like "twenty five", "one hundred", "two thousand"
    let total = 0;
    let current = 0;
    const words = lowerText.split(/[\s-]+/);
    
    for (let word of words) {
      const num = numberWords[word];
      if (num !== undefined) {
        if (num >= 100) {
          current = current === 0 ? num : current * num;
        } else {
          current += num;
        }
      }
    }
    
    total += current;
    return total > 0 ? total.toString() : null;
  };
  
  const startVoiceInput = (key) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    
    recognition.onstart = () => {
      setIsListening(key);
      console.log('Voice input started - please speak now');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Heard:', transcript);
      
      const number = wordsToNumber(transcript);
      
      if (number) {
        console.log('Converted to number:', number);
        // Just update the custom value - we're already in custom mode
        handleCustomValueChange(key, number);
        console.log('Value set to:', number);
        setIsListening(null);
      } else {
        setIsListening(null);
        alert(`I heard "${transcript}" but couldn't find a number. Please try saying just the number (e.g., "150" or "one hundred fifty").`);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(null);
      
      let message = 'Voice input failed. ';
      switch(event.error) {
        case 'no-speech':
          message += 'No speech was detected. Please try again.';
          break;
        case 'audio-capture':
          message += 'No microphone was found.';
          break;
        case 'not-allowed':
          message += 'Microphone permission was denied.';
          break;
        case 'network':
          message += 'Network error occurred.';
          break;
        default:
          message += 'Please try again.';
      }
      alert(message);
    };
    
    recognition.onend = () => {
      console.log('Voice input ended');
      setIsListening(null);
    };
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setIsListening(null);
      alert('Could not start voice input. Please try again.');
    }
  };
  
  const handleEdit = () => {
    console.log('Edit button clicked');
    console.log('Saved plan:', savedPlan);
    
    setShowConfirmation({
      message: 'Do you want to edit your current diet plan?',
      onConfirm: () => {
        console.log('Edit confirmed');
        
        // Start with default structure for all metrics
        const defaultMetrics = {
          calories: { enabled: false, target: '', isCustom: false },
          protein: { enabled: false, target: '', isCustom: false },
          waterIntake: { enabled: false, target: '', isCustom: false },
          meals: { enabled: false, target: '', isCustom: false },
          fruitsVegetables: { enabled: false, target: '', isCustom: false },
          sugars: { enabled: false, target: '', isCustom: false },
          fiber: { enabled: false, target: '', isCustom: false },
          sodium: { enabled: false, target: '', isCustom: false },
          cholesterol: { enabled: false, target: '', isCustom: false },
          calcium: { enabled: false, target: '', isCustom: false },
          vitaminD: { enabled: false, target: '', isCustom: false },
          iron: { enabled: false, target: '', isCustom: false },
          potassium: { enabled: false, target: '', isCustom: false }
        };
        
        // Load saved metrics and merge with defaults
        if (savedPlan && savedPlan.metrics) {
          Object.keys(savedPlan.metrics).forEach(key => {
            if (defaultMetrics[key]) {
              defaultMetrics[key] = { ...savedPlan.metrics[key] };
              
              // Check if value is custom (not in predefined options)
              const metricInfo = metricsList.find(m => m.key === key);
              if (metricInfo && defaultMetrics[key].target) {
                const isInOptions = metricInfo.options.includes(defaultMetrics[key].target.toString());
                defaultMetrics[key].isCustom = !isInOptions;
              }
            }
          });
        }
        
        console.log('Loading metrics:', defaultMetrics);
        setMetrics(defaultMetrics);
        setShowSummary(false);
        setIsEditing(true);
        setShowConfirmation(null);
      },
      onCancel: () => {
        console.log('Edit cancelled');
        setShowConfirmation(null);
      }
    });
  };

  const metricsList = [
    { 
      key: 'calories', 
      label: 'Calories', 
      unit: 'kcal/day', 
      options: ['1200', '1500', '1800', '2000', '2200', '2500', '3000'],
      helpText: 'Total energy from food. Balanced intake helps maintain healthy weight.'
    },
    { 
      key: 'protein', 
      label: 'Protein', 
      unit: 'grams/day', 
      options: ['50', '75', '100', '125', '150', '175', '200'],
      helpText: 'Essential for muscle maintenance and repair. Found in meat, fish, beans, and dairy.'
    },
    { 
      key: 'waterIntake', 
      label: 'Water Intake', 
      unit: 'cups/day', 
      options: ['4', '6', '8', '10', '12'],
      helpText: 'Proper hydration supports all body functions. Aim for clear or light yellow urine.'
    },
    { 
      key: 'meals', 
      label: 'Meals', 
      unit: 'meals/day', 
      options: ['2', '3', '4', '5', '6'],
      helpText: 'Regular eating patterns help maintain stable energy and blood sugar levels.'
    },
    { 
      key: 'fruitsVegetables', 
      label: 'Fruits & Vegetables', 
      unit: 'servings/day', 
      options: ['3', '5', '7', '9'],
      helpText: 'Rich in vitamins, minerals, and fiber. A variety of colors provides different nutrients.'
    },
    { 
      key: 'sugars', 
      label: 'Sugars', 
      unit: 'grams/day', 
      options: ['15', '20', '25', '30', '35', '40'],
      helpText: 'Added sugars in processed foods. Natural sugars from fruits are not included.'
    },
    { 
      key: 'fiber', 
      label: 'Fiber', 
      unit: 'grams/day', 
      options: ['20', '25', '30', '35', '40'],
      helpText: 'Supports digestive health. Found in whole grains, fruits, vegetables, and legumes.'
    },
    { 
      key: 'sodium', 
      label: 'Sodium', 
      unit: 'mg/day', 
      options: ['1500', '2000', '2300', '2500'],
      helpText: 'Mineral that affects fluid balance. Found in salt and processed foods.'
    },
    { 
      key: 'cholesterol', 
      label: 'Cholesterol', 
      unit: 'mg/day', 
      options: ['200', '250', '300'],
      helpText: 'Fat-like substance. Found in animal products like eggs, meat, and dairy.'
    },
    { 
      key: 'calcium', 
      label: 'Calcium', 
      unit: 'mg/day', 
      options: ['800', '1000', '1200', '1300'],
      helpText: 'Important for bone health. Found in dairy, leafy greens, and fortified foods.'
    },
    { 
      key: 'vitaminD', 
      label: 'Vitamin D', 
      unit: 'IU/day', 
      options: ['400', '600', '800', '1000', '2000'],
      helpText: 'Supports bone health and immune function. Made by skin from sunlight.'
    },
    { 
      key: 'iron', 
      label: 'Iron', 
      unit: 'mg/day', 
      options: ['8', '10', '15', '18'],
      helpText: 'Essential for oxygen transport in blood. Found in red meat, beans, and fortified cereals.'
    },
    { 
      key: 'potassium', 
      label: 'Potassium', 
      unit: 'mg/day', 
      options: ['2000', '2500', '3000', '3500', '4700'],
      helpText: 'Helps regulate fluid balance and muscle function. Found in bananas, potatoes, and beans.'
    }
  ];

  if (showSummary && savedPlan) {
    const activeMetrics = Object.entries(savedPlan.metrics)
      .filter(([_, value]) => value.enabled && value.target)
      .map(([key, value]) => {
        const metricInfo = metricsList.find(m => m.key === key);
        return { ...metricInfo, target: value.target };
      });

    return (
      <div className="diet-plan-page">
        <div className="diet-plan-container">
          <div className="hero-section">
            <h1 className="hero-title">Diet Plan Saved!</h1>
            <p className="hero-subtitle">Your personalized nutrition plan is ready</p>
          </div>

          <div className="summary-section">
            <div className="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            
            <h2 className="summary-title">Your Daily Goals</h2>
            
            <div className="summary-grid">
              {activeMetrics.map(({ key, label, target, unit }) => (
                <div key={key} className="summary-card">
                  <div className="summary-label">{label}</div>
                  <div className="summary-value">
                    {target} <span className="summary-unit">{unit.replace('/day', '')}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="summary-meta">
              <p>Plan ID: <strong>{savedPlan.id}</strong></p>
              <p>Created: <strong>{new Date(savedPlan.createdAt).toLocaleString()}</strong></p>
              {savedPlan.updatedAt && (
                <p>Last Updated: <strong>{new Date(savedPlan.updatedAt).toLocaleString()}</strong></p>
              )}
            </div>

            <div className="summary-actions">
              <button onClick={handleEdit} className="edit-button">
                Edit Plan
              </button>
              <button onClick={handleCreateNew} className="create-new-button">
                Create New Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="diet-plan-page">
      <div className="diet-plan-container">
        <div className="hero-section">
          <h1 className="hero-title">Diet Plan</h1>
          <p className="hero-subtitle">
            {isEditing ? 'Edit your personalized nutrition plan' : 'Create and manage your personalized nutrition plan'}
          </p>
        </div>

        {showConfirmation && (
          <div className="confirmation-overlay">
            <div className="confirmation-dialog">
              <h3 className="confirmation-title">Confirm Action</h3>
              <p className="confirmation-message">{showConfirmation.message}</p>
              <div className="confirmation-actions">
                <button onClick={showConfirmation.onCancel} className="confirmation-cancel">
                  Cancel
                </button>
                <button onClick={showConfirmation.onConfirm} className="confirmation-confirm">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="form-section">
          <h2 className="form-title">
            {isEditing ? 'Edit Your Tracking Goals' : 'What do you want to track?'}
          </h2>
          <p className="form-description">
            Select the metrics you'd like to monitor and set your daily goals
          </p>

          {error && (
            <div className="error-banner">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="metrics-list">
              {metricsList.map(({ key, label, unit, options, helpText }) => (
                <div key={key} className="metric-item">
                  <div className="metric-header">
                    <label className="metric-checkbox">
                      <input
                        type="checkbox"
                        checked={metrics[key].enabled}
                        onChange={() => handleToggle(key)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="metric-label">{label}</span>
                    </label>
                    <button 
                      type="button"
                      className="help-button"
                      onClick={() => toggleHelp(key)}
                      aria-label={`Help for ${label}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                  
                  {showHelp[key] && (
                    <div className="help-tooltip">
                      <p>{helpText}</p>
                    </div>
                  )}
                  
                  {metrics[key].enabled && (
                    <div className="metric-input-group">
                      <select
                        className="metric-select"
                        value={metrics[key].isCustom ? 'custom' : metrics[key].target}
                        onChange={(e) => handleTargetChange(key, e.target.value)}
                      >
                        <option value="">Select target...</option>
                        {options.map(option => (
                          <option key={option} value={option}>
                            {option} {unit.replace('/day', '')}
                          </option>
                        ))}
                        <option value="custom">Custom Amount</option>
                      </select>
                      
                      {metrics[key].isCustom && (
                        <div className="custom-input-wrapper">
                          <input
                            type="number"
                            className="metric-custom-input"
                            value={metrics[key].target}
                            onChange={(e) => handleCustomValueChange(key, e.target.value)}
                            placeholder="Enter custom value"
                            min="0"
                            step="any"
                          />
                          <button
                            type="button"
                            className={`voice-input-button ${isListening === key ? 'listening' : ''}`}
                            onClick={() => startVoiceInput(key)}
                            disabled={isListening !== null}
                            title="Use voice input"
                          >
                            {isListening === key ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="3">
                                  <animate attributeName="r" from="3" to="10" dur="1s" repeatCount="indefinite"/>
                                  <animate attributeName="opacity" from="1" to="0" dur="1s" repeatCount="indefinite"/>
                                </circle>
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                              </svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                      
                      {!metrics[key].isCustom && metrics[key].target && (
                        <span className="metric-unit-display">per day</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading 
                ? (isEditing ? 'Updating...' : 'Saving...') 
                : (isEditing ? 'Update Diet Plan' : 'Save Diet Plan')
              }
            </button>
            
            {isEditing && (
              <button 
                type="button" 
                className="cancel-edit-button" 
                onClick={() => {
                  setShowSummary(true);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default DietPlan;


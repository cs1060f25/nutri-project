import React, { useState, useEffect, useRef } from 'react';

const ALLERGIES = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish', 'Shellfish'
];

const DIET_GOALS = [
  'Weight Loss', 'Muscle Gain', 'Maintenance', 'Allergy Management'
];

const ACTIVITY_LEVELS = [
  'Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'
];

function ChatOnboarding({ onComplete }) {
  const [messages, setMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    allergies: [],
    dietGoal: '',
    activityLevel: ''
  });
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Welcome message
    setTimeout(() => {
      addBotMessage("👋 Hi! I'm your CrimsonFuel assistant. I'm here to help you create a safe, allergy-aware nutrition profile.");
    }, 500);
    
    setTimeout(() => {
      addBotMessage("Let's start with something simple - what's your name?");
    }, 1500);
  }, []);

  const addBotMessage = (text) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { type: 'bot', text }]);
      setIsTyping(false);
    }, 800);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { type: 'user', text }]);
  };

  const handleSend = () => {
    if (!userInput.trim()) return;

    const input = userInput.trim();
    addUserMessage(input);
    setUserInput('');

    if (currentStep === 0) {
      // Name step
      setUserData(prev => ({ ...prev, name: input }));
      setTimeout(() => {
        addBotMessage(`Nice to meet you, ${input}! 🎉`);
      }, 1000);
      setTimeout(() => {
        addBotMessage("Now, this is important - do you have any severe allergies I should know about? Select all that apply:");
        setCurrentStep(1);
      }, 2000);
    } else if (currentStep === 2) {
      // Diet goal step
      const goal = DIET_GOALS.find(g => g.toLowerCase() === input.toLowerCase()) || input;
      setUserData(prev => ({ ...prev, dietGoal: goal }));
      setTimeout(() => {
        addBotMessage("Great choice! 💪");
      }, 1000);
      setTimeout(() => {
        addBotMessage("Last question - what's your typical activity level?");
        setCurrentStep(3);
      }, 2000);
    } else if (currentStep === 3) {
      // Activity level step
      const level = ACTIVITY_LEVELS.find(l => l.toLowerCase() === input.toLowerCase()) || input;
      setUserData(prev => ({ ...prev, activityLevel: level }));
      setTimeout(() => {
        addBotMessage("Perfect! Let me create your allergy-safe profile... ✨");
      }, 1000);
      setTimeout(() => {
        completeOnboarding({ ...userData, activityLevel: level });
      }, 2500);
    }
  };

  const handleAllergySelect = (allergy) => {
    const newAllergies = selectedAllergies.includes(allergy)
      ? selectedAllergies.filter(a => a !== allergy)
      : [...selectedAllergies, allergy];
    setSelectedAllergies(newAllergies);
  };

  const handleAllergiesConfirm = () => {
    if (selectedAllergies.length === 0) {
      addUserMessage("No allergies");
      setUserData(prev => ({ ...prev, allergies: [] }));
      setTimeout(() => {
        addBotMessage("Got it! No allergies noted. 👍");
      }, 1000);
    } else {
      addUserMessage(`Allergies: ${selectedAllergies.join(', ')}`);
      setUserData(prev => ({ ...prev, allergies: selectedAllergies }));
      setTimeout(() => {
        addBotMessage(`I've noted your allergies: ${selectedAllergies.join(', ')}. We'll keep you safe! 🛡️`);
      }, 1000);
    }
    
    setTimeout(() => {
      addBotMessage("What's your main nutrition goal?");
      setCurrentStep(2);
    }, 2500);
  };

  const completeOnboarding = async (finalData) => {
    try {
      // Mock API call - in real app would call Django backend
      const mockResponse = {
        success: true,
        user: {
          id: Date.now(),
          name: finalData.name,
          allergies: finalData.allergies,
          dietGoal: finalData.dietGoal,
          activityLevel: finalData.activityLevel,
          safetyBadge: 'verified'
        }
      };
      
      setTimeout(() => {
        onComplete(mockResponse.user);
      }, 500);
    } catch (error) {
      addBotMessage("Oops! Something went wrong. Let's try again.");
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-icon">🍎</div>
        <div className="chat-header-text">
          <h1>CrimsonFuel</h1>
          <p>Allergy-Aware Nutrition Assistant</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className="message">
            <div className={`message-avatar ${msg.type}`}>
              {msg.type === 'bot' ? '🤖' : '👤'}
            </div>
            <div className={`message-bubble ${msg.type}`}>
              {msg.text}
            </div>
          </div>
        ))}

        {currentStep === 1 && messages.length > 3 && (
          <div className="message">
            <div className="message-avatar bot">🤖</div>
            <div className="message-bubble bot">
              <div className="allergy-chips">
                {ALLERGIES.map(allergy => (
                  <div
                    key={allergy}
                    className={`allergy-chip ${selectedAllergies.includes(allergy) ? 'selected' : ''}`}
                    onClick={() => handleAllergySelect(allergy)}
                  >
                    {allergy}
                  </div>
                ))}
              </div>
              <button
                onClick={handleAllergiesConfirm}
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #0078d4 0%, #00bcf2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        )}

        {isTyping && (
          <div className="message">
            <div className="message-avatar bot">🤖</div>
            <div className="message-bubble bot">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {currentStep !== 1 && (
        <div className="chat-input-area">
          <div className="input-wrapper">
            <input
              type="text"
              className="chat-input"
              placeholder="Type your answer..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={isTyping}
            />
            <button
              className="send-button"
              onClick={handleSend}
              disabled={!userInput.trim() || isTyping}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatOnboarding;

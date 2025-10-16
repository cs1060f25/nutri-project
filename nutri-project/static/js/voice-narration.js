// static/js/voice-narration.js

class VoiceNarrationManager {
  constructor(accessibilityManager) {
    this.a11y = accessibilityManager;
    this.synth = window.speechSynthesis;
    this.isEnabled = false;
    this.voice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    
    this.initializeVoices();
    this.setupEventListeners();
  }

  /**
   * Initialize available voices
   */
  initializeVoices() {
    // Wait for voices to load
    if (this.synth.getVoices().length > 0) {
      this.selectDefaultVoice();
    } else {
      this.synth.addEventListener('voiceschanged', () => {
        this.selectDefaultVoice();
      });
    }
  }

  /**
   * Select default voice (preferably English)
   */
  selectDefaultVoice() {
    const voices = this.synth.getVoices();
    
    // Try to find US English voice
    this.voice = voices.find(v => v.lang === 'en-US') || 
                 voices.find(v => v.lang.startsWith('en')) ||
                 voices;
    
    console.log('Selected voice:', this.voice?.name);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Voice toggle button
    const toggleBtn = document.getElementById('voiceToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleVoiceNarration());
      
      // Keyboard accessibility
      toggleBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleVoiceNarration();
        }
      });
    }

    // Auto-narrate summary cards on load (if enabled)
    document.addEventListener('DOMContentLoaded', () => {
      const autoNarrate = localStorage.getItem('autoNarrate') === 'true';
      if (autoNarrate) {
        this.isEnabled = true;
        this.narratePageSummary();
      }
    });
  }

  /**
   * Toggle voice narration on/off
   */
  toggleVoiceNarration() {
    this.isEnabled = !this.isEnabled;
    
    const toggleBtn = document.getElementById('voiceToggleBtn');
    const icon = toggleBtn?.querySelector('.voice-icon');
    
    if (this.isEnabled) {
      toggleBtn?.classList.add('speaking');
      if (icon) icon.textContent = '🔊';
      this.a11y.announce('Voice narration enabled');
      this.narratePageSummary();
      localStorage.setItem('autoNarrate', 'true');
    } else {
      this.stopSpeaking();
      toggleBtn?.classList.remove('speaking');
      if (icon) icon.textContent = '🔇';
      this.a11y.announce('Voice narration disabled');
      localStorage.setItem('autoNarrate', 'false');
    }
  }

  /**
   * Speak text using Web Speech API
   * @param {string} text - Text to speak
   * @param {Object} options - Speech options
   */
  speak(text, options = {}) {
    if (!this.isEnabled || !text) return;

    // Stop any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.rate = options.rate || this.rate;
    utterance.pitch = options.pitch || this.pitch;
    utterance.volume = options.volume || this.volume;

    // Visual feedback
    const toggleBtn = document.getElementById('voiceToggleBtn');
    
    utterance.onstart = () => {
      toggleBtn?.classList.add('speaking');
    };

    utterance.onend = () => {
      toggleBtn?.classList.remove('speaking');
    };

    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      toggleBtn?.classList.remove('speaking');
    };

    this.synth.speak(utterance);
  }

  /**
   * Stop current speech
   */
  stopSpeaking() {
    this.synth.cancel();
    const toggleBtn = document.getElementById('voiceToggleBtn');
    toggleBtn?.classList.remove('speaking');
  }

  /**
   * Narrate page summary
   */
  narratePageSummary() {
    const summary = this.generatePageSummary();
    this.speak(summary);
  }

  /**
   * Generate spoken summary of insights page
   * @returns {string}
   */
  generatePageSummary() {
    const parts = [];
    
    // Page title
    const titleEl = document.querySelector('.page-title');
    if (titleEl) {
      parts.push(titleEl.textContent);
    }

    // Date range
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    if (startDate && endDate) {
      parts.push(`Showing data from ${this.formatDateForSpeech(startDate)} to ${this.formatDateForSpeech(endDate)}.`);
    }

    // Summary cards
    const summaryCards = document.querySelectorAll('.summary-card');
    summaryCards.forEach((card, index) => {
      const title = card.querySelector('.summary-card-title')?.textContent;
      const value = card.querySelector('.summary-card-value')?.textContent;
      const unit = card.querySelector('.summary-card-unit')?.textContent;
      const comparison = card.querySelector('.summary-card-comparison')?.textContent;
      
      if (title && value) {
        let cardSummary = `${title}: ${value}`;
        if (unit) cardSummary += ` ${unit}`;
        if (comparison) cardSummary += `, ${comparison}`;
        parts.push(cardSummary);
      }
    });

    // Goal alignment
    const goalElements = document.querySelectorAll('[data-goal-status]');
    const goalsOnTrack = Array.from(goalElements).filter(
      el => el.dataset.goalStatus === 'on_track'
    ).length;
    
    if (goalElements.length > 0) {
      parts.push(`You are on track with ${goalsOnTrack} out of ${goalElements.length} nutrition goals.`);
    }

    // Recommendations
    const recommendations = document.querySelectorAll('.recommendation-item');
    if (recommendations.length > 0) {
      parts.push(`You have ${recommendations.length} nutrition recommendations.`);
      
      // Narrate first high-priority recommendation
      const highPriority = document.querySelector('.recommendation-item.priority-high');
      if (highPriority) {
        const message = highPriority.querySelector('.recommendation-message')?.textContent;
        if (message) {
          parts.push(`Important: ${message}`);
        }
      }
    }

    return parts.join(' ');
  }

  /**
   * Narrate specific metric data
   * @param {string} metric - Metric name
   * @param {Object} data - Metric data
   */
  narrateMetric(metric, data) {
    if (!this.isEnabled) return;

    const metricLabels = {
      calories: 'calories',
      protein: 'protein',
      carbs: 'carbohydrates',
      fats: 'fats',
      sodium: 'sodium',
      fiber: 'fiber'
    };

    const label = metricLabels[metric] || metric;
    const average = data.daily_averages?.[metric];
    const goal = data.goal_alignment?.[metric];

    let narrative = `${label} overview. `;
    
    if (average !== undefined) {
      narrative += `Your average daily ${label} intake is ${average.toFixed(1)}. `;
    }

    if (goal) {
      const percentage = goal.percentage;
      const status = goal.status;
      
      if (status === 'on_track') {
        narrative += `You are on track with your goal at ${percentage.toFixed(0)} percent.`;
      } else {
        const deviation = percentage > 100 ? 'above' : 'below';
        narrative += `You are ${Math.abs(percentage - 100).toFixed(0)} percent ${deviation} your goal.`;
      }
    }

    this.speak(narrative);
  }

  /**
   * Narrate goal streak
   * @param {number} streakCount - Number of consecutive days
   * @param {string} goalType - Type of goal
   */
  narrateStreak(streakCount, goalType) {
    if (!this.isEnabled) return;

    let narrative = '';
    
    if (streakCount === 0) {
      narrative = `Start your ${goalType} goal streak today!`;
    } else if (streakCount === 1) {
      narrative = `Great start! You have a 1-day streak for your ${goalType} goal.`;
    } else if (streakCount < 7) {
      narrative = `Nice work! You're at ${streakCount} days in a row for your ${goalType} goal. Keep it up!`;
    } else if (streakCount < 30) {
      narrative = `Impressive! ${streakCount} day streak for your ${goalType} goal. You're building a strong habit.`;
    } else {
      narrative = `Amazing! ${streakCount} consecutive days meeting your ${goalType} goal. You're a nutrition champion!`;
    }

    this.speak(narrative);
  }

  /**
   * Format date for natural speech
   * @param {string} dateStr - ISO date string
   * @returns {string}
   */
  formatDateForSpeech(dateStr) {
    const date = new Date(dateStr);
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Set speech rate
   * @param {number} rate - Speech rate (0.1 to 10)
   */
  setRate(rate) {
    this.rate = Math.max(0.1, Math.min(10, rate));
  }

  /**
   * Set speech pitch
   * @param {number} pitch - Speech pitch (0 to 2)
   */
  setPitch(pitch) {
    this.pitch = Math.max(0, Math.min(2, pitch));
  }

  /**
   * Set speech volume
   * @param {number} volume - Speech volume (0 to 1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Check if speech synthesis is supported
   * @returns {boolean}
   */
  isSupported() {
    return 'speechSynthesis' in window;
  }
}

// Export
window.VoiceNarrationManager = VoiceNarrationManager;

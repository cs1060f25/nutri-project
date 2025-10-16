// static/js/accessibility-helpers.js

class AccessibilityManager {
  constructor() {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.announcer = document.getElementById('aria-announcer');
    this.initializeARIA();
    this.setupKeyboardNavigation();
  }

  /**
   * Initialize ARIA live region for announcements
   */
  initializeARIA() {
    if (!this.announcer) {
      this.announcer = document.createElement('div');
      this.announcer.id = 'aria-announcer';
      this.announcer.setAttribute('role', 'status');
      this.announcer.setAttribute('aria-live', 'polite');
      this.announcer.setAttribute('aria-atomic', 'true');
      this.announcer.className = 'sr-only';
      document.body.appendChild(this.announcer);
    }
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   */
  announce(message, priority = 'polite') {
    if (!this.announcer) {
      this.initializeARIA();
    }
    
    this.announcer.setAttribute('aria-live', priority);
    
    // Clear and set with a small delay to ensure announcement
    this.announcer.textContent = '';
    setTimeout(() => {
      this.announcer.textContent = message;
    }, 100);
    
    // Clear after announcement
    setTimeout(() => {
      this.announcer.textContent = '';
    }, 3000);
  }

  /**
   * Setup keyboard navigation for custom components
   */
  setupKeyboardNavigation() {
    // Handle metric toggle navigation with arrow keys
    const metricToggles = document.querySelectorAll('.metric-toggle-btn');
    
    metricToggles.forEach((toggle, index) => {
      toggle.addEventListener('keydown', (e) => {
        let nextIndex;
        
        switch(e.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            nextIndex = index > 0 ? index - 1 : metricToggles.length - 1;
            metricToggles[nextIndex].focus();
            break;
            
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault();
            nextIndex = index < metricToggles.length - 1 ? index + 1 : 0;
            metricToggles[nextIndex].focus();
            break;
            
          case 'Home':
            e.preventDefault();
            metricToggles.focus();
            break;
            
          case 'End':
            e.preventDefault();
            metricToggles[metricToggles.length - 1].focus();
            break;
        }
      });
    });
  }

  /**
   * Set focus to element with announcement
   * @param {HTMLElement} element - Element to focus
   * @param {string} announcement - Optional announcement
   */
  setFocusWithAnnouncement(element, announcement = null) {
    if (element) {
      element.focus();
      if (announcement) {
        this.announce(announcement);
      }
    }
  }

  /**
   * Check if animations should be reduced
   * @returns {boolean}
   */
  shouldReduceMotion() {
    return this.prefersReducedMotion;
  }

  /**
   * Get animation duration based on user preference
   * @param {number} defaultDuration - Default duration in ms
   * @returns {number}
   */
  getAnimationDuration(defaultDuration) {
    return this.prefersReducedMotion ? 1 : defaultDuration;
  }

  /**
   * Make chart accessible with keyboard navigation and screen reader support
   * @param {HTMLCanvasElement} canvas - Chart canvas element
   * @param {Object} chartData - Chart data for text alternative
   */
  makeChartAccessible(canvas, chartData) {
    // Set ARIA attributes
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('tabindex', '0');
    
    // Generate text alternative
    const altText = this.generateChartAltText(chartData);
    canvas.setAttribute('aria-label', altText);
    
    // Add keyboard interaction
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        this.announce(altText);
      }
    });
  }

  /**
   * Generate descriptive text for chart
   * @param {Object} chartData - Chart configuration and data
   * @returns {string}
   */
  generateChartAltText(chartData) {
    if (!chartData || !chartData.data) return 'Chart visualization';
    
    const { labels, datasets } = chartData.data;
    const datasetName = datasets?.label || 'Data';
    const values = datasets?.data || [];
    
    if (values.length === 0) return 'Empty chart';
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    return `${datasetName} chart showing ${values.length} data points. ` +
           `Minimum value: ${min.toFixed(1)}, ` +
           `Maximum value: ${max.toFixed(1)}, ` +
           `Average: ${avg.toFixed(1)}`;
  }

  /**
   * Validate form with accessible error handling
   * @param {HTMLFormElement} form - Form to validate
   * @returns {boolean}
   */
  validateFormAccessibly(form) {
    const invalidInputs = form.querySelectorAll(':invalid');
    
    if (invalidInputs.length > 0) {
      const firstInvalid = invalidInputs;
      const errorMessage = firstInvalid.validationMessage || 'Please check this field';
      
      firstInvalid.focus();
      firstInvalid.setAttribute('aria-invalid', 'true');
      this.announce(`Error: ${errorMessage}`, 'assertive');
      
      return false;
    }
    
    return true;
  }
}

// Export for use in other scripts
window.AccessibilityManager = AccessibilityManager;

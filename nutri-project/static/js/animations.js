// static/js/animations.js

class AnimationController {
  constructor(accessibilityManager) {
    this.a11y = accessibilityManager;
    this.shouldAnimate = !this.a11y.shouldReduceMotion();
  }

  /**
   * Animate number counting up
   * @param {HTMLElement} element - Element containing the number
   * @param {number} endValue - Target number
   * @param {number} duration - Animation duration in ms
   * @param {string} unit - Unit suffix (e.g., 'g', 'mg')
   */
  animateNumber(element, endValue, duration = 1000, unit = '') {
    if (!this.shouldAnimate) {
      element.textContent = endValue.toFixed(1) + unit;
      return;
    }

    const startValue = 0;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      element.textContent = currentValue.toFixed(1) + unit;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Announce final value to screen readers
        this.a11y.announce(`Value updated to ${endValue.toFixed(1)}${unit}`);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Stagger animation for multiple elements
   * @param {NodeList} elements - Elements to animate
   * @param {string} animationClass - CSS animation class
   * @param {number} staggerDelay - Delay between elements in ms
   */
  staggerAnimation(elements, animationClass, staggerDelay = 100) {
    if (!this.shouldAnimate) {
      elements.forEach(el => el.style.opacity = '1');
      return;
    }

    elements.forEach((element, index) => {
      setTimeout(() => {
        element.classList.add(animationClass);
      }, index * staggerDelay);
    });
  }

  /**
   * Animate progress bar
   * @param {HTMLElement} progressBar - Progress bar element
   * @param {number} percentage - Target percentage (0-100)
   */
  animateProgressBar(progressBar, percentage) {
    if (!this.shouldAnimate) {
      progressBar.style.width = percentage + '%';
      return;
    }

    progressBar.style.setProperty('--progress-width', percentage + '%');
    progressBar.classList.add('progress-bar');
  }

  /**
   * Smooth scroll to element
   * @param {HTMLElement} element - Target element
   * @param {Object} options - Scroll options
   */
  scrollToElement(element, options = {}) {
    const defaultOptions = {
      behavior: this.shouldAnimate ? 'smooth' : 'auto',
      block: 'start',
      inline: 'nearest'
    };
    
    element.scrollIntoView({ ...defaultOptions, ...options });
  }

  /**
   * Gentle shake animation for errors
   * @param {HTMLElement} element - Element to shake
   */
  shakeElement(element) {
    if (!this.shouldAnimate) return;

    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = 'shake 0.4s ease-in-out';
    }, 10);

    setTimeout(() => {
      element.style.animation = '';
    }, 400);
  }
}

// Add shake keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`;
document.head.appendChild(style);

// Export
window.AnimationController = AnimationController;

// static/js/charts.js

class NutritionChartManager {
  constructor(accessibilityManager) {
    this.a11y = accessibilityManager;
    this.charts = {};
    this.currentMetric = 'calories';
    this.chartColors = {
      calories: { bg: 'rgba(0, 122, 255, 0.1)', border: 'rgb(0, 122, 255)' },
      protein: { bg: 'rgba(255, 59, 48, 0.1)', border: 'rgb(255, 59, 48)' },
      carbs: { bg: 'rgba(255, 204, 0, 0.1)', border: 'rgb(255, 204, 0)' },
      fats: { bg: 'rgba(52, 199, 89, 0.1)', border: 'rgb(52, 199, 89)' },
      sodium: { bg: 'rgba(255, 149, 0, 0.1)', border: 'rgb(255, 149, 0)' },
      fiber: { bg: 'rgba(88, 86, 214, 0.1)', border: 'rgb(88, 86, 214)' },
    };
  }

  /**
   * Create line chart for daily trends
   * @param {string} canvasId - Canvas element ID
   * @param {Object} data - Chart data
   * @param {Object} goal - Goal configuration
   */
  createTrendChart(canvasId, data, goal = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const metric = this.currentMetric;
    const colors = this.chartColors[metric];

    // Prepare datasets
    const datasets = [
      {
        label: this.getMetricLabel(metric),
        data: data.map(d => d[metric]),
        borderColor: colors.border,
        backgroundColor: colors.bg,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.border,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }
    ];

    // Add goal line if provided
    if (goal && goal.target_value) {
      datasets.push({
        label: 'Goal',
        data: Array(data.length).fill(goal.target_value),
        borderColor: 'rgba(142, 142, 147, 0.5)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      });
    }

    const chartConfig = {
      type: 'line',
      data: {
        labels: data.map(d => this.formatDateLabel(d.date)),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
                size: 14,
                weight: '500'
              },
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--color-label').trim(),
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              family: '-apple-system',
              size: 14,
              weight: '600'
            },
            bodyFont: {
              family: '-apple-system',
              size: 13
            },
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                const unit = this.getMetricUnit(metric);
                return `${label}: ${value.toFixed(1)}${unit}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: '-apple-system',
                size: 12
              },
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--color-secondary-label').trim()
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--color-gray-5').trim(),
              drawBorder: false
            },
            ticks: {
              font: {
                family: '-apple-system',
                size: 12
              },
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--color-secondary-label').trim(),
              callback: (value) => {
                return value + this.getMetricUnit(metric);
              }
            }
          }
        },
        animation: {
          duration: this.a11y.getAnimationDuration(750),
          easing: 'easeInOutQuart'
        }
      }
    };

    // Destroy existing chart if present
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    // Create new chart
    this.charts[canvasId] = new Chart(ctx, chartConfig);

    // Make accessible
    this.a11y.makeChartAccessible(canvas, chartConfig);
  }

  /**
   * Create pie chart for macronutrient distribution
   * @param {string} canvasId - Canvas element ID
   * @param {Object} distribution - Macro distribution data
   */
  createMacroDistributionChart(canvasId, distribution) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const chartConfig = {
      type: 'doughnut',
      data: {
        labels: ['Protein', 'Carbohydrates', 'Fats'],
        datasets: [{
          data: [
            distribution.protein,
            distribution.carbs,
            distribution.fats
          ],
          backgroundColor: [
            'rgb(255, 59, 48)',
            'rgb(255, 204, 0)',
            'rgb(52, 199, 89)'
          ],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: '-apple-system',
                size: 14,
                weight: '500'
              },
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--color-label').trim(),
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              family: '-apple-system',
              size: 14,
              weight: '600'
            },
            bodyFont: {
              family: '-apple-system',
              size: 13
            },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                return `${label}: ${value.toFixed(1)}%`;
              }
            }
          }
        },
        animation: {
          duration: this.a11y.getAnimationDuration(1000),
          easing: 'easeInOutQuart'
        }
      }
    };

    // Destroy existing chart
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    // Create new chart
    this.charts[canvasId] = new Chart(ctx, chartConfig);

    // Make accessible
    this.a11y.makeChartAccessible(canvas, chartConfig);
  }

  /**
   * Update chart with new metric
   * @param {string} metric - New metric to display
   * @param {Object} data - Chart data
   * @param {Object} goal - Goal data
   */
  updateMetric(metric, data, goal = null) {
    this.currentMetric = metric;
    this.createTrendChart('trendChart', data, goal);
    
    // Announce change
    const metricLabel = this.getMetricLabel(metric);
    this.a11y.announce(`Now showing ${metricLabel} trend`);
  }

  /**
   * Get human-readable metric label
   * @param {string} metric - Metric key
   * @returns {string}
   */
  getMetricLabel(metric) {
    const labels = {
      calories: 'Calories',
      protein: 'Protein',
      carbs: 'Carbohydrates',
      fats: 'Fats',
      sodium: 'Sodium',
      fiber: 'Fiber',
      sugar: 'Sugar',
      calcium: 'Calcium',
      iron: 'Iron'
    };
    return labels[metric] || metric;
  }

  /**
   * Get metric unit
   * @param {string} metric - Metric key
   * @returns {string}
   */
  getMetricUnit(metric) {
    const units = {
      calories: 'kcal',
      protein: 'g',
      carbs: 'g',
      fats: 'g',
      sodium: 'mg',
      fiber: 'g',
      sugar: 'g',
      calcium: 'mg',
      iron: 'mg'
    };
    return units[metric] || '';
  }

  /**
   * Format date for chart labels
   * @param {string} dateStr - ISO date string
   * @returns {string}
   */
  formatDateLabel(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Destroy all charts
   */
  destroyAllCharts() {
    Object.values(this.charts).forEach(chart => chart.destroy());
    this.charts = {};
  }
}

// Export for use
window.NutritionChartManager = NutritionChartManager;

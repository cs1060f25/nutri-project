// InsightsSummary.tsx
import React from 'react';

interface Insight {
  type: 'pattern' | 'achievement' | 'suggestion';
  title: string;
  description: string;
  icon: string;
}

const InsightsSummary: React.FC<{
  dateRange: { start: string; end: string };
  avgCalories: number;
  highestDay: { date: string; calories: number };
  lowestDay: { date: string; calories: number };
}> = ({ dateRange, avgCalories, highestDay, lowestDay }) => {
  const insights: Insight[] = [
    {
      type: 'pattern',
      title: 'Average Daily Intake',
      description: `Over the selected period, your average daily caloric intake was ${avgCalories.toFixed(0)} kcal.`,
      icon: '📊'
    },
    {
      type: 'pattern',
      title: 'Highest Intake Day',
      description: `Your highest intake was ${highestDay.calories.toFixed(0)} kcal on ${highestDay.date}. Days with higher intake often correlate with social events, stress, or increased activity.`,
      icon: '📈'
    },
    {
      type: 'pattern',
      title: 'Lowest Intake Day',
      description: `Your lowest intake was ${lowestDay.calories.toFixed(0)} kcal on ${lowestDay.date}. Consistently low intake days may indicate missed meals or inadequate nutrition.`,
      icon: '📉'
    },
    {
      type: 'suggestion',
      title: 'Regular Eating Patterns',
      description: 'Research shows that consistent meal timing supports stable energy levels and better nutrient absorption. Consider establishing regular meal times.',
      icon: '🕐'
    }
  ];

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'achievement':
        return 'bg-green-50 border-green-200';
      case 'suggestion':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-purple-50 border-purple-200';
    }
  };

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Insights & Patterns
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Understanding your nutrition patterns from {dateRange.start} to {dateRange.end}
        </p>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getInsightStyle(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{insight.icon}</span>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          📚 Educational Resources
        </h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>HUHS Nutrition Services:</strong> Schedule a consultation 
              with registered dietitians at (617) 495-2068
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>HUDS Dietary Accommodations:</strong> Request support for 
              specific dietary needs through the Disability Access Office
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>
              <strong>Mental Health Support:</strong> CAMHS provides confidential 
              support for concerns about eating at (617) 495-2042
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default InsightsSummary;

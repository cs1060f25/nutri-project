// GoalProgressSummary.tsx
import React from 'react';

interface GoalProgress {
  metric: string;
  current: number;
  target: number;
  unit: string;
  description: string;
}

const GoalProgressSummary: React.FC<{
  goals: GoalProgress[];
}> = ({ goals }) => {
  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressMessage = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    
    if (percentage >= 90 && percentage <= 110) {
      return {
        message: 'Within target range',
        color: 'text-blue-700',
        bg: 'bg-blue-50'
      };
    } else if (percentage < 90) {
      return {
        message: 'Below target',
        color: 'text-indigo-700',
        bg: 'bg-indigo-50'
      };
    } else {
      return {
        message: 'Above target',
        color: 'text-purple-700',
        bg: 'bg-purple-50'
      };
    }
  };

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Your Nutrition Goals Progress
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Average daily intake during selected period
        </p>
      </div>

      <div className="space-y-6">
        {goals.map((goal, index) => {
          const progress = getProgressPercentage(goal.current, goal.target);
          const status = getProgressMessage(goal.current, goal.target);
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {goal.metric}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {goal.description}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full ${status.bg}`}>
                  <span className={`text-xs font-medium ${status.color}`}>
                    {status.message}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 
                               h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-700 min-w-[100px] text-right">
                  {goal.current.toFixed(0)} / {goal.target.toFixed(0)} {goal.unit}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded">
        <div className="flex items-start gap-3">
          <svg 
            className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Individualized Needs
            </p>
            <p className="text-xs text-amber-700 mt-1">
              These goals are general guidelines. Your specific needs may vary 
              based on activity level, stress, sleep, and health status. Consider 
              consulting with HUHS nutritionists for personalized guidance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalProgressSummary;

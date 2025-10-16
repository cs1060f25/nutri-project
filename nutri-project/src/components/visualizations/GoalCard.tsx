import React from 'react';
import { TrendingUp, TrendingDown, Target, Flame, Activity } from 'lucide-react';

interface GoalCardProps {
  title: string;
  current: number;
  target: number;
  unit: string;
  icon?: 'flame' | 'target' | 'activity';
  trend?: number;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  title,
  current,
  target,
  unit,
  icon = 'target',
  trend,
}) => {
  const percentage = (current / target) * 100;
  const isOverTarget = percentage > 100;
  const isNearTarget = percentage >= 90 && percentage <= 110;

  const getIcon = () => {
    switch (icon) {
      case 'flame':
        return <Flame className="w-5 h-5" />;
      case 'activity':
        return <Activity className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const getColor = () => {
    if (isNearTarget) return 'bg-green-500';
    if (isOverTarget) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`${getColor()} p-2 rounded-lg text-white`}>
            {getIcon()}
          </div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {current.toFixed(0)}
          </span>
          <span className="text-sm text-gray-500">/ {target} {unit}</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className={`font-medium ${
            isNearTarget ? 'text-green-600' :
            isOverTarget ? 'text-amber-600' :
            'text-blue-600'
          }`}>
            {percentage.toFixed(0)}% of goal
          </span>
          {!isNearTarget && (
            <span className="text-gray-500">
              {isOverTarget ? '+' : ''}{(current - target).toFixed(0)} {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

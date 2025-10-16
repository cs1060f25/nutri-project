import React from 'react';
import { Calendar, Award, Zap } from 'lucide-react';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  successRate: number;
  totalDays: number;
}

export const StreakCard: React.FC<StreakCardProps> = ({
  currentStreak,
  longestStreak,
  successRate,
  totalDays,
}) => {
  return (
    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-6 h-6" />
        <h3 className="text-xl font-bold">Goal Streak</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 opacity-80" />
            <span className="text-sm opacity-90">Current Streak</span>
          </div>
          <div className="text-3xl font-bold">{currentStreak}</div>
          <div className="text-sm opacity-75">days</div>
        </div>

        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 opacity-80" />
            <span className="text-sm opacity-90">Best Streak</span>
          </div>
          <div className="text-3xl font-bold">{longestStreak}</div>
          <div className="text-sm opacity-75">days</div>
        </div>
      </div>

      <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm opacity-90">Success Rate</span>
          <span className="text-lg font-bold">{successRate}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${successRate}%` }}
          ></div>
        </div>
        <div className="text-xs opacity-75 mt-2">
          {Math.round(totalDays * successRate / 100)} of {totalDays} days on track
        </div>
      </div>
    </div>
  );
};

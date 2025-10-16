import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangeSelectorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onPresetSelect: (preset: 'week' | 'month' | 'semester') => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onPresetSelect,
}) => {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-red-600" />
        <h3 className="font-semibold text-gray-900">Date Range</h3>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => onPresetSelect('week')}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors font-medium"
        >
          Past Week
        </button>
        <button
          onClick={() => onPresetSelect('month')}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors font-medium"
        >
          Past Month
        </button>
        <button
          onClick={() => onPresetSelect('semester')}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors font-medium"
        >
          Semester
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
    </div>
  );
};

// DateRangeSelector.tsx
import React, { useState } from 'react';
import { format, subDays, subMonths } from 'date-fns';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

const DateRangeSelector: React.FC<{
  onRangeChange: (range: DateRange) => void;
}> = ({ onRangeChange }) => {
  const [range, setRange] = useState<DateRange>({
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
  });

  const presetRanges = [
    { label: 'Past Week', days: 7 },
    { label: 'Past Month', days: 30 },
    { label: 'Past 3 Months', days: 90 },
  ];

  const handlePresetClick = (days: number) => {
    const newRange = {
      startDate: subDays(new Date(), days),
      endDate: new Date(),
    };
    setRange(newRange);
    onRangeChange(newRange);
  };

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Select Time Period
      </label>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {presetRanges.map(({ label, days }) => (
          <button
            key={label}
            onClick={() => handlePresetClick(days)}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 
                     text-blue-700 rounded-md transition-colors
                     text-sm font-medium"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={format(range.startDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              const newRange = {
                ...range,
                startDate: new Date(e.target.value),
              };
              setRange(newRange);
              onRangeChange(newRange);
            }}
            className="w-full px-3 py-2 border border-gray-300 
                     rounded-md focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={format(range.endDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              const newRange = {
                ...range,
                endDate: new Date(e.target.value),
              };
              setRange(newRange);
              onRangeChange(newRange);
            }}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="w-full px-3 py-2 border border-gray-300 
                     rounded-md focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;
